/**
 * DOCU: Audit trail action types for regulatory tracking and event logging.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export enum AuditAction {
  /** Triggered when a new document is uploaded by an advisor. */
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  /** Triggered when a document review status changes. */
  STATUS_CHANGED = "STATUS_CHANGED",
  /** Triggered when an officer records a formal review decision. */
  REVIEW_DECISION = "REVIEW_DECISION",
  /** Triggered when an advisor or officer adds a collaboration comment. */
  COMMENT_ADDED = "COMMENT_ADDED",
  /** Triggered when document metadata is modified. */
  METADATA_UPDATED = "METADATA_UPDATED",
  /** Triggered when automated compliance AI finishes scanning the document. */
  AI_SCAN_COMPLETED = "AI_SCAN_COMPLETED",
}
