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
      fileSize: doc.file_size ? formatFileSize(doc.file_size) : undefined,
      notes: doc.description,
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
    if (filters?.status && filters.status !== "All") {
      params.status = filters.status;
    }
    if (filters?.advisorId) {
      params.advisor_id = filters.advisorId;
    }

    try {
      const envelope = await this.client.get<ApiResponseEnvelope<ApiDocument[]>>(API_ENDPOINTS.DOCUMENTS.QUEUE, {
        params,
      });
      const data = Array.isArray(envelope?.data) ? envelope.data : [];
      return data.map(this.mapToDocumentItem.bind(this));
    } catch {
      const envelope = await this.client.get<ApiResponseEnvelope<ApiDocument[]>>(API_ENDPOINTS.DOCUMENTS.BASE, {
        params,
      });
      const data = Array.isArray(envelope?.data) ? envelope.data : [];
      return data.map(this.mapToDocumentItem.bind(this));
    }
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
  public async getAnalysis(id: string) {
    try {
      const envelope = await this.client.get<ApiResponseEnvelope<Record<string, unknown>>>(API_ENDPOINTS.DOCUMENTS.ANALYSIS(id));
      const rawFlags = Array.isArray(envelope?.data?.flags)
        ? (envelope.data.flags as Record<string, unknown>[])
        : Array.isArray(envelope?.data)
        ? (envelope.data as Record<string, unknown>[])
        : [];

      return rawFlags.map((item, index) => ({
        id: String(item.id || `flag-${index + 1}`),
        ruleCode: String(item.rule || item.ruleCode || item.rule_code || `RULE-${index + 1}`),
        severity: ((String(item.severity || "MEDIUM")).toUpperCase() as "HIGH" | "MEDIUM" | "LOW"),
        title: String(item.title || item.rule || "Compliance Rule Flag"),
        passage: String(item.passage || item.flagged_text || item.text || ""),
        explanation: String(item.explanation || item.reason || item.description || "Potential regulatory non-compliance detected."),
        confidenceScore: Number(item.confidenceScore || item.confidence_score || item.confidence || 85),
        pageNumber: Number(item.pageNumber || item.page_number || item.page || 1),
      }));
    } catch {
      return [];
    }
  }
}

export const documentService = new DocumentService();
