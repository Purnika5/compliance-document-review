/**
 * DOCU: Coordinates document validation and API actions for frontend workflows.
 * Last Updated Date: September 3, 2026
 * @returns Document retrieval, upload, and status action functions.
 * @author Keith
 */
import { uploadDocumentSchema, type UploadDocumentInput, type DocumentItem, type DocumentStatusType } from "@/lib/validation/document";
import {
  fetchDocumentRequest,
  fetchDocumentVersionsRequest,
  fetchMySubmissionsRequest,
  fetchQueueRequest,
  uploadDocumentRequest,
  updateDocumentStatusRequest,
} from "@/lib/api/documents";

export { fetchQueueRequest, fetchDocumentVersionsRequest };

/**
 * DOCU: Retrieves all versions and revision history for a document.
 * Last Updated Date: September 18, 2026
 * @param documentId - Document identifier to retrieve versions for.
 * @returns Document lineage versions and revision thread entries.
 * @author Keith
 */
export async function getDocumentVersionsAction(documentId: string) {
  return fetchDocumentVersionsRequest(documentId);
}

/**
 * DOCU: Retrieves one document through the document API action layer.
 * Last Updated Date: September 3, 2026
 * @param documentId - Document identifier to retrieve.
 * @returns The requested document item.
 * @author Keith
 */
export async function getDocumentAction(documentId: string): Promise<DocumentItem> {
  return fetchDocumentRequest(documentId);
}

/**
 * DOCU: Retrieves the authenticated advisor's submitted documents.
 * Last Updated Date: September 3, 2026
 * @returns The advisor's document items.
 * @author Keith
 */
export async function getMySubmissionsAction(): Promise<DocumentItem[]> {
  return fetchMySubmissionsRequest();
}

/**
 * DOCU: Retrieves documents available to the officer review queue.
 * Last Updated Date: September 3, 2026
 * @param statusFilter - Optional status filter.
 * @returns Queue document items.
 * @author Keith
 */
export async function getQueueAction(statusFilter?: string): Promise<DocumentItem[]> {
  return fetchQueueRequest(statusFilter);
}

/**
 * DOCU: Validates and submits a document upload through the action layer.
 * Last Updated Date: September 3, 2026
 * @param input - Document upload form values.
 * @returns The document created by the backend.
 * @author Keith
 */
export async function uploadDocumentAction(input: UploadDocumentInput): Promise<DocumentItem> {
  const parsed = uploadDocumentSchema.parse(input);
  return uploadDocumentRequest({ ...parsed, file: input.file });
}

/**
 * DOCU: Updates a document review status through the officer action layer.
 * Last Updated Date: September 3, 2026
 * @param id - Document identifier to update.
 * @param status - Approved, Needs Revision, or Rejected.
 * @returns The updated document status and timestamp.
 * @author Keith
 */
export async function updateDocumentStatusAction(
  id: string,
  status: "Approved" | "Needs Revision" | "Rejected",
  comment?: string
): Promise<{ id: string; status: DocumentStatusType; updated_at: string }> {
  return updateDocumentStatusRequest(id, status, comment);
}
