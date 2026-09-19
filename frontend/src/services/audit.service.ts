/**
 * DOCU: Audit Trail Service consuming APIClient for regulatory audit logging and document versions.
 * Last Updated Date: September 13, 2026
 * @author Keith
 */
import { apiClient, APIClient } from "@/utils/apiClient";
import { AuditLogEntry } from "@/entities/interfaces/audit.interface";
import { ApiResponseEnvelope } from "@/entities/types/api.type";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { AuditAction } from "@/entities/enums/audit.enum";
import type { RoleType } from "@/entities/enums/auth.enum";

export class AuditService {
  private client: APIClient;

  constructor() {
    this.client = apiClient;
  }

  /**
   * DOCU: Fetches the regulatory audit history events and document version history for a specific document.
   * Calls GET /documents/:id/versions with fallback support.
   * Last Updated Date: September 18, 2026
   * @param documentId - Document identifier to retrieve audit records for.
   * @returns Array of AuditLogEntry records or empty array on failure.
   * @author Keith
   */
  public async getDocumentAuditTrail(documentId: string): Promise<AuditLogEntry[]> {
    try {
      const response = await this.client.get<
        ApiResponseEnvelope<{ versions?: Record<string, unknown>[]; thread_entries?: Record<string, unknown>[] } | AuditLogEntry[]>
      >(API_ENDPOINTS.DOCUMENTS.VERSIONS(documentId));

      const payload = response?.data;
      if (Array.isArray(payload)) {
        return payload;
      }
      if (payload && typeof payload === "object") {
        const mapped: AuditLogEntry[] = [];
        const threadEntries = Array.isArray(payload.thread_entries) ? payload.thread_entries : [];
        const versions = Array.isArray(payload.versions) ? payload.versions : [];

        for (const entry of threadEntries) {
          const entryType = String(entry.entry_type || "").toLowerCase();
          const action = entryType === "decision"
            ? AuditAction.REVIEW_DECISION
            : entryType === "comment"
            ? AuditAction.COMMENT_ADDED
            : AuditAction.DOCUMENT_UPLOADED;

          const roleStr = String(entry.author_role || "").toUpperCase();
          const actorRole: RoleType = roleStr === "OFFICER" ? "Officer" : "Advisor";

          mapped.push({
            id: String(entry.id || `entry-${mapped.length + 1}`),
            document_id: String(entry.document_id || documentId),
            action,
            actor_name: String(entry.author_name || (actorRole === "Officer" ? "Compliance Officer" : "Advisor")),
            actor_role: actorRole,
            notes: String(entry.message || "Action recorded."),
            timestamp: String(entry.created_at || new Date().toISOString()),
            document_title: "",
          });
        }

        for (const v of versions) {
          mapped.push({
            id: `ver-${String(v.id || documentId)}-${String(v.version || 1)}`,
            document_id: String(v.id || documentId),
            action: AuditAction.DOCUMENT_UPLOADED,
            actor_name: String(v.advisor_name || "Advisor"),
            actor_role: "Advisor",
            notes: v.description ? `Version ${v.version}: ${v.description}` : `Version ${v.version} submitted`,
            timestamp: String(v.created_at || new Date().toISOString()),
            document_title: String(v.title || "Document"),
            new_status: String(v.status || "Pending"),
          });
        }

        // Sort latest first
        mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return mapped;
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
