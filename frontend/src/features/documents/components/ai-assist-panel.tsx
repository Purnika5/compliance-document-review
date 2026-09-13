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
} from "lucide-react";
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

export interface AIAssistPanelProps {
  documentId: string;
  flags?: IAIFlagItem[];
  selectedFlagId?: string | null;
  onSelectFlag?: (flag: IAIFlagItem) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function AIAssistPanel({
  documentId,
  flags = [],
  selectedFlagId = null,
  onSelectFlag,
  isLoading = false,
  onRefresh,
}: AIAssistPanelProps) {
  const [activeTab, setActiveTab] = useState<"flags" | "copilot">("flags");

  const highSeverityCount = flags.filter((f) => f.severity === "HIGH").length;
  const mediumSeverityCount = flags.filter((f) => f.severity === "MEDIUM").length;
  const lowSeverityCount = flags.filter((f) => f.severity === "LOW").length;

  return (
    <div className="border border-border bg-card text-card-foreground rounded-xl overflow-hidden h-full flex flex-col text-xs shadow-xs">
      {/* Panel Top Header */}
      <div className="border-b border-border bg-muted/40 text-foreground px-3.5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <span>AI Compliance Guidance</span>
              <span className="font-mono text-[10px] text-muted-foreground">({documentId})</span>
            </h3>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            disabled={isLoading}
            onClick={onRefresh}
            title="Refresh AI Analysis"
            className="p-1.5 rounded-md text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062A20] transition-colors cursor-pointer border border-transparent hover:border-emerald-800/60 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-emerald-400")} />
          </button>
        )}
      </div>

      {/* Institutional Framing Notice (Never AI Decision Maker) */}
      <div className="border-b border-border bg-muted/20 p-2.5 text-muted-foreground text-[11px] flex items-start gap-2 shrink-0">
        <ShieldAlert className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="leading-snug">
          <strong className="text-foreground">Advisory Guidance Only:</strong> AI suggests potential compliance rules and highlights passages. Final determination rests solely with the Compliance Officer.
        </p>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-muted/20 p-1 shrink-0 gap-1">
          <button
            onClick={() => setActiveTab("flags")}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
              activeTab === "flags"
                ? "bg-[#062A20] text-[#54d0a2] border border-emerald-800/60 font-bold shadow-xs"
                : "bg-transparent text-muted-foreground hover:bg-[#062A20] hover:text-[#54d0a2]"
            )}
          >
            Rule Flags ({flags.length})
          </button>
          <button
            onClick={() => setActiveTab("copilot")}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
              activeTab === "copilot"
                ? "bg-[#062A20] text-[#54d0a2] border border-emerald-800/60 font-bold shadow-xs"
                : "bg-transparent text-muted-foreground hover:bg-[#062A20] hover:text-[#54d0a2]"
            )}
          >
            Regulatory Copilot
          </button>
        </div>

        {activeTab === "flags" ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 animate-fade-in">
                <div className="h-10 w-10 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shrink-0">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-xs font-bold text-foreground">Evaluating Compliance Rules</h4>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    AI engine is scanning document text for regulatory rules, disclosures, and suitability guidelines...
                  </p>
                </div>
                <div className="w-full space-y-2 pt-2">
                  <div className="h-16 rounded-lg bg-muted/30 border border-border/40 animate-pulse" />
                  <div className="h-16 rounded-lg bg-muted/30 border border-border/40 animate-pulse" />
                  <div className="h-16 rounded-lg bg-muted/30 border border-border/40 animate-pulse" />
                </div>
              </div>
            ) : flags.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/25 text-primary flex items-center justify-center">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-xs font-bold text-foreground">No Compliance Flags Recorded</h4>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    This document has no automated regulatory flags. The compliance officer may proceed with manual review and determination.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Risk Overview Header Card */}
                <div className="border border-border/80 bg-muted/30 rounded-lg p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Pre-Audit Flag Summary
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-foreground">REVIEW PENDING</span>
                      <span className="text-[10px] text-muted-foreground">
                        • {highSeverityCount} High, {mediumSeverityCount} Med, {lowSeverityCount} Low
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 font-mono font-bold text-xs">
                    {flags.length} {flags.length === 1 ? "Issue" : "Issues"}
                  </div>
                </div>

                {/* Flags List */}
                <div className="space-y-2">
                  {flags.map((flag) => {
                    const isSelected = selectedFlagId === flag.id;

                    return (
                      <div
                        key={flag.id}
                        onClick={() => onSelectFlag?.(flag)}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[#062a20] border-emerald-800/60 ring-1 ring-emerald-600/40 shadow-2xs"
                            : "bg-transparent border-border hover:border-emerald-800/40 hover:bg-[#062a20]/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider font-mono",
                              flag.severity === "HIGH" && "bg-destructive/15 text-destructive border-destructive/30",
                              flag.severity === "MEDIUM" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                              flag.severity === "LOW" && "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {flag.severity} • Rule {flag.ruleCode}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Page {flag.pageNumber}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-foreground leading-snug">{flag.title}</h4>

                        {flag.passage && (
                          <div className="border border-border/70 bg-muted/30 rounded-lg mt-1.5 p-2 text-foreground/90 text-[11px] space-y-0.5">
                            <span className="font-semibold block text-[10px] uppercase tracking-wider text-muted-foreground">
                              Flagged Passage
                            </span>
                            <p className="italic font-serif leading-relaxed text-foreground/80">{`"${flag.passage}"`}</p>
                          </div>
                        )}

                        <p className="mt-1.5 text-[11px] text-muted-foreground leading-normal">
                          <strong className="text-foreground">Rule Rationale: </strong>
                          {flag.explanation}
                        </p>

                        <div className="mt-2 pt-2 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Confidence: <strong className="text-foreground/80">{flag.confidenceScore}%</strong></span>
                          <span className="font-semibold text-primary flex items-center gap-0.5">
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
          <div className="flex-1 flex flex-col min-h-0 bg-card p-6 text-center justify-center items-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-xs font-bold text-foreground">Institutional Copilot Standby</h4>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Direct compliance Q&amp;A operates in tandem with backend review models. Review decisions and notes can be recorded through the Officer Decision Suite.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
