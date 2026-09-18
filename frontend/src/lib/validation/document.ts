/**
 * DOCU: Defines Zod schemas and TypeScript interfaces for document upload, validation, and item listing.
 * Last Updated Date: September 7, 2026
 * @returns Shared document validation contracts.
 * @author Keith
 */
import { z } from "zod";

/**
 * DOCU: Zod enum validating valid document review lifecycle states.
 */
export const documentStatusEnum = z.enum(["Pending", "Approved", "Needs Revision", "Rejected"]);
export type DocumentStatusType = z.infer<typeof documentStatusEnum>;

/**
 * DOCU: Document upload validation schema ensuring minimum title length and category presence.
 */
export const uploadDocumentSchema = z.object({
  title: z.string().min(3, "Document title must be at least 3 characters"),
  category: z.string().min(1, "Please select or enter a category"),
  notes: z.string().optional(),
  file: z.any().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema> & {
  file?: File;
};

/**
 * DOCU: Standardized document item model rendered in queue and submission tables.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface DocumentItem {
  /** Unique document identifier. */
  id: string;
  /** Submission title. */
  title: string;
  /** Category classification or file format. */
  category: string;
  /** Submitting advisor name. */
  submittedBy: string;
  /** Creation timestamp string. */
  submittedAt: string;
  /** Document review lifecycle status. */
  status: DocumentStatusType;
  /** Submitting advisor email address. */
  advisorEmail?: string;
  /** Formatted file size string. */
  fileSize?: string;
  /** Additional notes or filing remarks. */
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
  /** URL to access the uploaded file. */
  fileUrl?: string;
}
