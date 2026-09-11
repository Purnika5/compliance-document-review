import { query } from '../db/pool';
import { AuthTokenPayload } from '../types/models';
import { AuditTrailItem, CreateAuditInput } from '../types/notification';
import { AppError } from '../middleware/error.middleware';

export class AuditService {
  public static async createAuditRecord(input: CreateAuditInput): Promise<void> {
    const {
      documentId,
      userId,
      action,
      previousStatus,
      newStatus,
      reason,
      fileSize,
      fileType
    } = input;

    await query(
      `INSERT INTO audit_trail (
        document_id,
        user_id,
        action,
        previous_status,
        new_status,
        reason,
        file_size,
        file_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        documentId,
        userId,
        action,
        previousStatus || null,
        newStatus || null,
        reason || null,
        fileSize || null,
        fileType || null
      ]
    );
  }

  public static async getAuditTrail(
    documentId: string,
    user: AuthTokenPayload
  ): Promise<AuditTrailItem[]> {
    // 1. Verify document existence and access rights
    const docRes = await query<{ id: string; advisor_id: string }>(
      'SELECT id, advisor_id FROM documents WHERE id = $1',
      [documentId]
    );

    if (docRes.rows.length === 0) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const doc = docRes.rows[0];

    // Role-based access control: Advisors can only view audit trail for their own documents
    const normalizedRole = user.role.toUpperCase();
    if (normalizedRole === 'ADVISOR' && doc.advisor_id !== user.id) {
      throw new AppError(
        'Forbidden: You do not have permission to view audit history for this document',
        403,
        'FORBIDDEN'
      );
    }

    // 2. Fetch audit trail records joined with user info
    const auditRes = await query<{
      id: string;
      document_id: string;
      user_id: string;
      action: string;
      previous_status: string | null;
      new_status: string | null;
      reason: string | null;
      file_size: string | number | null;
      file_type: string | null;
      created_at: Date;
      user_name: string;
      user_email: string;
      user_role: string;
    }>(
      `SELECT 
        a.id,
        a.document_id,
        a.user_id,
        a.action,
        a.previous_status,
        a.new_status,
        a.reason,
        a.file_size,
        a.file_type,
        a.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM audit_trail a
      JOIN users u ON a.user_id = u.id
      WHERE a.document_id = $1
      ORDER BY a.created_at ASC`,
      [documentId]
    );

    // 3. Format response matching History Payload Structure
    return auditRes.rows.map((row) => {
      const isoDate = new Date(row.created_at).toISOString();
      const userRoleUpper = row.user_role.toUpperCase() === 'ADVISOR' ? 'ADVISOR' : 'OFFICER';

      return {
        id: row.id,
        document_id: row.document_id,
        documentId: row.document_id,
        who: {
          userId: row.user_id,
          user_name: row.user_name,
          user_email: row.user_email,
          user_role: userRoleUpper
        },
        what: {
          action: row.action as any,
          details: {
            previous_status: row.previous_status || null,
            new_status: row.new_status || null,
            reason: row.reason || null,
            file_size: row.file_size ? Number(row.file_size) : null,
            file_type: row.file_type || null
          }
        },
        when: isoDate,
        createdAt: isoDate
      };
    });
  }
}
