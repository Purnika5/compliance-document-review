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
      // 1. Attempt official immutable audit-trail endpoint first
      try {
        const auditRes = await this.client.get<ApiResponseEnvelope<any[]>>(
          `/documents/${documentId}/audit-trail`
        );
        const auditData = auditRes?.data;
        if (Array.isArray(auditData) && auditData.length > 0) {
          return auditData.map((item: any) => {
            const who = item.who || {};
            const what = item.what || {};
            const details = what.details || {};
            const roleStr = String(who.user_role || item.actor_role || "").toUpperCase();
            const actorRole: RoleType = roleStr === "OFFICER" ? "Officer" : "Advisor";

            return {
              id: String(item.id || item.documentId),
              document_id: String(item.document_id || item.documentId || documentId),
              action: (what.action || item.action || AuditAction.STATUS_CHANGED) as AuditAction,
              actor_name: String(who.user_name || item.actor_name || (actorRole === "Officer" ? "Compliance Officer" : "Advisor")),
              actor_role: actorRole,
              actor_email: who.user_email || item.actor_email,
              previous_status: details.previous_status || item.previous_status,
              new_status: details.new_status || item.new_status,
              notes: details.reason || item.notes || item.reason || (what.action ? String(what.action) : "Audit event recorded."),
              timestamp: String(item.when || item.createdAt || item.timestamp || new Date().toISOString()),
              document_title: String(item.document_title || ""),
            };
          }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } catch {
        // Fall back to versions and thread entries endpoint
      }

      // 2. Fallback to versions endpoint
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
          const msg = String(entry.message || "Action recorded.");

          let resolvedStatus: string | undefined = undefined;
          if (entryType === "decision") {
            const msgLower = msg.toLowerCase();
            if (msgLower.includes("needs revision") || msgLower.includes("revision")) {
              resolvedStatus = "Needs Revision";
            } else if (msgLower.includes("approved") || msgLower.includes("approv")) {
              resolvedStatus = "Approved";
            } else if (msgLower.includes("rejected") || msgLower.includes("reject")) {
              resolvedStatus = "Rejected";
            } else if (actorRole === "Officer") {
              resolvedStatus = "Needs Revision";
            }
          }

          mapped.push({
            id: String(entry.id || `entry-${mapped.length + 1}`),
            document_id: String(entry.document_id || documentId),
            action,
            actor_name: String(entry.author_name || (actorRole === "Officer" ? "Compliance Officer" : "Advisor")),
            actor_role: actorRole,
            notes: msg,
            timestamp: String(entry.created_at || new Date().toISOString()),
            document_title: "",
            new_status: resolvedStatus || (entry.new_status as string),
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
      return [];
    }
  }
}

export const auditService = new AuditService();
