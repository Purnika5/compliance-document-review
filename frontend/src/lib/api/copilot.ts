/**
 * DOCU: Frontend API client for Neural Compliance Copilot and repository search.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import { client, getBaseBackendUrl } from "./client";
import type { ISearchParams, ISearchResponse, IAuditAndFixResponse } from "@/types/copilot.types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const copilotApi = {
  /**
   * Search document repository with multi-dimensional filters, version lineages, and analytics.
   */
  async searchDocuments(params: ISearchParams): Promise<ISearchResponse> {
    const response = await client.post<ApiResponse<ISearchResponse>>("/api/documents/search", params);
    return response.data;
  },

  /**
   * In-chat document compliance audit & automated remediation via Google Gemini engine.
   */
  async auditAndRemediate(
    file: File,
    options?: { targetDocumentId?: string; instructions?: string }
  ): Promise<IAuditAndFixResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.targetDocumentId) {
      formData.append("target_document_id", options.targetDocumentId);
    }
    if (options?.instructions) {
      formData.append("instructions", options.instructions);
    }

    return await client.post<IAuditAndFixResponse>("/api/chat/audit-and-fix", formData);
  },

  /**
   * 1-Click submit remediated document directly as new proposal or revision.
   */
  async submitRemediated(data: {
    text: string;
    title: string;
    description?: string;
    targetDocumentId?: string;
    token?: string;
  }): Promise<any> {
    const response = await client.post<ApiResponse<any>>("/api/documents/submit-remediated", data);
    return response.data;
  },

  /**
   * Formats a direct download URL for remediated files.
   */
  getDownloadUrl(token: string): string {
    return `${getBaseBackendUrl()}/api/documents/download-remediated?token=${encodeURIComponent(token)}`;
  },
};
