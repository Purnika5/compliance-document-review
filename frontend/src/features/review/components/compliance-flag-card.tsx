/**
 * DOCU: Renders one AI compliance flag and its severity details.
 * Last Updated Date: September 7, 2026
 * @returns The compliance flag card view.
 * @author Keith
 */
import * as React from "react";
import type { IAIFlagItem } from "@/features/documents/components/ai-assist-panel";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronRight, ShieldAlert } from "lucide-react";

export interface ComplianceFlagCardProps {
  flag: IAIFlagItem;
  isSelected?: boolean;
  onSelect: (flag: IAIFlagItem) => void;
}

/**
 * DOCU: Renders a compliance flag with severity and selection behavior.
 * Last Updated Date: September 7, 2026
 * @param props - Flag data and selection callback.
 * @returns The compliance flag card view.
 * @author Keith
 */
export function ComplianceFlagCard({
  flag,
  isSelected = false,
  onSelect,
}: ComplianceFlagCardProps) {
  /**
   * DOCU: Resolves styling class tokens based on flag severity level.
   * Last Updated Date: September 7, 2026
   * @returns Tailwind class string for badge styling.
   * @author Keith
   */
  const getSeverityBadge = () => {
    switch (flag.severity) {
      case "HIGH":
        return "bg-[hsl(0_50%_97%)] text-[hsl(0_65%_38%)] border-[hsl(0_40%_86%)]";
      case "MEDIUM":
        return "bg-[hsl(35_80%_96%)] text-[hsl(28_85%_32%)] border-[hsl(30_50%_84%)]";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div
      onClick={() => onSelect(flag)}
      className={cn(
        "p-3 rounded border text-left transition-all cursor-pointer bg-white",
        isSelected
          ? "border-slate-900 ring-1 ring-slate-900 bg-slate-50/80 shadow-xs"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className={cn(
            "px-1.5 py-0.2 text-[10px] font-bold rounded border uppercase tracking-wider",
            getSeverityBadge()
          )}
        >
          {flag.severity} • Rule {flag.ruleCode}
        </span>
        <span className="text-[10px] font-mono text-slate-500">Page {flag.pageNumber}</span>
      </div>

      <h4 className="text-xs font-bold text-slate-900 leading-snug">{flag.title}</h4>

      <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[11px] space-y-0.5">
        <span className="font-semibold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-500">
          Document Passage
        </span>
        <p className="italic font-serif leading-relaxed">{`"${flag.passage}"`}</p>
      </div>

      <div className="mt-2 text-[11px] text-slate-600 leading-normal">
        <strong className="text-slate-800">Rule Logic: </strong>
        {flag.explanation}
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span>Confidence: <strong>{flag.confidenceScore}%</strong></span>
        <span className="font-semibold text-slate-800 flex items-center gap-0.5 hover:text-slate-950">
          Highlight in Document <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
