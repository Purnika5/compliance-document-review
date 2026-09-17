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
          className="flex items-center gap-2 bg-[#C5E86C] hover:bg-[#b4db53] text-[#183028] border border-[#b4db53] px-4 py-2.5 rounded-full shadow-lg shadow-[#183028]/10 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="h-2 w-2 rounded-full bg-[#183028] animate-pulse" />
          <Bot className="h-4 w-4 text-[#183028]" />
          <span>Compliance Help</span>
        </button>
      )}

      {/* Structured Help Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[540px] rounded-2xl flex flex-col overflow-hidden text-xs bg-white border border-[#E6E8E7] shadow-2xl">
          {/* Header */}
          <div className="bg-[#FAFBFB] text-[#183028] px-4 py-3 flex items-center justify-between border-b border-[#E6E8E7] shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="h-7 w-7 rounded-xl bg-[#C5E86C]/35 border border-[#C5E86C] flex items-center justify-center text-[#183028] shadow-2xs">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-[#183028] tracking-tight">Compliance Help</h3>
                <p className="text-[10px] text-[#183028]/60">Institutional workflow guide</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-[#183028]/60 hover:text-[#183028] hover:bg-[#C5E86C]/20 transition-colors cursor-pointer"
              aria-label="Close help window"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Institutional Compliance Disclaimer Banner */}
          <div className="border-b border-[#E6E8E7] bg-[#FAFBFB]/50 px-3.5 py-2 text-[#183028]/70 text-[11px] flex items-start gap-2 shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-[#183028] mt-0.5 shrink-0" />
            <p className="leading-snug">
              Official determinations rest solely with authorized compliance personnel.
            </p>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-white">
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
                      <span className="text-[10px] text-[#183028]/60">You</span>
                    ) : (
                      <span className="text-[10px] text-[#183028] font-bold">Springer Help</span>
                    )}
                    <span className="text-[9px] text-[#183028]/40">{message.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      "p-3 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap min-h-[30px]",
                      isUser
                        ? "bg-[#183028] text-white font-medium rounded-br-xs shadow-2xs"
                        : "bg-[#FAFBFB] text-[#183028] border border-[#E6E8E7] rounded-bl-xs shadow-2xs"
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
                          <span className="inline-block w-[2px] h-[12px] bg-[#183028] ml-0.5 align-middle animate-[blink_0.7s_step-end_infinite]" />
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
          <div className="px-3 py-2 bg-[#FAFBFB]/50 border-t border-[#E6E8E7] flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isTyping}
                className="whitespace-nowrap text-[10px] font-semibold text-[#183028] hover:bg-[#C5E86C]/20 bg-white border border-[#E6E8E7] px-2.5 py-1 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3 bg-white border-t border-[#E6E8E7] flex items-center space-x-2 shrink-0">
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
              className="bg-[#FAFBFB] border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/40 h-8 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#183028] disabled:opacity-60"
            />
            <Button
              size="icon"
              disabled={!inputValue.trim() || isTyping}
              onClick={() => handleSend()}
              className="h-8 w-8 bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white rounded-xl disabled:opacity-40 shrink-0 cursor-pointer shadow-2xs transition-all"
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
