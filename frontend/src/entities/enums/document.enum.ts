/**
 * DOCU: Document lifecycle status, category, and priority enums for compliance management.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */

/**
 * DOCU: Document review lifecycle state.
 */
export enum DocumentStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  NEEDS_REVISION = "Needs Revision",
  REJECTED = "Rejected",
}

/**
 * DOCU: String union type of document lifecycle states.
 */
export type DocumentStatusType = "Pending" | "Approved" | "Needs Revision" | "Rejected";

/**
 * DOCU: Compliance document categories and supported MIME types.
 */
export enum DocumentCategory {
  FINANCIAL_REPORT = "FINANCIAL_REPORT",
  COMPLIANCE_DISCLOSURE = "COMPLIANCE_DISCLOSURE",
  KYC_VERIFICATION = "KYC_VERIFICATION",
  AUDIT_MEMO = "AUDIT_MEMO",
  PDF = "PDF",
  DOCX = "DOCX",
  DOCUMENT = "Document",
}

/**
 * DOCU: Review priority urgency levels.
 */
export enum PriorityLevel {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  URGENT = "Urgent",
}
