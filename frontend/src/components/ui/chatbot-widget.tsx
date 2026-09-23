"use client";

/**
 * DOCU: Renders the Neural Compliance Copilot with Google Gemini engine.
 * Features filterable document search, telemetry analytics, in-chat draft audit, and automated remediation.
 * Last Updated Date: September 23, 2026
 * @returns The compliance copilot widget view.
 * @author Keith
 */
import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
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
  Maximize2,
  Minimize2,
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
  DASHBOARD_INITIAL_MESSAGES,
  DASHBOARD_SUGGESTED_QUESTIONS,
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
  suggestedChips?: string[];
}

/** Determines whether a user input is asking to check, fix, or polish grammar/sentences */
export function isGrammarCheckQuery(text: string): boolean {
  const l = text.toLowerCase().trim();
  return (
    l.startsWith("check grammar:") ||
    l.startsWith("grammar:") ||
    l.startsWith("check:") ||
    l.startsWith("audit note:") ||
    l.startsWith("fix:") ||
    l.startsWith("fix grammar") ||
    l.startsWith("fix sentence") ||
    l.startsWith("fix my sentence") ||
    l.startsWith("fix my grammar") ||
    /\b(?:check|fix|correct|improve|polish|rephrase|rewrite)\s+(?:my\s+|this\s+|the\s+)?(?:grammar|sentence|sentences|phrasing|wording)\b/i.test(l) ||
    /\b(?:i\s+want\s+(?:more\s+)?to\s+fix\s+(?:my\s+)?(?:sentence|grammar|writing))\b/i.test(l) ||
    /\b(?:help\s+me\s+fix\s+(?:my\s+)?(?:sentence|grammar))\b/i.test(l) ||
    /\bgrammar\s+(?:check|re-?check|fix)\b/i.test(l) ||
    /\b(check\s+grammar|proofread|audit\s+draft\s+note)\b/i.test(l)
  );
}

/** Human conversational fallback response when backend is unreachable or offline */
function getConversationalFallback(
  role?: string,
  isLoginMode?: boolean,
  userQuery?: string,
  session?: UserSession | null
): string {
  if (isLoginMode) {
    return "Hello! I am your Springer Capital Compliance Assistant. I can help answer questions regarding our platform review workflows, accepted filing formats, and FINRA 2210 / SEC 206 regulatory guidelines. What would you like to know?";
  }

  if (userQuery) {
    const q = userQuery.trim().toLowerCase();

    // 1. User Identity / Account
    if (
      q.includes("my name") ||
      q.includes("who am i") ||
      q.includes("what is my role") ||
      q.includes("what is my email") ||
      q.includes("my account")
    ) {
      const email = session?.email || (role === "Officer" ? "officer@springercapital.com" : "advisor@springercapital.com");
      const name = email.split("@")[0];
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      return `You are currently logged in as **${formattedName}** (${email}), serving as an institutional **${session?.role || role || "Advisor"}** at Springer Capital.`;
    }

    // 2. Specific known users
    if (q.includes("officer@springercapital.com")) {
      return "Yes! **officer@springercapital.com** is registered as the **Chief Compliance Officer** at Springer Capital with supervisory authority over the queue.";
    }
    if (q.includes("advisor@springercapital.com")) {
      return "Yes! **advisor@springercapital.com** is registered as a **Senior Investment Advisor** authorized to draft and submit proposal documents for compliance review.";
    }
    if (q.includes("is there any user by the email") || q.includes("user with email")) {
      const emailMatch = userQuery.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        const found = emailMatch[0].toLowerCase();
        if (found.endsWith("@springercapital.com")) {
          return `The user **${found}** belongs to the Springer Capital internal institutional domain.`;
        }
        return `The address **${found}** is an external email address. Client PII is masked before supervisory review.`;
      }
      return "Please provide an email address to verify institutional registration.";
    }

    // 3. Astronomy & General Science
    if (q.includes("how far is the sun") || q.includes("distance to the sun")) {
      return "The Sun is approximately **93 million miles** (about **149.6 million kilometers**, or **1 AU**) away from Earth. Sunlight takes roughly **8 minutes and 20 seconds** to reach us! ☀️";
    }
    if (q.includes("how far is the moon") || q.includes("distance to the moon")) {
      return "The Moon is an average of **238,855 miles** (about **384,400 kilometers**) away from Earth. 🌕";
    }
    if (q.includes("speed of light")) {
      return "The speed of light in a vacuum is approximately **186,282 miles per second** (or **299,792,458 meters per second**). ⚡";
    }

    // 4. Basic math
    const mathMatch = userQuery.match(/(?:what is|calculate|compute)?\s*(-?\d+(?:\.\d+)?)\s*([\+\-\*\/x×÷])\s*(-?\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      const num1 = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const num2 = parseFloat(mathMatch[3]);
      let res: number | null = null;
      if (op === "+" || op === "plus") res = num1 + num2;
      else if (op === "-" || op === "minus") res = num1 - num2;
      else if (op === "*" || op === "x" || op === "×") res = num1 * num2;
      else if (op === "/" || op === "÷") res = num2 !== 0 ? num1 / num2 : null;
      if (res !== null) {
        return `The calculation **${num1} ${op} ${num2}** equals **${res}**.`;
      }
    }

    // 5. Greetings
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)\b/i.test(q)) {
      return role === "Officer"
        ? "Hello! I'm active and monitoring the supervisory queue. How can I assist you with compliance reviews, regulatory guidance, or anything else today?"
        : "Hello! I'm here and ready to help you draft compliant investment proposals, check FINRA/SEC rules, or answer any questions you have. What are you working on?";
    }

    if (q.includes("thank you") || q.includes("thanks")) {
      return "You're very welcome! Let me know if there's anything else you'd like to draft, audit, or discuss.";
    }
  }

  return role === "Officer"
    ? "I'm monitoring the supervisory review queue and ready to help evaluate filings, check regulatory rules, or assist with determinations. How can I help you today?"
    : "I'm here to help you track your proposal submissions, explain FINRA Rule 2210 & SEC Rule 206 rules, or scan and auto-fix any draft file you attach here with zero flags. What are you working on today?";
}

/** Resolves full bot response and attached results based on input and mode */
function resolveBotReply(rawText: string, isLoginMode: boolean, role?: string): IResolvedBotReply {
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
  if (isGrammarCheckQuery(rawText)) {
    const cleanDraft = rawText
      .replace(/^(?:can you\s+|please\s+|help me\s+|i want\s+(?:you\s+)?to\s+|i want more to\s+)?(?:fix|check|re-?check|correct|proofread|improve|rewrite|rephrase)\s*(?:my|this|the)?\s*(?:grammar|sentence|sentences|phrasing|text|draft|writing)?[:,-]?\s*/i, "")
      .replace(/\b(?:please\s+)?(?:re-?check|check|fix)\s+(?:grammar|sentence|sentences)\b[:,-]?/gi, "")
      .replace(/\b(?:grammar|sentence|sentences)\s+(?:check|re-?check)\b[:,-]?/gi, "")
      .replace(/^(?:grammar|sentence|check|audit\s*note|fix)[:,-]?\s*/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (cleanDraft && cleanDraft.length > 2 && !/^(?:sentence|sentences|grammar|text|phrasing|draft)$/i.test(cleanDraft)) {
      const grammarResult = recheckGrammar(cleanDraft);
      return {
        text: grammarResult.summary,
        grammarResult,
      };
    }

    // No text provided yet — prompt the user to provide the sentence or draft
    return {
      text: "I'd be glad to help fix your sentence! Please paste or type the sentence or draft note you'd like me to audit (for example: *\"The investment team have submited the proposal\"* or *\"Our fund guarantees 10% return\"*), and I will correct its grammar, spelling, and regulatory tone for you.",
      suggestedChips: [
        "Fix: The investment team have submited the proposal.",
        "Fix: Our fund guarantees a 12% return with zero risk.",
        "Fix: He dont have no files uploaded yet.",
      ],
    };
  }

  return { text: getConversationalFallback(role, isLoginMode, rawText) };
}

/** Determines active suggested questions dynamically based on authentication state, user role, and active page */
function getSuggestedQuestions(isLoginMode: boolean, role?: string, pathname?: string): string[] {
  if (isLoginMode) {
    return LOGIN_SUGGESTED_QUESTIONS;
  }

  const isOfficer = role === "Officer";
  const path = pathname || "";

  // 1. Specific Document Review Page (/documents/[id])
  if (path.includes("/documents/")) {
    if (isOfficer) {
      return [
        "Audit this document against FINRA 2210 & SEC 206 rules",
        "Draft compliance memo with required revisions",
        "Can this document be auto-remediated without altering intent?",
        "Review attestation & audit history for this filing",
      ];
    }
    return [
      "Explain the flagged compliance issues for this document",
      "What revisions does the Compliance Officer require?",
      "Show version comparison between v1 and v2",
      "How do I remediate promissory language in this filing?",
    ];
  }

  // 2. Supervisory Queue & Assigned Pages (/queue, /assigned)
  if (path.includes("/queue") || path.includes("/assigned")) {
    return [
      "List all pending documents awaiting my determination",
      "Show unassigned queue submissions by date",
      "Show documents uploaded today",
      "Who uploaded the most recent filing?",
    ];
  }

  // 3. Submissions Page (/submissions)
  if (path.includes("/submissions")) {
    return [
      "Which of my submissions are pending officer review?",
      "Show documents requiring revision with officer feedback",
      "Summarize my approved filings this quarter",
      "How do I submit an updated version (v2)?",
    ];
  }

  // 4. Dashboard & General Context
  if (isOfficer) {
    return [
      "What documents are awaiting compliance review today?",
      "Show high-risk submissions across all advisors",
      "Who uploaded documents this week?",
      "Show all pending filings with risk flags",
    ];
  }

  // Default Advisor Dashboard
  return [
    "Show my submissions from this month",
    "Show filings that need revision",
    "Show approved documents",
    "What are the FINRA 2210 disclosure rules?",
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

  // Questions explaining workflows, FAQs, guidelines, or auditing are NOT document searches
  if (
    /\b(how\s+(?:does|do|can|to)|what\s+is|explain|tell\s+me\s+about|walk\s+me\s+through|faq|workflow|guidelines?)\b/i.test(lower) ||
    /\b(versioning|lineage|pii|masking|file\s+format|file\s+limit|standard|rule)\b/i.test(lower) ||
    /^(?:audit|compliance\s*audit|scan|check\s*compliance|fix|check\s*grammar|grammar)[:,-]?\s+/i.test(lower)
  ) {
    return false;
  }

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
    "approve",
    "pending",
    "needs revision",
    "revision needed",
    "for revision",
    "my revisions",
    "rejected",
    "reject",
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

  // Status detection (supports 'revision', 'needs revision', 'approve', 'approved', 'reject', 'rejected', 'pending')
  const statuses: string[] = [];
  if (
    lower.includes("needs revision") ||
    lower.includes("revision needed") ||
    lower.includes("for revision") ||
    lower.includes("revision only") ||
    lower.includes("revision") ||
    lower.includes("revisions")
  ) {
    statuses.push("Needs Revision");
  }
  if (lower.includes("approved") || lower.includes("approve")) statuses.push("Approved");
  if (lower.includes("pending") || lower.includes("in review")) statuses.push("Pending");
  if (lower.includes("rejected") || lower.includes("reject")) statuses.push("Rejected");
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

// ─────────────────────────────────────────────────────────────────────────────
// localStorage quota helpers — enforce file-scan limit client-side
// Works even if the user_quotas Supabase table doesn't exist yet.
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_QUOTA_KEY = "sc_file_scan_quota";
const LOCAL_QUOTA_LIMIT: number = 2;
const LOCAL_QUOTA_PERIOD_DAYS: number = 4;

interface LocalQuota {
  used: number;
  periodStartedAt: number; // epoch ms
}

function getLocalQuota(userId: string): LocalQuota {
  if (typeof window === "undefined") return { used: 0, periodStartedAt: Date.now() };
  try {
    const raw = localStorage.getItem(`${LOCAL_QUOTA_KEY}_${userId}`);
    if (!raw) return { used: 0, periodStartedAt: Date.now() };
    const parsed: LocalQuota = JSON.parse(raw);
    const periodMs = LOCAL_QUOTA_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    // Auto-reset if period expired
    if (Date.now() - parsed.periodStartedAt > periodMs) {
      const fresh = { used: 0, periodStartedAt: Date.now() };
      localStorage.setItem(`${LOCAL_QUOTA_KEY}_${userId}`, JSON.stringify(fresh));
      return fresh;
    }
    return parsed;
  } catch {
    return { used: 0, periodStartedAt: Date.now() };
  }
}

function incrementLocalQuota(userId: string): LocalQuota {
  const current = getLocalQuota(userId);
  const updated = { ...current, used: current.used + 1 };
  try {
    localStorage.setItem(`${LOCAL_QUOTA_KEY}_${userId}`, JSON.stringify(updated));
  } catch { /* storage full — ignore */ }
  return updated;
}

function getLocalQuotaResetDate(userId: string): string {
  const q = getLocalQuota(userId);
  const resetMs = q.periodStartedAt + LOCAL_QUOTA_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return new Date(resetMs).toLocaleDateString("en-US", { month: "long", day: "numeric" });
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

  // Chatbot open and fullscreen state
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Quota tracking (Advisor only, null = Officer or not loaded)
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number; resetsAt: string; resetInDays: number } | null>(null);
  const [fileQuota, setFileQuota] = useState<{ used: number; limit: number; remaining: number; resetsAt: string; resetInDays: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically close chatbot on route redirection or page navigation
  useEffect(() => {
    setIsOpen(false);
    setIsFullscreen(false);
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
    setIsFullscreen(false);
  }

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAwaitingGrammarInput, setIsAwaitingGrammarInput] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Pre-load quota when chatbot opens — localStorage is instant, server is async
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    const userId = session?.email || "anonymous";


    // 1. Immediately apply localStorage quota (works without Supabase table)
    const localQ = getLocalQuota(userId);
    setFileQuota((prev) => {
      // Only override if server hasn't returned a more authoritative value
      if (prev !== null) return prev;
      return {
        used: localQ.used,
        limit: LOCAL_QUOTA_LIMIT,
        remaining: Math.max(0, LOCAL_QUOTA_LIMIT - localQ.used),
        resetsAt: "",
        resetInDays: LOCAL_QUOTA_PERIOD_DAYS,
      };
    });

    // 2. Also fetch server quota async for Advisor role (server quota wins if available)
    if (session?.role === "Advisor" || session?.role === "Officer") {
      copilotApi.getQuota().then((info) => {
        if (!info) return;
        // Use the stricter of server vs local counts
        const serverUsed = info.fileAnalyses.used;
        const localUsed = getLocalQuota(userId).used;
        const effectiveUsed = Math.max(serverUsed, localUsed);
        const effectiveRemaining = Math.max(0, info.fileAnalyses.limit - effectiveUsed);

        if (session?.role === "Advisor") {
          setQuota({ used: info.chatMessages.used, limit: info.chatMessages.limit, remaining: info.chatMessages.remaining, resetsAt: info.resetsAt, resetInDays: info.resetInDays });
        }
        setFileQuota({ used: effectiveUsed, limit: info.fileAnalyses.limit, remaining: effectiveRemaining, resetsAt: info.resetsAt, resetInDays: info.resetInDays });
      }).catch(() => { /* silent — localStorage gate still works */ });
    }
  }, [isOpen, isAuthenticated, session?.email, session?.role]);


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

  /** Stages draft file upload without automatically submitting */
  const handleFileUpload = (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showErrorToast("File exceeds maximum allowed limit of 25MB.");
      return;
    }

    setPendingFile(file);
    showSuccessToast(`Draft attached: "${file.name}". Choose 'Scan File' or 'Fix & Remediate'.`);
  };

  /** Executes in-chat Gemini audit or remediation on the attached file */
  const handleExecuteFileAudit = async (file: File, mode: "scan" | "remediate", userInstructions?: string) => {
    if (!file || isUploading) return;

    setPendingFile(null);
    if (inputValue) setInputValue("");

    const userMsgId = `user-${++messageIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const modeLabel = mode === "scan"
      ? "Scan for FINRA 2210 & SEC 206 rule violations"
      : "Auto-remediate into 100% compliant proposal (zero flags)";

    const promptDesc = userInstructions
      ? ` — Instruction: "${userInstructions}"`
      : ` — Action: ${modeLabel}`;

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: `📎 Draft file: ${file.name} (${Math.round(file.size / 1024)} KB)${promptDesc}`,
        timestamp,
      },
    ]);

    setIsUploading(true);
    setUploadStatusText("Auditing draft passages with Google Gemini against FINRA 2210 & SEC 206...");

    const botMsgId = `bot-${++messageIdRef.current}`;

    const docMatch = pathname ? pathname.match(/\/documents\/([0-9a-fA-F-]+)/) : null;
    const activeDocId = docMatch ? docMatch[1] : undefined;

    try {
      // ── Local quota gate (works even without Supabase table) ──────────────
      const userId = session?.email || "anonymous";
      const localQ = getLocalQuota(userId);
      const localExhausted = localQ.used >= LOCAL_QUOTA_LIMIT;

      // Also check cached server quota
      const serverExhausted = fileQuota !== null && fileQuota.remaining === 0;

      if (localExhausted || serverExhausted) {
        setIsUploading(false);
        setUploadStatusText("");
        const resetDate = serverExhausted && fileQuota?.resetsAt
          ? new Date(fileQuota.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
          : getLocalQuotaResetDate(userId);
        const resetInDays = serverExhausted && fileQuota?.resetInDays
          ? fileQuota.resetInDays
          : LOCAL_QUOTA_PERIOD_DAYS;
        const roleMsg = session?.role === "Officer"
          ? `You've used your ${LOCAL_QUOTA_LIMIT} document scan${LOCAL_QUOTA_LIMIT !== 1 ? "s" : ""} for this period. Your quota resets on ${resetDate} (${resetInDays} day${resetInDays !== 1 ? "s" : ""} from now).`
          : `You've used both of your file analysis slots for this period. Your quota resets on ${resetDate} (${resetInDays} day${resetInDays !== 1 ? "s" : ""} from now). You can still chat, view submissions, or download previously remediated files.`;
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: "bot",
            text: roleMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setIsTyping(false);
        return;
      }

      const auditResponse = await copilotApi.auditAndRemediate(file, {
        instructions: userInstructions,
        targetDocumentId: activeDocId,
      });

      setIsUploading(false);
      setUploadStatusText("");

      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: auditResponse.conversational_summary,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          auditResult: session?.role === "Officer" ? undefined : auditResponse,
          officerAuditResult: session?.role === "Officer" ? auditResponse : undefined,
          suggestedChips: session?.role === "Officer"
            ? [
              "Show all pending documents in queue",
              "Show high-risk submissions across all advisors",
              "What FINRA 2210 rules apply to this type of filing?",
            ]
            : [
              "Submit remediated version",
              "Show my submissions from this month",
              "Download remediated file",
            ],
        },
      ]);
      // Increment LOCAL quota counter on every successful scan/fix
      const updatedLocal = incrementLocalQuota(userId);
      // Also sync server quota
      if ((auditResponse as any)?.quota) {
        setFileQuota((auditResponse as any).quota);
      } else {
        // Update local-derived display even if server didn't return quota
        setFileQuota((prev) => prev
          ? { ...prev, used: updatedLocal.used, remaining: Math.max(0, LOCAL_QUOTA_LIMIT - updatedLocal.used) }
          : { used: updatedLocal.used, limit: LOCAL_QUOTA_LIMIT, remaining: Math.max(0, LOCAL_QUOTA_LIMIT - updatedLocal.used), resetsAt: "", resetInDays: LOCAL_QUOTA_PERIOD_DAYS }
        );
      }
    } catch (err: any) {
      setIsUploading(false);
      setUploadStatusText("");
      console.error("[Copilot File Audit Error]", err);

      // Handle quota exceeded (HTTP 429) — surfaced from API after our fix
      if (err?.status === 429) {
        const quotaData = err?.data?.quota;
        const resetDate = quotaData?.resetsAt
          ? new Date(quotaData.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
          : getLocalQuotaResetDate(session?.email || "anonymous");
        const resetInDays = quotaData?.resetInDays ?? LOCAL_QUOTA_PERIOD_DAYS;
        const limitNum = quotaData?.limit ?? LOCAL_QUOTA_LIMIT;
        const roleMsg = session?.role === "Officer"
          ? `You've used your ${limitNum} document scan${limitNum !== 1 ? "s" : ""} for this period. Your quota resets on ${resetDate} (${resetInDays} day${resetInDays !== 1 ? "s" : ""} from now).`
          : `You've used both of your file analysis slots for this period. Your quota resets on ${resetDate} (${resetInDays} day${resetInDays !== 1 ? "s" : ""} from now). You can still chat, view your submissions, or download previously remediated files.`;
        if (quotaData) setFileQuota(quotaData);
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: "bot",
            text: roleMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setIsTyping(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: `I encountered an issue auditing your file: ${err.message || "Failed to process file"}. Please try again or paste text directly.`,
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
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }

      setIsTyping(true);
      let charIndex = 0;

      setMessages((prev) => {
        const existing = prev.some((msg) => msg.id === botMsgId);
        if (existing) {
          return prev.map((msg) =>
            msg.id === botMsgId
              ? {
                ...msg,
                text: "",
                isTyping: true,
                grammarResult: extras?.grammarResult,
                documentationResult: extras?.documentationResult,
                searchResult: extras?.searchResult,
                suggestedChips: extras?.suggestedChips,
              }
              : msg
          );
        }
        return [
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
        ];
      });

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

    // If an uploaded draft file is pending, execute remediation with the user's message
    if (pendingFile) {
      const fileToProcess = pendingFile;
      handleExecuteFileAudit(fileToProcess, "remediate", rawText || undefined);
      return;
    }

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

    // 1. Documentation enhancement (local only — grammar/polish goes to backend AI)
    const isEnhance =
      lower.startsWith("enhance:") ||
      lower.startsWith("enhance documentation:") ||
      lower.startsWith("enhance note:") ||
      lower.includes("enhance for documentation") ||
      lower.includes("format as memo");

    if (isEnhance) {
      setTimeout(() => {
        const reply = resolveBotReply(rawText, isLoginMode, session?.role);
        simulateTyping(botMsgId, reply.text, timestamp, {
          documentationResult: reply.documentationResult,
        });
      }, 200);
      return;
    }

    // Grammar/polish/sentence-fix requests flow to the backend AI (Gemini/Grok)
    // with role-scoped system prompts — not processed locally.

    // Add bot typing placeholder once
    setIsTyping(true);
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, sender: "bot", text: "", timestamp, isTyping: true },
    ]);

    // 2a. Workflow / FAQ guard — these must reach the backend AI, NOT the search engine.
    const isWorkflowFaqQuery =
      /\b(versioning|lineage|v1\s*(?:and|&|\/)\s*v2|version\s*(?:1|2)|versioning\s*faq|faq|workflow|guidelines|regulations?\s*faq)\b/i.test(rawText) ||
      /\b(how\s+(does|do|can|to)|what\s+is|explain|tell me about|what are)\b.{0,60}\b(versioning|version|v1|v2|revisions?|upload|submission|review|pii|masking|audit\s+trail|file\s+limit|file\s+format|supported\s+format|standards?|rules?|finra|sec)\b/i.test(rawText) ||
      /\b(how\s+does\s+(versioning|the\s+review|submission|upload|revision)\s+work)\b/i.test(rawText) ||
      /\b(what\s+(happens|is\s+the\s+process|are\s+the\s+steps)\s+(when|after|for|if)\b)/i.test(rawText) ||
      /\b(walk\s+me\s+through|step[- ]by[- ]step|explain\s+the\s+(workflow|process|steps))/i.test(rawText);

    const isAuditTextQuery =
      /^(?:audit|compliance\s*audit|scan|check\s*compliance|audit\s*this|audit\s*text|audit\s*draft|audit\s*passage)[:,-]?\s+/i.test(rawText) ||
      /\b(?:compliance\s*audit|audit\s*this\s*text|audit\s*this\s*passage|scan\s*this\s*text)\b/i.test(rawText);

    // 2b. Repository Search Intent Routing (skip if it's a workflow FAQ or text audit)
    if (isAuthenticated && !isWorkflowFaqQuery && !isAuditTextQuery && isDocumentSearchQuery(rawText)) {
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
    const userRole = session?.role || "Advisor";
    const docMatch = pathname ? pathname.match(/\/documents\/([0-9a-fA-F-]+)/) : null;
    const documentId = docMatch ? docMatch[1] : undefined;

    // Optimistically increment quota counter immediately for realtime feedback
    if (userRole === "Advisor") {
      setQuota((prev) =>
        prev
          ? { ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) }
          : null
      );
    }

    copilotApi
      .sendChatMessage(rawText, userRole, {
        pathname: pathname || undefined,
        documentId,
        conversationHistory: messages.slice(-6).map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
      })
      .then((res) => {
        // Reconcile quota with authoritative server value after response
        if (res?.quota) setQuota(res.quota);
        return res?.reply || getConversationalFallback(userRole, isLoginMode, rawText, session);
      })
      .catch(() => {
        return getConversationalFallback(userRole, isLoginMode, rawText, session);
      })
      .then((replyText) => {
        simulateTyping(botMsgId, replyText, timestamp);
      });
  };

  const currentSuggestedQuestions = getSuggestedQuestions(isLoginMode, session?.role, pathname);
  const currentPlaceholder = getPlaceholderText(isLoginMode, isTyping, isUploading);

  if (isAuthPage) {
    return null;
  }

  return (
    <div className="print:hidden font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => {
              setIsOpen(true);
              setIsFullscreen(false);
            }}
            className="flex items-center gap-2.5 bg-white hover:bg-[#FAFBFB] text-[#183028] border border-[#E6E8E7] hover:border-[#183028]/30 px-4 py-2.5 rounded-full shadow-xl shadow-[#183028]/10 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer group"
            aria-label="Open Compliance Copilot"
          >
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </div>
            <Bot className="h-4 w-4 text-[#183028]" />
            <span className="tracking-tight text-[#183028]">{isLoginMode ? "Compliance Help" : "Neural Copilot"}</span>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded font-extrabold bg-[#C5E86C] text-[#183028] border border-[#b4db53]">
              Gemini 2.5
            </span>
          </button>
        </div>
      )}

      {/* Fullscreen Backdrop Overlay */}
      {isOpen && isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200 cursor-pointer"
        />
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col overflow-hidden text-xs bg-white border border-[#E6E8E7] shadow-2xl rounded-2xl transition-[width,height,transform] duration-200",
            isFullscreen
              ? "fixed inset-3 sm:inset-6 md:inset-10 z-50 max-w-6xl max-h-[92vh] m-auto"
              : "fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[480px] h-[600px] max-h-[calc(100vh-2.5rem)]",
            isDragging && "ring-2 ring-[#C5E86C] border-[#183028]"
          )}
        >
          {/* Drag & Drop Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-[#183028]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3 pointer-events-none animate-in fade-in">
              <div className="h-16 w-16 rounded-2xl bg-[#C5E86C]/20 border border-[#C5E86C] flex items-center justify-center text-[#C5E86C]">
                <UploadCloud className="h-8 w-8 animate-bounce" />
              </div>
              <h4 className="text-sm font-bold text-[#C5E86C]">Drop Draft to Stage for Review</h4>
              <p className="text-xs text-white/80 max-w-xs leading-relaxed">
                Release file to attach. You can choose to scan for infractions or auto-fix into a 100% compliant proposal with zero flags.
              </p>
            </div>
          )}

          <ChatHeader
            isLoginMode={isLoginMode}
            role={session?.role}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
            onClose={() => {
              setIsOpen(false);
              setIsFullscreen(false);
            }}
          />

          {/* Chat Messages Log */}
          <div ref={messagesContainerRef} className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#FAFBFB]/50">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                copiedId={copiedId}
                onCopy={handleCopy}
                onElevateToDocumentation={(text) => {
                  setInputValue(`enhance documentation: ${text}`);
                }}
                onExecuteChip={(chip) => {
                  if (chip === "Submit remediated version") {
                    const auditMessage = [...messages].reverse().find((m) => m.auditResult);
                    if (auditMessage?.auditResult) {
                      copilotApi
                        .submitRemediated({
                          text: auditMessage.auditResult.remediated_content.text,
                          title: auditMessage.auditResult.remediated_content.suggested_title,
                          token: auditMessage.auditResult.remediated_content.token,
                          targetDocumentId: auditMessage.auditResult.one_click_actions.target_document_id || undefined,
                        })
                        .then(() => {
                          // Mark the source message as submitted so chips update
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === auditMessage.id
                                ? { ...m, submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
                                : m
                            )
                          );
                          showSuccessToast("Remediated document submitted with zero flags!");
                        })
                        .catch((err) => {
                          showErrorToast(err.message || "Failed to submit remediated document.");
                        });
                      return;
                    }
                  }
                  handleSend(chip);
                }}
              />
            ))}

            {/* In-chat Live Processing State */}
            {isUploading && (
              <div className="flex items-center space-x-2 text-[11px] text-[#183028] bg-white border border-[#E6E8E7] p-3 rounded-2xl animate-pulse shadow-2xs">
                <Loader2 className="h-4 w-4 animate-spin text-[#183028]" />
                <div className="flex flex-col">
                  <span className="font-bold">{uploadStatusText || "Processing document..."}</span>
                  <span className="text-[9.5px] text-[#183028]/60">Google Gemini compliance intelligence pipeline active</span>
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

          {/* Staged Draft File Card */}
          {pendingFile && (
            <div className="mx-3 mb-2 p-2.5 bg-[#FAFBFB] border border-[#C5E86C] rounded-xl flex flex-col gap-2 shadow-2xs animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-[#183028] text-[#C5E86C] flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-[#183028] truncate">{pendingFile.name}</p>
                    <p className="text-[9.5px] text-[#183028]/60">{Math.round(pendingFile.size / 1024)} KB • Attached draft</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-[#183028]/50 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                  title="Remove attached file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Officers: scan only. Advisors: scan + fix */}
              {session?.role === "Officer" ? (
                <button
                  type="button"
                  disabled={isUploading || isTyping}
                  onClick={() => handleExecuteFileAudit(pendingFile, "scan", inputValue.trim() || undefined)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white hover:bg-[#FAFBFB] text-[#183028] border border-[#E6E8E7] text-[10px] font-bold transition-all shadow-2xs cursor-pointer hover:border-[#183028]/30"
                >
                  <ShieldAlert className="h-3 w-3 text-amber-600" />
                  <span>Scan File for Compliance Flags</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    disabled={isUploading || isTyping}
                    onClick={() => handleExecuteFileAudit(pendingFile, "scan", inputValue.trim() || undefined)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white hover:bg-[#FAFBFB] text-[#183028] border border-[#E6E8E7] text-[10px] font-bold transition-all shadow-2xs cursor-pointer hover:border-[#183028]/30"
                  >
                    <ShieldAlert className="h-3 w-3 text-amber-600" />
                    <span>Scan File for Rules</span>
                  </button>
                  <button
                    type="button"
                    disabled={isUploading || isTyping}
                    onClick={() => handleExecuteFileAudit(pendingFile, "remediate", inputValue.trim() || undefined)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#183028] hover:bg-[#23453a] text-[#C5E86C] text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Wand2 className="h-3 w-3 text-[#C5E86C]" />
                    <span>Fix &amp; Remediate File</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quota Usage Bar */}
          {isAuthenticated && (quota || fileQuota) && (
            <div className="px-3 pt-2 pb-1 bg-white border-t border-[#E6E8E7] flex flex-col gap-1 shrink-0">
              {/* Chat messages quota — Advisor only */}
              {session?.role === "Advisor" && quota && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold text-[#183028]/60 shrink-0 w-20">AI Messages</span>
                  <div className="flex-1 bg-[#E6E8E7] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        quota.remaining === 0 ? "bg-red-400" : quota.remaining <= 5 ? "bg-amber-400" : "bg-[#C5E86C]"
                      )}
                      style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                    />
                  </div>
                  <span className={cn("text-[9px] font-bold shrink-0", quota.remaining === 0 ? "text-red-500" : "text-[#183028]/60")}>
                    {quota.used}/{quota.limit}
                  </span>
                </div>
              )}
              {/* File scans quota — both roles */}
              {fileQuota && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold text-[#183028]/60 shrink-0 w-20">
                    {session?.role === "Officer" ? "Doc Scans" : "File Analyses"}
                  </span>
                  <div className="flex-1 bg-[#E6E8E7] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        fileQuota.remaining === 0 ? "bg-red-400" : "bg-[#C5E86C]"
                      )}
                      style={{ width: `${Math.min(100, (fileQuota.used / fileQuota.limit) * 100)}%` }}
                    />
                  </div>
                  <span className={cn("text-[9px] font-bold shrink-0", fileQuota.remaining === 0 ? "text-red-500" : "text-[#183028]/60")}>
                    {fileQuota.used}/{fileQuota.limit}
                  </span>
                </div>
              )}
              {(quota?.remaining === 0 || fileQuota?.remaining === 0) && (
                <p className="text-[9px] text-[#183028]/50 text-center">
                  Resets in {(quota?.resetInDays || fileQuota?.resetInDays)} day{((quota?.resetInDays || fileQuota?.resetInDays) !== 1) ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Message Input Box with Attachment Clip */}

          <div className="p-3 bg-white border-t border-[#E6E8E7] flex items-center space-x-2 shrink-0">
            {isAuthenticated && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={isTyping || isUploading}
                onClick={() => fileInputRef.current?.click()}
                title="Attach draft file (.pdf, .docx, .txt) to scan or remediate"
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
              placeholder={pendingFile ? "Type optional instructions or hit send..." : currentPlaceholder}
              className="bg-[#FAFBFB] border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 h-8 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#183028] disabled:opacity-60"
            />

            <Button
              size="icon"
              disabled={(!inputValue.trim() && !pendingFile) || isTyping || isUploading}
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
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

function ChatHeader({
  isLoginMode,
  role,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}: IChatHeaderProps) {
  return (
    <div className="bg-white text-[#183028] px-4 py-3 flex items-center justify-between border-b border-[#E6E8E7] shrink-0">
      <div className="flex items-center space-x-2.5">
        <div className="relative h-8 w-8 rounded-xl bg-[#C5E86C]/30 border border-[#b4db53] flex items-center justify-center text-[#183028] shadow-2xs">
          <Bot className="h-4 w-4 text-[#183028]" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[#183028] tracking-tight">
              {isLoginMode ? "Compliance Help" : "Neural Copilot"}
            </h3>
            {!isLoginMode && role && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider bg-[#C5E86C] text-[#183028] border border-[#b4db53]">
                {role}
              </span>
            )}
            {isFullscreen && (
              <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[#183028] text-white">
                Fullscreen
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] text-[#183028]/70 mt-0.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Online</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Fullscreen / Back to Normal Button */}
        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[#183028] hover:bg-[#FAFBFB] bg-[#FAFBFB]/70 border border-[#E6E8E7] hover:border-[#183028]/30 transition-all cursor-pointer font-bold text-[10px] shadow-2xs"
          aria-label={isFullscreen ? "Back to normal chatbot size" : "Expand chatbot to fullscreen"}
          title={isFullscreen ? "Back to normal size" : "Fullscreen mode"}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5 text-[#183028]" />
              <span>Back to normal</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5 text-[#183028]" />
              <span>Fullscreen</span>
            </>
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#183028]/60 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          aria-label="Close copilot window"
          title="Close"
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

        {/* Rich Audit & Remediation Card — Advisor only; Officer gets text-only flag summary */}
        {!isUser && message.auditResult && !isCurrentlyTyping && (
          <AuditResultCard
            result={message.auditResult}
            isCopied={copiedId === message.id}
            onCopy={() => onCopy(message.id, message.auditResult!.remediated_content.text)}
          />
        )}

        {/* Officer Supervisory Compliance Flag Scan Card */}
        {!isUser && message.officerAuditResult && !isCurrentlyTyping && (
          <OfficerFlagScanCard result={message.officerAuditResult} />
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
          <div className="mt-3 pt-2 border-t border-[#E6E8E7] flex flex-wrap gap-1.5 items-center">
            {message.submittedAt ? (
              // Already submitted — show badge, hide submit chip to prevent spam
              <>
                <span className="flex items-center gap-1 text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  ✓ Submitted at {message.submittedAt}
                </span>
                {message.suggestedChips
                  .filter((chip) => chip !== "Submit remediated version")
                  .map((chip) => (
                    <button
                      key={chip}
                      onClick={() => onExecuteChip?.(chip)}
                      className="text-[9.5px] font-semibold text-[#183028] hover:bg-[#C5E86C] bg-[#FAFBFB] border border-[#183028]/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      ↳ {chip}
                    </button>
                  ))}
              </>
            ) : (
              message.suggestedChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onExecuteChip?.(chip)}
                  className="text-[9.5px] font-semibold text-[#183028] hover:bg-[#C5E86C] bg-[#FAFBFB] border border-[#183028]/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  ↳ {chip}
                </button>
              ))
            )}
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
  const [submittedDocId, setSubmittedDocId] = useState<string | null>(null);

  const handleDownload = () => {
    // 1. Instant client-side blob download (zero latency, zero round-trip, always works)
    if (result.remediated_content && result.remediated_content.text) {
      const blob = new Blob([result.remediated_content.text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTitle = (result.remediated_content.suggested_title || "Remediated_Proposal")
        .replace(/[^a-zA-Z0-9_\-\s]/g, "")
        .trim();
      link.download = `${safeTitle}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccessToast("Remediated compliant file downloaded.");
      return;
    }

    // 2. Fallback to server endpoint
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
      const res = await copilotApi.submitRemediated({
        text: result.remediated_content.text,
        title: result.remediated_content.suggested_title,
        token: result.remediated_content.token,
        targetDocumentId: result.one_click_actions.target_document_id || undefined,
      });
      const docId = res?.id || res?.data?.id;
      if (docId) {
        setSubmittedDocId(docId);
      }
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

      {/* 1-Click Jump to Review Workspace */}
      {isSubmitted && submittedDocId && (
        <div className="pt-2 animate-fade-in">
          <Link
            href={`/documents/${submittedDocId}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-[#183028] hover:bg-[#23453a] text-[#C5E86C] text-[11px] font-bold transition-all shadow-md cursor-pointer border border-[#C5E86C]/30"
          >
            <FileText className="h-3.5 w-3.5 text-[#C5E86C]" />
            <span>Open Remediated Document in Review Workspace →</span>
          </Link>
        </div>
      )}
    </div>
  );
}

/** Supervisory compliance flag scan card rendered for Officers when they scan a file */
function OfficerFlagScanCard({ result }: { result: IAuditAndFixResponse }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const flagCount = result.audit_breakdown.length;

  const categoryColors: Record<string, string> = {
    PROHIBITED_CLAIM: "bg-rose-100 text-rose-800 border-rose-300",
    MISSING_DISCLOSURE: "bg-amber-100 text-amber-800 border-amber-300",
    SUITABILITY: "bg-orange-100 text-orange-800 border-orange-300",
    PRECEDENT_MATCH: "bg-sky-100 text-sky-800 border-sky-300",
  };

  const categoryLabel: Record<string, string> = {
    PROHIBITED_CLAIM: "Prohibited Claim",
    MISSING_DISCLOSURE: "Missing Disclosure",
    SUITABILITY: "Suitability Risk",
    PRECEDENT_MATCH: "Precedent Match",
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#E6E8E7] space-y-2.5 text-[#183028]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#183028]">
            Supervisory Compliance Scan
          </span>
        </div>
        <span
          className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shadow-2xs ${
            flagCount === 0
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : "bg-rose-100 text-rose-800 border-rose-300"
          }`}
        >
          {flagCount === 0 ? "No Flags" : `${flagCount} Flag${flagCount !== 1 ? "s" : ""} Found`}
        </span>
      </div>

      {/* File meta */}
      <div className="flex items-center gap-2 p-1.5 bg-[#FAFBFB] rounded-lg border border-[#E6E8E7] text-[10px]">
        <FileText className="h-3.5 w-3.5 text-[#183028]/60" />
        <span className="font-semibold text-[#183028] truncate max-w-[220px]">
          {result.file_meta.original_filename}
        </span>
        <span className="text-[#183028]/50">({Math.round(result.file_meta.file_size / 1024)} KB)</span>
      </div>

      {/* Compliant — no flags */}
      {flagCount === 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            No FINRA 2210 / SEC 206(4)-1 infractions detected. Document appears compliant for supervisory review.
          </span>
        </div>
      )}

      {/* Flag breakdown */}
      {flagCount > 0 && (
        <div className="space-y-2 pt-0.5">
          <span className="text-[10px] font-bold text-[#183028] flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Regulatory Infractions Identified:
          </span>

          <div className="space-y-2">
            {result.audit_breakdown.map((item, i) => {
              const catColor = categoryColors[(item as any).category] || "bg-gray-100 text-gray-800 border-gray-300";
              const catLabel = categoryLabel[(item as any).category] || (item as any).category || "Flag";
              const isExpanded = expandedIndex === i;
              return (
                <div
                  key={i}
                  className="bg-white border border-[#E6E8E7] rounded-xl shadow-2xs overflow-hidden"
                >
                  {/* Flag header row — always visible */}
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer hover:bg-[#FAFBFB] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${catColor}`}>
                        {catLabel}
                      </span>
                      <span className="text-[9.5px] font-bold text-[#183028] truncate">
                        {item.rule}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3 text-[#183028]/50 shrink-0 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-[#183028]/50 shrink-0 ml-1" />
                    )}
                  </button>

                  {/* Expanded detail — original passage + issue + recommendation */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-[#E6E8E7]">
                      <p className="text-[9.5px] text-[#183028]/80 pt-2">
                        <span className="font-bold text-rose-700">Issue: </span>
                        {item.issue}
                      </p>

                      <div className="p-1.5 bg-rose-50/80 border border-rose-200 rounded text-[9.5px] text-rose-900 leading-relaxed">
                        <span className="font-bold text-rose-700 block text-[8.5px] uppercase mb-0.5">Flagged Passage:</span>
                        <span className="font-mono">{item.original_passage}</span>
                      </div>

                      <div className="p-1.5 bg-emerald-50/80 border border-emerald-200 rounded text-[9.5px] text-emerald-900 leading-relaxed">
                        <span className="font-bold text-emerald-700 block text-[8.5px] uppercase mb-0.5">Recommended Remediation:</span>
                        <span className="font-semibold">{item.fixed_passage}</span>
                      </div>

                      <p className="text-[8.5px] text-[#183028]/60 italic">
                        <strong>Rationale:</strong> {item.reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-[#183028]/50 italic pt-1">
            Based on FINRA Rule 2210 (Communications with the Public), SEC Rule 206(4)-1 (Investment Adviser Marketing Rule), and FINRA Rule 2111 (Suitability). Advisor must remediate all flagged passages before re-submission.
          </p>
        </div>
      )}
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
        {analytics.breakdown_by_status.Rejected > 0 && (
          <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
            {analytics.breakdown_by_status.Rejected} Rejected
          </span>
        )}
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
