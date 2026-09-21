/**
 * DOCU: Document Management and Compliance Review Service consuming APIClient.
 * Provides methods for submission listing, officer queue filtering, uploads, and review decisions.
 * Last Updated Date: September 13, 2026
 * @author Keith
 */
import { apiClient, APIClient } from "@/utils/apiClient";
import {
  ApiDocument,
  DocumentItem,
  DocumentFilterOptions,
} from "@/entities/interfaces/document.interface";
import { ReviewDecisionPayload, ReviewDecisionResult } from "@/entities/interfaces/review.interface";
import { ApiResponseEnvelope } from "@/entities/types/api.type";
import { UploadDocumentInput, EditDocumentInput } from "@/schema/document.schema";
import { formatFileSize } from "@/utils/helpers";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { IAIFlagItem } from "@/features/documents/components/ai-assist-panel";

export interface DocumentAnalysisResult {
  flags: IAIFlagItem[];
  isDegraded: boolean;
  status: string;
  summary?: string;
  message?: string;
}

export class DocumentService {
  private client: APIClient;

  constructor() {
    this.client = apiClient;
  }

  /**
   * DOCU: Normalizes backend raw document response into a UI-friendly DocumentItem.
   * Last Updated Date: September 7, 2026
   * @param doc - Raw ApiDocument received from the backend REST API.
   * @returns Transformed DocumentItem with normalized categories and formatted sizes.
   * @author Keith
   */
  public mapToDocumentItem(doc: ApiDocument): DocumentItem {
    const diskFileName = doc.file_path ? doc.file_path.split("/").pop()?.split("\\").pop() : doc.file_name;
    const fileUrl = diskFileName
      ? `/api/raw-file/documents/${diskFileName}`
      : (doc.id ? `/documents/${doc.id}/file` : undefined);

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
      version: (doc as unknown as { version?: number }).version ? Number((doc as unknown as { version?: number }).version) : 1,
      originalDocumentId: (doc as unknown as { original_document_id?: string }).original_document_id,
      fileSize: doc.file_size ? formatFileSize(doc.file_size) : undefined,
      notes: doc.description,
      fileName: doc.file_name,
      filePath: doc.file_path,
      mimeType: doc.mime_type,
      maskedText: doc.masked_text,
      originalText: doc.original_text,
      fileUrl,
    };
  }

  /**
   * DOCU: Fetches documents submitted by the currently authenticated advisor.
   * Last Updated Date: September 7, 2026
   * @returns Array of DocumentItem objects owned by the authenticated advisor.
   * @author Keith
   */
  public async getMySubmissions(): Promise<DocumentItem[]> {
    const envelope = await this.client.get<ApiResponseEnvelope<ApiDocument[]>>(API_ENDPOINTS.DOCUMENTS.BASE);
    const data = Array.isArray(envelope.data) ? envelope.data : [];
    return data.map(this.mapToDocumentItem.bind(this));
  }

  /**
   * DOCU: Fetches the review queue for compliance officers with optional status/advisor filtering.
   * Queries /documents/queue with fallback to /documents.
   * Last Updated Date: September 13, 2026
   * @param filters - Optional query filters for document status or advisor ID.
   * @returns Array of DocumentItem objects matching the specified filter criteria.
   * @author Keith
   */
  public async getQueue(filters?: DocumentFilterOptions): Promise<DocumentItem[]> {
    const params: Record<string, string | undefined> = {};
    if (filters?.status) {
      params.status = filters.status;
    }
    if (filters?.advisorId) {
      params.advisor_id = filters.advisorId;
    }

    const envelope = await this.client.get<ApiResponseEnvelope<ApiDocument[]>>(API_ENDPOINTS.DOCUMENTS.QUEUE, {
      params,
    });
    const data = Array.isArray(envelope?.data) ? envelope.data : [];
    return data.map(this.mapToDocumentItem.bind(this));
  }

  /**
   * DOCU: Fetches a single document by its unique UUID identifier.
   * Last Updated Date: September 7, 2026
   * @param id - Document unique identifier.
   * @returns Normalized DocumentItem detail model.
   * @author Keith
   */
  public async getDocumentById(id: string): Promise<DocumentItem> {
    const envelope = await this.client.get<ApiResponseEnvelope<ApiDocument>>(`/documents/${id}`);
    return this.mapToDocumentItem(envelope.data);
  }

  /**
   * DOCU: Uploads a new compliance document with multipart form-data payload.
   * Last Updated Date: September 7, 2026
   * @param data - Document metadata and binary file attachment.
   * @returns Normalized DocumentItem created by the backend.
   * @author Keith
   */
  public async uploadDocument(data: UploadDocumentInput & { file?: File }): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("category", data.category);
    if (data.notes) formData.append("description", data.notes);
    if (data.file) formData.append("file", data.file);

    const envelope = await this.client.post<ApiResponseEnvelope<ApiDocument>>("/documents", formData);
    return this.mapToDocumentItem(envelope.data);
  }

  /**
   * DOCU: Updates an existing document's title, category, or description with fallback to status endpoint.
   * Last Updated Date: September 13, 2026
   * @param id - Document identifier to update.
   * @param data - Updated metadata fields.
   * @returns Updated DocumentItem model.
   * @author Keith
   */
  public async updateDocument(id: string, data: EditDocumentInput): Promise<DocumentItem> {
    try {
      const envelope = await this.client.patch<ApiResponseEnvelope<ApiDocument>>(`/documents/${id}`, data);
      return this.mapToDocumentItem(envelope.data);
    } catch {
      const envelope = await this.client.patch<ApiResponseEnvelope<ApiDocument>>(`/documents/${id}/status`, data);
      return this.mapToDocumentItem(envelope.data);
    }
  }

  /**
   * DOCU: Submits an official compliance review decision (Approved, Needs Revision, or Rejected).
   * Last Updated Date: September 7, 2026
   * @param id - Document identifier to review.
   * @param decision - Review outcome status, review notes, and addressed flags.
   * @returns Result confirmation containing updated status and timestamp.
   * @author Keith
   */
  public async submitDecision(
    id: string,
    decision: ReviewDecisionPayload
  ): Promise<ReviewDecisionResult> {
    const envelope = await this.client.patch<ApiResponseEnvelope<ReviewDecisionResult>>(
      API_ENDPOINTS.DOCUMENTS.STATUS(id),
      decision
    );
    return envelope.data;
  }

  /**
   * DOCU: Fetches automated AI compliance analysis flags for a document.
   * Last Updated Date: September 13, 2026
   * @param id - Document unique identifier.
   * @returns Promise resolving to array of IAIFlagItem flags.
   * @author Keith
   */
  public async getAnalysis(id: string): Promise<DocumentAnalysisResult> {
    try {
      const envelope = await this.client.get<ApiResponseEnvelope<Record<string, unknown>>>(API_ENDPOINTS.DOCUMENTS.ANALYSIS(id));
      const rawFlags = Array.isArray(envelope?.data?.flags)
        ? (envelope.data.flags as Record<string, unknown>[])
        : Array.isArray(envelope?.data)
        ? (envelope.data as Record<string, unknown>[])
        : [];

      const isDegraded = Boolean(
        envelope?.data?.is_degraded ||
        envelope?.data?.status === "unavailable" ||
        (envelope?.data?.summary && String(envelope.data.summary).includes("unavailable"))
      );

      const flags: IAIFlagItem[] = rawFlags.map((item, index) => ({
        id: String(item.id || `flag-${index + 1}`),
        ruleCode: String(item.rule || item.ruleCode || item.rule_code || `RULE-${index + 1}`),
        severity: ((String(item.severity || "MEDIUM")).toUpperCase() as "HIGH" | "MEDIUM" | "LOW"),
        title: String(item.title || item.rule || "Compliance Rule Flag"),
        passage: String(item.passage || item.flagged_text || item.text || ""),
        explanation: String(item.explanation || item.reason || item.description || "Potential regulatory non-compliance detected."),
        confidenceScore: Number(item.confidenceScore || item.confidence_score || item.confidence || 85),
        pageNumber: Number(item.pageNumber || item.page_number || item.page || 1),
      }));

      return {
        flags,
        isDegraded,
        status: typeof envelope?.data?.status === "string" ? envelope.data.status : (isDegraded ? "unavailable" : "available"),
        summary: typeof envelope?.data?.summary === "string" ? envelope.data.summary : undefined,
        message: typeof envelope?.data?.message === "string" ? envelope.data.message : undefined,
      };
    } catch {
      return {
        flags: [],
        isDegraded: true,
        status: "unavailable",
        summary: "AI service unreachable.",
        message: "AI compliance analysis is temporarily unavailable.",
      };
    }
  }

  /**
   * DOCU: Resubmits a new document version for a submission flagged as Needs Revision.
   * Sends multipart form-data payload to POST /documents/:id/resubmit.
   * Last Updated Date: September 13, 2026
   * @param id - Unique document identifier.
   * @param file - Revised binary file attachment.
   * @param notes - Revision comments or explanation.
   * @returns Updated DocumentItem created by backend.
   * @author Keith
   */
  public async resubmitDocument(id: string, file: File, notes?: string): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("file", file);
    if (notes) {
      formData.append("notes", notes);
      formData.append("description", notes);
    }

    const envelope = await this.client.post<ApiResponseEnvelope<ApiDocument>>(
      API_ENDPOINTS.DOCUMENTS.RESUBMIT(id),
      formData
    );
    return this.mapToDocumentItem(envelope.data);
  }

  /**
   * DOCU: Fetches the lineage and revision history for a document.
   * Calls GET /documents/:id/versions.
   * Last Updated Date: September 18, 2026
   * @param id - Document unique identifier.
   * @returns Promise resolving to lineage versions and thread entries.
   * @author Keith
   */
  public async getDocumentVersions(id: string): Promise<{
    versions: (DocumentItem & { version: number })[];
    threadEntries: {
      id: string;
      threadId: string;
      documentId: string;
      authorId: string;
      authorName: string;
      authorRole: string;
      entryType: string;
      message: string;
      createdAt: string;
    }[];
  }> {
    const envelope = await this.client.get<ApiResponseEnvelope<{
      versions: (ApiDocument & { version?: number })[];
      thread_entries: {
        id: string;
        thread_id: string;
        document_id: string;
        author_id: string;
        author_name: string;
        author_role: string;
        entry_type: string;
        message: string;
        created_at: string;
      }[];
    }>>(API_ENDPOINTS.DOCUMENTS.VERSIONS(id));

    const rawVersions = Array.isArray(envelope?.data?.versions) ? envelope.data.versions : [];
    const rawEntries = Array.isArray(envelope?.data?.thread_entries) ? envelope.data.thread_entries : [];

    const mappedVersions = rawVersions.map((v) => ({
      ...this.mapToDocumentItem(v),
      version: v.version ? Number(v.version) : 1,
    }));

    const mappedEntries = rawEntries.map((e) => ({
      id: e.id,
      threadId: e.thread_id,
      documentId: e.document_id,
      authorId: e.author_id,
      authorName: e.author_name,
      authorRole: e.author_role,
      entryType: e.entry_type,
      message: e.message,
      createdAt: e.created_at,
    }));

    return {
      versions: mappedVersions,
      threadEntries: mappedEntries,
    };
  }
}

export const documentService = new DocumentService();
