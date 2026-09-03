"use client";

import React, { useState, useRef } from "react";
import { Send, User, Shield, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

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

export const MOCK_REVISION_EVENTS: IRevisionEvent[] = [
  {
    id: "rev-1",
    version: "v1.0",
    author: "Sarah Jenkins",
    role: "Advisor",
    action: "Initial Document Submission",
    comment: "Submitted Q3 Asset Allocation Proposal with offshore portfolio rebalancing model for institutional portfolio #4092.",
    timestamp: "May 20, 2026 · 10:24 AM",
  },
  {
    id: "rev-2",
    version: "v1.0",
    author: "Officer Alex Smith",
    role: "Officer",
    action: "Revision Requested",
    statusChange: { from: "Pending", to: "Needs Revision" },
    comment: "Please provide secondary beneficial ownership disclosures for the 15% private REIT holding under Rule FD-2.1.3.",
    timestamp: "May 21, 2026 · 2:41 PM",
  },
  {
    id: "rev-3",
    version: "v1.1",
    author: "Sarah Jenkins",
    role: "Advisor",
    action: "Resubmitted with Revised Disclosure",
    comment: "Attached secondary disclosure affidavit form D-442 signed by principal managing partner.",
    timestamp: "May 22, 2026 · 9:15 AM",
  },
];

export interface RevisionThreadProps {
  documentId: string;
  events?: IRevisionEvent[];
  onAddComment?: (comment: string) => void;
  readOnly?: boolean;
}

export function RevisionThread({
  documentId,
  events = MOCK_REVISION_EVENTS,
  onAddComment,
  readOnly = false,
}: RevisionThreadProps) {
  const [timeline, setTimeline] = useState<IRevisionEvent[]>(events);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const revCountRef = useRef(timeline.length);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const newEvent: IRevisionEvent = {
      id: `rev-${++revCountRef.current}`,
      version: "v1.1",
      author: "Officer Alex Smith",
      role: "Officer",
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
      <div className="neu-inset flex items-center justify-between rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">Revision History</span>
          <span className="rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-cyan-800">
            {timeline.length} events
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">{documentId}</span>
      </div>

      {/* Structured Chronological Timeline */}
      <div className="relative space-y-3 pl-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-cyan-200">
        {timeline.map((item) => {
          const isOfficer = item.role === "Officer";

          return (
            <div key={item.id} className="relative group">
              {/* Timeline Dot */}
              <div
                className={cn(
                  "absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 border-background shadow-sm",
                  isOfficer ? "bg-blue-600" : "bg-cyan-600"
                )}
              />

              {/* Event Content Card */}
              <div className="neu-soft rounded-xl p-3 space-y-2 text-xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {isOfficer ? (
                      <Shield className="h-3.5 w-3.5 text-blue-700" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-cyan-700" />
                    )}
                    <span className="font-bold text-slate-900">{item.author}</span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border",
                        isOfficer
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-cyan-50 text-cyan-800 border-cyan-200"
                      )}
                    >
                      {item.role}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({item.version})
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1 sm:max-w-[130px]">
                    <Clock className="h-2.5 w-2.5" />
                    {item.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{item.action}</span>
                  {item.statusChange && (
                    <div className="flex items-center gap-1">
                      <StatusBadge status={item.statusChange.to} showIcon={false} />
                    </div>
                  )}
                </div>

                {item.comment && (
                  <p className="neu-inset p-2 rounded-lg text-slate-700 leading-relaxed font-normal">
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
        <form onSubmit={handleSubmit} className="space-y-2 border-t border-white/70 pt-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Append Collaboration Remark
          </label>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Document notes, regulatory findings, or instructions..."
            className="neu-inset min-h-[60px] rounded-lg text-xs focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex justify-end sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              size="sm"
              className="h-8 max-w-full px-3 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-white gap-1.5"
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
