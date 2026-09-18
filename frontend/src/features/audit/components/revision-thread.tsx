"use client";

/**
 * DOCU: Renders the chronological revision discussion for a document.
 * Last Updated Date: September 7, 2026
 * @returns The revision thread view.
 * @author Keith
 */
import React, { useState, useRef, useEffect } from "react";
import { Send, User, Shield, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth/auth-store";
import { apiClient } from "@/utils/apiClient";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { ApiResponseEnvelope } from "@/entities/types/api.type";

export interface IRevisionEvent {
  id: string;
  version: string;
  author: string;
  role: "Advisor" | "Officer" | "System";
  action: string;
  statusChange?: { from: string; to: string };
  comment?: string;
  timestamp: string;
}

export interface RevisionThreadProps {
  documentId: string;
  events?: IRevisionEvent[];
  onAddComment?: (comment: string) => void;
  readOnly?: boolean;
  refreshKey?: number;
}

/**
 * DOCU: Renders the revision history and optional comment form for a document.
 * Last Updated Date: September 18, 2026
 * @param documentId - Document identifier displayed in the revision header.
 * @param events - Revision events supplied by the document workflow.
 * @param onAddComment - Optional callback invoked after a comment is added.
 * @param readOnly - Whether comment submission controls are disabled.
 * @param refreshKey - Dynamic trigger to re-query backend thread entries.
 * @returns The revision thread view.
 * @author Keith
 */
export function RevisionThread({
  documentId,
  events = [],
  onAddComment,
  readOnly = false,
  refreshKey = 0,
}: RevisionThreadProps) {
  const [timeline, setTimeline] = useState<IRevisionEvent[]>(events);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function loadBackendThread() {
      setIsLoadingThread(true);
      try {
        const res = await apiClient.get<
          ApiResponseEnvelope<{ versions?: Record<string, unknown>[]; thread_entries?: Record<string, unknown>[] }>
        >(API_ENDPOINTS.DOCUMENTS.VERSIONS(documentId));

        const entries = res?.data?.thread_entries;
        if (Array.isArray(entries) && isActive) {
          const apiTimeline: IRevisionEvent[] = entries.map((entry, idx) => {
            const roleStr = String(entry.author_role || "").toUpperCase();
            const role: "Advisor" | "Officer" | "System" = roleStr === "OFFICER" ? "Officer" : "Advisor";
            const isDecision = entry.entry_type === "decision";
            const isSubmission = entry.entry_type === "submission";
            return {
              id: String(entry.id || `entry-${idx + 1}`),
              version: `v1.${idx + 1}`,
              author: String(entry.author_name || (role === "Officer" ? "Compliance Officer" : "Advisor")),
              role,
              action: isDecision
                ? "Officer Review Decision"
                : isSubmission
                ? "Advisor Document Submission"
                : "Collaboration Note",
              comment: String(entry.message || ""),
              timestamp: entry.created_at ? new Date(String(entry.created_at)).toLocaleString() : "Recently",
            };
          });

          if (apiTimeline.length > 0) {
            setTimeline(apiTimeline);
            return;
          }
        }
      } catch (err) {
        console.warn("[RevisionThread] Failed to fetch backend thread entries:", err);
      } finally {
        if (isActive) setIsLoadingThread(false);
      }

      // Fallback to localStorage or provided events if backend returns no entries
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`revisions_${documentId}`);
        if (saved) {
          try {
            setTimeline(JSON.parse(saved));
            return;
          } catch {
            // ignore
          }
        }
      }
      setTimeline(events);
    }

    loadBackendThread();
    return () => {
      isActive = false;
    };
  }, [documentId, refreshKey, events]);

  useEffect(() => {
    if (typeof window !== "undefined" && timeline.length > 0) {
      localStorage.setItem(`revisions_${documentId}`, JSON.stringify(timeline));
    }
  }, [timeline, documentId]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const revCountRef = useRef(timeline.length);

  /**
   * DOCU: Validates and appends a new revision comment to the local timeline.
   * Last Updated Date: September 7, 2026
   * @param e - Form submission event from the comment form.
   * @returns Nothing; updates the timeline and optional parent callback.
   * @author Keith
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const session = authStore.getSession();
    const roleCapitalized = session?.role
      ? ((session.role.charAt(0).toUpperCase() + session.role.slice(1).toLowerCase()) as "Advisor" | "Officer" | "System")
      : "Officer";

    const newEvent: IRevisionEvent = {
      id: `rev-${++revCountRef.current}`,
      version: `v1.${timeline.length + 1}`,
      author: session?.name || "Reviewer",
      role: roleCapitalized === "Advisor" || roleCapitalized === "Officer" ? roleCapitalized : "Officer",
      action: "Officer Collaboration Note",
      comment: newComment.trim(),
      timestamp: "Just now",
    };

    setTimeline((prev) => [...prev, newEvent]);
    if (onAddComment) onAddComment(newComment.trim());
    setNewComment("");
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Header Info */}
      <div className="border border-[#E6E8E7] bg-white text-[#183028] flex items-center rounded-xl px-3.5 py-2.5 text-xs shadow-2xs">
        <span className="font-bold text-[#183028]">Revision History</span>
      </div>

      {/* Structured Chronological Timeline */}
      <div className="relative space-y-3 pl-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-[#E6E8E7]">
        {timeline.map((item) => {
          const isOfficer = item.role === "Officer";

          return (
            <div key={item.id} className="relative group">
              {/* Timeline Dot */}
              <div
                className={cn(
                  "absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 border-white shadow-2xs",
                  isOfficer ? "bg-[#183028] ring-2 ring-[#C5E86C]" : "bg-[#183028]/40 ring-2 ring-[#E6E8E7]"
                )}
              />

              {/* Event Content Card */}
              <div className="border border-[#E6E8E7] bg-white text-[#183028] rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {isOfficer ? (
                      <Shield className="h-3.5 w-3.5 text-[#183028]" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-[#183028]/60" />
                    )}
                    <span className="font-bold text-[#183028]">{item.author}</span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-lg uppercase border",
                        isOfficer
                          ? "bg-[#C5E86C]/20 text-[#183028] border-[#C5E86C]"
                          : "bg-[#E6E8E7]/50 text-[#183028] border-[#E6E8E7]"
                      )}
                    >
                      {item.role}
                    </span>
                    <span className="text-[10px] font-mono text-[#183028]/60">
                      ({item.version})
                    </span>
                  </div>

                  <span className="text-[10px] text-[#183028]/50 flex items-center gap-1 sm:max-w-[130px]">
                    <Clock className="h-2.5 w-2.5" />
                    {item.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#183028]">{item.action}</span>
                  {item.statusChange && (
                    <div className="flex items-center gap-1">
                      <StatusBadge status={item.statusChange.to} showIcon={false} />
                    </div>
                  )}
                </div>

                {item.comment && (
                  <p className="border border-[#E6E8E7] bg-[#E6E8E7]/20 p-2.5 rounded-lg text-[#183028] leading-relaxed font-normal">
                    {item.comment}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Collaboration Remark Form */}
      {!readOnly && (
        <form onSubmit={handleSubmit} noValidate className="space-y-2 border-t border-[#E6E8E7] pt-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#183028]/60">
            Append Collaboration Remark
          </label>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Document notes, regulatory findings, or instructions..."
            className="bg-white border border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 min-h-[60px] rounded-xl text-xs focus-visible:ring-1 focus-visible:ring-[#183028] shadow-2xs"
          />
          <div className="flex justify-end sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              size="sm"
              className="h-8.5 max-w-full px-4 rounded-xl text-xs font-semibold bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white gap-1.5 shadow-2xs cursor-pointer transition-all"
            >
              <Send className="h-3 w-3" />
              <span>Record Remark</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
