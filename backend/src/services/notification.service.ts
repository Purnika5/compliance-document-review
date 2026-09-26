import { Response } from 'express';
import { query } from '../db/pool';
import {
  CreateNotificationInput,
  NotificationRecord,
  NotificationType
} from '../types/notification';
import { AppError } from '../middleware/error.middleware';

export class NotificationService {
  // Active SSE stream connections per userId
  private static sseClients: Map<string, Set<Response>> = new Map();

  public static addSSEClient(userId: string, res: Response): void {
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, new Set());
    }
    this.sseClients.get(userId)!.add(res);
  }

  public static removeSSEClient(userId: string, res: Response): void {
    if (this.sseClients.has(userId)) {
      const clients = this.sseClients.get(userId)!;
      clients.delete(res);
      if (clients.size === 0) {
        this.sseClients.delete(userId);
      }
    }
  }

  public static broadcastNotification(userId: string, notification: NotificationRecord): void {
    const clients = this.sseClients.get(userId);
    if (clients && clients.size > 0) {
      const payload = `data: ${JSON.stringify(notification)}\n\n`;
      clients.forEach((res) => {
        try {
          res.write(payload);
        } catch (err) {
          // Stream error or disconnected client
        }
      });
    }
  }

  public static async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationRecord> {
    const { userId, documentId, title, message, type } = input;

    const result = await query<{
      id: string;
      user_id: string;
      document_id: string;
      title: string;
      message: string;
      type: string;
      is_read: boolean;
      created_at: Date;
    }>(
      `INSERT INTO notifications (
        user_id,
        document_id,
        title,
        message,
        type,
        is_read
      ) VALUES ($1, $2, $3, $4, $5, false)
      RETURNING *`,
      [userId, documentId, title, message, type]
    );

    const row = result.rows[0];
    let fileName: string | undefined;
    let mimeType: string | undefined;
    if (documentId) {
      try {
        const docRes = await query<{ file_name: string; mime_type: string }>(
          'SELECT file_name, mime_type FROM documents WHERE id = $1',
          [documentId]
        );
        if (docRes.rows[0]) {
          fileName = docRes.rows[0].file_name;
          mimeType = docRes.rows[0].mime_type;
        }
      } catch {
        // non-blocking
      }
    }

    const notification: NotificationRecord = {
      id: row.id,
      userId: row.user_id,
      user_id: row.user_id,
      documentId: row.document_id,
      document_id: row.document_id,
      title: row.title,
      message: row.message,
      type: row.type as any,
      isRead: row.is_read,
      is_read: row.is_read,
      createdAt: row.created_at,
      created_at: row.created_at,
      fileName,
      file_name: fileName,
      mimeType,
      mime_type: mimeType,
    };

    // Dispatch real-time SSE stream update
    this.broadcastNotification(userId, notification);

    return notification;
  }

  public static async notifyOfficers(
    documentId: string,
    title: string,
    message: string,
    type: NotificationType = 'STATUS_CHANGE'
  ): Promise<void> {
    try {
      const officersRes = await query<{ id: string }>(
        "SELECT id FROM users WHERE LOWER(role) = 'officer'"
      );
      for (const officer of officersRes.rows) {
        await this.createNotification({
          userId: officer.id,
          documentId,
          title,
          message,
          type
        });
      }
    } catch (err) {
      console.error('[NotificationService] Failed to notify officers:', err);
    }
  }

  public static async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: NotificationRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const whereClause = unreadOnly
      ? 'WHERE user_id = $1 AND is_read = false'
      : 'WHERE user_id = $1';

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications ${whereClause}`,
      [userId]
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const dataRes = await query<{
      id: string;
      user_id: string;
      document_id: string;
      title: string;
      message: string;
      type: string;
      is_read: boolean;
      created_at: Date;
      file_name?: string | null;
      mime_type?: string | null;
    }>(
      `SELECT n.*, d.file_name, d.mime_type 
       FROM notifications n 
       LEFT JOIN documents d ON n.document_id = d.id 
       ${whereClause.replace(/user_id/g, 'n.user_id').replace(/is_read/g, 'n.is_read')} 
       ORDER BY n.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const notifications: NotificationRecord[] = dataRes.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      user_id: row.user_id,
      documentId: row.document_id,
      document_id: row.document_id,
      title: row.title,
      message: row.message,
      type: row.type as any,
      isRead: row.is_read,
      is_read: row.is_read,
      createdAt: row.created_at,
      created_at: row.created_at,
      fileName: row.file_name || undefined,
      file_name: row.file_name || undefined,
      mimeType: row.mime_type || undefined,
      mime_type: row.mime_type || undefined,
    }));

    return { notifications, total, page, limit };
  }

  public static async getUnreadCount(userId: string): Promise<{ unread_count: number; unreadCount: number }> {
    const countRes = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    const unread_count = parseInt(countRes.rows[0]?.count || '0', 10);
    return { unread_count, unreadCount: unread_count };
  }

  public static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationRecord> {
    const checkRes = await query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM notifications WHERE id = $1',
      [notificationId]
    );

    if (checkRes.rows.length === 0) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    if (checkRes.rows[0].user_id !== userId) {
      throw new AppError('Forbidden: Access denied to notification', 403, 'FORBIDDEN');
    }

    const updateRes = await query<{
      id: string;
      user_id: string;
      document_id: string;
      title: string;
      message: string;
      type: string;
      is_read: boolean;
      created_at: Date;
    }>(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );

    const row = updateRes.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      user_id: row.user_id,
      documentId: row.document_id,
      document_id: row.document_id,
      title: row.title,
      message: row.message,
      type: row.type as any,
      isRead: row.is_read,
      is_read: row.is_read,
      createdAt: row.created_at,
      created_at: row.created_at
    };
  }

  public static async markAllAsRead(userId: string): Promise<{ updated_count: number }> {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return { updated_count: result.rowCount || 0 };
  }
}
