/**
 * DOCU: Document validation schemas using Zod for uploads, edits, and review decisions.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { z } from "zod";

/**
 * DOCU: Zod enum validating allowed review lifecycle status values.
 */
export const documentStatusEnum = z.enum(["Pending", "Approved", "Needs Revision", "Rejected"]);
export type DocumentStatusType = z.infer<typeof documentStatusEnum>;

/**
 * DOCU: Upload document form validation schema.
 */
export const uploadDocumentSchema = z.object({
  title: z.string().min(3, "Document title must be at least 3 characters"),
  category: z.string().min(1, "Please select or enter a category"),
  notes: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

/**
 * DOCU: Edit document metadata validation schema.
 */
export const editDocumentSchema = z.object({
  title: z.string().min(3, "Document title must be at least 3 characters"),
  category: z.string().min(1, "Please select or enter a category"),
  description: z.string().optional(),
});

export type EditDocumentInput = z.infer<typeof editDocumentSchema>;

/**
 * DOCU: Officer review decision validation schema with feedback notes.
 */
export const reviewDecisionSchema = z.object({
  status: z.enum(["Approved", "Needs Revision", "Rejected"]),
  comment: z.string().min(3, "Please provide review feedback or comments").optional(),
});

export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
