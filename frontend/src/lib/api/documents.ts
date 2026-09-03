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

// ─── Dummy/Mock data for static rendering before API is live ──────────────────
const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: "DOC-2026-001",
    title: "Q3 Investment Strategy & Asset Allocation Proposal",
    category: "Proposal",
    submittedBy: "Sarah Jenkins",
    advisorEmail: "sarah.j@springercapital.com",
    submittedAt: "2026-09-01T10:30:00Z",
    status: "Pending",
    fileSize: "2.4 MB",
  },
  {
    id: "DOC-2026-002",
    title: "High Net Worth Client Risk Assessment Audit",
    category: "Audit Report",
    submittedBy: "David Chen",
    advisorEmail: "david.c@springercapital.com",
    submittedAt: "2026-08-28T14:15:00Z",
    status: "Approved",
    fileSize: "1.8 MB",
  },
  {
    id: "DOC-2026-003",
    title: "Annual Compliance Verification Statement 2026",
    category: "Compliance",
    submittedBy: "Sarah Jenkins",
    advisorEmail: "sarah.j@springercapital.com",
    submittedAt: "2026-08-25T09:00:00Z",
    status: "Needs Revision",
    fileSize: "4.1 MB",
  },
  {
    id: "DOC-2026-004",
    title: "Tax Optimization Framework - Overseas Holdings",
    category: "Tax Strategy",
    submittedBy: "Michael Vance",
    advisorEmail: "michael.v@springercapital.com",
    submittedAt: "2026-08-20T16:45:00Z",
    status: "Rejected",
    fileSize: "3.2 MB",
  },
  {
    id: "DOC-2026-005",
    title: "Sovereign Wealth Portfolio Rebalancing Brief",
    category: "Portfolio Brief",
    submittedBy: "Sarah Jenkins",
    advisorEmail: "sarah.j@springercapital.com",
    submittedAt: "2026-08-15T11:20:00Z",
    status: "Approved",
    fileSize: "5.0 MB",
  },
];

/**
 * GET /documents — Advisor sees own, Officer sees all
 * Query params (Officer only): ?status=Pending&advisor_id=...
 */
export async function fetchMySubmissionsRequest(): Promise<DocumentItem[]> {
  try {
    const envelope = await client.get<Envelope<ApiDocument[]>>("/documents");
    return envelope.data.map(mapApiDocumentToItem);
  } catch {
    // Fallback to dummy data until API is live
    return MOCK_DOCUMENTS;
  }
}

export async function fetchQueueRequest(statusFilter?: string): Promise<DocumentItem[]> {
  try {
    const query =
      statusFilter && statusFilter !== "All" ? `?status=${encodeURIComponent(statusFilter)}` : "";
    const envelope = await client.get<Envelope<ApiDocument[]>>(`/documents${query}`);
    return envelope.data.map(mapApiDocumentToItem);
  } catch {
    // Fallback to dummy data filtered by status
    if (!statusFilter || statusFilter === "All") return MOCK_DOCUMENTS;
    return MOCK_DOCUMENTS.filter((doc) => doc.status === statusFilter);
  }
}

/**
 * POST /documents — multipart/form-data: { file, title, description }
 * Advisor only.
 */
export async function uploadDocumentRequest(data: UploadDocumentInput): Promise<DocumentItem> {
  try {
    // Use FormData for multipart — the file field is a placeholder until the file picker is wired up
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.notes) formData.append("description", data.notes);

    const envelope = await client.request<Envelope<ApiDocument>>("/documents", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type boundary for multipart
    });
    return mapApiDocumentToItem(envelope.data);
  } catch {
    // Fallback created document for static testing
    const newDoc: DocumentItem = {
      id: `DOC-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: data.title,
      category: data.category,
      submittedBy: "Current User",
      submittedAt: new Date().toISOString(),
      status: "Pending" as DocumentStatusType,
      fileSize: "1.5 MB",
    };
    MOCK_DOCUMENTS.unshift(newDoc);
    return newDoc;
  }
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
