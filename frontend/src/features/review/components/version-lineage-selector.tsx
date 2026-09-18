"use client";

/**
 * DOCU: Version Lineage Selector component for compliance document review.
 * Allows officers to toggle between historical versions (v1, v2) to review previous feedback,
 * creation timestamps, officer revision remarks, and comparative AI analysis.
 * Last Updated Date: September 18, 2026
 * @author Keith
 */
import React from "react";
import { GitBranch, Clock, AlertCircle, CheckCircle2, User, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
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

      {/* Selected Version Metadata & Timestamps */}
      {activeVersion && (
        <div className="space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#183028]/80 bg-[#E6E8E7]/30 px-3 py-2 rounded-xl border border-[#E6E8E7]">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#183028]/60" />
                <span className="font-semibold text-[#183028]">
                  Created / Submitted:
                </span>
                <span className="font-mono font-medium">
                  {activeVersion.submittedAt
                    ? new Date(activeVersion.submittedAt).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recently"}
                </span>
              </div>

              <div className="h-3 w-px bg-[#E6E8E7] hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#183028]/60" />
                <span className="font-semibold text-[#183028]">Advisor:</span>
                <span>{activeVersion.submittedBy || "Advisor"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#183028]/60 uppercase tracking-wider font-semibold">
                Lifecycle Status:
              </span>
              <StatusBadge status={activeVersion.status} />
            </div>
          </div>

          {/* Previous Officer Revision Remarks (Critical for compliance review) */}
          {activeVersionRemarks.length > 0 && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                  <span>Officer Revision Remarks for v{activeVersion.version}</span>
                </div>
                <span className="text-[10px] text-amber-700 font-mono">
                  {new Date(activeVersionRemarks[activeVersionRemarks.length - 1].createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-amber-950 font-medium leading-relaxed pl-5 text-[11px] italic">
                &ldquo;{activeVersionRemarks[activeVersionRemarks.length - 1].message}&rdquo;
              </p>
              <p className="text-[10px] text-amber-800/80 pl-5">
                Recorded by {activeVersionRemarks[activeVersionRemarks.length - 1].authorName} (
                {activeVersionRemarks[activeVersionRemarks.length - 1].authorRole})
              </p>
            </div>
          )}

          {/* If viewing v2 and v1 had remarks, show the preceding feedback that prompted this version */}
          {activeVersion.version > 1 && previousOfficerRemarks.length > 0 && activeVersionRemarks.length === 0 && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
                  <span>Preceding Officer Revision Feedback (from v{previousVersion?.version})</span>
                </div>
                <span className="text-[10px] text-amber-700 font-mono">
                  {new Date(previousOfficerRemarks[previousOfficerRemarks.length - 1].createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-amber-950 font-medium leading-relaxed pl-5 text-[11px] italic">
                &ldquo;{previousOfficerRemarks[previousOfficerRemarks.length - 1].message}&rdquo;
              </p>
              <p className="text-[10px] text-amber-800/80 pl-5">
                Feedback issued by {previousOfficerRemarks[previousOfficerRemarks.length - 1].authorName} (
                {previousOfficerRemarks[previousOfficerRemarks.length - 1].authorRole})
              </p>
            </div>
          )}

          {/* Advisor Resubmission Response Note */}
          {advisorSubmissionNote && activeVersion.version > 1 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                <span>Advisor Resubmission Remarks (v{activeVersion.version})</span>
              </div>
              <p className="text-emerald-950 font-medium leading-relaxed pl-5 text-[11px]">
                {advisorSubmissionNote.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
