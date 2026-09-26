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
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth/auth-store";
import { getMySubmissionsAction, getQueueAction } from "@/lib/actions/document-actions";
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
  const pathname = usePathname();
  const activeDocumentId = React.useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/\/documents\/([^\/\?#]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [revisionItems, setRevisionItems] = useState<DocumentItem[]>([]);
  const [docTypeMap, setDocTypeMap] = useState<
    Record<string, { fileName?: string; fileFormat?: string; mimeType?: string; title?: string }>
  >({});
  const [viewedRevisionIds, setViewedRevisionIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("viewed_revision_doc_ids");
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isFading, setIsFading] = useState<boolean>(false);

  const triggerFadeAndDismiss = (notifId?: string) => {
    setIsFading(true);
    if (notifId) {
      markAsRead(notifId);
    }
    setTimeout(() => {
      setIsDismissed(true);
      setIsFading(false);
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
      let items = res.notifications;
      if (activeDocumentId) {
        let hasMarked = false;
        items = items.map((n) => {
          if (n.documentId === activeDocumentId && !n.read) {
            hasMarked = true;
            return { ...n, read: true };
          }
          return n;
        });
        if (hasMarked) {
          notificationService.markDocumentAsRead(activeDocumentId).catch(() => {});
        }
      }
      setNotifications(items);
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
        const map: Record<string, { fileName?: string; fileFormat?: string; mimeType?: string; title?: string }> = {};
        for (const d of myDocs) {
          map[d.id] = {
            fileName: d.fileName,
            fileFormat: d.fileFormat,
            mimeType: d.mimeType,
            title: d.title,
          };
        }
        setDocTypeMap((prev) => ({ ...prev, ...map }));
      } catch (err) {
        console.error("[NotificationCenter] Failed to fetch revision submissions:", err);
      }
    } else {
      setRevisionItems([]);
      try {
        const queueDocs = await getQueueAction();
        const map: Record<string, { fileName?: string; fileFormat?: string; mimeType?: string; title?: string }> = {};
        for (const d of queueDocs) {
          map[d.id] = {
            fileName: d.fileName,
            fileFormat: d.fileFormat,
            mimeType: d.mimeType,
            title: d.title,
          };
        }
        setDocTypeMap((prev) => ({ ...prev, ...map }));
      } catch (err) {
        console.error("[NotificationCenter] Failed to fetch queue submissions:", err);
      }
    }
  }, [activeDocumentId]);

  // When activeDocumentId changes (viewing a document), automatically mark its notifications as read
  useEffect(() => {
    if (!activeDocumentId) return;

    setViewedRevisionIds((prev) => {
      if (prev.has(activeDocumentId)) return prev;
      const next = new Set(prev);
      next.add(activeDocumentId);
      try {
        sessionStorage.setItem("viewed_revision_doc_ids", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    setNotifications((prev) => {
      const hasUnread = prev.some((n) => n.documentId === activeDocumentId && !n.read);
      if (!hasUnread) return prev;
      return prev.map((n) => (n.documentId === activeDocumentId ? { ...n, read: true } : n));
    });

    notificationService.markDocumentAsRead(activeDocumentId).catch(() => {});
  }, [activeDocumentId]);

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
          if (activeDocumentId && newItem.documentId === activeDocumentId) {
            newItem.read = true;
            notificationService.markDocumentAsRead(activeDocumentId).catch(() => {});
          }
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

    const prevToken = { current: authStore.getToken() };

    const unsubscribeAuth = authStore.subscribe(() => {
      const currentToken = authStore.getToken();
      if (currentToken !== prevToken.current) {
        prevToken.current = currentToken;
        if (disconnectSSE) {
          disconnectSSE();
          disconnectSSE = null;
        }
        initialize();
      }
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

  const renderFileBadge = (
    type: "pdf" | "doc" | "txt" | "xls" | "generic",
    statusBadge?: "approval" | "revision" | "ai"
  ) => {
    let badgeClasses = "";
    let iconSvg: React.ReactNode = null;
    let label = "";

    switch (type) {
      case "pdf":
        badgeClasses = "bg-red-50 border-red-200 text-red-600";
        label = "PDF";
        iconSvg = (
          <svg
            className="h-3 w-3 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
        break;
      case "doc":
        badgeClasses = "bg-blue-50 border-blue-200 text-blue-600";
        label = "DOC";
        iconSvg = (
          <svg
            className="h-3 w-3 text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
        break;
      case "txt":
        badgeClasses = "bg-amber-50 border-amber-200 text-amber-700";
        label = "TXT";
        iconSvg = (
          <svg
            className="h-3 w-3 text-amber-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        );
        break;
      case "xls":
        badgeClasses = "bg-emerald-50 border-emerald-200 text-emerald-600";
        label = "XLS";
        iconSvg = (
          <svg
            className="h-3 w-3 text-emerald-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
        break;
      default:
        badgeClasses = "bg-[#183028]/5 border-[#183028]/15 text-[#183028]/70";
        label = "FILE";
        iconSvg = <FileText className="h-3 w-3 text-[#183028]/70" />;
        break;
    }

    return (
      <div className="relative inline-flex shrink-0">
        <div
          className={cn(
            "h-7 w-7 rounded-md border flex flex-col items-center justify-center shrink-0 shadow-2xs select-none transition-transform group-hover:scale-105",
            badgeClasses
          )}
        >
          {iconSvg}
          <span className="text-[7px] font-black tracking-wider leading-none mt-0.5 font-sans uppercase">
            {label}
          </span>
        </div>
        {statusBadge === "approval" && (
          <span
            className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-2xs ring-1 ring-white"
            title="Approved"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
          </span>
        )}
        {statusBadge === "revision" && (
          <span
            className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-2xs ring-1 ring-white"
            title="Revision Required"
          >
            <AlertCircle className="h-2.5 w-2.5" />
          </span>
        )}
        {statusBadge === "ai" && (
          <span
            className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-2xs ring-1 ring-white"
            title="AI Alert"
          >
            <ShieldAlert className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    );
  };

  const getCategoryIcon = (category: INotificationItem["category"]) => {
    switch (category) {
      case "ai":
        return (
          <div className="h-7 w-7 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          </div>
        );
      case "approval":
        return (
          <div className="h-7 w-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          </div>
        );
      case "revision":
        return (
          <div className="h-7 w-7 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          </div>
        );
      default:
        return (
          <div className="h-7 w-7 rounded-md bg-[#183028]/5 border border-[#183028]/15 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="h-3.5 w-3.5 text-[#183028]/60 shrink-0" />
          </div>
        );
    }
  };

  const getNotificationIcon = (notif: INotificationItem) => {
    const docInfo = notif.documentId ? docTypeMap[notif.documentId] : undefined;
    const fileName = (notif.fileName || notif.file_name || docInfo?.fileName || "").trim();
    const mimeType = (notif.mimeType || notif.mime_type || docInfo?.mimeType || "").trim().toLowerCase();
    const fileFormat = (docInfo?.fileFormat || "").trim().toUpperCase();
    const title = notif.title || docInfo?.title || "";
    const description = notif.description || "";
    const combined = `${fileName} ${mimeType} ${fileFormat} ${title} ${description}`.toUpperCase();

    const isPdf =
      fileName.toLowerCase().endsWith(".pdf") ||
      mimeType.includes("pdf") ||
      fileFormat === "PDF" ||
      combined.includes(".PDF") ||
      /\bPDF\b/i.test(title);

    const isDoc =
      fileName.toLowerCase().endsWith(".doc") ||
      fileName.toLowerCase().endsWith(".docx") ||
      mimeType.includes("msword") ||
      mimeType.includes("wordprocessingml") ||
      fileFormat === "DOC" ||
      fileFormat === "DOCX" ||
      combined.includes(".DOCX") ||
      combined.includes(".DOC") ||
      /\bDOCX\b/i.test(title) ||
      /\bWORD\b/i.test(title);

    const isTxt =
      fileName.toLowerCase().endsWith(".txt") ||
      mimeType.includes("text/plain") ||
      fileFormat === "TXT" ||
      combined.includes(".TXT") ||
      /\bTXT\b/i.test(title);

    const isXls =
      fileName.toLowerCase().endsWith(".xls") ||
      fileName.toLowerCase().endsWith(".xlsx") ||
      fileName.toLowerCase().endsWith(".csv") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("ms-excel") ||
      mimeType.includes("csv") ||
      fileFormat === "XLS" ||
      fileFormat === "XLSX" ||
      combined.includes(".XLSX") ||
      combined.includes(".XLS") ||
      combined.includes(".CSV");

    let statusBadge: "approval" | "revision" | "ai" | undefined;
    if (notif.category === "approval" || notif.rawType?.includes("APPROVED")) {
      statusBadge = "approval";
    } else if (
      notif.category === "revision" ||
      notif.rawType?.includes("REVISION") ||
      notif.title.toLowerCase().includes("revision") ||
      notif.description.toLowerCase().includes("needs revision")
    ) {
      statusBadge = "revision";
    } else if (notif.category === "ai") {
      statusBadge = "ai";
    }

    if (isPdf) return renderFileBadge("pdf", statusBadge);
    if (isDoc) return renderFileBadge("doc", statusBadge);
    if (isTxt) return renderFileBadge("txt", statusBadge);
    if (isXls) return renderFileBadge("xls", statusBadge);

    // If it's associated with a document, default to institutional PDF badge
    if (notif.documentId) {
      return renderFileBadge("pdf", statusBadge);
    }

    return getCategoryIcon(notif.category);
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
    if (!rawTitle || !rawTitle.trim()) {
      return "Notification";
    }

    const stripped = rawTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^New Document Submitted:\s*/i, "")
      .replace(/^Document Status Updated:\s*/i, "")
      .replace(/^New Revision Uploaded:\s*/i, "")
      .replace(/^New Revision Comment Added:\s*/i, "")
      .replace(/^Advisor Revision Comment:\s*/i, "")
      .replace(/^Document Updated:\s*/i, "")
      .replace(/^Revision Submitted:\s*/i, "")
      .replace(/["'`´]/g, "")
      .trim();

    if (stripped) {
      if (/^New Revision Comment Added$/i.test(stripped) || /^Revision Comment Added$/i.test(stripped)) {
        return "Revision Comment";
      }
      return stripped;
    }

    if (/Revision Comment/i.test(rawTitle)) {
      return "Revision Comment";
    }
    if (/Advisor Revision|Advisor Comment/i.test(rawTitle)) {
      return "Advisor Comment";
    }
    if (/Status Updated/i.test(rawTitle)) {
      return "Status Update";
    }
    if (/Document/i.test(rawTitle)) {
      return "Document Update";
    }

    return rawTitle.trim() || "Notification";
  };

  const unviewedRevisionDocs = React.useMemo(() => {
    return revisionItems.filter(
      (item) => item.id !== activeDocumentId && !viewedRevisionIds.has(item.id)
    );
  }, [revisionItems, activeDocumentId, viewedRevisionIds]);

  const topRevisionItem = React.useMemo(() => {
    if (!isAdvisor || unviewedRevisionDocs.length === 0) return null;
    const target = unviewedRevisionDocs[0];
    return {
      id: target.id,
      title: cleanNoticeTitle(target.title),
      notifId: notifications.find((n) => n.documentId === target.id)?.id,
    };
  }, [isAdvisor, unviewedRevisionDocs, notifications]);

  const officerUnreadNotifs = React.useMemo(() => {
    return notifications.filter(
      (n) =>
        !n.read &&
        n.documentId !== activeDocumentId &&
        (n.category === "revision" ||
          n.category === "document" ||
          n.rawType === "REVISION_COMMENT" ||
          n.rawType === "STATUS_CHANGE")
    );
  }, [notifications, activeDocumentId]);

  const topOfficerItem = React.useMemo(() => {
    if (!isOfficer || officerUnreadNotifs.length === 0) return null;
    return {
      id: officerUnreadNotifs[0].documentId,
      title: cleanNoticeTitle(officerUnreadNotifs[0].title),
      description: officerUnreadNotifs[0].description,
      notifId: officerUnreadNotifs[0].id,
    };
  }, [isOfficer, officerUnreadNotifs]);

  const displayedRevisionItem = topRevisionItem;
  const displayedOfficerItem = topOfficerItem;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      {/* Information Alert (Outside notification, beside notification bell) */}
      {isAdvisor && unviewedRevisionDocs.length > 0 && displayedRevisionItem && !isDismissed && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border border-sky-200 bg-sky-50/95 text-sky-950 shadow-2xs text-xs transition-all duration-300 ease-out pointer-events-none",
            isFading ? "opacity-0 scale-95 -translate-y-1" : "opacity-100 scale-100 animate-fade-in"
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
              className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-2xs transition-all shrink-0 cursor-pointer ml-1"
            >
              <span>Inspect</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => triggerFadeAndDismiss(displayedRevisionItem.notifId)}
            className="pointer-events-auto text-sky-500 hover:text-sky-800 p-0.5 rounded-full hover:bg-sky-100 transition-colors cursor-pointer ml-0.5"
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
            "flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-2xs text-xs transition-all duration-300 ease-out pointer-events-none",
            isFading ? "opacity-0 scale-95 -translate-y-1" : "opacity-100 scale-100 animate-fade-in"
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
              className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#183028] hover:bg-[#23453a] text-white shadow-2xs transition-all shrink-0 cursor-pointer ml-1"
            >
              <span>Review</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => triggerFadeAndDismiss(displayedOfficerItem.notifId)}
            className="pointer-events-auto text-emerald-500 hover:text-emerald-800 p-0.5 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer ml-0.5"
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
            data-tour="header-notifications"
            className={cn(
              "relative h-8 w-8 rounded-full border bg-[#FFFFFF] text-[#183028] hover:bg-[#C5E86C] hover:text-[#183028] hover:border-[#C5E86C] flex items-center justify-center transition-all cursor-pointer shadow-2xs outline-none",
              unreadCount > 0 && revisionNotifs.length > 0
                ? "border-orange-300 text-orange-700 bg-orange-50/50 ring-2 ring-orange-400/20"
                : isOfficer && officerUnreadNotifs.length > 0
                ? "border-emerald-300 text-emerald-800 bg-emerald-50/50 ring-2 ring-emerald-400/20"
                : unreadCount > 0
                ? "border-[#183028]/25 text-[#183028] bg-white ring-1 ring-[#183028]/10"
                : "border-[#E6E8E7]"
            )}
            title={
              unreadCount > 0 && revisionNotifs.length > 0
                ? `${unreadCount} unread notification(s) (${revisionNotifs.length} revision action required)`
                : unreadCount > 0
                ? `${unreadCount} unread notification(s)`
                : isConnected
                ? "Notifications (Live Stream Connected)"
                : "Notifications"
            }
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && revisionNotifs.length > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-orange-600 text-white text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#183028] text-white text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
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
                  <div className="mt-0.5 shrink-0">{getNotificationIcon(notif)}</div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-[#183028] truncate">
                        {cleanNoticeTitle(notif.title) || notif.title || "Notification"}
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
