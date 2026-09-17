/**
 * DOCU: Renders the notification center for application alerts adhering to dark mode.
 * Last Updated Date: September 8, 2026
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
        return <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />;
      case "approval":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "revision":
        return <AlertCircle className="h-3.5 w-3.5 text-orange-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative h-8 w-8 rounded-full border border-[#E6E8E7] bg-[#FFFFFF] text-[#183028] hover:bg-[#C5E86C] hover:text-[#183028] hover:border-[#C5E86C] flex items-center justify-center transition-all cursor-pointer shadow-2xs outline-none"
          title="Notifications"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#183028] ring-2 ring-white animate-pulse" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border border-[#E6E8E7] bg-[#FFFFFF] overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-[#E6E8E7] flex items-center justify-between bg-[#FAFBFB]">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[#183028] uppercase tracking-wider">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#C5E86C]/35 text-[#183028] border border-[#C5E86C] font-mono">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-semibold text-[#183028]/70 hover:text-[#183028] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-1.5 px-3 py-1.5 border-b border-[#E6E8E7] bg-[#FAFBFB]/50">
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "text-[11px] font-semibold px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer",
              activeFilter === "all"
                ? "bg-[#C5E86C] text-[#183028] font-bold"
                : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("unread")}
            className={cn(
              "text-[11px] font-semibold px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer",
              activeFilter === "unread"
                ? "bg-[#C5E86C] text-[#183028] font-bold"
                : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-[#E6E8E7]">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#183028]/60">
              No notifications matching current filter.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-3 transition-colors hover:bg-[#C5E86C]/15 text-left relative flex gap-2.5 items-start cursor-pointer",
                  !notif.read ? "bg-[#FAFBFB]" : "bg-transparent"
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="mt-0.5 shrink-0">{getCategoryIcon(notif.category)}</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-[#183028] truncate">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-[#183028]/50 shrink-0 font-mono">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#183028]/70 leading-normal line-clamp-2">
                    {notif.description}
                  </p>
                  {notif.documentId && (
                    <div className="pt-1">
                      <Link
                        href={`/documents/${notif.documentId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#183028] hover:underline"
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
