/**
 * DOCU: Renders one AI compliance flag and its severity details adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The compliance flag card view.
 * @author Keith
 */
import * as React from "react";
import type { IAIFlagItem } from "@/features/documents/components/ai-assist-panel";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface ComplianceFlagCardProps {
  flag: IAIFlagItem;
  isSelected?: boolean;
  onSelect: (flag: IAIFlagItem) => void;
}

export function ComplianceFlagCard({
  flag,
  isSelected = false,
  onSelect,
}: ComplianceFlagCardProps) {
  const getSeverityBadge = () => {
    switch (flag.severity) {
      case "HIGH":
        return "bg-rose-950/60 text-rose-300 border-rose-800/60 shadow-[0_0_8px_rgba(244,63,94,0.12)]";
      case "MEDIUM":
        return "bg-amber-950/60 text-amber-300 border-amber-800/60 shadow-[0_0_8px_rgba(245,158,11,0.12)]";
      case "LOW":
      default:
        return "bg-secondary text-muted-foreground border-border";
    }
  };

  return (
    <div
      onClick={() => onSelect(flag)}
      className={cn(
        "p-3 rounded-lg border text-left transition-all cursor-pointer bg-card/60",
        isSelected
          ? "border-emerald-800/60 ring-1 ring-emerald-600/40 bg-[#062a20] shadow-xs"
          : "border-border bg-transparent hover:border-emerald-800/40 hover:bg-[#062a20]/40"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className={cn(
            "px-1.5 py-0.2 text-[10px] font-semibold rounded border uppercase tracking-wider",
            getSeverityBadge()
          )}
        >
          {flag.severity} • Rule {flag.ruleCode}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">Page {flag.pageNumber}</span>
      </div>

      <h4 className="text-xs font-semibold text-foreground leading-snug">{flag.title}</h4>

      <div className="mt-2 p-2 rounded-md bg-secondary/50 border border-border text-foreground/90 text-[11px] space-y-0.5">
        <span className="font-semibold block text-[10px] uppercase tracking-wider text-muted-foreground">
          Document Passage
        </span>
        <p className="italic font-serif leading-relaxed text-foreground/90">{`"${flag.passage}"`}</p>
      </div>

      <div className="mt-2 text-[11px] text-muted-foreground leading-normal">
        <strong className="text-foreground/90">Rule Logic: </strong>
        {flag.explanation}
      </div>

      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Confidence: <strong className="text-foreground">{flag.confidenceScore}%</strong></span>
        <span className="font-medium text-emerald-400 flex items-center gap-0.5 hover:underline">
          Highlight in Document <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
