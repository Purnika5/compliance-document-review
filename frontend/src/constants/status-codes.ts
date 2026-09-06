/**
 * DOCU: Document review status definitions and UI configuration for badges and labels.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { DocumentStatusType } from "@/entities/enums/document.enum";

/**
 * DOCU: UI display configuration for a document status.
 */
export interface StatusConfig {
  /** Human-readable status label. */
  label: string;
  /** UI badge color variant. */
  variant: "default" | "secondary" | "destructive" | "outline";
  /** Contextual explanation for tooltips and help text. */
  description: string;
}

/**
 * DOCU: Mapping of each DocumentStatusType to its UI display properties.
 */
export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatusType, StatusConfig> = {
  Pending: {
    label: "Pending Review",
    variant: "secondary",
    description: "Document has been submitted and is awaiting compliance officer review.",
  },
  Approved: {
    label: "Approved",
    variant: "default",
    description: "Document meets all compliance requirements and has been formally approved.",
  },
  "Needs Revision": {
    label: "Needs Revision",
    variant: "outline",
    description: "Document has flagged compliance issues that require advisor correction.",
  },
  Rejected: {
    label: "Rejected",
    variant: "destructive",
    description: "Document failed compliance checks and cannot proceed.",
  },
};
