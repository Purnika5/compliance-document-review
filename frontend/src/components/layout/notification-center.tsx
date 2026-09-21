/**
 * DOCU: Renders the notification center for application alerts connected to real-time backend SSE stream.
 * Connects to GET /notifications/stream for live updates and provides mark-as-read and navigation capabilities.
 * Last Updated Date: September 18, 2026
 * @returns The notification center popover view.
 * @author Keith
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Loader2,
  AlertTriangle,
  ArrowRight,
  Info,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth/auth-store";
import { getMySubmissionsAction } from "@/lib/actions/document-actions";
import type { DocumentItem } from "@/lib/validation/document";
import {
  notificationService,
  INotificationItem,
} from "@/services/notification.service";
import { showInfoToast } from "@/components/ui/toast";

export type { INotificationItem };

/**
 * DOCU: Filters submissions to only those document lineages whose LATEST version
 * is currently in "Needs Revision" status. Lineages that have already been resubmitted
 * (latest version is Pending, Approved, or Rejected) are excluded from revision alerts.
 */
function getActiveRevisionDocuments(docs: DocumentItem[]): DocumentItem[] {
  const lineageMap = new Map<string, DocumentItem[]>();
  for (const doc of docs) {
    const rootId = doc.originalDocumentId || doc.id;
    const list = lineageMap.get(rootId) || [];
    list.push(doc);
    lineageMap.set(rootId, list);
  }

  const activeRevisions: DocumentItem[] = [];
  lineageMap.forEach((lineageDocs) => {
    const sorted = [...lineageDocs].sort((a, b) => {
      const verA = a.version || 1;
      const verB = b.version || 1;
      if (verA !== verB) return verA - verB;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });
    const latestDoc = sorted[sorted.length - 1];
    if (latestDoc && latestDoc.status === "Needs Revision") {
      activeRevisions.push(latestDoc);
    }
  });

  return activeRevisions;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [revisionItems, setRevisionItems] = useState<DocumentItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [activeNoticeItem, setActiveNoticeItem] = useState<{ id?: string; title: string; notifId?: string } | null>(null);

  const triggerFadeAndDismiss = (notifId?: string) => {
    setIsFading(true);
    if (notifId) {
      markAsRead(notifId);
    }
    setTimeout(() => {
      setIsDismissed(true);
      setIsFading(false);
      setActiveNoticeItem(null);
    }, 300);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  /**
   * DOCU: Fetches the latest notifications from the backend REST API.
   * Last Updated Date: September 18, 2026
   */
  const loadNotifications = useCallback(async () => {
    if (!authStore.isAuthenticated()) return;
    setIsLoading(true);
    try {
      const res = await notificationService.getNotifications(false, 1, 40);
      setNotifications(res.notifications);
    } catch (err) {
      console.error("[NotificationCenter] Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }

    const role = authStore.getRole();
    if (role === "Advisor") {
      try {
        const myDocs = await getMySubmissionsAction();
        setRevisionItems(getActiveRevisionDocuments(myDocs));
      } catch (err) {
        console.error("[NotificationCenter] Failed to fetch revision submissions:", err);
      }
    } else {
      setRevisionItems([]);
    }
  }, []);

  /**
   * DOCU: Subscribes to live SSE notification stream and updates internal state on arrival.
   * Last Updated Date: September 18, 2026
   */
  useEffect(() => {
    let disconnectSSE: (() => void) | null = null;

    const initialize = () => {
      if (!authStore.isAuthenticated()) {
        setIsConnected(false);
        setNotifications([]);
        return;
      }

      loadNotifications();

      disconnectSSE = notificationService.connectSSE(
        (newItem: INotificationItem) => {
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === newItem.id);
            if (exists) {
              return prev.map((n) => (n.id === newItem.id ? newItem : n));
            }
            return [newItem, ...prev];
          });
          setIsDismissed(false);
          setIsFading(false);
          showInfoToast(newItem.title, newItem.description);

          const role = authStore.getRole();
          if (role === "Advisor") {
            getMySubmissionsAction()
              .then((myDocs) => {
                setRevisionItems(getActiveRevisionDocuments(myDocs));
              })
              .catch(() => {});
          }
        },
        (connected: boolean) => {
          setIsConnected(connected);
        }
      );
    };

    initialize();

    const handleRefresh = () => {
      loadNotifications();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("compliance-notification-refresh", handleRefresh);
    }

    const unsubscribeAuth = authStore.subscribe(() => {
      if (disconnectSSE) {
        disconnectSSE();
        disconnectSSE = null;
      }
      initialize();
    });

    return () => {
      if (disconnectSSE) {
        disconnectSSE();
      }
      unsubscribeAuth();
      if (typeof window !== "undefined") {
        window.removeEventListener("compliance-notification-refresh", handleRefresh);
      }
    };
  }, [loadNotifications]);

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationService.markAllAsRead();
  };

  const markAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await notificationService.markAsRead(id);
  };

  const getCategoryIcon = (category: INotificationItem["category"]) => {
    switch (category) {
      case "ai":
        return <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
      case "approval":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
      case "revision":
        return <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-[#183028]/60 shrink-0" />;
    }
  };

  const userRole = authStore.getRole();
  const isAdvisor = userRole === "Advisor";
  const isOfficer = userRole === "Officer";

  const revisionNotifs = notifications.filter(
    (n) =>
      (n.category === "revision" ||
        n.rawType === "REVISION_COMMENT" ||
        n.title.toLowerCase().includes("revision") ||
        n.description.toLowerCase().includes("needs revision")) &&
      !n.read
  );

  const activeRevisionCount = isAdvisor ? revisionItems.length : 0;

  const cleanNoticeTitle = (rawTitle: string) => {
    return rawTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^New Document Submitted:\s*/i, "")
      .replace(/^Document Status Updated:\s*/i, "")
      .replace(/^New Revision Comment Added:?\s*/i, "")
      .replace(/^Advisor Revision Comment.*?:?\s*/i, "")
      .replace(/^Document Updated:\s*/i, "")
      .replace(/^Revision Submitted:\s*/i, "")
      .replace(/["'`´]/g, "")
      .trim();
  };

  const topRevisionItem =
    isAdvisor && revisionItems.length > 0
      ? {
          id: revisionItems[0].id,
          title: cleanNoticeTitle(revisionItems[0].title),
          notifId: undefined as string | undefined,
        }
      : null;

  const officerUnreadNotifs = notifications.filter(
    (n) =>
      !n.read &&
      (n.category === "revision" ||
        n.category === "document" ||
        n.rawType === "REVISION_COMMENT" ||
        n.rawType === "STATUS_CHANGE")
  );

  const topOfficerItem =
    isOfficer && officerUnreadNotifs.length > 0
      ? {
          id: officerUnreadNotifs[0].documentId,
          title: cleanNoticeTitle(officerUnreadNotifs[0].title),
          description: officerUnreadNotifs[0].description,
          notifId: officerUnreadNotifs[0].id,
        }
      : null;

  const totalBadgeCount =
    activeRevisionCount > 0
      ? Math.max(unreadCount, activeRevisionCount)
      : unreadCount;

  useEffect(() => {
    if (!isFading && !isDismissed) {
      if (isAdvisor && topRevisionItem) {
        setActiveNoticeItem(topRevisionItem);
      } else if (isOfficer && topOfficerItem) {
        setActiveNoticeItem(topOfficerItem);
      } else {
        setActiveNoticeItem(null);
      }
    }
  }, [isAdvisor, isOfficer, topRevisionItem, topOfficerItem, isFading, isDismissed]);

  const displayedRevisionItem = isFading && activeNoticeItem ? activeNoticeItem : topRevisionItem;
  const displayedOfficerItem = isFading && activeNoticeItem ? activeNoticeItem : topOfficerItem;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      {/* Information Alert (Outside notification, beside notification bell) */}
      {isAdvisor && activeRevisionCount > 0 && displayedRevisionItem && !isDismissed && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border border-sky-200 bg-sky-50/95 text-sky-950 shadow-2xs text-xs transition-all duration-300 ease-out",
            isFading ? "opacity-0 scale-95 -translate-y-1 pointer-events-none" : "opacity-100 scale-100 animate-fade-in"
          )}
        >
          <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-sky-950 hidden sm:inline">
              Revision:
            </span>
            <span className="font-semibold text-sky-950 truncate max-w-[120px] sm:max-w-[180px]">
              {displayedRevisionItem.title}
            </span>
          </div>

          {displayedRevisionItem.id && (
            <Link
              href={`/documents/${displayedRevisionItem.id}`}
              onClick={() => {
                triggerFadeAndDismiss(displayedRevisionItem.notifId);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-2xs transition-all shrink-0 cursor-pointer ml-1"
            >
              <span>Inspect</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => triggerFadeAndDismiss(displayedRevisionItem.notifId)}
            className="text-sky-500 hover:text-sky-800 p-0.5 rounded-full hover:bg-sky-100 transition-colors cursor-pointer ml-0.5"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {isOfficer && displayedOfficerItem && !isDismissed && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-2xs text-xs transition-all duration-300 ease-out",
            isFading ? "opacity-0 scale-95 -translate-y-1 pointer-events-none" : "opacity-100 scale-100 animate-fade-in"
          )}
        >
          <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-emerald-950 hidden sm:inline">
              Review:
            </span>
            <span className="text-emerald-800 truncate max-w-[120px] sm:max-w-[180px]">
              {displayedOfficerItem.title}
            </span>
          </div>

          {displayedOfficerItem.id && (
            <Link
              href={`/documents/${displayedOfficerItem.id}`}
              onClick={() => {
                triggerFadeAndDismiss(displayedOfficerItem.notifId);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#183028] hover:bg-[#23453a] text-white shadow-2xs transition-all shrink-0 cursor-pointer ml-1"
            >
              <span>Review</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => triggerFadeAndDismiss(displayedOfficerItem.notifId)}
            className="text-emerald-500 hover:text-emerald-800 p-0.5 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer ml-0.5"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "relative h-8 w-8 rounded-full border bg-[#FFFFFF] text-[#183028] hover:bg-[#C5E86C] hover:text-[#183028] hover:border-[#C5E86C] flex items-center justify-center transition-all cursor-pointer shadow-2xs outline-none",
              activeRevisionCount > 0
                ? "border-orange-300 text-orange-700 bg-orange-50/50 ring-2 ring-orange-400/20"
                : isOfficer && officerUnreadNotifs.length > 0
                ? "border-emerald-300 text-emerald-800 bg-emerald-50/50 ring-2 ring-emerald-400/20"
                : "border-[#E6E8E7]"
            )}
            title={
              activeRevisionCount > 0
                ? `${activeRevisionCount} submission(s) require revision attention`
                : isOfficer && officerUnreadNotifs.length > 0
                ? `${officerUnreadNotifs.length} document/revision update(s) require officer review`
                : isConnected
                ? "Notifications (Live Stream Connected)"
                : "Notifications"
            }
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {activeRevisionCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-orange-600 text-white text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-white">
                {activeRevisionCount > 99 ? "99+" : activeRevisionCount}
              </span>
            ) : totalBadgeCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#183028] text-white text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-white">
                {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border border-[#E6E8E7] bg-[#FFFFFF] overflow-hidden text-xs z-50"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-[#E6E8E7] flex items-center justify-between bg-[#FAFBFB]">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#183028] uppercase tracking-wider">
                Notifications
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#183028]/10 text-[#183028] font-mono">
                {notifications.length}
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] text-[#183028]/60 font-medium font-mono">
                  ({unreadCount} unread)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className={cn(
                "text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all",
                unreadCount > 0
                  ? "text-[#183028] bg-white hover:bg-[#F0F2F1] border border-[#E6E8E7] cursor-pointer shadow-2xs font-bold"
                  : "text-[#183028]/40 border border-transparent cursor-not-allowed opacity-60"
              )}
              title={unreadCount > 0 ? "Mark all notifications as read" : "All notifications are read"}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E6E8E7]">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#183028]/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#183028]/40" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#183028]/60 flex flex-col items-center justify-center gap-1">
                <Bell className="h-6 w-6 text-[#183028]/25 mb-1" />
                <span className="font-medium">No notifications yet</span>
                <span className="text-[11px] text-[#183028]/40">
                  You will be notified live when document reviews are updated.
                </span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3 transition-colors hover:bg-[#C5E86C]/15 text-left relative flex gap-2.5 items-start cursor-pointer group",
                    !notif.read ? "bg-[#FAFBFB]" : "bg-transparent opacity-85"
                  )}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="mt-0.5 shrink-0">{getCategoryIcon(notif.category)}</div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-[#183028] truncate">
                        {cleanNoticeTitle(notif.title)}
                      </p>
                      <span className="text-[10px] text-[#183028]/50 shrink-0 font-mono">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#183028]/70 leading-normal line-clamp-2">
                      {notif.description}
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                      {notif.documentId ? (
                        <Link
                          href={`/documents/${notif.documentId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#183028] hover:underline"
                        >
                          <span>Open Document</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      ) : <span />}
                      {!notif.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="text-[10px] text-[#183028]/50 hover:text-[#183028] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
