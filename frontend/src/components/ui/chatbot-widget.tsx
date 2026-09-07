"use client";

/**
 * DOCU: Renders the interactive compliance copilot widget.
 * Last Updated Date: September 3, 2026
 * @returns The compliance copilot widget view.
 * @author Keith
 */
import React, { useState, useRef, useEffect } from "react";
import { User, Send, X, Bot, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IChatMessage } from "@/types/chatbot.types";
import {
  INITIAL_MESSAGES,
  SUGGESTED_QUESTIONS,
  MOCK_BOT_RESPONSES,
} from "@/lib/constants/chatbot";

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<IChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, streamingText, isOpen]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  const streamBotResponse = (fullResponse: string) => {
    setIsTyping(false);
    const botMsgId = `bot-${++messageIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setStreamingMsgId(botMsgId);
    setStreamingText("");

    const words = fullResponse.split(" ");
    let currentWordIndex = 0;

    typingTimerRef.current = setInterval(() => {
      if (currentWordIndex < words.length) {
        const nextChunk = words.slice(0, currentWordIndex + 1).join(" ");
        setStreamingText(nextChunk);
        currentWordIndex++;
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: "bot",
            text: fullResponse,
            timestamp,
          },
        ]);
        setStreamingMsgId(null);
        setStreamingText("");
      }
    }, 25);
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isTyping || streamingMsgId) return;

    const userMsg: IChatMessage = {
      id: `user-${++messageIdRef.current}`,
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsTyping(true);

    let botAnswer =
      "Springer AI provides automated advisory guidance based on FINRA Rule 2111, SEC Rule 17a-4, and firm compliance guidelines. Select a document or ask a specific regulatory inquiry.";

    const lower = text.toLowerCase();
    if (lower.includes("upload") || lower.includes("submit") || lower.includes("proposal")) {
      botAnswer = MOCK_BOT_RESPONSES.upload;
    } else if (lower.includes("review") || lower.includes("approve") || lower.includes("officer")) {
      botAnswer = MOCK_BOT_RESPONSES.review;
    } else if (lower.includes("category") || lower.includes("type") || lower.includes("format")) {
      botAnswer = MOCK_BOT_RESPONSES.categories;
    } else if (lower.includes("role") || lower.includes("permission") || lower.includes("advisor")) {
      botAnswer = MOCK_BOT_RESPONSES.permissions;
    }

    setTimeout(() => {
      streamBotResponse(botAnswer);
    }, 300);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Trigger: Disciplined Institutional Dark Slate Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="glass-accent flex items-center gap-2 text-white px-3.5 py-2 rounded-md shadow-md text-xs font-semibold transition-colors cursor-pointer"
        >
          <Bot className="h-4 w-4 text-emerald-400" />
          <span>Compliance Copilot</span>
        </button>
      )}

      {/* Structured Copilot Window */}
      {isOpen && (
          <div className="neu-surface w-[360px] sm:w-[400px] h-[520px] rounded-xl flex flex-col overflow-hidden text-xs">
          {/* Header */}
          <div className="glass-accent text-white px-4 py-3 flex items-center justify-between border-b border-cyan-300/40 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="h-7 w-7 rounded-md bg-indigo-950/80 border border-cyan-300/40 flex items-center justify-center text-cyan-300 font-bold">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">Compliance Assistant</h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-white/15 text-cyan-50 rounded border border-white/30 uppercase">
                    AI Guidance
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Institutional Reference System</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Copilot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Compliance Disclaimer Notice */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] flex items-center gap-1.5 shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>AI guidance only. Final decisions executed by Compliance Officer.</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-background/45">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2 max-w-[88%]",
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded flex items-center justify-center text-[10px] font-semibold shrink-0",
                    msg.sender === "user"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-800 border border-slate-300"
                  )}
                >
                  {msg.sender === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div>
                  <div
                    className={cn(
                      "p-2.5 rounded text-xs leading-relaxed border",
                      msg.sender === "user"
                        ? "glass-pink text-white"
                        : "detail-highlight text-slate-700"
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block px-0.5">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {streamingMsgId && (
              <div className="flex items-start gap-2 max-w-[88%] mr-auto">
                <div className="h-6 w-6 rounded bg-slate-200 text-slate-800 border border-slate-300 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="detail-highlight p-2.5 rounded-lg text-xs leading-relaxed text-slate-800">
                    {streamingText}
                    <span className="inline-block w-1.5 h-3 bg-slate-900 ml-1" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block px-0.5">Processing...</span>
                </div>
              </div>
            )}

            {isTyping && !streamingMsgId && (
              <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-200 w-32">
                Analyzing rules...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                disabled={isTyping || !!streamingMsgId}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap text-[10px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 px-2 py-0.5 rounded transition-colors cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-background/70 border-t border-white/70 flex items-center gap-1.5 shrink-0">
            <Input
              placeholder="Ask compliance rule questions..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isTyping || !!streamingMsgId}
              className="neu-inset flex-1 text-xs h-8 rounded-md text-slate-900 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping || !!streamingMsgId}
              size="icon"
              className="h-8 w-8 rounded bg-slate-900 hover:bg-slate-800 text-white shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
