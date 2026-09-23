import { DocumentStatusType } from "../enums/document.enum";

/**
 * DOCU: Raw document schema returned by backend REST API endpoints.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface ApiDocument {
  /** Unique document identifier. */
  id: string;
  /** Title of the document submission. */
  title: string;
  /** Optional detailed description or notes. */
  description?: string;
  /** Stored file name on server. */
  file_name: string;
  /** Server file storage path. */
  file_path: string;
  /** Binary file size in bytes. */
  file_size: number;
  /** MIME content type of uploaded file. */
  mime_type: string;
  /** Current document review lifecycle status. */
  status: DocumentStatusType;
  /** User identifier of submitting advisor. */
  advisor_id: string;
  /** Display name of submitting advisor. */
  advisor_name?: string;
  /** Email address of submitting advisor. */
  advisor_email?: string;
  /** ISO timestamp when submitted. */
  created_at: string;
  /** ISO timestamp when last modified. */
  updated_at: string;
  /** Optional PII masked extracted document text. */
  masked_text?: string;
  /** Optional raw extracted document text. */
  original_text?: string;
}

/**
 * DOCU: Normalized UI-friendly document item for tables and dashboards.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface DocumentItem {
  /** Unique document identifier. */
  id: string;
  /** Title of the document submission. */
  title: string;
  /** Institutional document category classification (e.g., Regulatory Filing, Audit Report). */
  category: string;
  /** Raw file format derived from MIME type: "PDF" | "DOCX" | "TXT" | "Document". */
  fileFormat?: string;
  /** Submitting advisor name. */
  submittedBy: string;
  /** Submitting advisor email. */
  advisorEmail?: string;
  /** Creation timestamp string. */
  submittedAt: string;
  /** Current document review status. */
  status: DocumentStatusType;
  /** Human-readable formatted file size. */
  fileSize?: string;
  /** Additional notes or description. */
  notes?: string;
  /** Stored file name on server. */
  fileName?: string;
  /** Server file storage path. */
  filePath?: string;
  /** MIME content type. */
  mimeType?: string;
  /** Extracted masked text content. */
  maskedText?: string;
  /** Original extracted text content. */
  originalText?: string;
  /** Document version number in lineage (1, 2, ...). */
  version?: number;
  /** Root document identifier for versioned lineage tracking. */
  originalDocumentId?: string | null;
  /** Full URL to access uploaded file. */
  fileUrl?: string;
}

/**
 * DOCU: Represents a specific historical version in a document lineage.
 * Last Updated Date: September 18, 2026
 * @author Keith
 */
export interface DocumentVersionItem extends DocumentItem {
  version: number;
  previousOfficerRemarks?: string;
}

/**
 * DOCU: Lineage thread entry representing an action, remark, or revision submission.
 * Last Updated Date: September 18, 2026
 * @author Keith
 */
export interface LineageThreadEntry {
  id: string;
  threadId: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorRole: "Officer" | "Advisor" | "System" | string;
  entryType: "decision" | "submission" | "comment" | string;
  message: string;
  createdAt: string;
}

/**
 * DOCU: Response structure for GET /documents/:id/versions.
 * Last Updated Date: September 18, 2026
 * @author Keith
 */
export interface DocumentLineageResponse {
  versions: DocumentVersionItem[];
  threadEntries: LineageThreadEntry[];
}

/**
 * DOCU: Document tally counts per lifecycle status.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface DocumentCounts {
  All: number;
  Pending: number;
  Approved: number;
  "Needs Revision": number;
  Rejected: number;
}

/**
 * DOCU: Query filtering parameters for document listing endpoints.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface DocumentFilterOptions {
  /** Status filter value. */
  status?: string;
  /** Search text filter. */
  search?: string;
  /** Submitting advisor ID filter. */
  advisorId?: string;
}
