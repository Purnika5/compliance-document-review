"use client";

/**
 * DOCU: Renders the interactive compliance copilot and informative pre-login assistant.
 * Supports Informative Pre-Login guidance, Grammar Recheck, and Institutional Documentation Rule optimization.
 * Last Updated Date: September 21, 2026
 * @returns The compliance copilot widget view.
 * @author Keith
 */
import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  Send,
  X,
  Bot,
  ShieldAlert,
  Check,
  Copy,
  Sparkles,
  BookOpen,
  FileCheck2,
  Wand2,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IChatMessage } from "@/types/chatbot.types";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import {
  LOGIN_INITIAL_MESSAGES,
  LOGIN_SUGGESTED_QUESTIONS,
  LOGIN_KNOWLEDGE_BASE,
  DASHBOARD_INITIAL_MESSAGES,
  DASHBOARD_SUGGESTED_QUESTIONS,
  PLATFORM_KNOWLEDGE_BASE,
} from "@/lib/constants/chatbot";
import {
  recheckGrammar,
  enhanceForDocumentation,
  detectUserIntent,
  type IGrammarResult,
  type IDocumentationResult,
} from "@/lib/chatbot/documentation-engine";

/** Typing speed in milliseconds per character */
const TYPING_SPEED_MS = 14;

type ChatMode = "knowledge" | "grammar" | "documentation";

export function ChatbotWidget() {
  const pathname = usePathname();

  // Reactive subscription to authStore
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const isAuthenticated = Boolean(session?.token);
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isLoginMode = !isAuthenticated || isAuthPage;

  // On login page, the chatbot starts open for informative guidance
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitializedState, setHasInitializedState] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatMode>("knowledge");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initialize open state: auto-open on login page once
  useEffect(() => {
    if (!hasInitializedState) {
      if (isLoginMode) {
        setIsOpen(true);
      }
      setHasInitializedState(true);
    }
  }, [isLoginMode, hasInitializedState]);

  // Messages state
  const [messages, setMessages] = useState<IChatMessage[]>(
    isLoginMode ? LOGIN_INITIAL_MESSAGES : DASHBOARD_INITIAL_MESSAGES
  );

  // Switch initial messages if login/dashboard state transitions
  useEffect(() => {
    setMessages(isLoginMode ? LOGIN_INITIAL_MESSAGES : DASHBOARD_INITIAL_MESSAGES);
    setActiveTab("knowledge");
  }, [isLoginMode]);

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

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  /** Copies text to clipboard with animated feedback */
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  /** Simulates character-by-character bot typing animation */
  const simulateTyping = useCallback(
    (
      botMsgId: string,
      fullText: string,
      timestamp: string,
      extras?: {
        grammarResult?: IGrammarResult;
        documentationResult?: IDocumentationResult;
      }
    ) => {
      setIsTyping(true);
      let charIndex = 0;

      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: "",
          timestamp,
          isTyping: true,
          grammarResult: extras?.grammarResult,
          documentationResult: extras?.documentationResult,
        },
      ]);

      typingIntervalRef.current = setInterval(() => {
        charIndex += 2; // smooth slightly faster pacing
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
    },
    []
  );

  const handleSend = (overrideText?: string, forcedMode?: ChatMode) => {
    const rawText = overrideText || inputValue.trim();
    if (!rawText || isTyping) return;

    const userMsgId = `user-${++messageIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: rawText,
        timestamp,
      },
    ]);

    if (!overrideText) setInputValue("");

    const botMsgId = `bot-${++messageIdRef.current}`;

    // Evaluate Mode and Intent
    const effectiveMode = forcedMode || activeTab;
    const { intent, targetText } = detectUserIntent(rawText);

    setTimeout(() => {
      // 1. Informative Pre-login mode
      if (isLoginMode) {
        const lower = rawText.toLowerCase();
        let answer = LOGIN_KNOWLEDGE_BASE.default;

        if (
          lower.includes("demo") ||
          lower.includes("account") ||
          lower.includes("credential") ||
          lower.includes("login") ||
          lower.includes("password") ||
          lower.includes("alex") ||
          lower.includes("sarah")
        ) {
          answer = LOGIN_KNOWLEDGE_BASE.credentials;
        } else if (
          lower.includes("format") ||
          lower.includes("pdf") ||
          lower.includes("docx") ||
          lower.includes("category") ||
          lower.includes("supported")
        ) {
          answer = LOGIN_KNOWLEDGE_BASE.formats;
        } else if (
          lower.includes("portal") ||
          lower.includes("what is") ||
          lower.includes("springer") ||
          lower.includes("about")
        ) {
          answer = LOGIN_KNOWLEDGE_BASE.overview;
        } else if (
          lower.includes("review") ||
          lower.includes("workflow") ||
          lower.includes("how does") ||
          lower.includes("officer")
        ) {
          answer = LOGIN_KNOWLEDGE_BASE.workflow;
        }

        simulateTyping(botMsgId, answer, timestamp);
        return;
      }

      // 2. Authenticated Dashboard Mode - Grammar Check
      if (effectiveMode === "grammar" || intent === "grammar") {
        const textToAudit = intent === "grammar" ? targetText : rawText;
        const grammarRes = recheckGrammar(textToAudit);

        const replyIntro =
          grammarRes.issues.length === 0
            ? "Grammar & Syntax Audit Complete: No grammatical or spelling issues were found. The phrasing adheres to institutional documentation quality."
            : `Grammar & Syntax Audit Complete: Corrected ${grammarRes.issues.length} item(s) to align with institutional professional standards.`;

        simulateTyping(botMsgId, replyIntro, timestamp, { grammarResult: grammarRes });
        return;
      }

      // 3. Authenticated Dashboard Mode - Documentation Rules Enhancer
      if (effectiveMode === "documentation" || intent === "documentation") {
        const textToEnhance = intent === "documentation" ? targetText : rawText;
        const docRes = enhanceForDocumentation(textToEnhance);

        const replyIntro = `Institutional Documentation Optimization Complete: Your response has been elevated to meet FINRA Rule 2210 and SEC Rule 206(4)-1 audit-defensible standards.`;

        simulateTyping(botMsgId, replyIntro, timestamp, { documentationResult: docRes });
        return;
      }

      // 4. Authenticated Dashboard Mode - Knowledge Q&A
      const lower = rawText.toLowerCase();
      let answer = PLATFORM_KNOWLEDGE_BASE.default;

      if (lower.includes("upload") || lower.includes("submit") || lower.includes("proposal")) {
        answer = PLATFORM_KNOWLEDGE_BASE.upload;
      } else if (lower.includes("review") || lower.includes("approve") || lower.includes("officer")) {
        answer = PLATFORM_KNOWLEDGE_BASE.review;
      } else if (lower.includes("category") || lower.includes("type") || lower.includes("format")) {
        answer = PLATFORM_KNOWLEDGE_BASE.categories;
      } else if (lower.includes("role") || lower.includes("permission") || lower.includes("advisor")) {
        answer = PLATFORM_KNOWLEDGE_BASE.permissions;
      } else if (lower.includes("grammar") || lower.includes("check")) {
        answer =
          "To audit grammar, click the 'Recheck Grammar' tab above, or prefix your message with 'Recheck grammar: [your text]'.";
      } else if (lower.includes("rule") || lower.includes("documentation") || lower.includes("enhance")) {
        answer =
          "To polish text for documentation rules, select the 'Documentation Rules' tab above, or prefix your message with 'Make response better: [your draft]'.";
      }

      simulateTyping(botMsgId, answer, timestamp);
    }, 300);
  };

  // Compute Suggested Questions according to mode
  const currentSuggestedQuestions = isLoginMode
    ? LOGIN_SUGGESTED_QUESTIONS
    : activeTab === "grammar"
    ? [
        "Recheck grammar: The advisor have submited the proposal without signed notes",
        "Recheck grammar: We was reviewing the doc and there is no risks",
        "Recheck grammar: Its alright to approve untill we recieve the audit",
      ]
    : activeTab === "documentation"
    ? [
        "Make response better: Looks good to me, advisor can proceed",
        "Make response better: Needs changes, missing fee schedules and conflict statements",
        "Make response better: This investment guarantees 15% return with zero risk",
      ]
    : DASHBOARD_SUGGESTED_QUESTIONS;

  const currentPlaceholder = isLoginMode
    ? "Ask about demo accounts, guidelines, formats..."
    : activeTab === "grammar"
    ? "Paste draft note or text to recheck grammar..."
    : activeTab === "documentation"
    ? "Paste response or draft to polish for documentation rules..."
    : isTyping
    ? "Springer Help is processing..."
    : "Ask workflows, or type 'Recheck grammar: ...'";

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-[#C5E86C] hover:bg-[#b4db53] text-[#183028] border border-[#b4db53] px-4 py-2.5 rounded-full shadow-lg shadow-[#183028]/15 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer group"
          aria-label="Open Compliance Help Assistant"
        >
          <div className="h-2 w-2 rounded-full bg-[#183028] animate-pulse" />
          <Bot className="h-4 w-4 text-[#183028]" />
          <span>{isLoginMode ? "Compliance Help & Login Info" : "Compliance Copilot"}</span>
          {isLoginMode && (
            <span className="bg-[#183028] text-[#C5E86C] text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
              Info
            </span>
          )}
        </button>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[440px] h-[580px] rounded-2xl flex flex-col overflow-hidden text-xs bg-white border border-[#E6E8E7] shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#FAFBFB] text-[#183028] px-4 py-3 flex items-center justify-between border-b border-[#E6E8E7] shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#C5E86C]/35 border border-[#C5E86C] flex items-center justify-center text-[#183028] shadow-2xs">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-[#183028] tracking-tight">
                    {isLoginMode ? "Compliance Help" : "Compliance Copilot"}
                  </h3>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                      isLoginMode
                        ? "bg-[#183028] text-[#C5E86C]"
                        : "bg-[#C5E86C]/50 text-[#183028]"
                    )}
                  >
                    {isLoginMode ? "Informative" : session?.role || "Staff"}
                  </span>
                </div>
                <p className="text-[10px] text-[#183028]/60">
                  {isLoginMode
                    ? "Institutional workflow & login orientation"
                    : "Grammar recheck & documentation rules optimizer"}
                </p>
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

          {/* Institutional Mode Tabs (When Authenticated in Dashboard) */}
          {!isLoginMode && (
            <div className="bg-white border-b border-[#E6E8E7] px-2 py-1.5 flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveTab("knowledge")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
                  activeTab === "knowledge"
                    ? "bg-[#183028] text-white shadow-xs"
                    : "text-[#183028]/70 hover:bg-[#FAFBFB] hover:text-[#183028]"
                )}
              >
                <BookOpen className="h-3 w-3" />
                <span>Knowledge</span>
              </button>

              <button
                onClick={() => setActiveTab("grammar")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
                  activeTab === "grammar"
                    ? "bg-[#183028] text-white shadow-xs"
                    : "text-[#183028]/70 hover:bg-[#FAFBFB] hover:text-[#183028]"
                )}
              >
                <FileCheck2 className="h-3 w-3" />
                <span>Recheck Grammar</span>
              </button>

              <button
                onClick={() => setActiveTab("documentation")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
                  activeTab === "documentation"
                    ? "bg-[#183028] text-white shadow-xs"
                    : "text-[#183028]/70 hover:bg-[#FAFBFB] hover:text-[#183028]"
                )}
              >
                <Wand2 className="h-3 w-3" />
                <span>Doc Rules</span>
              </button>
            </div>
          )}

          {/* Institutional Compliance Disclaimer Banner */}
          <div className="border-b border-[#E6E8E7] bg-[#FAFBFB]/70 px-3.5 py-1.5 text-[#183028]/70 text-[10.5px] flex items-center gap-2 shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-[#183028] shrink-0" />
            <p className="leading-snug truncate">
              {isLoginMode
                ? "Pre-login informational assistance • Institutional Springer Capital Portal"
                : "Official determinations rest solely with authorized compliance personnel."}
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
                    "flex flex-col max-w-[90%] space-y-1",
                    isUser ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center space-x-1.5 px-0.5">
                    {isUser ? (
                      <span className="text-[10px] text-[#183028]/60">You</span>
                    ) : (
                      <span className="text-[10px] text-[#183028] font-bold flex items-center gap-1">
                        <span>Springer Help</span>
                        {isLoginMode && (
                          <span className="text-[9px] font-normal text-[#183028]/60">• Guide</span>
                        )}
                      </span>
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
                    {!isUser && message.text === "" ? (
                      <TypingDots />
                    ) : (
                      <>
                        <div>{message.text}</div>
                        {!isUser && isCurrentlyTyping && (
                          <span className="inline-block w-[2px] h-[12px] bg-[#183028] ml-0.5 align-middle animate-[blink_0.7s_step-end_infinite]" />
                        )}
                      </>
                    )}

                    {/* Rich Grammar Result Card */}
                    {!isUser && message.grammarResult && !isCurrentlyTyping && (
                      <div className="mt-3 pt-2.5 border-t border-[#E6E8E7] space-y-2 text-[#183028]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028] flex items-center gap-1">
                            <FileCheck2 className="h-3 w-3 text-emerald-600" />
                            Corrected Version
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(message.id, message.grammarResult!.correctedText)
                            }
                            className="flex items-center gap-1 text-[10px] font-semibold text-[#183028] hover:text-emerald-700 bg-white border border-[#E6E8E7] px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-2.5 w-2.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Corrected Content Box */}
                        <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs font-medium text-[#183028] select-text">
                          {message.grammarResult.correctedText}
                        </div>

                        {/* Identified Issues Badges */}
                        {message.grammarResult.issues.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[9.5px] font-semibold text-[#183028]/70">
                              Identified Issues:
                            </span>
                            <div className="space-y-1">
                              {message.grammarResult.issues.map((iss, idx) => (
                                <div
                                  key={idx}
                                  className="text-[10px] bg-white border border-[#E6E8E7] rounded px-2 py-1 flex items-start justify-between gap-1.5"
                                >
                                  <div>
                                    <span className="line-through text-rose-500 font-mono">
                                      {iss.original}
                                    </span>
                                    <span className="mx-1 text-[#183028]/40">→</span>
                                    <span className="text-emerald-700 font-bold font-mono">
                                      {iss.replacement}
                                    </span>
                                    <p className="text-[9px] text-[#183028]/60 mt-0.5">
                                      {iss.reason}
                                    </p>
                                  </div>
                                  <span className="text-[8.5px] uppercase font-bold px-1 rounded bg-[#C5E86C]/30 text-[#183028] shrink-0">
                                    {iss.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Direct Button to Elevate to Documentation Rules */}
                        <div className="pt-1">
                          <button
                            onClick={() => {
                              setActiveTab("documentation");
                              handleSend(
                                `Make response better: ${message.grammarResult!.correctedText}`,
                                "documentation"
                              );
                            }}
                            className="w-full flex items-center justify-center gap-1.5 bg-[#C5E86C] hover:bg-[#b4db53] text-[#183028] py-1.5 px-2.5 rounded-lg font-bold text-[10.5px] cursor-pointer transition-colors shadow-2xs"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Enhance for Documentation Rules</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rich Documentation Result Card */}
                    {!isUser && message.documentationResult && !isCurrentlyTyping && (
                      <div className="mt-3 pt-2.5 border-t border-[#E6E8E7] space-y-2 text-[#183028]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028] flex items-center gap-1">
                            <Wand2 className="h-3 w-3 text-emerald-600" />
                            Institutional Determination Record
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(message.id, message.documentationResult!.enhancedText)
                            }
                            className="flex items-center gap-1 text-[10px] font-semibold text-[#183028] hover:text-emerald-700 bg-white border border-[#E6E8E7] px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-2.5 w-2.5" />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Applied Rules Badges */}
                        <div className="flex flex-wrap gap-1">
                          {message.documentationResult.appliedRules.map((rule) => (
                            <span
                              key={rule.id}
                              className="text-[9px] bg-[#183028] text-[#C5E86C] font-semibold px-1.5 py-0.5 rounded"
                              title={rule.description}
                            >
                              ✓ {rule.code}
                            </span>
                          ))}
                        </div>

                        {/* Enhanced Text Box */}
                        <div className="p-2.5 bg-white rounded-lg border border-[#183028]/20 text-[11px] font-mono leading-relaxed text-[#183028] whitespace-pre-wrap select-text shadow-2xs max-h-[160px] overflow-y-auto">
                          {message.documentationResult.enhancedText}
                        </div>

                        {/* Key Improvements List */}
                        <div className="text-[9.5px] text-[#183028]/80 space-y-0.5 pt-0.5">
                          {message.documentationResult.improvements.map((imp, idx) => (
                            <div key={idx} className="flex items-start gap-1">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{imp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Pills */}
          <div className="px-3 py-2 bg-[#FAFBFB]/80 border-t border-[#E6E8E7] flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
            {currentSuggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isTyping}
                className="whitespace-nowrap text-[10px] font-semibold text-[#183028] hover:bg-[#C5E86C]/25 bg-white border border-[#E6E8E7] px-2.5 py-1 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
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
              placeholder={currentPlaceholder}
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
      <span
        className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 animate-[bounce_1s_ease-in-out_infinite]"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 animate-[bounce_1s_ease-in-out_infinite]"
        style={{ animationDelay: "160ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 animate-[bounce_1s_ease-in-out_infinite]"
        style={{ animationDelay: "320ms" }}
      />
    </span>
  );
}
