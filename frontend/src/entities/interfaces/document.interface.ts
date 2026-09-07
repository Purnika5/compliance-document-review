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
  /** Document category or file format. */
  category: string;
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
