export type AuditAction = 'DOCUMENT_SUBMITTED' | 'STATUS_UPDATED' | 'REVISION_COMMENT_ADDED';

export type NotificationType = 'STATUS_CHANGE' | 'REVISION_COMMENT' | 'COMPLIANCE_ALERT';

export interface AuditDetails {
  previous_status?: string | null;
  new_status?: string | null;
  reason?: string | null;
  file_size?: number | null;
  file_type?: string | null;
}

export interface AuditWho {
  userId: string;
  user_name: string;
  user_email: string;
  user_role: 'ADVISOR' | 'OFFICER';
}

export interface AuditWhat {
  action: AuditAction;
  details: AuditDetails;
}

export interface AuditTrailItem {
  id: string;
  document_id: string;
  documentId: string;
  who: AuditWho;
  what: AuditWhat;
  when: string;
  createdAt: string;
}

export interface CreateAuditInput {
  documentId: string;
  userId: string;
  action: AuditAction;
  previousStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  user_id?: string;
  documentId: string;
  document_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  is_read?: boolean;
  createdAt: Date | string;
  created_at?: Date | string;
}

export interface CreateNotificationInput {
  userId: string;
  documentId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export interface ListNotificationsQuery {
  unread_only?: boolean;
  page?: number;
  limit?: number;
}
