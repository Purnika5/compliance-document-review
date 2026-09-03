"use client";

/**
 * DOCU: Renders the notification center for application alerts.
 * Last Updated Date: September 3, 2026
 * @returns The notification center view.
 * @author Keith
 */
import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldAlert,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface INotificationItem {
  id: string;
  category: "document" | "revision" | "approval" | "ai" | "system";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  documentId?: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filteredNotifications =
    activeFilter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const getCategoryIcon = (category: INotificationItem["category"]) => {
    switch (category) {
      case "ai":
        return <ShieldAlert className="h-3.5 w-3.5 text-amber-800" />;
      case "approval":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800" />;
      case "revision":
        return <AlertCircle className="h-3.5 w-3.5 text-amber-800" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-slate-700" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative h-8 w-8 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          title="Notifications"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded shadow-lg border border-slate-200 bg-white overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-mono">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-1.5 px-3 py-1.5 border-b border-slate-100 bg-white">
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer",
              activeFilter === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("unread")}
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer",
              activeFilter === "unread"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No notifications matching current filter.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-3 transition-colors hover:bg-slate-50 text-left relative flex gap-2.5 items-start cursor-pointer",
                  !notif.read ? "bg-slate-50/70" : "bg-white"
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="mt-0.5 shrink-0">{getCategoryIcon(notif.category)}</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal line-clamp-2">
                    {notif.description}
                  </p>
                  {notif.documentId && (
                    <div className="pt-1">
                      <Link
                        href={`/documents/${notif.documentId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <span>Open {notif.documentId}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
