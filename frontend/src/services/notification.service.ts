/**
 * DOCU: Real-time Notification Service consuming backend REST API & Server-Sent Events (SSE).
 * Connects to GET /notifications/stream for live updates and provides methods for fetching and marking notifications.
 * Last Updated Date: September 18, 2026
 * @author Keith
 */
import { apiClient, APIClient } from "@/utils/apiClient";
import { authStore } from "@/lib/auth/auth-store";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { ApiResponseEnvelope } from "@/entities/types/api.type";

export interface INotificationItem {
  id: string;
  category: "document" | "revision" | "approval" | "ai" | "system";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  documentId?: string;
  rawType?: string;
}

export interface RawBackendNotification {
  id: string;
  userId?: string;
  user_id?: string;
  documentId?: string;
  document_id?: string;
  title: string;
  message: string;
  type: "STATUS_CHANGE" | "REVISION_COMMENT" | "COMPLIANCE_ALERT" | string;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
}

export function mapBackendNotificationToItem(raw: RawBackendNotification): INotificationItem {
  const type = String(raw.type || "").toUpperCase();
  const title = String(raw.title || "");
  let category: INotificationItem["category"] = "document";
  if (type === "STATUS_CHANGE") {
    if (title.includes("Approved")) {
      category = "approval";
    } else if (title.toLowerCase().includes("revision")) {
      category = "revision";
    } else if (title.toLowerCase().includes("submitted") || title.toLowerCase().includes("new document")) {
      category = "document";
    } else {
      category = "revision";
    }
  } else if (type === "REVISION_COMMENT") {
    category = "revision";
  } else if (type === "COMPLIANCE_ALERT") {
    category = "ai";
  }

  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();
  const dateObj = new Date(createdAt);
  const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });

  return {
    id: raw.id,
    category,
    title: raw.title || "Compliance Notification",
    description: raw.message || "",
    timestamp: `${dateStr} ${timeStr}`,
    read: Boolean(raw.isRead ?? raw.is_read ?? false),
    documentId: raw.documentId || raw.document_id,
    rawType: type,
  };
}

export class NotificationService {
  private client: APIClient;

  constructor() {
    this.client = apiClient;
  }

  /**
   * DOCU: Fetches paginated notifications for the authenticated user.
   * Calls GET /notifications.
   * Last Updated Date: September 18, 2026
   */
  public async getNotifications(
    unreadOnly: boolean = false,
    page: number = 1,
    limit: number = 30
  ): Promise<{ notifications: INotificationItem[]; total: number }> {
    try {
      const envelope = await this.client.get<{
        success: boolean;
        data: RawBackendNotification[];
        pagination?: { total: number; page: number; limit: number };
      }>(API_ENDPOINTS.NOTIFICATIONS.BASE, {
        params: {
          unread_only: String(unreadOnly),
          page: String(page),
          limit: String(limit),
        },
      });

      const rawItems = Array.isArray(envelope?.data) ? envelope.data : [];
      return {
        notifications: rawItems.map(mapBackendNotificationToItem),
        total: envelope?.pagination?.total ?? rawItems.length,
      };
    } catch {
      return { notifications: [], total: 0 };
    }
  }

  /**
   * DOCU: Fetches the total count of unread notifications.
   * Calls GET /notifications/unread-count.
   * Last Updated Date: September 18, 2026
   */
  public async getUnreadCount(): Promise<number> {
    try {
      const envelope = await this.client.get<ApiResponseEnvelope<{ unread_count: number; unreadCount: number }>>(
        API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT
      );
      return envelope?.data?.unread_count ?? envelope?.data?.unreadCount ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * DOCU: Marks a single notification as read.
   * Calls PATCH /notifications/:id/read.
   * Last Updated Date: September 18, 2026
   */
  public async markAsRead(id: string): Promise<void> {
    try {
      await this.client.patch(API_ENDPOINTS.NOTIFICATIONS.READ(id));
    } catch (err) {
      console.error(`[NotificationService] Failed to mark notification ${id} as read:`, err);
    }
  }

  /**
   * DOCU: Marks all notifications as read for the authenticated user.
   * Calls POST /notifications/read-all.
   * Last Updated Date: September 18, 2026
   */
  public async markAllAsRead(): Promise<void> {
    try {
      await this.client.post(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, {});
    } catch (err) {
      console.error("[NotificationService] Failed to mark all notifications as read:", err);
    }
  }

  /**
   * DOCU: Opens a real-time Server-Sent Events (SSE) stream connection to GET /notifications/stream.
   * Dispatches incoming notifications and manages automatic reconnection.
   * Last Updated Date: September 18, 2026
   * @param onNotification - Callback invoked when a real-time notification arrives.
   * @param onStatusChange - Optional callback receiving connection state changes.
   * @returns Cleanup teardown function to close the stream.
   * @author Keith
   */
  public connectSSE(
    onNotification: (item: INotificationItem) => void,
    onStatusChange?: (connected: boolean) => void
  ): () => void {
    if (typeof window === "undefined") return () => {};

    const token = authStore.getToken();
    if (!token) return () => {};

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const streamUrl = `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const setupStream = () => {
      if (isCleanedUp) return;

      try {
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          onStatusChange?.(true);
        };

        eventSource.onmessage = (event) => {
          try {
            if (!event.data || event.data.trim() === "" || event.data.startsWith(":")) {
              return;
            }
            const parsed = JSON.parse(event.data);
            if (parsed.type === "CONNECTED") {
              onStatusChange?.(true);
              return;
            }
            const item = mapBackendNotificationToItem(parsed);
            onNotification(item);
          } catch (err) {
            console.error("[NotificationService] SSE message parse error:", err);
          }
        };

        eventSource.onerror = () => {
          onStatusChange?.(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isCleanedUp) {
            reconnectTimeout = setTimeout(setupStream, 4000);
          }
        };
      } catch (err) {
        console.error("[NotificationService] SSE stream error:", err);
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(setupStream, 4000);
        }
      }
    };

    setupStream();

    return () => {
      isCleanedUp = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      onStatusChange?.(false);
    };
  }
}

export const notificationService = new NotificationService();
