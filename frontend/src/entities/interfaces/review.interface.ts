import { DocumentStatusType } from "../enums/document.enum";

/**
 * DOCU: Compliance Risk & Flag contracts for AI-assisted review analysis.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface ComplianceFlag {
  /** Unique flag identifier. */
  id: string;
  /** Severity risk rating. */
  category: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  /** Flag headline or rule violated. */
  title: string;
  /** Detailed rationale and flagged clause description. */
  description: string;
  /** Recommended remediation action for the advisor. */
  suggestedAction?: string;
  /** Whether the flag has been resolved by an advisor revision. */
  resolved?: boolean;
}

/**
 * DOCU: Payload submitted by compliance officers when approving, requesting revision, or rejecting a document.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface ReviewDecisionPayload {
  /** Outcome decision status. */
  status: "Approved" | "Needs Revision" | "Rejected";
  /** Official compliance officer feedback or revision requirements. */
  comment?: string;
  /** List of addressed compliance flag identifiers. */
  flagsAddressed?: string[];
}

/**
 * DOCU: Confirmation response from the backend review status update endpoint.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface ReviewDecisionResult {
  /** Identifier of the reviewed document. */
  id: string;
  /** Resulting document lifecycle status. */
  status: DocumentStatusType;
  /** ISO timestamp when the decision was recorded. */
  updated_at: string;
  /** Recorded officer notes or remarks. */
  officer_notes?: string;
}
