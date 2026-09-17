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
          className="relative h-8 w-8 rounded-lg text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062A20] flex items-center justify-center transition-colors cursor-pointer border border-border/40 hover:border-emerald-800/60 bg-transparent"
          title="Notifications"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#24A152] animate-pulse" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-xl shadow-2xl border border-border bg-card overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-[#062A20] text-[#54d0a2] border border-emerald-800/60 font-mono">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-medium text-muted-foreground hover:text-[#54d0a2] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-1.5 px-3 py-1.5 border-b border-border bg-card/60">
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer",
              activeFilter === "all"
                ? "bg-[#062A20] text-[#54d0a2] border border-emerald-800/60"
                : "bg-transparent text-muted-foreground hover:bg-[#062A20] hover:text-[#54d0a2]"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("unread")}
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer",
              activeFilter === "unread"
                ? "bg-[#062A20] text-[#54d0a2] border border-emerald-800/60"
                : "bg-transparent text-muted-foreground hover:bg-[#062A20] hover:text-[#54d0a2]"
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No notifications matching current filter.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-3 transition-colors hover:bg-[#062A20]/40 text-left relative flex gap-2.5 items-start cursor-pointer",
                  !notif.read ? "bg-muted/20" : "bg-transparent"
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="mt-0.5 shrink-0">{getCategoryIcon(notif.category)}</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                    {notif.description}
                  </p>
                  {notif.documentId && (
                    <div className="pt-1">
                      <Link
                        href={`/documents/${notif.documentId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#24A152] hover:text-[#54d0a2] hover:underline"
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
