"use client";

/**
 * DOCU: Renders the Neural Compliance Copilot with Google Gemini engine.
 * Features filterable document search, telemetry analytics, in-chat draft audit, and automated remediation.
 * Last Updated Date: September 23, 2026
 * @returns The compliance copilot widget view.
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
  Paperclip,
  UploadCloud,
  FileText,
  Download,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  History,
  AlertTriangle,
  Loader2,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IChatMessage } from "@/types/chatbot.types";
import type { ISearchResponse, IAuditAndFixResponse, IAuditBreakdownItem, ISearchDocument } from "@/types/copilot.types";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { getBaseBackendUrl } from "@/lib/api/client";
import { copilotApi } from "@/lib/api/copilot";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast";
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
function resolveBotReply(rawText: string, isLoginMode: boolean): IResolvedBotReply {
  const lower = rawText.toLowerCase();

  // 1. Documentation Enhancement intent
  const isEnhanceExplicit =
    lower.startsWith("enhance:") ||
    lower.startsWith("enhance documentation:") ||
    lower.startsWith("enhance note:") ||
    lower.includes("enhance for documentation") ||
    lower.includes("format as memo");

  if (isEnhanceExplicit) {
    const cleanDraft = rawText.replace(/^(enhance\s*(documentation|note)?:\s*)/i, "").trim();
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
  return [
    "Show my submissions from this month",
    "Show filings that need revision",
    "Show approved documents",
    "Audit & fix draft document (attach file)",
    ...DASHBOARD_SUGGESTED_QUESTIONS.slice(0, 3),
  ];
}

/** Determines active input placeholder text */
function getPlaceholderText(isLoginMode: boolean, isTyping: boolean, isUploading: boolean): string {
  if (isUploading) {
    return "Auditing draft with Google Gemini...";
  }
  if (isLoginMode) {
    return "Ask about guidelines, classifications, formats...";
  }
  if (isTyping) {
    return "Springer Neural Copilot is reasoning...";
  }
  return "Ask copilot, search filings, or attach file to audit...";
}

/** Detects if query looks like a document search request */
function isDocumentSearchQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const searchKeywords = [
    "show",
    "list",
    "find",
    "search",
    "files",
    "filings",
    "submissions",
    "documents",
    "proposals",
    "approved",
    "pending",
    "needs revision",
    "rejected",
    "my uploads",
    "my files",
    "this month",
    "last month",
    "today",
    "yesterday",
    "past 7 days",
    "past 30 days",
    "past 90 days",
    "high-risk",
    "flags",
  ];
  return searchKeywords.some((k) => lower.includes(k));
}

/** Extracts search parameters from natural language user query */
function parseNaturalSearch(text: string): {
  query?: string;
  status?: string[];
  date_range?: string;
  uploaded_by?: string;
} {
  const lower = text.toLowerCase();
  const params: { query?: string; status?: string[]; date_range?: string; uploaded_by?: string } = {};

  // Date range detection
  if (lower.includes("past 7 days") || lower.includes("last 7 days")) params.date_range = "past 7 days";
  else if (lower.includes("past 30 days") || lower.includes("last 30 days")) params.date_range = "past 30 days";
  else if (lower.includes("past 90 days") || lower.includes("last 90 days")) params.date_range = "past 90 days";
  else if (lower.includes("this month")) params.date_range = "this month";
  else if (lower.includes("last month")) params.date_range = "last month";
  else if (lower.includes("today")) params.date_range = "today";
  else if (lower.includes("yesterday")) params.date_range = "yesterday";
  else if (lower.includes("2026")) params.date_range = "2026";
  else if (lower.includes("2025")) params.date_range = "2025";

  // Status detection
  const statuses: string[] = [];
  if (lower.includes("needs revision") || lower.includes("revision needed")) statuses.push("Needs Revision");
  if (lower.includes("approved")) statuses.push("Approved");
  if (lower.includes("pending")) statuses.push("Pending");
  if (lower.includes("rejected")) statuses.push("Rejected");
  if (statuses.length > 0) params.status = statuses;

  // Ownership
  if (lower.includes("my uploads") || lower.includes("my files") || lower.includes("my submissions")) {
    params.uploaded_by = "my uploads";
  }

  // Keywords (extract title search after "find", "search", or "named")
  const titleMatch = lower.match(/(?:find|search|named|title|called)\s+["']?([^"'\n]+?)["']?(?:$|\s+(?:from|in|with|that))/i);
  if (titleMatch && titleMatch[1] && titleMatch[1].length > 2) {
    params.query = titleMatch[1].trim();
  }

  return params;
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

  // Chatbot open state
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  /** Handles file upload and triggers in-chat Gemini audit & remediation */
  const handleFileUpload = async (file: File) => {
    if (!file || isUploading) return;

    if (file.size > 25 * 1024 * 1024) {
      showErrorToast("File exceeds maximum allowed limit of 25MB.");
      return;
    }

    const userMsgId = `user-${++messageIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add user upload message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: `📎 Uploaded draft file: ${file.name} (${Math.round(file.size / 1024)} KB) for institutional compliance audit & auto-remediation.`,
        timestamp,
      },
    ]);

    setIsUploading(true);
    setUploadStatusText("Extracting document text & sanitizing PII...");

    const botMsgId = `bot-${++messageIdRef.current}`;

    try {
      setTimeout(() => {
        setUploadStatusText("Auditing passages with Google Gemini against FINRA 2210 & SEC 206...");
      }, 900);

      const auditResponse = await copilotApi.auditAndRemediate(file);

      setIsUploading(false);
      setUploadStatusText("");

      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: auditResponse.conversational_summary,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          auditResult: auditResponse,
          suggestedChips: [
            "Submit remediated version",
            "Show high-risk flags",
            "Show my submissions from this month",
          ],
        },
      ]);
    } catch (err: any) {
      setIsUploading(false);
      setUploadStatusText("");
      console.error("[Copilot File Audit Error]", err);
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: `Compliance audit encountered an issue: ${err.message || "Failed to process file"}. Please try again or paste text directly.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  /** Handles drag-and-drop file ingestion into chat */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isAuthenticated) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
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
        searchResult?: ISearchResponse;
        suggestedChips?: string[];
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
          searchResult: extras?.searchResult,
          suggestedChips: extras?.suggestedChips,
        },
      ]);

      typingIntervalRef.current = setInterval(() => {
        charIndex += 2;
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
    if (!rawText || isTyping || isUploading) return;

    const userMsgId = `user-${++messageIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: rawText, timestamp },
    ]);

    if (!overrideText) setInputValue("");

    const botMsgId = `bot-${++messageIdRef.current}`;
    const lower = rawText.toLowerCase();

    // 1. Grammar / enhance check (run locally)
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

    const isEnhance =
      lower.startsWith("enhance:") ||
      lower.startsWith("enhance documentation:") ||
      lower.startsWith("enhance note:") ||
      lower.includes("enhance for documentation") ||
      lower.includes("format as memo");

    if (isGrammar || isEnhance) {
      setTimeout(() => {
        const reply = resolveBotReply(rawText, isLoginMode);
        simulateTyping(botMsgId, reply.text, timestamp, {
          grammarResult: reply.grammarResult,
          documentationResult: reply.documentationResult,
        });
      }, 200);
      return;
    }

    // 2. Repository Search Intent Routing
    if (isAuthenticated && isDocumentSearchQuery(rawText)) {
      setIsTyping(true);
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, sender: "bot", text: "", timestamp, isTyping: true },
      ]);

      try {
        const searchParams = parseNaturalSearch(rawText);
        const searchResult = await copilotApi.searchDocuments({
          ...searchParams,
          conversation_history: messages.slice(-4).map((m) => ({ role: m.sender, content: m.text })),
        });

        setIsTyping(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: searchResult.conversational_reply,
                  isTyping: false,
                  searchResult,
                  suggestedChips: searchResult.suggested_chips,
                }
              : msg
          )
        );
        return;
      } catch (searchErr) {
        console.warn("[Copilot Search Engine Error] Falling back to standard chat proxy:", searchErr);
      }
    }

    // 3. Conversational AI fallback to Gemini API
    setIsTyping(true);
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, sender: "bot", text: "", timestamp, isTyping: true },
    ]);

    const userRole = session?.role || "Advisor";
    const apiUrl = `${getBaseBackendUrl()}/api/chat`;

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: rawText, role: userRole }),
      signal: AbortSignal.timeout(14000),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { reply: string };
        return data.reply;
      })
      .catch(() => {
        return resolveBotReply(rawText, isLoginMode).text;
      })
      .then((replyText) => {
        let charIndex = 0;
        typingIntervalRef.current = setInterval(() => {
          charIndex += 2;
          const currentText = replyText.slice(0, charIndex);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, text: currentText, isTyping: charIndex < replyText.length }
                : msg
            )
          );
          if (charIndex >= replyText.length) {
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
              typingIntervalRef.current = null;
            }
            setIsTyping(false);
          }
        }, TYPING_SPEED_MS);
      });
  };

  const currentSuggestedQuestions = getSuggestedQuestions(isLoginMode);
  const currentPlaceholder = getPlaceholderText(isLoginMode, isTyping, isUploading);

  if (isAuthPage) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-[#183028] hover:bg-[#203f35] text-[#C5E86C] border border-[#C5E86C]/40 px-4 py-2.5 rounded-full shadow-xl shadow-[#183028]/25 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer group"
          aria-label="Open Compliance Copilot"
        >
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5E86C] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C5E86C]" />
          </div>
          <Bot className="h-4 w-4 text-[#C5E86C]" />
          <span className="tracking-tight">{isLoginMode ? "Compliance Help" : "Neural Copilot"}</span>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded font-extrabold bg-[#C5E86C] text-[#183028]">
            Gemini 2.5
          </span>
        </button>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative w-[380px] sm:w-[500px] h-[640px] rounded-2xl flex flex-col overflow-hidden text-xs bg-white border border-[#E6E8E7] shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200",
            isDragging && "ring-2 ring-[#C5E86C] border-[#183028]"
          )}
        >
          {/* Drag & Drop Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-[#183028]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3 pointer-events-none animate-in fade-in">
              <div className="h-16 w-16 rounded-2xl bg-[#C5E86C]/20 border border-[#C5E86C] flex items-center justify-center text-[#C5E86C]">
                <UploadCloud className="h-8 w-8 animate-bounce" />
              </div>
              <h4 className="text-sm font-bold text-[#C5E86C]">Drop Draft to Audit & Remediate</h4>
              <p className="text-xs text-white/80 max-w-xs leading-relaxed">
                Google Gemini will inspect against FINRA Rule 2210 & SEC Rule 206 and generate your already-fixed compliant version.
              </p>
            </div>
          )}

          <ChatHeader
            isLoginMode={isLoginMode}
            role={session?.role}
            onClose={() => setIsOpen(false)}
          />

          {/* Chat Messages Log */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#FAFBFB]/50">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                copiedId={copiedId}
                onCopy={handleCopy}
                onElevateToDocumentation={(txt) => handleSend(`Enhance documentation: ${txt}`)}
                onExecuteChip={(chip) => handleSend(chip)}
              />
            ))}

            {/* Uploading progress banner */}
            {isUploading && (
              <div className="p-3 bg-[#183028] text-white rounded-2xl border border-[#C5E86C]/40 space-y-2 shadow-lg animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-2 text-[#C5E86C]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Neural Compliance Engine Active
                  </span>
                  <span className="text-[10px] text-white/70">Auditing Draft</span>
                </div>
                <p className="text-[10px] text-white/90">{uploadStatusText}</p>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#C5E86C] h-full rounded-full w-2/3 animate-[pulse_1.5s_infinite]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions / Dynamic Suggestion Pills */}
          <div className="px-3 py-2 bg-white border-t border-[#E6E8E7] flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
            {currentSuggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={isTyping || isUploading}
                className="whitespace-nowrap text-[10px] font-semibold text-[#183028] hover:bg-[#C5E86C]/30 bg-[#FAFBFB] border border-[#E6E8E7] px-2.5 py-1 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Hidden File Input for Attachment Clip */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
                e.target.value = "";
              }
            }}
            accept=".pdf,.docx,.doc,.txt,.xlsx,.xls"
            className="hidden"
          />

          {/* Message Input Box with Attachment Clip */}
          <div className="p-3 bg-white border-t border-[#E6E8E7] flex items-center space-x-2 shrink-0">
            {isAuthenticated && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={isTyping || isUploading}
                onClick={() => fileInputRef.current?.click()}
                title="Attach draft file (.pdf, .docx, .txt) to audit & remediate"
                className="h-8 w-8 rounded-xl border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/25 hover:text-[#183028] shrink-0 cursor-pointer shadow-2xs"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
            )}

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isTyping || isUploading}
              placeholder={currentPlaceholder}
              className="bg-[#FAFBFB] border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 h-8 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#183028] disabled:opacity-60"
            />

            <Button
              size="icon"
              disabled={!inputValue.trim() || isTyping || isUploading}
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
    <div className="bg-[#183028] text-white px-4 py-3 flex items-center justify-between border-b border-[#23453a] shrink-0">
      <div className="flex items-center space-x-2.5">
        <div className="relative h-8 w-8 rounded-xl bg-[#C5E86C]/20 border border-[#C5E86C] flex items-center justify-center text-[#C5E86C] shadow-2xs">
          <Bot className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#C5E86C] animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-white tracking-tight">
              {isLoginMode ? "Compliance Help" : "Neural Compliance Copilot"}
            </h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[#C5E86C] text-[#183028]">
              {isLoginMode ? "Guidance" : role || "Staff"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] text-[#C5E86C]/90 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C5E86C]" />
            <span>Google Gemini Engine: Active</span>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Close copilot window"
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
  onExecuteChip?: (chipText: string) => void;
}

function ChatMessageItem({
  message,
  copiedId,
  onCopy,
  onElevateToDocumentation,
  onExecuteChip,
}: IChatMessageItemProps) {
  const isUser = message.sender === "user";
  const isCurrentlyTyping = message.isTyping;

  return (
    <div
      className={cn(
        "flex flex-col max-w-[94%] space-y-1",
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
          "p-3 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap min-h-[30px] shadow-2xs",
          isUser
            ? "bg-[#183028] text-white font-medium rounded-br-xs"
            : "bg-white text-[#183028] border border-[#E6E8E7] rounded-bl-xs"
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

        {/* Rich Audit & Remediation Card */}
        {!isUser && message.auditResult && !isCurrentlyTyping && (
          <AuditResultCard
            result={message.auditResult}
            isCopied={copiedId === message.id}
            onCopy={() => onCopy(message.id, message.auditResult!.remediated_content.text)}
          />
        )}

        {/* Rich Repository Search Telemetry Card */}
        {!isUser && message.searchResult && !isCurrentlyTyping && (
          <TelemetrySearchCard result={message.searchResult} />
        )}

        {/* Existing Grammar Result */}
        {!isUser && message.grammarResult && !isCurrentlyTyping && (
          <GrammarResultCard
            result={message.grammarResult}
            isCopied={copiedId === message.id}
            onCopy={() => onCopy(message.id, message.grammarResult!.correctedText)}
            onElevate={() => onElevateToDocumentation?.(message.grammarResult!.correctedText)}
          />
        )}

        {/* Existing Documentation Result */}
        {!isUser && message.documentationResult && !isCurrentlyTyping && (
          <DocumentationResultCard
            result={message.documentationResult}
            isCopied={copiedId === message.id}
            onCopy={() => onCopy(message.id, message.documentationResult!.enhancedText)}
          />
        )}

        {/* Dynamic Contextual Suggestion Bubbles */}
        {!isUser && message.suggestedChips && message.suggestedChips.length > 0 && !isCurrentlyTyping && (
          <div className="mt-3 pt-2 border-t border-[#E6E8E7] flex flex-wrap gap-1.5">
            {message.suggestedChips.map((chip) => (
              <button
                key={chip}
                onClick={() => onExecuteChip?.(chip)}
                className="text-[9.5px] font-semibold text-[#183028] hover:bg-[#C5E86C] bg-[#FAFBFB] border border-[#183028]/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                ↳ {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Card rendering in-chat File Audit & Automated Remediation results */
interface IAuditCardProps {
  result: IAuditAndFixResponse;
  isCopied: boolean;
  onCopy: () => void;
}

function AuditResultCard({ result, isCopied, onCopy }: IAuditCardProps) {
  const [showFullText, setShowFullText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleDownload = () => {
    // Download through URL or blob
    const downloadUrl = copilotApi.getDownloadUrl(result.remediated_content.token);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${result.remediated_content.suggested_title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessToast("Remediated compliant file downloaded.");
  };

  const handleDirectSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    try {
      await copilotApi.submitRemediated({
        text: result.remediated_content.text,
        title: result.remediated_content.suggested_title,
        token: result.remediated_content.token,
        targetDocumentId: result.one_click_actions.target_document_id || undefined,
      });
      setIsSubmitted(true);
      showSuccessToast("Remediated document submitted successfully to compliance queue!");
    } catch (err: any) {
      console.error("[Submit Remediated Error]", err);
      showErrorToast(err.message || "Failed to submit remediated document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#E6E8E7] space-y-2.5 text-[#183028]">
      {/* Header with Readiness Score Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#183028]">
            Compliance Audit & Auto-Fix
          </span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#C5E86C] text-[#183028] border border-[#183028]/10 shadow-2xs">
          100% Compliant
        </span>
      </div>

      {/* File meta tag */}
      <div className="flex items-center gap-2 p-1.5 bg-[#FAFBFB] rounded-lg border border-[#E6E8E7] text-[10px]">
        <FileText className="h-3.5 w-3.5 text-[#183028]/60" />
        <span className="font-semibold text-[#183028] truncate max-w-[220px]">
          {result.file_meta.original_filename}
        </span>
        <span className="text-[#183028]/50">
          ({Math.round(result.file_meta.file_size / 1024)} KB)
        </span>
      </div>

      {/* Identified Infractions Diff Breakdown */}
      {result.audit_breakdown.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-bold text-[#183028] flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Infraction Diagnostic & Prescribed Amendments:
          </span>

          <div className="space-y-2">
            {result.audit_breakdown.map((item, i) => (
              <div
                key={i}
                className="p-2.5 bg-white border border-[#E6E8E7] rounded-xl space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#183028] text-[#C5E86C]">
                    {item.rule}
                  </span>
                  <span className="text-[9px] text-rose-600 font-semibold">Violation Flag</span>
                </div>

                {/* Original problematic passage */}
                <div className="p-1.5 bg-rose-50/80 border border-rose-200 rounded text-[10px] text-rose-900 leading-relaxed">
                  <span className="font-bold text-rose-700 block text-[9px] uppercase">Original Passage:</span>
                  <span className="line-through decoration-rose-500 font-mono text-[9.5px]">{item.original_passage}</span>
                </div>

                {/* Fixed passage */}
                <div className="p-1.5 bg-emerald-50/80 border border-emerald-200 rounded text-[10px] text-emerald-900 leading-relaxed">
                  <span className="font-bold text-emerald-700 block text-[9px] uppercase">Remediated Compliant Text:</span>
                  <span className="font-semibold text-[9.5px]">{item.fixed_passage}</span>
                </div>

                <p className="text-[9px] text-[#183028]/70 italic">
                  <strong>Amendment Rationale:</strong> {item.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Remediated Document Preview */}
      <div className="space-y-1 pt-1">
        <button
          onClick={() => setShowFullText(!showFullText)}
          className="flex items-center justify-between w-full text-[10px] font-bold text-[#183028] hover:text-[#23453a] py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1">
            <FileCheck2 className="h-3 w-3 text-emerald-600" />
            Remediated Compliant Document Preview
          </span>
          {showFullText ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showFullText && (
          <div className="p-2.5 bg-white border border-[#183028]/20 rounded-xl text-[10px] font-mono leading-relaxed text-[#183028] max-h-[140px] overflow-y-auto whitespace-pre-wrap select-text shadow-2xs">
            {result.remediated_content.text}
          </div>
        )}
      </div>

      {/* 1-Click Interactive Action Triggers */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        <button
          onClick={onCopy}
          className="flex items-center justify-center gap-1 text-[10px] font-semibold text-[#183028] hover:bg-[#FAFBFB] bg-white border border-[#E6E8E7] py-1.5 px-2 rounded-lg cursor-pointer transition-colors shadow-2xs"
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-600 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy Text</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-1 text-[10px] font-semibold text-[#183028] hover:bg-[#FAFBFB] bg-white border border-[#E6E8E7] py-1.5 px-2 rounded-lg cursor-pointer transition-colors shadow-2xs"
        >
          <Download className="h-3 w-3" />
          <span>Download Fixed</span>
        </button>

        <button
          onClick={handleDirectSubmit}
          disabled={isSubmitting || isSubmitted}
          className={cn(
            "flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 px-2 rounded-lg cursor-pointer transition-colors shadow-2xs",
            isSubmitted
              ? "bg-emerald-600 text-white"
              : "bg-[#183028] hover:bg-[#23453a] text-[#C5E86C]"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Submitting...</span>
            </>
          ) : isSubmitted ? (
            <>
              <Check className="h-3 w-3" />
              <span>Submitted ✓</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 text-[#C5E86C]" />
              <span>Submit Proposal</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/** Card rendering live repository search matches and telemetry metrics */
interface ITelemetryCardProps {
  result: ISearchResponse;
}

function TelemetrySearchCard({ result }: ITelemetryCardProps) {
  const router = useRouter();
  const { documents, analytics } = result;

  return (
    <div className="mt-3 pt-3 border-t border-[#E6E8E7] space-y-2.5 text-[#183028]">
      {/* High-density telemetry chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#183028] text-white">
          {analytics.total_matches} {analytics.total_matches === 1 ? "Match" : "Matches"}
        </span>
        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          {analytics.breakdown_by_status.Approved} Approved
        </span>
        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
          {analytics.breakdown_by_status.Pending} Pending
        </span>
        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          {analytics.breakdown_by_status.NeedsRevision} Needs Revision
        </span>
        {analytics.regulatory_risk_summary > 0 && (
          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
            <ShieldAlert className="h-2.5 w-2.5" />
            {analytics.regulatory_risk_summary} Flagged
          </span>
        )}
      </div>

      {/* Matching Document Items List */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
        {documents.slice(0, 5).map((doc) => (
          <div
            key={doc.id}
            className="p-2 bg-white rounded-xl border border-[#E6E8E7] hover:border-[#183028]/30 transition-all space-y-1.5 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0">
                <h5 className="font-bold text-[11px] text-[#183028] truncate">{doc.title}</h5>
                <p className="text-[9px] text-[#183028]/60">
                  By {doc.advisor_name} • {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                  v{doc.version}
                  {doc.total_versions > 1 ? ` of ${doc.total_versions}` : ""}
                </span>
                <span
                  className={cn(
                    "text-[8.5px] font-bold px-1.5 py-0.5 rounded",
                    doc.status === "Approved" && "bg-emerald-100 text-emerald-800",
                    doc.status === "Pending" && "bg-blue-100 text-blue-800",
                    doc.status === "Needs Revision" && "bg-amber-100 text-amber-800",
                    doc.status === "Rejected" && "bg-rose-100 text-rose-800"
                  )}
                >
                  {doc.status}
                </span>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                onClick={() => router.push(`/documents/${doc.id}`)}
                className="flex items-center gap-1 text-[9px] font-semibold text-[#183028] hover:bg-[#C5E86C]/30 bg-[#FAFBFB] border border-[#E6E8E7] px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                <span>Open File</span>
              </button>

              <button
                onClick={() => router.push(`/documents/${doc.id}/audit-trail`)}
                className="flex items-center gap-1 text-[9px] font-semibold text-[#183028] hover:bg-[#C5E86C]/30 bg-[#FAFBFB] border border-[#E6E8E7] px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                <History className="h-2.5 w-2.5" />
                <span>Audit Trail</span>
              </button>

              {doc.has_revisions && (
                <button
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="flex items-center gap-1 text-[9px] font-semibold text-[#183028] hover:bg-[#C5E86C]/30 bg-[#FAFBFB] border border-[#E6E8E7] px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <Layers className="h-2.5 w-2.5" />
                  <span>Lineage (v1-v{doc.total_versions})</span>
                </button>
              )}
            </div>
          </div>
        ))}
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
