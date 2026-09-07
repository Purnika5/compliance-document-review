"use client";

/**
 * DOCU: Renders the document revision history timeline.
 * Last Updated Date: September 3, 2026
 * @returns The revision timeline view.
 * @author Keith
 */
import React, { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    const newEvent: IRevisionEvent = {
      id: nextRevisionId,
      version: "v1.1",
      author: "Officer Alex Smith",
      role: "Officer",
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
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Document history</p>
        <span className="font-mono text-[10px] text-slate-500">{documentId}</span>
      </div>

      {/* Continuous Timeline */}
      <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
        {timeline.map((item) => {
          const isOfficer = item.role === "Officer";

          return (
            <div key={item.id} className="relative">
              {/* Timeline Indicator Dot */}
              <div
                className={cn(
                  "absolute -left-5 top-1 h-4 w-4 rounded border-2 border-white flex items-center justify-center text-[8px] font-bold",
                  isOfficer ? "bg-slate-900 text-white" : "bg-emerald-800 text-white"
                )}
              >
                {item.version.replace("v", "")}
              </div>

              {/* Event Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{item.author}</span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase",
                        isOfficer
                          ? "bg-slate-200 text-slate-800"
                          : "bg-emerald-100 text-emerald-900"
                      )}
                    >
                      {item.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-700">{item.action}</span>
                  {item.statusChange && (
                    <span className="text-[10px] font-mono font-medium bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded">
                      {item.statusChange.from} → {item.statusChange.to}
                    </span>
                  )}
                </div>

                {item.comment && (
                  <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 leading-normal">
                    {item.comment}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Collaboration Comment Form */}
      <form onSubmit={handleSubmit} className="pt-2 space-y-2">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Add Collaboration Remark
        </label>
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Type notes or instruction for the advisor..."
          className="text-xs min-h-[60px] bg-white border-slate-200 rounded-md focus-visible:ring-slate-900"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            size="sm"
            className="rounded-md font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
          >
            <Send className="h-3 w-3" /> Post Note
          </Button>
        </div>
      </form>
    </div>
  );
}
