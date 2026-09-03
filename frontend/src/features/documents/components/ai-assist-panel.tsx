"use client";

import React, { useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Send,
  RefreshCw,
  Bot,
  ShieldAlert,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface IAIFlagItem {
  id: string;
  ruleCode: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  passage: string;
  explanation: string;
  confidenceScore: number;
  pageNumber: number;
}

export const MOCK_AI_FLAGS: IAIFlagItem[] = [
  {
    id: "flag-1",
    ruleCode: "FD-2.1.3",
    severity: "HIGH",
    title: "Undisclosed Beneficial Ownership in REIT Holding",
    passage: "15.0% allocation to offshore Private Real Estate Trust without designated beneficiary declaration schedule.",
    explanation:
      "Rule FD-2.1.3 mandates clear beneficial ownership identification for private trust holdings exceeding 10% of total allocation.",
    confidenceScore: 94,
    pageNumber: 1,
  },
  {
    id: "flag-2",
    ruleCode: "SEC-17a-4",
    severity: "MEDIUM",
    title: "Missing 5-Year Volatility Benchmark Table",
    passage: "Target yield modeled at +9.4% without historical drawdown sensitivity documentation.",
    explanation:
      "SEC Rule 17a-4 requires explicit risk disclosure tables alongside prospective return projections.",
    confidenceScore: 88,
    pageNumber: 1,
  },
  {
    id: "flag-3",
    ruleCode: "COMP-4.0",
    severity: "LOW",
    title: "Client Risk Tolerance Questionnaire Copy Pending",
    passage: "Proposal indicates Aggressive Growth profile without attached stamped suitability score.",
    explanation:
      "Advisory standard requires client-signed suitability forms within 30 days of allocation submission.",
    confidenceScore: 76,
    pageNumber: 3,
  },
];

const SUGGESTED_PROMPTS = [
  "Summarize this document",
  "Explain this flag",
  "Show applicable rules",
  "What information is missing?",
];

export interface AIAssistPanelProps {
  documentId: string;
  selectedFlagId: string | null;
  onSelectFlag: (flag: IAIFlagItem) => void;
}

export function AIAssistPanel({
  documentId,
  selectedFlagId,
  onSelectFlag,
}: AIAssistPanelProps) {
  const [flags] = useState<IAIFlagItem[]>(MOCK_AI_FLAGS);
  const [activeTab, setActiveTab] = useState<"flags" | "copilot">("flags");
  const [isAiAvailable, setIsAiAvailable] = useState<boolean>(true);
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: "ai" | "user"; text: string }>
  >([
    {
      id: "msg-1",
      sender: "ai",
      text: "Compliance pre-audit completed. 1 high-severity item flagged under Rule FD-2.1.3 regarding offshore trust beneficial ownership. Document remains open for manual officer determination.",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messageIdRef = useRef(0);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    const userMsgId = `user-${++messageIdRef.current}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", text }]);
    setInputVal("");
    setIsTyping(true);

    setTimeout(() => {
      let reply = "Compliance documentation verified against FINRA Rule 2111 suitability standards.";
      if (text.toLowerCase().includes("summarize")) {
        reply =
          "Executive Summary: 45% Global Equities, 30% Sovereign Bonds, 15% Private REIT, 10% Cash. Primary regulatory flag is undisclosed foreign beneficial ownership in Section 3.";
      } else if (text.toLowerCase().includes("flag") || text.toLowerCase().includes("fd-2.1.3")) {
        reply =
          "Flag FD-2.1.3: Foreign real estate holdings exceeding 10% must include certified beneficial ownership affidavits from the managing partner.";
      } else if (text.toLowerCase().includes("rules")) {
        reply =
          "Applicable Rules: • Rule FD-2.1.3 (Foreign Asset Disclosures) • SEC Rule 17a-4 (Books and Records) • FINRA Rule 2111 (Suitability Standard).";
      } else if (text.toLowerCase().includes("missing")) {
        reply =
          "Missing items: 1. Secondary beneficial ownership declaration. 2. 5-year volatility benchmark table. 3. Signed client risk questionnaire copy.";
      }

      setMessages((prev) => [
        ...prev,
        { id: `ai-${++messageIdRef.current}`, sender: "ai", text: reply },
      ]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <div className="neu-surface rounded-xl overflow-hidden h-full flex flex-col text-xs">
      {/* Panel Top Header */}
      <div className="glass-accent text-white px-3.5 py-2.5 flex items-center justify-between border-b border-cyan-300/40 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-md bg-indigo-950/80 border border-cyan-300/40 flex items-center justify-center font-bold text-cyan-300">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <span>AI Compliance Guidance</span>
              <span className="font-mono text-[10px] text-cyan-100">({documentId})</span>
            </h3>
          </div>
        </div>

        <button
          onClick={() => setIsAiAvailable((prev) => !prev)}
          className="text-[10px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isAiAvailable ? "Simulate Outage" : "Restore System"}
        </button>
      </div>

      {/* Institutional Framing Notice (Never AI Decision Maker) */}
          <div className="detail-highlight p-2.5 text-slate-700 text-[11px] flex items-start gap-2 shrink-0">
        <ShieldAlert className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
        <p className="leading-snug">
          <strong>Advisory Guidance Only:</strong> AI suggests potential compliance rules and highlights passages. Final determination rests solely with the Compliance Officer.
        </p>
      </div>

      {/* Outage / Offline Fallback State */}
      {!isAiAvailable ? (
        <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/70">
          <div className="h-10 w-10 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h4 className="text-xs font-bold text-slate-900">
              AI Assistance Temporarily Unavailable
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Manual document inspection and officer decision workflows remain fully functional.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAiAvailable(true)}
            className="h-8 px-3 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Connection</span>
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab Switcher */}
            <div className="flex border-b border-white/70 bg-background/60 p-1 shrink-0">
            <button
              onClick={() => setActiveTab("flags")}
              className={cn(
                "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                activeTab === "flags"
                  ? "bg-white text-slate-900 border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Rule Flags ({flags.length})
            </button>
            <button
              onClick={() => setActiveTab("copilot")}
              className={cn(
                "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                activeTab === "copilot"
                  ? "bg-white text-slate-900 border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Regulatory Copilot
            </button>
          </div>

          {activeTab === "flags" ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Risk Overview Header Card */}
              <div className="detail-highlight rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pre-Audit Risk Score
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-slate-900">EVALUATION PENDING</span>
                    <span className="text-[10px] text-slate-500">• 1 High, 1 Med, 1 Low</span>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded bg-red-50 text-red-900 border border-red-200 font-mono font-bold text-xs">
                  84% Conf.
                </div>
              </div>

              {/* Flags List */}
              <div className="space-y-2">
                {flags.map((flag) => {
                  const isSelected = selectedFlagId === flag.id;

                  return (
                    <div
                      key={flag.id}
                      onClick={() => onSelectFlag(flag)}
                      className={cn(
                        "p-3 rounded border text-left transition-colors cursor-pointer",
                        isSelected
                          ? "bg-cyan-50 border-cyan-500 ring-2 ring-cyan-400 shadow-[inset_0_0_0_1px_hsl(190_80%_48%)]"
                          : "bg-white border-slate-200 hover:border-cyan-300"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={cn(
                            "px-1.5 py-0.2 text-[10px] font-bold rounded border uppercase tracking-wider font-mono",
                            flag.severity === "HIGH" && "bg-red-50 text-red-800 border-red-200",
                            flag.severity === "MEDIUM" && "bg-amber-50 text-amber-800 border-amber-200",
                            flag.severity === "LOW" && "bg-slate-100 text-slate-800 border-slate-200"
                          )}
                        >
                          {flag.severity} • Rule {flag.ruleCode}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Page {flag.pageNumber}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{flag.title}</h4>

                      <div className="detail-highlight rounded-lg mt-1.5 p-2 text-slate-700 text-[11px] space-y-0.5">
                        <span className="font-semibold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-500">
                          Flagged Passage
                        </span>
                        <p className="italic font-serif leading-relaxed">{`"${flag.passage}"`}</p>
                      </div>

                      <p className="mt-1.5 text-[11px] text-slate-600 leading-normal">
                        <strong className="text-slate-800">Rule Rationale: </strong>
                        {flag.explanation}
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Confidence: <strong>{flag.confidenceScore}%</strong></span>
                        <span className="font-semibold text-primary flex items-center gap-0.5">
                          Inspect on Canvas <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
                  <div className="flex-1 flex flex-col min-h-0 bg-background/45">
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "p-2.5 rounded text-xs leading-relaxed max-w-[88%]",
                      m.sender === "user"
                        ? "ml-auto glass-pink text-white"
                        : "mr-auto neu-soft text-slate-800"
                    )}
                  >
                    {m.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-200 w-28">
                    Analyzing rules...
                  </div>
                )}
              </div>

              <div className="px-2.5 py-1.5 bg-white border-t border-slate-200 flex gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="whitespace-nowrap text-[10px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer shrink-0"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5 shrink-0">
                <Input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Inquire about compliance citations..."
                  className="neu-inset h-8 text-xs rounded-md focus-visible:bg-background"
                />
                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  className="h-8 w-8 bg-primary hover:bg-primary/90 text-white rounded-md shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
