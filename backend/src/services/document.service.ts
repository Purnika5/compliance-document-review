import { query } from '../db/pool';
import { AuthTokenPayload, DocumentRecord, DocumentStatus, DocumentWithAdvisor } from '../types/models';
import { AppError } from '../middleware/error.middleware';

export interface CreateDocumentInput {
  title: string;
  description?: string;
  file: Express.Multer.File;
  advisorId: string;
}

export interface ListDocumentsFilter {
  status?: string;
  advisor_id?: string;
}

export class DocumentService {
  public static async submitDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
    const { title, description, file, advisorId } = input;

    const result = await query<DocumentRecord>(
      `INSERT INTO documents (
        title,
        description,
        file_name,
        file_path,
        file_size,
        mime_type,
        status,
        advisor_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)
      RETURNING *`,
      [
        title.trim(),
        description ? description.trim() : null,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        advisorId
      ]
    );

    return result.rows[0];
  }

  public static async updateDocumentStatus(
    documentId: string,
    newStatus: DocumentStatus
  ): Promise<DocumentRecord> {
    const existing = await query<DocumentRecord>(
      'SELECT id, status, advisor_id FROM documents WHERE id = $1',
      [documentId]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const validStatuses: DocumentStatus[] = ['Pending', 'Approved', 'Needs Revision', 'Rejected'];
    if (!validStatuses.includes(newStatus)) {
      throw new AppError(
        `Invalid status '${newStatus}'. Allowed: ${validStatuses.join(', ')}`,
        400,
        'INVALID_STATUS'
      );
    }

    const result = await query<DocumentRecord>(
      `UPDATE documents
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, documentId]
    );

    return result.rows[0];
  }

  public static async listDocuments(
    user: AuthTokenPayload,
    filters: ListDocumentsFilter = {}
  ): Promise<DocumentWithAdvisor[]> {
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (user.role === 'Advisor') {
      params.push(user.id);
      whereConditions.push(`d.advisor_id = $${params.length}`);
    } else if (user.role === 'Officer' && filters.advisor_id) {
      params.push(filters.advisor_id);
      whereConditions.push(`d.advisor_id = $${params.length}`);
    }

    if (filters.status && filters.status.toLowerCase() !== 'all') {
      params.push(filters.status);
      whereConditions.push(`LOWER(d.status) = LOWER($${params.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_path,
        d.file_size,
        d.mime_type,
        d.status,
        d.advisor_id,
        d.created_at,
        d.updated_at,
        u.name AS advisor_name,
        u.email AS advisor_email
      FROM documents d
      JOIN users u ON d.advisor_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const result = await query<DocumentWithAdvisor>(sql, params);
    return result.rows;
  }

  public static async getDocumentById(
    documentId: string,
    user: AuthTokenPayload
  ): Promise<DocumentWithAdvisor> {
    const sql = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_path,
        d.file_size,
        d.mime_type,
        d.status,
        d.advisor_id,
        d.created_at,
        d.updated_at,
        u.name AS advisor_name,
        u.email AS advisor_email
      FROM documents d
      JOIN users u ON d.advisor_id = u.id
      WHERE d.id = $1
    `;

    const result = await query<DocumentWithAdvisor>(sql, [documentId]);

    if (result.rows.length === 0) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const doc = result.rows[0];

    if (user.role === 'Advisor' && doc.advisor_id !== user.id) {
      throw new AppError('Forbidden: You do not have permission to view this document', 403, 'FORBIDDEN');
    }

    return doc;
  }
}
