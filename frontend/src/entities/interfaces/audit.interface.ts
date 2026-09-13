import { AuditAction } from "../enums/audit.enum";
import { RoleType } from "../enums/auth.enum";

/**
 * DOCU: Audit log entry contract representing an immutable event in the regulatory audit trail.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface AuditLogEntry {
  /** Unique audit event identifier. */
  id: string;
  /** Identifier of the target document. */
  document_id: string;
  /** Action performed on the document. */
  action: AuditAction;
  /** Display name of the user who performed the action. */
  actor_name: string;
  /** Authorization role of the actor. */
  actor_role: RoleType;
  /** Email address of the actor. */
  actor_email?: string;
  /** Document status before the action took place. */
  previous_status?: string;
  /** Resulting document status after the action. */
  new_status?: string;
  /** Optional remarks or reason recorded with the action. */
  notes?: string;
  /** ISO timestamp when the audit event occurred. */
  timestamp: string;
  /** Display name of the document. */
  document_title: string;
}

/**
 * DOCU: Historical revision timeline item displaying document version changes and notes.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface RevisionHistoryItem {
  /** Sequential version number. */
  version: number;
  /** Timestamp when the revision was saved. */
  updated_at: string;
  /** Display name of the user who committed the revision. */
  changed_by: string;
  /** Remarks explaining changes made in this revision. */
  notes?: string;
  /** Filename associated with this version. */
  file_name?: string;
}
