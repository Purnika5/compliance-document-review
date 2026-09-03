/**
 * DOCU: Provides frontend API requests and response mapping for documents.
 * Last Updated Date: September 3, 2026
 * @returns Normalized document API request functions.
 * @author Keith
 */
import { client } from "./client";
import type { DocumentItem, DocumentStatusType, UploadDocumentInput } from "@/lib/validation/document";

/**
 * Sahil's backend response envelope: { success, message, data: ... }
 */
interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiDocument {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatusType;
  advisor_id: string;
  advisor_name?: string;
  advisor_email?: string;
  created_at: string;
  updated_at: string;
}

/**
 * DOCU: Maps a backend document response into the frontend document model.
 * Last Updated Date: September 3, 2026
 * @param doc - Raw document returned by the backend API.
 * @returns Document item used by frontend components.
 * @author Keith
 */
function mapApiDocumentToItem(doc: ApiDocument): DocumentItem {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.mime_type?.includes("pdf")
      ? "PDF"
      : doc.mime_type?.includes("word") || doc.file_name?.endsWith(".docx")
        ? "DOCX"
        : "Document",
    submittedBy: doc.advisor_name || "Advisor",
    advisorEmail: doc.advisor_email,
    submittedAt: doc.created_at,
    status: doc.status,
    fileSize: doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB` : undefined,
  };
}

/**
 * GET /documents — Advisor sees own, Officer sees all
 * Query params (Officer only): ?status=Pending&advisor_id=...
 */
/**
 * DOCU: Retrieves documents submitted by the authenticated advisor.
 * Last Updated Date: September 3, 2026
 * @returns The authenticated user's document items.
 * @author Keith
 */
export async function fetchMySubmissionsRequest(): Promise<DocumentItem[]> {
  const envelope = await client.get<Envelope<ApiDocument[]>>("/documents");
  return envelope.data.map(mapApiDocumentToItem);
}

/**
 * DOCU: Retrieves the officer review queue with an optional status filter.
 * Last Updated Date: September 3, 2026
 * @param statusFilter - Optional document status used to filter the queue.
 * @returns Document items available in the review queue.
 * @author Keith
 */
export async function fetchQueueRequest(statusFilter?: string): Promise<DocumentItem[]> {
  const query =
    statusFilter && statusFilter !== "All" ? `?status=${encodeURIComponent(statusFilter)}` : "";
  const envelope = await client.get<Envelope<ApiDocument[]>>(`/documents${query}`);
  return envelope.data.map(mapApiDocumentToItem);
}

/**
 * DOCU: Retrieves one document by identifier from the backend API.
 * Last Updated Date: September 3, 2026
 * @param documentId - Document identifier requested from the API.
 * @returns The normalized document item.
 * @author Keith
 */
export async function fetchDocumentRequest(documentId: string): Promise<DocumentItem> {
  const envelope = await client.get<Envelope<ApiDocument>>(`/documents/${documentId}`);
  return mapApiDocumentToItem(envelope.data);
}

/**
 * POST /documents — multipart/form-data: { file, title, description }
 * Advisor only.
 */
/**
 * DOCU: Uploads a document using the backend multipart endpoint.
 * Last Updated Date: September 3, 2026
 * @param data - Document title, category, notes, and file data.
 * @returns The document created by the backend.
 * @author Keith
 */
export async function uploadDocumentRequest(data: UploadDocumentInput): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("title", data.title);
  if (data.notes) formData.append("description", data.notes);

  const envelope = await client.request<Envelope<ApiDocument>>("/documents", {
    method: "POST",
    body: formData,
  });
  return mapApiDocumentToItem(envelope.data);
}

/**
 * PATCH /documents/:id/status — Officer only
 * Body: { status: "Approved" | "Needs Revision" | "Rejected" }
 */
/**
 * DOCU: Sends a review status change for a document to the backend API.
 * Last Updated Date: September 3, 2026
 * @param documentId - Document identifier to update.
 * @param status - New review status selected by the officer.
 * @returns The updated document item.
 * @author Keith
 */
export async function updateDocumentStatusRequest(
  id: string,
  status: "Approved" | "Needs Revision" | "Rejected"
): Promise<{ id: string; status: DocumentStatusType; updated_at: string }> {
  const envelope = await client.request<
    Envelope<{ id: string; status: DocumentStatusType; updated_at: string }>
  >(`/documents/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return envelope.data;
}
