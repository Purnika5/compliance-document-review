/**
 * DOCU: Audit Trail Service consuming APIClient for regulatory audit logging and document versions.
 * Last Updated Date: September 13, 2026
 * @author Keith
 */
import { apiClient, APIClient } from "@/utils/apiClient";
import { AuditLogEntry } from "@/entities/interfaces/audit.interface";
import { ApiResponseEnvelope } from "@/entities/types/api.type";
import { API_ENDPOINTS } from "@/constants/api-endpoints";

export class AuditService {
  private client: APIClient;

  constructor() {
    this.client = apiClient;
  }

  /**
   * DOCU: Fetches the regulatory audit history events and document version history for a specific document.
   * Calls GET /documents/:id/versions with fallback support.
   * Last Updated Date: September 13, 2026
   * @param documentId - Document identifier to retrieve audit records for.
   * @returns Array of AuditLogEntry records or empty array on failure.
   * @author Keith
   */
  public async getDocumentAuditTrail(documentId: string): Promise<AuditLogEntry[]> {
    try {
      const response = await this.client.get<
        ApiResponseEnvelope<AuditLogEntry[] | { versions?: AuditLogEntry[]; thread_entries?: AuditLogEntry[] }>
      >(API_ENDPOINTS.DOCUMENTS.VERSIONS(documentId));

      const payload = response?.data;
      if (Array.isArray(payload)) {
        return payload;
      }
      if (payload && typeof payload === "object") {
        return payload.versions || payload.thread_entries || [];
      }
      return [];
    } catch {
      try {
        const fallback = await this.client.get<ApiResponseEnvelope<AuditLogEntry[]>>(
          `/documents/${documentId}/audit`
        );
        return Array.isArray(fallback?.data) ? fallback.data : [];
      } catch {
        return [];
      }
    }
  }
}

export const auditService = new AuditService();
