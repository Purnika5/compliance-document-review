"use client";

/**
 * DOCU: Renders AI-generated compliance flags and document assistance controls.
 * Last Updated Date: September 8, 2026
 * @returns The AI assistance panel view.
 * @author Keith
 */
import React, { useState } from "react";
import {
  ChevronRight,
  Bot,
  ShieldAlert,
  FileCheck,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { unmaskText } from "@/utils/pii-unmasker";

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

export interface AIAssistPanelProps {
  documentId: string;
  flags?: IAIFlagItem[];
  selectedFlagId?: string | null;
  onSelectFlag?: (flag: IAIFlagItem) => void;
  isLoading?: boolean;
  isDegraded?: boolean;
  onRefresh?: () => void;
  isUnmasked?: boolean;
  onToggleUnmask?: () => void;
  piiMap?: Record<string, string>;
  isOfficer?: boolean;
}

export function AIAssistPanel({
  documentId,
  flags = [],
  selectedFlagId = null,
  onSelectFlag,
  isLoading = false,
  isDegraded = false,
  onRefresh,
  isUnmasked = false,
  onToggleUnmask,
  piiMap = {},
  isOfficer = false,
}: AIAssistPanelProps) {
  const [activeTab, setActiveTab] = useState<"flags" | "copilot">("flags");

  const highSeverityCount = flags.filter((f) => f.severity === "HIGH").length;
  const mediumSeverityCount = flags.filter((f) => f.severity === "MEDIUM").length;
  const lowSeverityCount = flags.filter((f) => f.severity === "LOW").length;

  return (
    <div className="border border-[#E6E8E7] bg-white text-[#183028] rounded-2xl overflow-hidden h-full flex flex-col text-xs shadow-2xs">
      {/* Panel Top Header */}
      <div className="border-b border-[#E6E8E7] bg-white text-[#183028] px-3.5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-xl bg-[#E6E8E7]/40 border border-[#E6E8E7] flex items-center justify-center font-bold text-[#183028]">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#183028] flex items-center gap-1.5">
              <span>AI Compliance Guidance</span>
              <span className="font-mono text-[10px] text-[#183028]/60">(DOC-{(documentId || "0000").slice(-4).toUpperCase()})</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onRefresh && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onRefresh}
              title="Refresh AI Analysis"
              className="p-1.5 rounded-xl text-[#183028]/60 hover:text-[#183028] hover:bg-[#C5E86C]/20 transition-colors cursor-pointer border border-[#E6E8E7] disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-[#183028]")} />
            </button>
          )}
        </div>
      </div>

      {/* Institutional Framing Notice (Never AI Decision Maker) */}
      <div className="border-b border-[#E6E8E7] bg-[#E6E8E7]/20 p-2.5 text-[#183028]/70 text-[11px] flex items-start gap-2 shrink-0">
        <ShieldAlert className="h-3.5 w-3.5 text-[#183028] mt-0.5 shrink-0" />
        <p className="leading-snug">
          <strong className="text-[#183028]">Advisory Guidance Only:</strong> AI suggests potential compliance rules and highlights passages. Final determination rests solely with the Compliance Officer.
        </p>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab Switcher */}
        <div className="flex border-b border-[#E6E8E7] bg-white p-1.5 shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("flags")}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer",
              activeTab === "flags"
                ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
            )}
          >
            Compliance Flags ({flags.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("copilot")}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer",
              activeTab === "copilot"
                ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
            )}
          >
            Regulatory Copilot
          </button>
        </div>

        {activeTab === "flags" ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 animate-fade-in">
                <div className="h-10 w-10 rounded-full bg-[#E6E8E7]/40 border border-[#E6E8E7] text-[#183028] flex items-center justify-center shrink-0">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-xs font-bold text-[#183028]">Evaluating Compliance Rules</h4>
                  <p className="text-[11px] text-[#183028]/60 leading-normal">
                    AI engine is scanning document text for regulatory rules, disclosures, and suitability guidelines...
                  </p>
                </div>
                <div className="w-full space-y-2 pt-2">
                  <div className="h-16 rounded-xl bg-[#E6E8E7]/30 border border-[#E6E8E7] animate-pulse" />
                  <div className="h-16 rounded-xl bg-[#E6E8E7]/30 border border-[#E6E8E7] animate-pulse" />
                  <div className="h-16 rounded-xl bg-[#E6E8E7]/30 border border-[#E6E8E7] animate-pulse" />
                </div>
              </div>
            ) : isDegraded ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 animate-fade-in">
                <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono uppercase tracking-wider font-semibold">
                    Graceful Degradation Active
                  </div>
                  <h4 className="text-xs font-bold text-foreground">AI Review Engine Offline</h4>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Automated rule scanning is temporarily paused due to upstream resilience fail-safe. Document review, decision logging, and audit trails remain fully functional.
                  </p>
                </div>
              </div>
            ) : flags.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                <div className="h-10 w-10 rounded-full bg-[#C5E86C]/20 border border-[#C5E86C] text-[#183028] flex items-center justify-center">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-xs font-bold text-[#183028]">No Compliance Flags Recorded</h4>
                  <p className="text-[11px] text-[#183028]/60 leading-normal">
                    This document has no automated regulatory flags. The compliance officer may proceed with manual review and determination.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Risk Overview Header Card */}
                <div className="border border-[#E6E8E7] bg-white rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50">
                      Pre-Audit Flag Summary
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-[#183028]">REVIEW PENDING</span>
                      <span className="text-[10px] text-[#183028]/60">
                        • {highSeverityCount} High, {mediumSeverityCount} Med, {lowSeverityCount} Low
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded-lg bg-[#C5E86C]/30 text-[#183028] border border-[#C5E86C] font-mono font-bold text-xs">
                    {flags.length} {flags.length === 1 ? "Issue" : "Issues"}
                  </div>
                </div>

                {/* Flags List */}
                <div className="space-y-2">
                  {flags.map((flag) => {
                    const isSelected = selectedFlagId === flag.id;
                    const displayTitle = isUnmasked ? unmaskText(flag.title, piiMap) : flag.title;
                    const displayPassage = isUnmasked ? unmaskText(flag.passage, piiMap) : flag.passage;
                    const displayExplanation = isUnmasked ? unmaskText(flag.explanation, piiMap) : flag.explanation;

                    return (
                      <div
                        key={flag.id}
                        onClick={() => onSelectFlag?.(flag)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-colors cursor-pointer shadow-2xs",
                          isSelected
                            ? "bg-[#C5E86C]/15 border-[#183028] ring-1 ring-[#183028]"
                            : "bg-white border-[#E6E8E7] hover:border-[#183028] hover:bg-[#C5E86C]/10"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] font-bold rounded-lg border uppercase tracking-wider font-mono",
                                flag.severity === "HIGH" && "bg-rose-50 text-rose-900 border-rose-300",
                                flag.severity === "MEDIUM" && "bg-amber-50 text-amber-900 border-amber-300",
                                flag.severity === "LOW" && "bg-[#E6E8E7]/50 text-[#183028] border-[#E6E8E7]"
                              )}
                            >
                              {flag.severity} • Rule {flag.ruleCode}
                            </span>
                            {isUnmasked && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                                Raw PII Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#183028]/60 font-mono">
                            Page {flag.pageNumber}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-[#183028] leading-snug">{displayTitle}</h4>

                        {displayPassage && (
                          <div className="border border-[#E6E8E7] bg-[#E6E8E7]/20 rounded-lg mt-1.5 p-2 text-[#183028] text-[11px] space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold block text-[10px] uppercase tracking-wider text-[#183028]/50">
                                Flagged Passage
                              </span>
                              {isUnmasked && (
                                <span className="text-[9px] font-semibold text-amber-800 italic">
                                  Display-Layer Unmasked
                                </span>
                              )}
                            </div>
                            <p className="italic font-serif leading-relaxed text-[#183028]/90">{`"${displayPassage}"`}</p>
                          </div>
                        )}

                        <p className="mt-1.5 text-[11px] text-[#183028]/70 leading-normal">
                          <strong className="text-[#183028]">Rule Rationale: </strong>
                          {displayExplanation}
                        </p>

                        <div className="mt-2 pt-2 border-t border-[#E6E8E7] flex items-center justify-between text-[10px] text-[#183028]/60">
                          <span>Confidence: <strong className="text-[#183028]">{flag.confidenceScore}%</strong></span>
                          <span className="font-semibold text-[#183028] flex items-center gap-0.5">
                            Inspect on Canvas <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-white p-6 text-center justify-center items-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-[#E6E8E7]/30 border border-[#E6E8E7] flex items-center justify-center text-[#183028]">
              <Bot className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-xs font-bold text-[#183028]">Institutional Copilot Standby</h4>
              <p className="text-[11px] text-[#183028]/60 leading-normal">
                Direct compliance Q&amp;A operates in tandem with backend review models. Review decisions and notes can be recorded through the Officer Decision Suite.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
