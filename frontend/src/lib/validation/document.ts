import { z } from "zod";

export const documentStatusEnum = z.enum(["Pending", "Approved", "Needs Revision", "Rejected"]);
export type DocumentStatusType = z.infer<typeof documentStatusEnum>;

export const uploadDocumentSchema = z.object({
  title: z.string().min(3, "Document title must be at least 3 characters"),
  category: z.string().min(1, "Please select or enter a category"),
  notes: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  submittedBy: string;
  submittedAt: string;
  status: DocumentStatusType;
  advisorEmail?: string;
  fileSize?: string;
}
