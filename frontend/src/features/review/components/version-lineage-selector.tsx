"use client";

/**
 * DOCU: Version Lineage Selector component for compliance document review.
 * Allows officers to toggle between historical versions (v1, v2) to review previous feedback,
 * creation timestamps, officer revision remarks, and comparative AI analysis.
 * Last Updated Date: September 18, 2026
 * @author Keith
 */
import React from "react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/lib/validation/document";

export interface LineageEntry {
  id: string;
  threadId: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  entryType: string;
  message: string;
  createdAt: string;
}

export interface VersionLineageSelectorProps {
  versions: (DocumentItem & { version: number })[];
  activeVersionId: string;
  threadEntries?: LineageEntry[];
  onSelectVersion: (version: DocumentItem & { version: number }) => void;
  isLoading?: boolean;
}

export function VersionLineageSelector({
  versions,
  activeVersionId,
  threadEntries = [],
  onSelectVersion,
  isLoading = false,
}: VersionLineageSelectorProps) {
  if (isLoading) {
    return (
      <div className="border border-[#E6E8E7] bg-white rounded-2xl p-4 shadow-2xs animate-pulse">
        <div className="h-4 bg-muted/60 rounded w-48 mb-3" />
        <div className="flex gap-2">
          <div className="h-9 bg-muted/40 rounded-xl w-24" />
          <div className="h-9 bg-muted/40 rounded-xl w-24" />
        </div>
      </div>
    );
  }

  // Sort versions by version number ascending (v1, v2, ...)
  const sortedVersions = [...versions].sort((a, b) => a.version - b.version);
  const activeVersion = sortedVersions.find((v) => v.id === activeVersionId) || sortedVersions[sortedVersions.length - 1];

  if (sortedVersions.length === 0) {
    return null;
  }

  // Find officer revision remarks across thread entries
  // Remarks associated specifically with the selected version, or from the previous version if active is v2
  const activeVersionRemarks = threadEntries.filter(
    (e) => (e.entryType === "decision" || e.authorRole === "Officer") && e.documentId === activeVersion?.id
  );

  // If active is v2+, find previous version's officer revision remarks that led to this revision
  const previousVersion = sortedVersions.find((v) => v.version === (activeVersion?.version || 1) - 1);
  const previousOfficerRemarks = previousVersion
    ? threadEntries.filter(
        (e) => (e.entryType === "decision" || e.authorRole === "Officer") && e.documentId === previousVersion.id
      )
    : [];

  // Find advisor submission notes for active version
  const advisorSubmissionNote = threadEntries.find(
    (e) => e.documentId === activeVersion?.id && (e.entryType === "submission" || e.authorRole === "Advisor")
  );

  return (
    <div className="border border-[#E6E8E7] bg-white text-[#183028] rounded-2xl p-4 shadow-2xs space-y-3.5 transition-all">
      {/* Top Lineage Bar: Header and Version Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E8E7] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#183028] text-[#C5E86C] flex items-center justify-center shrink-0">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#183028] tracking-tight">
                Version Lineage &amp; History
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#183028]/10 text-[#183028]">
                {sortedVersions.length} {sortedVersions.length === 1 ? "Version" : "Versions"} Linked
              </span>
            </div>
            <p className="text-[11px] text-[#183028]/60 mt-0.5">
              Toggle between historical revisions to compare document text, changes, and AI analysis.
            </p>
          </div>
        </div>

        {/* Version Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {sortedVersions.map((ver) => {
            const isActive = ver.id === activeVersion?.id;
            return (
              <button
                key={ver.id}
                type="button"
                onClick={() => onSelectVersion(ver)}
                style={{
                  backgroundColor: isActive ? "#C5E86C" : undefined,
                  color: isActive ? "#183028" : undefined,
                  borderColor: isActive ? "#A8CE4A" : undefined,
                }}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 border shrink-0",
                  isActive
                    ? "bg-[#C5E86C] text-[#183028] border-[#A8CE4A] font-bold shadow-xs ring-2 ring-[#C5E86C]/40"
                    : "bg-white text-[#183028] border-[#E6E8E7] hover:bg-[#C5E86C]/20 hover:border-[#183028]"
                )}
              >
                <span
                  style={{ color: isActive ? "#183028" : undefined }}
                  className="font-bold font-mono text-[#183028]"
                >
                  v{ver.version}
                </span>
                <span
                  style={{ color: isActive ? "#183028" : undefined }}
                  className={cn("text-[10px]", isActive ? "font-semibold text-[#183028]" : "opacity-80")}
                >
                  {ver.version === 1 ? "Initial" : `Revision ${ver.version - 1}`}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase",
                    isActive
                      ? "bg-white/90 text-[#183028] border border-[#183028]/20 shadow-2xs"
                      : ver.status === "Approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : ver.status === "Needs Revision"
                      ? "bg-amber-100 text-amber-800"
                      : ver.status === "Rejected"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-blue-100 text-blue-800"
                  )}
                >
                  {ver.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
