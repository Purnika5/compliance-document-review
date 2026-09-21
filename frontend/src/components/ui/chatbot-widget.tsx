"use client";

/**
 * DOCU: Renders the interactive compliance copilot and pre-login assistant.
 * Supports Pre-Login guidance, Grammar Recheck, and Institutional Documentation Rule optimization.
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
  Check,
  Copy,
  Sparkles,
  FileCheck2,
  Wand2,
  ArrowRight,
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
  type IGrammarResult,
  type IDocumentationResult,
} from "@/lib/chatbot/documentation-engine";

/** Typing speed in milliseconds per character */
const TYPING_SPEED_MS = 14;

interface IResolvedBotReply {
  text: string;
  grammarResult?: IGrammarResult;
  documentationResult?: IDocumentationResult;
}

/** Resolves bot reply for informative pre-login state */
function getLoginBotResponse(rawText: string): string {
  const lower = rawText.toLowerCase();

  if (["regulation", "rule", "finra", "sec", "standard", "2210", "206"].some((k) => lower.includes(k))) {
    return LOGIN_KNOWLEDGE_BASE.regulations;
  }
  if (["privacy", "pii", "mask", "security", "protect", "redact"].some((k) => lower.includes(k))) {
    return LOGIN_KNOWLEDGE_BASE.privacy;
  }
  if (["format", "pdf", "docx", "xlsx", "txt", "size", "limit", "category", "supported"].some((k) => lower.includes(k))) {
    return LOGIN_KNOWLEDGE_BASE.formats;
  }
  if (["access", "account", "permission", "register", "role", "login", "admin"].some((k) => lower.includes(k))) {
    return LOGIN_KNOWLEDGE_BASE.access;
  }
  if (["portal", "what is", "springer", "about", "overview"].some((k) => lower.includes(k))) {
    return LOGIN_KNOWLEDGE_BASE.overview;
  }
  if (["review", "workflow", "how does", "officer", "process"].some((k) => lower.includes(k))) {
    return LOGIN_KNOWLEDGE_BASE.workflow;
  }
  return LOGIN_KNOWLEDGE_BASE.default;
}

/** Resolves bot knowledge base reply for authenticated dashboard state */
function getDashboardBotKnowledgeResponse(rawText: string): string {
  const lower = rawText.toLowerCase();

  if (["version", "revision", "resubmit", "v1", "v2", "lineage"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.versions;
  }
  if (["finra", "sec", "rule", "2210", "206", "regulation", "standard", "204", "2111"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.rules;
  }
  if (["pii", "mask", "unmask", "redact", "ssn", "privacy", "leak"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.pii;
  }
  if (["audit", "trail", "history", "log", "attestation"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.audit;
  }
  if (["circuit", "breaker", "degrade", "resilience", "fallback", "outage"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.circuit_breaker;
  }
  if (["setting", "profile", "password", "preferences", "signature", "contact"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.settings;
  }
  if (["upload", "submit", "proposal", "filing"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.upload;
  }
  if (["review", "approve", "reject", "queue", "decision", "officer"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.review;
  }
  if (["category", "classification", "type", "brief", "statement"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.categories;
  }
  if (["format", "size", "limit", "pdf", "docx", "xlsx", "txt"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.formats;
  }
  if (["role", "permission", "advisor", "access", "guard"].some((k) => lower.includes(k))) {
    return PLATFORM_KNOWLEDGE_BASE.permissions;
  }
  return PLATFORM_KNOWLEDGE_BASE.default;
}

/** Resolves full bot response and attached results based on input and mode */
function resolveBotReply(
  rawText: string,
  isLoginMode: boolean
): IResolvedBotReply {
  const lower = rawText.toLowerCase();

  // 1. Documentation Enhancement intent
  const isEnhanceExplicit =
    lower.startsWith("enhance:") ||
    lower.startsWith("enhance documentation:") ||
    lower.startsWith("enhance note:") ||
    lower.includes("enhance for documentation") ||
    lower.includes("format as memo");

  if (isEnhanceExplicit) {
    const cleanDraft = rawText
      .replace(/^(enhance\s*(documentation|note)?:\s*)/i, "")
      .trim();
    const docResult = enhanceForDocumentation(cleanDraft || rawText);
    return {
      text: "I have audited and enhanced your draft according to institutional documentation rules (FINRA 2210 & SEC 206).",
      documentationResult: docResult,
    };
  }

  // 2. Grammar Recheck intent
  const isGrammarExplicit =
    lower.startsWith("check grammar:") ||
    lower.startsWith("grammar:") ||
    lower.startsWith("check:") ||
    lower.startsWith("audit note:") ||
    lower.startsWith("fix:") ||
    lower.includes("check grammar") ||
    lower.includes("grammar check") ||
    lower.includes("proofread") ||
    lower.includes("audit draft note");

  if (isGrammarExplicit) {
    const cleanDraft = rawText
      .replace(/^(check\s*grammar:\s*|grammar:\s*|check:\s*|audit\s*note:\s*|fix:\s*)/i, "")
      .trim();
    if (cleanDraft && cleanDraft.length > 5) {
      const grammarResult = recheckGrammar(cleanDraft);
      return {
        text: grammarResult.summary,
        grammarResult,
      };
    }
    return {
      text: PLATFORM_KNOWLEDGE_BASE.grammar,
    };
  }

  // 3. Fallback to knowledge base
  if (isLoginMode) {
    return { text: getLoginBotResponse(rawText) };
  }

  return { text: getDashboardBotKnowledgeResponse(rawText) };
}

/** Determines active suggested questions without nested ternaries */
function getSuggestedQuestions(isLoginMode: boolean): string[] {
  if (isLoginMode) {
    return LOGIN_SUGGESTED_QUESTIONS;
  }
  return DASHBOARD_SUGGESTED_QUESTIONS;
}

/** Determines active input placeholder text without nested ternaries */
function getPlaceholderText(isLoginMode: boolean, isTyping: boolean): string {
  if (isLoginMode) {
    return "Ask about guidelines, classifications, formats...";
  }
  if (isTyping) {
    return "Springer Help is processing...";
  }
  return "Ask about workflows, guidelines, or classifications...";
}

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

  // Chatbot is closed by default on initial open and page navigation
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Automatically close chatbot on route redirection or page navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Messages state
  const [messages, setMessages] = useState<IChatMessage[]>(
    isLoginMode ? LOGIN_INITIAL_MESSAGES : DASHBOARD_INITIAL_MESSAGES
  );

  // Adjust state during render if transition between login and dashboard occurs
  const [prevIsLoginMode, setPrevIsLoginMode] = useState(isLoginMode);
  if (prevIsLoginMode !== isLoginMode) {
    setPrevIsLoginMode(isLoginMode);
    setMessages(isLoginMode ? LOGIN_INITIAL_MESSAGES : DASHBOARD_INITIAL_MESSAGES);
    setIsOpen(false);
  }

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

  const handleSend = (overrideText?: string) => {
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

    setTimeout(() => {
      const reply = resolveBotReply(rawText, isLoginMode);
      simulateTyping(botMsgId, reply.text, timestamp, {
        grammarResult: reply.grammarResult,
        documentationResult: reply.documentationResult,
      });
    }, 300);
  };

  const currentSuggestedQuestions = getSuggestedQuestions(isLoginMode);
  const currentPlaceholder = getPlaceholderText(isLoginMode, isTyping);

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
          <span>{isLoginMode ? "Compliance Help" : "Compliance Copilot"}</span>
        </button>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[440px] h-[580px] rounded-2xl flex flex-col overflow-hidden text-xs bg-white border border-[#E6E8E7] shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
          <ChatHeader
            isLoginMode={isLoginMode}
            role={session?.role}
            onClose={() => setIsOpen(false)}
          />

          {/* Chat Messages Log */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-white">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                copiedId={copiedId}
                onCopy={handleCopy}
                onElevateToDocumentation={(txt) => handleSend(`Enhance documentation: ${txt}`)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Pills */}
          <div className="px-3 py-2 bg-[#FAFBFB]/80 border-t border-[#E6E8E7] flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
            {currentSuggestedQuestions.map((q) => (
              <button
                key={q}
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

/** Header for the chatbot window */
interface IChatHeaderProps {
  isLoginMode: boolean;
  role?: string;
  onClose: () => void;
}

function ChatHeader({ isLoginMode, role, onClose }: IChatHeaderProps) {
  return (
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
            {!isLoginMode && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[#C5E86C]/50 text-[#183028]">
                {role || "Staff"}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#183028]/60">
            {isLoginMode
              ? "Institutional workflow guide"
              : "Grammar recheck & documentation rules optimizer"}
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1.5 rounded-lg text-[#183028]/60 hover:text-[#183028] hover:bg-[#C5E86C]/20 transition-colors cursor-pointer"
        aria-label="Close help window"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Individual Chat Message Bubble */
interface IChatMessageItemProps {
  message: IChatMessage;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onElevateToDocumentation?: (text: string) => void;
}

function ChatMessageItem({
  message,
  copiedId,
  onCopy,
  onElevateToDocumentation,
}: IChatMessageItemProps) {
  const isUser = message.sender === "user";
  const isCurrentlyTyping = message.isTyping;

  return (
    <div
      className={cn(
        "flex flex-col max-w-[90%] space-y-1",
        isUser ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div className="flex items-center space-x-1.5 px-0.5">
        <span className={cn("text-[10px]", isUser ? "text-[#183028]/60" : "text-[#183028] font-bold")}>
          {isUser ? "You" : "Springer Help"}
        </span>
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

        {!isUser && message.grammarResult && !isCurrentlyTyping && (
          <GrammarResultCard
            result={message.grammarResult}
            isCopied={copiedId === message.id}
            onCopy={() => onCopy(message.id, message.grammarResult!.correctedText)}
            onElevate={() => onElevateToDocumentation?.(message.grammarResult!.correctedText)}
          />
        )}

        {!isUser && message.documentationResult && !isCurrentlyTyping && (
          <DocumentationResultCard
            result={message.documentationResult}
            isCopied={copiedId === message.id}
            onCopy={() => onCopy(message.id, message.documentationResult!.enhancedText)}
          />
        )}
      </div>
    </div>
  );
}

/** Card rendering grammar audit results */
interface IGrammarCardProps {
  result: IGrammarResult;
  isCopied: boolean;
  onCopy: () => void;
  onElevate: () => void;
}

function GrammarResultCard({ result, isCopied, onCopy, onElevate }: IGrammarCardProps) {
  return (
    <div className="mt-3 pt-2.5 border-t border-[#E6E8E7] space-y-2 text-[#183028]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028] flex items-center gap-1">
          <FileCheck2 className="h-3 w-3 text-emerald-600" />
          Corrected Version
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#183028] hover:text-emerald-700 bg-white border border-[#E6E8E7] px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
        >
          {isCopied ? (
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

      <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs font-medium text-[#183028] select-text">
        {result.correctedText}
      </div>

      {result.issues.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-[9.5px] font-semibold text-[#183028]/70">
            Identified Issues:
          </span>
          <div className="space-y-1">
            {result.issues.map((iss) => (
              <div
                key={`${iss.type}-${iss.original}-${iss.replacement}`}
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

      <div className="pt-1">
        <button
          onClick={onElevate}
          className="w-full flex items-center justify-center gap-1.5 bg-[#C5E86C] hover:bg-[#b4db53] text-[#183028] py-1.5 px-2.5 rounded-lg font-bold text-[10.5px] cursor-pointer transition-colors shadow-2xs"
        >
          <Sparkles className="h-3 w-3" />
          <span>Enhance for Documentation Rules</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** Card rendering documentation rules enhancement results */
interface IDocCardProps {
  result: IDocumentationResult;
  isCopied: boolean;
  onCopy: () => void;
}

function DocumentationResultCard({ result, isCopied, onCopy }: IDocCardProps) {
  return (
    <div className="mt-3 pt-2.5 border-t border-[#E6E8E7] space-y-2 text-[#183028]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028] flex items-center gap-1">
          <Wand2 className="h-3 w-3 text-emerald-600" />
          Institutional Determination Record
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#183028] hover:text-emerald-700 bg-white border border-[#E6E8E7] px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
        >
          {isCopied ? (
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

      <div className="flex flex-wrap gap-1">
        {result.appliedRules.map((rule) => (
          <span
            key={rule.id}
            className="text-[9px] bg-[#183028] text-[#C5E86C] font-semibold px-1.5 py-0.5 rounded"
            title={rule.description}
          >
            ✓ {rule.code}
          </span>
        ))}
      </div>

      <div className="p-2.5 bg-white rounded-lg border border-[#183028]/20 text-[11px] font-mono leading-relaxed text-[#183028] whitespace-pre-wrap select-text shadow-2xs max-h-[160px] overflow-y-auto">
        {result.enhancedText}
      </div>

      <div className="text-[9.5px] text-[#183028]/80 space-y-0.5 pt-0.5">
        {result.improvements.map((imp) => (
          <div key={imp} className="flex items-start gap-1">
            <span className="text-emerald-600 font-bold">•</span>
            <span>{imp}</span>
          </div>
        ))}
      </div>
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
