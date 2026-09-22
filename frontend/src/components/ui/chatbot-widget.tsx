"use client";

/**
 * DOCU: Neural Compliance Copilot & Pre-Login Assistant (Grok API Integration).
 * Provides multi-dimensional document search, real-time analytics aggregation,
 * interactive telemetry cards, and direct lineage/audit trail action chips.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  FileText,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IChatMessage } from "@/types/chatbot.types";
import type { ICopilotSearchResponse, ICopilotRecord } from "@/types/copilot.types";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { copilotApi } from "@/lib/api/copilot";
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
  type IGrammarResult,
  type IDocumentationResult,
} from "@/lib/chatbot/documentation-engine";

/** Typing speed in milliseconds per character */
const TYPING_SPEED_MS = 12;

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

/** Resolves fallback bot knowledge base reply for authenticated dashboard state */
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
  return PLATFORM_KNOWLEDGE_BASE.default;
}

/** Resolves bot reply for grammar commands */
function resolveBotReply(rawText: string, isLoginMode: boolean): IResolvedBotReply {
  const lower = rawText.toLowerCase();

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
      .replace(/\b(?:please\s+)?(?:re-?check|check|fix)\s+grammar\b[:,-]?/gi, "")
      .replace(/\bgrammar\s+(?:check|re-?check)\b[:,-]?/gi, "")
      .replace(/^(?:grammar|check|audit\s*note|fix)[:,-]?\s*/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleanDraft && cleanDraft.length > 2) {
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

  if (isLoginMode) {
    return { text: getLoginBotResponse(rawText) };
  }

  return { text: getDashboardBotKnowledgeResponse(rawText) };
}

/** Helper to extract natural language filtering intent */
function extractSearchFilters(
  rawText: string,
  previousContext: { status?: string | string[]; date_range?: string }
): {
  query?: string;
  status?: string | string[];
  date_range?: string;
  uploaded_by?: string;
} {
  const lower = rawText.toLowerCase();
  let status: string | string[] | undefined = previousContext.status;
  let date_range: string | undefined = previousContext.date_range;
  let uploaded_by: string | undefined;

  // Status Detection
  if (lower.includes("approved")) {
    status = "Approved";
  } else if (lower.includes("needs revision") || lower.includes("revision")) {
    status = "Needs Revision";
  } else if (lower.includes("pending")) {
    status = "Pending";
  } else if (lower.includes("rejected")) {
    status = "Rejected";
  }

  // Date Range Detection
  if (lower.includes("today")) date_range = "today";
  else if (lower.includes("yesterday")) date_range = "yesterday";
  else if (lower.includes("past 7 days") || lower.includes("last 7 days") || lower.includes("this week")) date_range = "past 7 days";
  else if (lower.includes("this month")) date_range = "this month";
  else if (lower.includes("last month") || lower.includes("past month")) date_range = "last month";
  else if (lower.includes("past 30 days") || lower.includes("last 30 days")) date_range = "past 30 days";
  else if (lower.includes("past 90 days") || lower.includes("last 90 days")) date_range = "past 90 days";
  else if (lower.includes("2026")) date_range = "2026";
  else if (lower.includes("2025")) date_range = "2025";

  // Uploader Scope
  if (lower.includes("my files") || lower.includes("my uploads") || lower.includes("my submissions") || lower.includes("mine")) {
    uploaded_by = "my uploads";
  }

  // Clean Query String
  let cleaned = rawText
    .replace(/\b(?:show|find|search|list|get|filter|display)\b/gi, "")
    .replace(/\b(?:my files|my uploads|my submissions)\b/gi, "")
    .replace(/\b(?:today|yesterday|this month|last month|past 7 days|past 30 days|past 90 days|2026|2025)\b/gi, "")
    .replace(/\b(?:approved|pending|needs revision|rejected)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    query: cleaned.length > 2 ? cleaned : undefined,
    status,
    date_range,
    uploaded_by,
  };
}

export function ChatbotWidget() {
  const pathname = usePathname();
  const router = useRouter();

  // Reactive subscription to authStore
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const isAuthenticated = Boolean(session?.token);
  const isAuthPage = Boolean(pathname && (pathname.startsWith("/login") || pathname.startsWith("/signup")));
  const isLoginMode = !isAuthenticated || isAuthPage;

  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Conversational filter state memory
  const [activeFilterContext, setActiveFilterContext] = useState<{
    status?: string | string[];
    date_range?: string;
  }>({});

  // Close chatbot on route redirection or page navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const [messages, setMessages] = useState<IChatMessage[]>(
    isLoginMode ? LOGIN_INITIAL_MESSAGES : DASHBOARD_INITIAL_MESSAGES
  );

  const [prevIsLoginMode, setPrevIsLoginMode] = useState(isLoginMode);
  if (prevIsLoginMode !== isLoginMode) {
    setPrevIsLoginMode(isLoginMode);
    setMessages(isLoginMode ? LOGIN_INITIAL_MESSAGES : DASHBOARD_INITIAL_MESSAGES);
    setIsOpen(false);
  }

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(100);
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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  /** Simulates character-by-character typing animation */
  const simulateTyping = useCallback(
    (
      botMsgId: string,
      fullText: string,
      timestamp: string,
      extras?: {
        grammarResult?: IGrammarResult;
        documentationResult?: IDocumentationResult;
        copilotData?: ICopilotSearchResponse;
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
          copilotData: extras?.copilotData,
        },
      ]);

      typingIntervalRef.current = setInterval(() => {
        charIndex += 3;
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

  const handleSend = async (overrideText?: string) => {
    const rawText = overrideText || inputValue.trim();
    if (!rawText || isTyping) return;

    const userMsgId = `user-${++messageIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: rawText, timestamp },
    ]);

    if (!overrideText) setInputValue("");

    const botMsgId = `bot-${++messageIdRef.current}`;
    const lower = rawText.toLowerCase();

    // 1. Instant local grammar check
    const isGrammar =
      lower.startsWith("check grammar:") ||
      lower.startsWith("grammar:") ||
      lower.startsWith("check:") ||
      lower.startsWith("audit note:") ||
      lower.startsWith("fix:") ||
      lower.includes("check grammar") ||
      lower.includes("grammar check") ||
      lower.includes("proofread") ||
      lower.includes("audit draft note");

    if (isGrammar) {
      setTimeout(() => {
        const reply = resolveBotReply(rawText, isLoginMode);
        simulateTyping(botMsgId, reply.text, timestamp, {
          grammarResult: reply.grammarResult,
          documentationResult: reply.documentationResult,
        });
      }, 150);
      return;
    }

    // 2. Pre-login FAQ mode
    if (isLoginMode) {
      setTimeout(() => {
        const reply = resolveBotReply(rawText, isLoginMode);
        simulateTyping(botMsgId, reply.text, timestamp);
      }, 150);
      return;
    }

    // 3. Neural Compliance Copilot (Grok Search Engine)
    setIsTyping(true);
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, sender: "bot", text: "", timestamp, isTyping: true },
    ]);

    // Extract filters with conversational memory
    const parsed = extractSearchFilters(rawText, activeFilterContext);
    setActiveFilterContext({ status: parsed.status, date_range: parsed.date_range });

    // Build conversation history payload
    const recentHistory = messages
      .slice(-4)
      .map((m) => ({ role: m.sender === "user" ? ("user" as const) : ("assistant" as const), content: m.text }));

    try {
      const response = await copilotApi.search({
        query: parsed.query,
        status: parsed.status,
        date_range: parsed.date_range,
        uploaded_by: parsed.uploaded_by,
        include_all_versions: lower.includes("lineage") || lower.includes("all version") || lower.includes("versions"),
        conversation_history: recentHistory,
      });

      const replyText = response.conversational_response.text;
      simulateTyping(botMsgId, replyText, timestamp, { copilotData: response });
    } catch {
      // Fallback gracefully
      const fallbackReply = resolveBotReply(rawText, isLoginMode);
      simulateTyping(botMsgId, fallbackReply.text, timestamp);
    }
  };

  const handleResetConversation = () => {
    setActiveFilterContext({});
    setMessages(isLoginMode ? LOGIN_INITIAL_MESSAGES : DASHBOARD_INITIAL_MESSAGES);
  };

  const currentSuggestedQuestions = isLoginMode ? LOGIN_SUGGESTED_QUESTIONS : DASHBOARD_SUGGESTED_QUESTIONS;
  const currentPlaceholder = isLoginMode
    ? "Ask about guidelines, classifications, formats..."
    : isTyping
    ? "Neural Copilot is analyzing..."
    : "Ask anything, search files, or verify compliance...";

  // Do not render the chatbot on login or sign up pages
  if (isAuthPage) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-[#183028] hover:bg-[#203d33] text-[#C5E86C] border border-[#C5E86C]/40 px-4 py-3 rounded-full shadow-xl shadow-[#183028]/25 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer group backdrop-blur-md"
          aria-label="Open Neural Compliance Copilot"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5E86C] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C5E86C]" />
          </span>
          <Bot className="h-4 w-4 text-[#C5E86C]" />
          <span className="tracking-wide">Neural Copilot</span>
        </button>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div className="w-[380px] sm:w-[480px] h-[640px] rounded-3xl flex flex-col overflow-hidden text-xs bg-white border border-[#E6E8E7] shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
          <ChatHeader
            isLoginMode={isLoginMode}
            role={session?.role}
            onClose={() => setIsOpen(false)}
            onReset={handleResetConversation}
          />

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-[#FAFBF9] to-white [scrollbar-width:thin] [scrollbar-color:#E2E8F0_transparent]">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                copiedId={copiedId}
                onCopy={handleCopy}
                onSendFollowUp={handleSend}
                onNavigate={(url) => router.push(url)}
                onElevateToDocumentation={(txt) => handleSend(`Enhance documentation: ${txt}`)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Pills */}
          <div className="px-3.5 py-2.5 bg-white border-t border-[#E6E8E7] flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
            {currentSuggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={isTyping}
                className="whitespace-nowrap text-[10.5px] font-semibold text-[#183028] hover:bg-[#C5E86C]/30 bg-[#FAFBF9] border border-[#E6E8E7] px-3 py-1 rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs hover:scale-[1.02]"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3.5 bg-white border-t border-[#E6E8E7] flex items-center space-x-2 shrink-0">
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
              className="bg-[#FAFBF9] border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 h-9 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#183028] disabled:opacity-60"
            />
            <Button
              size="icon"
              disabled={!inputValue.trim() || isTyping}
              onClick={() => handleSend()}
              className="h-9 w-9 bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white rounded-xl disabled:opacity-40 shrink-0 cursor-pointer shadow-2xs transition-all"
            >
              <Send className="h-4 w-4" />
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
  onReset: () => void;
}

function ChatHeader({ isLoginMode, role, onClose, onReset }: IChatHeaderProps) {
  return (
    <div className="bg-[#183028] text-white px-4 py-3.5 flex items-center justify-between border-b border-[#C5E86C]/20 shrink-0 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-xl bg-[#C5E86C]/20 border border-[#C5E86C]/40 flex items-center justify-center text-[#C5E86C] shadow-2xs">
          <Bot className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm tracking-tight">
              {isLoginMode ? "Springer Help" : "Neural Compliance Copilot"}
            </h3>
            {!isLoginMode && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[#C5E86C] text-[#183028]">
                {role || "Staff"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5E86C] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C5E86C]" />
            </span>
            <p className="text-[10px] text-[#C5E86C]/90 font-mono font-medium">
              {isLoginMode ? "Institutional Guide" : "Grok Neural Engine: Active"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Reset Conversation"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close help window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Individual Chat Message Bubble */
interface IChatMessageItemProps {
  message: IChatMessage;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onSendFollowUp: (text: string) => void;
  onNavigate: (url: string) => void;
  onElevateToDocumentation?: (text: string) => void;
}

function ChatMessageItem({
  message,
  copiedId,
  onCopy,
  onSendFollowUp,
  onNavigate,
  onElevateToDocumentation,
}: IChatMessageItemProps) {
  const isUser = message.sender === "user";
  const isCurrentlyTyping = message.isTyping;

  return (
    <div
      className={cn(
        "flex flex-col max-w-[94%] space-y-1.5",
        isUser ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div className="flex items-center space-x-1.5 px-0.5">
        <span className={cn("text-[10px]", isUser ? "text-[#183028]/60" : "text-[#183028] font-bold")}>
          {isUser ? "You" : "Springer Neural Copilot"}
        </span>
        <span className="text-[9px] text-[#183028]/40">{message.timestamp}</span>
      </div>

      <div
        className={cn(
          "p-3.5 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap min-h-[32px] transition-all",
          isUser
            ? "bg-[#183028] text-white font-medium rounded-br-xs shadow-2xs"
            : "bg-white text-[#183028] border border-[#E6E8E7] rounded-bl-xs shadow-xs"
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

        {/* Live Copilot Telemetry Card */}
        {!isUser && message.copilotData && !isCurrentlyTyping && (
          <CopilotTelemetryCard
            data={message.copilotData}
            onNavigate={onNavigate}
            onSendFollowUp={onSendFollowUp}
          />
        )}

        {/* Grammar Card */}
        {!isUser && message.grammarResult && !isCurrentlyTyping && (
          <GrammarResultCard
            result={message.grammarResult}
            isCopied={copiedId === message.id}
            onCopy={() => onCopy(message.id, message.grammarResult!.correctedText)}
            onElevate={() => onElevateToDocumentation?.(message.grammarResult!.correctedText)}
          />
        )}

        {/* Documentation Card */}
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

/** Interactive Live Data & Telemetry Card inside Chat */
interface ICopilotTelemetryCardProps {
  data: ICopilotSearchResponse;
  onNavigate: (url: string) => void;
  onSendFollowUp: (text: string) => void;
}

function CopilotTelemetryCard({ data, onNavigate, onSendFollowUp }: ICopilotTelemetryCardProps) {
  const { analytics, records, conversational_response } = data;
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedDocId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mt-3.5 pt-3 border-t border-[#E6E8E7] space-y-3">
      {/* 1. High-Density Telemetry Chips */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#FAFBF9] p-2 rounded-xl border border-[#E6E8E7]">
        <span className="text-[10px] font-bold text-[#183028]/60 uppercase px-1.5">Metrics:</span>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#183028] text-white">
          Total: {analytics.total_records}
        </span>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
          ✓ {analytics.by_status.Approved} Approved
        </span>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300">
          ⚠ {analytics.by_status["Needs Revision"]} Needs Rev
        </span>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-800 border border-sky-300">
          ⏳ {analytics.by_status.Pending} Pending
        </span>
        {analytics.by_status.Rejected > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-300">
            ✕ {analytics.by_status.Rejected} Rejected
          </span>
        )}
      </div>

      {/* 2. Document Result Cards */}
      {records.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-[#183028]/70 px-0.5">
            <span>Live Document Filings ({records.length})</span>
            {analytics.latest_versions_only && (
              <span className="text-[9.5px] font-mono text-[#183028]/50">Showing Latest Versions</span>
            )}
          </div>

          {records.slice(0, 4).map((rec: ICopilotRecord) => {
            const isExpanded = expandedDocId === rec.id;
            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-[#E6E8E7] p-3 space-y-2.5 shadow-2xs hover:border-[#183028]/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-xs text-[#183028] leading-tight truncate">
                      {rec.title}
                    </p>
                    <p className="text-[10px] text-[#183028]/60">
                      Advisor: <span className="font-semibold text-[#183028]">{rec.advisor_name}</span> • {new Date(rec.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[9.5px] font-bold rounded-full border",
                        rec.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : rec.status === "Needs Revision"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : rec.status === "Pending"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      )}
                    >
                      {rec.status}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-[#FAFBF9] border border-[#E6E8E7] text-[#183028] rounded">
                      v{rec.version}
                    </span>
                  </div>
                </div>

                {/* Compliance Flag Alert */}
                {rec.flags_count > 0 && (
                  <div className="bg-amber-50/70 rounded-lg p-2 border border-amber-200 text-[#183028] space-y-1">
                    <button
                      onClick={() => toggleExpand(rec.id)}
                      className="w-full flex items-center justify-between text-[10px] font-bold text-amber-900 cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-700" />
                        {rec.flags_count} Compliance Flag{rec.flags_count === 1 ? "" : "s"} Detected
                      </span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {isExpanded && (
                      <div className="pt-1 space-y-1.5 text-[10px]">
                        {rec.flags.map((f, i) => (
                          <div key={i} className="bg-white p-2 rounded border border-amber-200 space-y-0.5">
                            <span className="font-bold text-[#183028] block">{f.rule}</span>
                            <p className="italic text-rose-700 bg-rose-50 p-1 rounded font-serif">
                              &ldquo;{f.passage}&rdquo;
                            </p>
                            <p className="text-[9.5px] text-[#183028]/70">{f.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick-Action Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    onClick={() => onNavigate(`/documents/${rec.id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#183028] bg-[#FAFBF9] hover:bg-[#C5E86C]/30 border border-[#E6E8E7] rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Open Document</span>
                  </button>

                  {rec.total_versions > 1 && (
                    <button
                      onClick={() => onNavigate(`/documents/${rec.latest_doc_id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#183028] bg-[#FAFBF9] hover:bg-[#C5E86C]/30 border border-[#E6E8E7] rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      <Zap className="h-3 w-3 text-[#183028]" />
                      <span>Lineage (v1-v{rec.total_versions})</span>
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate(`/documents/${rec.id}/audit-trail`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#183028] bg-[#FAFBF9] hover:bg-[#C5E86C]/30 border border-[#E6E8E7] rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <ShieldCheck className="h-3 w-3 text-emerald-700" />
                    <span>Audit Trail</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Follow-Up Suggestion Bubbles */}
      {conversational_response.suggested_followups && conversational_response.suggested_followups.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/60 block px-0.5">
            Suggested Next Queries:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {conversational_response.suggested_followups.map((followUp) => (
              <button
                key={followUp}
                onClick={() => onSendFollowUp(followUp)}
                className="px-2.5 py-1 text-[10.5px] font-bold text-[#183028] bg-[#C5E86C]/25 hover:bg-[#C5E86C] border border-[#183028]/20 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
              >
                ⚡ {followUp}
              </button>
            ))}
          </div>
        </div>
      )}
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

/** Animated three-dot typing indicator */
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
