"use client";

/**
 * DOCU: Renders the chronological revision discussion for a document.
 * Last Updated Date: September 7, 2026
 * @returns The revision thread view.
 * @author Keith
 */
import React, { useState, useRef } from "react";
import { Send, User, Shield, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

import { authStore } from "@/lib/auth/auth-store";

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
}

/**
 * DOCU: Renders the revision history and optional comment form for a document.
 * Last Updated Date: September 7, 2026
 * @param documentId - Document identifier displayed in the revision header.
 * @param events - Revision events supplied by the document workflow.
 * @param onAddComment - Optional callback invoked after a comment is added.
 * @param readOnly - Whether comment submission controls are disabled.
 * @returns The revision thread view.
 * @author Keith
 */
export function RevisionThread({
  documentId,
  events = [],
  onAddComment,
  readOnly = false,
}: RevisionThreadProps) {
  const [timeline, setTimeline] = useState<IRevisionEvent[]>(events);
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
      <div className="border border-border bg-muted/30 flex items-center justify-between rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">Revision History</span>
          <span className="rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary">
            {timeline.length} events
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{documentId}</span>
      </div>

      {/* Structured Chronological Timeline */}
      <div className="relative space-y-3 pl-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-border">
        {timeline.map((item) => {
          const isOfficer = item.role === "Officer";

          return (
            <div key={item.id} className="relative group">
              {/* Timeline Dot */}
              <div
                className={cn(
                  "absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 border-background shadow-xs",
                  isOfficer ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground ring-2 ring-muted"
                )}
              />

              {/* Event Content Card */}
              <div className="border border-border bg-card text-card-foreground rounded-xl p-3 space-y-2 text-xs shadow-xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {isOfficer ? (
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="font-bold text-foreground">{item.author}</span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border",
                        isOfficer
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {item.role}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({item.version})
                    </span>
                  </div>

                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 sm:max-w-[130px]">
                    <Clock className="h-2.5 w-2.5" />
                    {item.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground/90">{item.action}</span>
                  {item.statusChange && (
                    <div className="flex items-center gap-1">
                      <StatusBadge status={item.statusChange.to} showIcon={false} />
                    </div>
                  )}
                </div>

                {item.comment && (
                  <p className="border border-border/80 bg-muted/40 p-2.5 rounded-lg text-foreground/90 leading-relaxed font-normal">
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
        <form onSubmit={handleSubmit} noValidate className="space-y-2 border-t border-border pt-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Append Collaboration Remark
          </label>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Document notes, regulatory findings, or instructions..."
            className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/60 min-h-[60px] rounded-lg text-xs focus-visible:ring-1 focus-visible:ring-primary"
          />
          <div className="flex justify-end sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              size="sm"
              className="h-8 max-w-full px-3 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
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
