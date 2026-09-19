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
        return "bg-rose-50 text-rose-900 border-rose-300";
      case "MEDIUM":
        return "bg-amber-50 text-amber-900 border-amber-300";
      case "LOW":
      default:
        return "bg-[#E6E8E7]/50 text-[#183028] border-[#E6E8E7]";
    }
  };

  return (
    <div
      onClick={() => onSelect(flag)}
      className={cn(
        "p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs",
        isSelected
          ? "border-[#183028] ring-1 ring-[#183028] bg-[#C5E86C]/15"
          : "border-[#E6E8E7] bg-white hover:border-[#183028] hover:bg-[#C5E86C]/10"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className={cn(
            "px-1.5 py-0.5 text-[10px] font-bold rounded-lg border uppercase tracking-wider font-mono",
            getSeverityBadge()
          )}
        >
          {flag.severity} • Rule {flag.ruleCode}
        </span>
        <span className="text-[10px] font-mono text-[#183028]/60">Page {flag.pageNumber}</span>
      </div>

      <h4 className="text-xs font-semibold text-[#183028] leading-snug">{flag.title}</h4>

      <div className="mt-2 p-2 rounded-lg bg-[#E6E8E7]/20 border border-[#E6E8E7] text-[#183028] text-[11px] space-y-0.5">
        <span className="font-semibold block text-[10px] uppercase tracking-wider text-[#183028]/50">
          Document Passage
        </span>
        <p className="italic font-serif leading-relaxed text-[#183028]/90">{`"${flag.passage}"`}</p>
      </div>

      <div className="mt-2 text-[11px] text-[#183028]/70 leading-normal">
        <strong className="text-[#183028]">Rule Logic: </strong>
        {flag.explanation}
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#E6E8E7] flex items-center justify-between text-[10px] text-[#183028]/60">
        <span>Confidence: <strong className="text-[#183028]">{flag.confidenceScore}%</strong></span>
        <span className="font-medium text-[#183028] flex items-center gap-0.5 hover:underline">
          Highlight in Document <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
