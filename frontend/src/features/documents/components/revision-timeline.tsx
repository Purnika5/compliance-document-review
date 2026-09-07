"use client";

/**
 * DOCU: Renders the document revision history timeline.
 * Last Updated Date: September 7, 2026
 * @returns The revision timeline view.
 * @author Keith
 */
import React, { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

interface RevisionTimelineProps {
  documentId: string;
  events?: IRevisionEvent[];
  onAddComment?: (comment: string) => void;
}

export function RevisionTimeline({
  documentId,
  events = [],
  onAddComment,
}: RevisionTimelineProps) {
  const [timeline, setTimeline] = useState<IRevisionEvent[]>(events);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const revisionIdRef = useRef(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const nextRevisionId = `rev-${(++revisionIdRef.current).toString()}`;
    const session = authStore.getSession();
    const roleCapitalized = session?.role
      ? ((session.role.charAt(0).toUpperCase() + session.role.slice(1).toLowerCase()) as "Advisor" | "Officer" | "System")
      : "Officer";

    const newEvent: IRevisionEvent = {
      id: nextRevisionId,
      version: `v1.${timeline.length + 1}`,
      author: session?.name || "Reviewer",
      role: roleCapitalized === "Advisor" || roleCapitalized === "Officer" ? roleCapitalized : "Officer",
      action: "Added Audit Remark",
      comment: newComment.trim(),
      timestamp: "Just now",
    };

    setTimeline((prev) => [...prev, newEvent]);
    if (onAddComment) onAddComment(newComment.trim());
    setNewComment("");
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Document history</p>
        <span className="font-mono text-[10px] text-muted-foreground">{documentId}</span>
      </div>

      {/* Continuous Timeline */}
      <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
        {timeline.map((item) => {
          const isOfficer = item.role === "Officer";

          return (
            <div key={item.id} className="relative">
              {/* Timeline Indicator Dot */}
              <div
                className={cn(
                  "absolute -left-5 top-1 h-4 w-4 rounded border border-border flex items-center justify-center text-[8px] font-bold",
                  isOfficer ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted text-foreground"
                )}
              >
                {item.version.replace("v", "")}
              </div>

              {/* Event Card */}
              <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{item.author}</span>
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
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/90">{item.action}</span>
                  {item.statusChange && (
                    <span className="text-[10px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      {item.statusChange.from} → {item.statusChange.to}
                    </span>
                  )}
                </div>

                {item.comment && (
                  <p className="text-xs text-foreground/90 bg-muted/40 p-2.5 rounded-md border border-border/80 leading-relaxed">
                    {item.comment}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Collaboration Comment Form */}
      <form onSubmit={handleSubmit} noValidate className="pt-2 space-y-2">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Add Collaboration Remark
        </label>
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Type notes or instruction for the advisor..."
          className="text-xs min-h-[60px] bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/60 rounded-md focus-visible:ring-1 focus-visible:ring-primary"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            size="sm"
            className="rounded-md font-semibold text-xs bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            <Send className="h-3 w-3" /> Post Note
          </Button>
        </div>
      </form>
    </div>
  );
}
