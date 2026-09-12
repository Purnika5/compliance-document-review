import { query } from '../db/pool';
import { AuthTokenPayload, DocumentAnalysis, DocumentRecord, DocumentStatus, DocumentWithAdvisor, RevisionThreadEntry } from '../types/models';
import { AppError } from '../middleware/error.middleware';
import { PipelineService } from './pipeline.service';

export interface CreateDocumentInput {
  title: string;
  description?: string;
  file: Express.Multer.File;
  advisorId: string;
}

export interface ResubmitDocumentInput {
  title?: string;
  description?: string;
  notes?: string;
  file: Express.Multer.File;
}

export interface ListDocumentsFilter {
  status?: string;
  advisor_id?: string;
}

export interface QueueFilter {
  status?: string;
}

export interface DocumentLineage {
  versions: DocumentWithAdvisor[];
  thread_entries: RevisionThreadEntry[];
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
        version,
        original_document_id,
        advisor_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending', 1, NULL, $7)
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

    const newDoc = result.rows[0];

    // Create root revision thread
    try {
      const threadRes = await query<{ id: string }>(
        `INSERT INTO revision_threads (root_document_id)
         VALUES ($1)
         ON CONFLICT (root_document_id) DO UPDATE SET root_document_id = EXCLUDED.root_document_id
         RETURNING id`,
        [newDoc.id]
      );

      if (threadRes.rows.length > 0) {
        await query(
          `INSERT INTO revision_thread_entries (
            thread_id,
            document_id,
            author_id,
            entry_type,
            message
          ) VALUES ($1, $2, $3, 'submission', 'Initial submission')`,
          [threadRes.rows[0].id, newDoc.id, advisorId]
        );
      }
    } catch (err) {
      console.error('[DocumentService] Failed to record revision thread for new submission:', err);
    }

    // Trigger Text Extraction -> DevOps PII Masker -> AI Analysis pipeline asynchronously
    PipelineService.processDocument(newDoc.id, newDoc.version, newDoc.file_path, newDoc.mime_type).catch((err) => {
      console.error('[DocumentService] Pipeline processing failed for submission:', err);
    });

    return newDoc;
  }

  public static async updateDocumentStatus(
    documentId: string,
    newStatus: DocumentStatus,
    comment?: string,
    officerId?: string
  ): Promise<DocumentRecord> {
    const existing = await query<DocumentRecord>(
      'SELECT id, status, advisor_id, original_document_id FROM documents WHERE id = $1',
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

    const updatedDoc = result.rows[0];

    if (officerId) {
      try {
        const rootDocId = existing.rows[0].original_document_id || existing.rows[0].id;
        
        let threadRes = await query<{ id: string }>(
          'SELECT id FROM revision_threads WHERE root_document_id = $1',
          [rootDocId]
        );

        if (threadRes.rows.length === 0) {
          threadRes = await query<{ id: string }>(
            `INSERT INTO revision_threads (root_document_id)
             VALUES ($1)
             ON CONFLICT (root_document_id) DO UPDATE SET root_document_id = EXCLUDED.root_document_id
             RETURNING id`,
            [rootDocId]
          );
        }

        if (threadRes.rows.length > 0) {
          const defaultMsg = `Status updated to '${newStatus}'`;
          await query(
            `INSERT INTO revision_thread_entries (
              thread_id,
              document_id,
              author_id,
              entry_type,
              message
            ) VALUES ($1, $2, $3, 'decision', $4)`,
            [threadRes.rows[0].id, documentId, officerId, comment && comment.trim() ? comment.trim() : defaultMsg]
          );
        }
      } catch (err) {
        console.error('[DocumentService] Failed to record decision in revision thread:', err);
      }
    }

    return updatedDoc;
  }

  public static async getQueue(filters: QueueFilter = {}): Promise<DocumentWithAdvisor[]> {
    const params: any[] = [];
    const whereConditions: string[] = [];

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
        d.version,
        d.original_document_id,
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

  public static async resubmitDocument(
    documentId: string,
    input: ResubmitDocumentInput,
    user: AuthTokenPayload
  ): Promise<DocumentRecord> {
    const existing = await query<DocumentRecord>(
      'SELECT * FROM documents WHERE id = $1',
      [documentId]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const currentDoc = existing.rows[0];

    if (currentDoc.advisor_id !== user.id) {
      throw new AppError('Forbidden: Only the original submitting advisor can resubmit this document', 403, 'FORBIDDEN');
    }

    if (currentDoc.status !== 'Needs Revision') {
      throw new AppError(
        `Cannot resubmit document with status '${currentDoc.status}'. Only documents marked 'Needs Revision' can be resubmitted.`,
        400,
        'CANNOT_RESUBMIT'
      );
    }

    const rootDocumentId = currentDoc.original_document_id || currentDoc.id;

    const pendingCheck = await query<{ id: string }>(
      `SELECT id FROM documents 
       WHERE (id = $1 OR original_document_id = $1) AND status = 'Pending'`,
      [rootDocumentId]
    );

    if (pendingCheck.rows.length > 0) {
      throw new AppError('A resubmission for this document is already pending review', 409, 'RESUBMISSION_PENDING');
    }

    const maxVerRes = await query<{ max_version: number }>(
      `SELECT COALESCE(MAX(version), 1) AS max_version 
       FROM documents 
       WHERE id = $1 OR original_document_id = $1`,
      [rootDocumentId]
    );

    const nextVersion = Number(maxVerRes.rows[0].max_version) + 1;

    const title = input.title && input.title.trim() ? input.title.trim() : currentDoc.title;
    const description = input.description !== undefined ? (input.description ? input.description.trim() : null) : currentDoc.description;

    const insertResult = await query<DocumentRecord>(
      `INSERT INTO documents (
        title,
        description,
        file_name,
        file_path,
        file_size,
        mime_type,
        status,
        version,
        original_document_id,
        advisor_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9)
      RETURNING *`,
      [
        title,
        description,
        input.file.originalname,
        input.file.path,
        input.file.size,
        input.file.mimetype,
        nextVersion,
        rootDocumentId,
        user.id
      ]
    );

    const newDoc = insertResult.rows[0];

    try {
      let threadRes = await query<{ id: string }>(
        'SELECT id FROM revision_threads WHERE root_document_id = $1',
        [rootDocumentId]
      );

      if (threadRes.rows.length === 0) {
        threadRes = await query<{ id: string }>(
          `INSERT INTO revision_threads (root_document_id)
           VALUES ($1)
           ON CONFLICT (root_document_id) DO UPDATE SET root_document_id = EXCLUDED.root_document_id
           RETURNING id`,
          [rootDocumentId]
        );
      }

      if (threadRes.rows.length > 0) {
        const msg = input.notes && input.notes.trim() ? input.notes.trim() : `Resubmitted as version ${nextVersion}`;
        await query(
          `INSERT INTO revision_thread_entries (
            thread_id,
            document_id,
            author_id,
            entry_type,
            message
          ) VALUES ($1, $2, $3, 'submission', $4)`,
          [threadRes.rows[0].id, newDoc.id, user.id, msg]
        );
      }
    } catch (err) {
      console.error('[DocumentService] Failed to record resubmission in revision thread:', err);
    }

    // Trigger Text Extraction -> DevOps PII Masker -> AI Analysis pipeline for resubmission asynchronously
    PipelineService.processDocument(newDoc.id, newDoc.version, newDoc.file_path, newDoc.mime_type).catch((err) => {
      console.error('[DocumentService] Pipeline processing failed for resubmission:', err);
    });

    return newDoc;
  }

  public static async getDocumentVersions(
    documentId: string,
    user: AuthTokenPayload
  ): Promise<DocumentLineage> {
    const existing = await query<DocumentRecord>(
      'SELECT id, advisor_id, original_document_id FROM documents WHERE id = $1',
      [documentId]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const doc = existing.rows[0];

    if (user.role === 'Advisor' && doc.advisor_id !== user.id) {
      throw new AppError('Forbidden: You do not have permission to view this document lineage', 403, 'FORBIDDEN');
    }

    const rootDocumentId = doc.original_document_id || doc.id;

    const versionsSql = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_path,
        d.file_size,
        d.mime_type,
        d.status,
        d.version,
        d.original_document_id,
        d.advisor_id,
        d.created_at,
        d.updated_at,
        u.name AS advisor_name,
        u.email AS advisor_email
      FROM documents d
      JOIN users u ON d.advisor_id = u.id
      WHERE d.id = $1 OR d.original_document_id = $1
      ORDER BY d.version ASC, d.created_at ASC
    `;

    const versionsResult = await query<DocumentWithAdvisor>(versionsSql, [rootDocumentId]);

    const threadEntriesSql = `
      SELECT 
        e.id,
        e.thread_id,
        e.document_id,
        e.author_id,
        e.entry_type,
        e.message,
        e.created_at,
        u.name AS author_name,
        u.role AS author_role
      FROM revision_thread_entries e
      JOIN revision_threads t ON e.thread_id = t.id
      JOIN users u ON e.author_id = u.id
      WHERE t.root_document_id = $1
      ORDER BY e.created_at ASC
    `;

    const entriesResult = await query<RevisionThreadEntry>(threadEntriesSql, [rootDocumentId]);

    return {
      versions: versionsResult.rows,
      thread_entries: entriesResult.rows
    };
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
        d.version,
        d.original_document_id,
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
        d.version,
        d.original_document_id,
        d.advisor_id,
        d.created_at,
        d.updated_at,
        u.name AS advisor_name,
        u.email AS advisor_email,
        da.summary AS ai_summary,
        da.flags AS ai_flags,
        da.masked_text
      FROM documents d
      JOIN users u ON d.advisor_id = u.id
      LEFT JOIN document_analyses da ON da.document_id = d.id AND da.version = d.version
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

  public static async getDocumentAnalysis(
    documentId: string,
    user: AuthTokenPayload
  ): Promise<DocumentAnalysis> {
    const doc = await this.getDocumentById(documentId, user);

    const sql = `
      SELECT * FROM document_analyses
      WHERE document_id = $1 AND version = $2
    `;
    const res = await query<DocumentAnalysis>(sql, [doc.id, doc.version]);

    if (res.rows.length === 0) {
      // If not yet analyzed, process it on-the-fly and persist
      const analyzed = await PipelineService.processDocument(doc.id, doc.version, doc.file_path, doc.mime_type);
      if (!analyzed) {
        throw new AppError('Document analysis is not available or still in progress', 404, 'ANALYSIS_NOT_FOUND');
      }
      return analyzed;
    }

    return res.rows[0];
  }
}

