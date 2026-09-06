/**
 * DOCU: Audit Trail Service consuming APIClient for regulatory audit logging.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { apiClient, APIClient } from "@/utils/apiClient";
import { AuditLogEntry } from "@/entities/interfaces/audit.interface";
import { ApiResponseEnvelope } from "@/entities/types/api.type";

export class AuditService {
  private client: APIClient;

  constructor() {
    this.client = apiClient;
  }

  /**
   * DOCU: Fetches the regulatory audit history events for a specific document.
   * Last Updated Date: September 7, 2026
   * @param documentId - Document identifier to retrieve audit records for.
   * @returns Array of AuditLogEntry records or empty array on failure.
   * @author Keith
   */
  public async getDocumentAuditTrail(documentId: string): Promise<AuditLogEntry[]> {
    try {
      const envelope = await this.client.get<ApiResponseEnvelope<AuditLogEntry[]>>(
        `/documents/${documentId}/audit`
      );
      return envelope.data;
    } catch {
      return [];
    }
  }
}

export const auditService = new AuditService();
