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
export async function fetchMySubmissionsRequest(): Promise<DocumentItem[]> {
  const envelope = await client.get<Envelope<ApiDocument[]>>("/documents");
  return envelope.data.map(mapApiDocumentToItem);
}

export async function fetchQueueRequest(statusFilter?: string): Promise<DocumentItem[]> {
  const query =
    statusFilter && statusFilter !== "All" ? `?status=${encodeURIComponent(statusFilter)}` : "";
  const envelope = await client.get<Envelope<ApiDocument[]>>(`/documents${query}`);
  return envelope.data.map(mapApiDocumentToItem);
}

export async function fetchDocumentRequest(documentId: string): Promise<DocumentItem> {
  const envelope = await client.get<Envelope<ApiDocument>>(`/documents/${documentId}`);
  return mapApiDocumentToItem(envelope.data);
}

/**
 * POST /documents — multipart/form-data: { file, title, description }
 * Advisor only.
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
