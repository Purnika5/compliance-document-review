"use client";

/**
 * DOCU: Renders the interactive compliance copilot widget with typing animation.
 * Last Updated Date: September 8, 2026
 * @returns The compliance copilot widget view.
 * @author Keith
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { User, Send, X, Bot, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IChatMessage } from "@/types/chatbot.types";
import {
  INITIAL_MESSAGES,
  SUGGESTED_QUESTIONS,
  PLATFORM_KNOWLEDGE_BASE,
} from "@/lib/constants/chatbot";

/** Typing speed in milliseconds per character */
const TYPING_SPEED_MS = 18;

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<IChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  /** Clears the typing interval on unmount to prevent memory leaks */
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  /** Simulates character-by-character bot typing animation */
  const simulateTyping = useCallback((botMsgId: string, fullText: string, timestamp: string) => {
    setIsTyping(true);
    let charIndex = 0;

    /* Insert a placeholder bot message with empty text */
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        sender: "bot",
        text: "",
        timestamp,
        isTyping: true,
      } as IChatMessage,
    ]);

    typingIntervalRef.current = setInterval(() => {
      charIndex++;
      const currentText = fullText.slice(0, charIndex);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, text: currentText, isTyping: charIndex < fullText.length }
            : msg
        )
      );

      if (charIndex >= fullText.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTyping(false);
      }
    }, TYPING_SPEED_MS);
  }, []);

  const handleSend = (overrideText?: string) => {
    const text = overrideText || inputValue.trim();
    if (!text || isTyping) return;

    const userMsgId = `user-${++messageIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let answer = PLATFORM_KNOWLEDGE_BASE.default;
    const lower = text.toLowerCase();
    if (lower.includes("upload") || lower.includes("submit") || lower.includes("proposal")) {
      answer = PLATFORM_KNOWLEDGE_BASE.upload;
    } else if (lower.includes("review") || lower.includes("approve") || lower.includes("officer")) {
      answer = PLATFORM_KNOWLEDGE_BASE.review;
    } else if (lower.includes("category") || lower.includes("type") || lower.includes("format")) {
      answer = PLATFORM_KNOWLEDGE_BASE.categories;
    } else if (lower.includes("role") || lower.includes("permission") || lower.includes("advisor")) {
      answer = PLATFORM_KNOWLEDGE_BASE.permissions;
    }

    const botMsgId = `bot-${++messageIdRef.current}`;

    /* Add the user message immediately */
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text,
        timestamp,
      },
    ]);

    if (!overrideText) setInputValue("");

    /* Small delay before bot starts "typing" for realism */
    setTimeout(() => {
      simulateTyping(botMsgId, answer, timestamp);
    }, 350);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-transparent hover:bg-[#062A20] hover:text-[#54d0a2] border border-border hover:border-emerald-800/60 text-foreground px-3.5 py-2.5 rounded-lg shadow-xl shadow-black/50 text-xs font-semibold transition-all hover:scale-102 cursor-pointer"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <Bot className="h-4 w-4 text-emerald-400" />
          <span>Compliance Help</span>
        </button>
      )}

      {/* Structured Help Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[540px] rounded-xl flex flex-col overflow-hidden text-xs bg-card border border-border shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="bg-muted/60 text-foreground px-4 py-3 flex items-center justify-between border-b border-border shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="h-6 w-6 rounded-md bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground tracking-tight">Compliance Help</h3>
                <p className="text-[10px] text-muted-foreground">Institutional workflow guide</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062A20] transition-colors cursor-pointer"
              aria-label="Close help window"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Institutional Compliance Disclaimer Banner */}
          <div className="border-b border-border bg-muted/20 px-3 py-2 text-muted-foreground text-[11px] flex items-start gap-2 shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="leading-snug">
              Official determinations rest solely with authorized compliance personnel.
            </p>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-card/60">
            {messages.map((message) => {
              const isUser = message.sender === "user";
              const isCurrentlyTyping = message.isTyping;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col max-w-[85%] space-y-1",
                    isUser ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center space-x-1.5 px-0.5">
                    {isUser ? (
                      <span className="text-[10px] text-muted-foreground">You</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-medium">Springer Help</span>
                    )}
                    <span className="text-[9px] text-muted-foreground/60">{message.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      "p-3 rounded-lg text-xs leading-relaxed break-words whitespace-pre-wrap min-h-[30px]",
                      isUser
                        ? "bg-[#24A152] text-white font-medium rounded-br-none shadow-xs"
                        : "bg-muted/70 text-foreground border border-border rounded-bl-none shadow-xs"
                    )}
                  >
                    {/* Show dots if the message is empty (initial typing state) */}
                    {!isUser && message.text === "" ? (
                      <TypingDots />
                    ) : (
                      <>
                        {message.text}
                        {/* Blinking cursor while typing */}
                        {!isUser && isCurrentlyTyping && (
                          <span className="inline-block w-[2px] h-[12px] bg-emerald-400 ml-0.5 align-middle animate-[blink_0.7s_step-end_infinite]" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Pills */}
          <div className="px-3 py-2 bg-muted/20 border-t border-border flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isTyping}
                className="whitespace-nowrap text-[10px] font-medium text-muted-foreground hover:text-[#54d0a2] bg-transparent hover:bg-[#062A20] border border-border/80 hover:border-emerald-800/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3 bg-card border-t border-border flex items-center space-x-2 shrink-0">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isTyping}
              placeholder={isTyping ? "Springer Help is typing..." : "Ask about guidelines, classifications..."}
              className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/60 h-8 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-60"
            />
            <Button
              size="icon"
              disabled={!inputValue.trim() || isTyping}
              onClick={() => handleSend()}
              className="h-8 w-8 bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white rounded-md disabled:opacity-40 shrink-0 cursor-pointer shadow-xs transition-all"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Animated three-dot typing indicator shown before first character appears */
function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: "160ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: "320ms" }} />
    </span>
  );
}
