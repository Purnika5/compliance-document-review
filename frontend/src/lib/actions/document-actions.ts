import { uploadDocumentSchema, type UploadDocumentInput, type DocumentItem, type DocumentStatusType } from "@/lib/validation/document";
import { fetchMySubmissionsRequest, fetchQueueRequest, uploadDocumentRequest, updateDocumentStatusRequest } from "@/lib/api/documents";

export async function getMySubmissionsAction(): Promise<DocumentItem[]> {
  return fetchMySubmissionsRequest();
}

export async function getQueueAction(statusFilter?: string): Promise<DocumentItem[]> {
  return fetchQueueRequest(statusFilter);
}

export async function uploadDocumentAction(input: UploadDocumentInput): Promise<DocumentItem> {
  const parsed = uploadDocumentSchema.parse(input);
  return uploadDocumentRequest(parsed);
}

/**
 * Officer-only: PATCH /documents/:id/status
 * Allowed statuses: "Approved" | "Needs Revision" | "Rejected"
 */
export async function updateDocumentStatusAction(
  id: string,
  status: "Approved" | "Needs Revision" | "Rejected"
): Promise<{ id: string; status: DocumentStatusType; updated_at: string }> {
  return updateDocumentStatusRequest(id, status);
}
