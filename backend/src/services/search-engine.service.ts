/**
 * DOCU: High-density multi-dimensional search and analytics engine for Springer Capital documents.
 * Powers the Neural Compliance Copilot with structured repository filtering and version lineage resolution.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import { query } from '../db/pool';
import { AuthTokenPayload } from '../types/models';
import { config } from '../config';

export interface SearchQueryParams {
  query?: string;
  status?: string | string[];
  date_range?: string;
  uploaded_by?: string;
  include_all_versions?: boolean;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface DocumentSearchItem {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: string;
  version: number;
  original_document_id: string | null;
  advisor_id: string;
  advisor_name: string;
  advisor_email: string;
  created_at: string;
  updated_at: string;
  family_id: string;
  total_versions: number;
  has_revisions: boolean;
  latest_doc_id: string;
  active_flags_count: number;
  flagged_rules: string[];
}

export interface SearchAnalytics {
  total_matches: number;
  breakdown_by_status: {
    Pending: number;
    Approved: number;
    NeedsRevision: number;
    Rejected: number;
  };
  regulatory_risk_summary: number;
  revision_velocity: {
    reversioned_count: number;
    reversioned_percentage: number;
  };
  temporal_aggregation: Array<{
    period: string;
    count: number;
  }>;
}

export interface SearchEngineResult {
  documents: DocumentSearchItem[];
  analytics: SearchAnalytics;
  conversational_reply: string;
  suggested_chips: string[];
}

export class SearchEngineService {
  /**
   * Resolves natural language date strings or ISO intervals into precise Date objects.
   */
  public static resolveDateRange(rangeStr?: string): { startDate: Date | null; endDate: Date | null } {
    if (!rangeStr || !rangeStr.trim() || rangeStr.toLowerCase() === 'all time') {
      return { startDate: null, endDate: null };
    }

    const clean = rangeStr.trim().toLowerCase();
    const now = new Date();

    if (clean === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    if (clean === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    if (clean === 'past 7 days' || clean === 'last 7 days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: now };
    }

    if (clean === 'past 30 days' || clean === 'last 30 days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: now };
    }

    if (clean === 'past 90 days' || clean === 'last 90 days') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: now };
    }

    if (clean === 'this month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    if (clean === 'last month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    if (clean === 'quarter to date' || clean === 'qtd') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      return { startDate: start, endDate: now };
    }

    if (/^202[0-9]$/.test(clean)) {
      const yr = parseInt(clean, 10);
      const start = new Date(yr, 0, 1, 0, 0, 0, 0);
      const end = new Date(yr, 11, 31, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    // Interval check: "YYYY-MM-DD to YYYY-MM-DD"
    if (clean.includes(' to ')) {
      const [p1, p2] = clean.split(' to ');
      const d1 = new Date(p1.trim());
      const d2 = new Date(p2.trim());
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        d2.setHours(23, 59, 59, 999);
        return { startDate: d1, endDate: d2 };
      }
    }

    // Direct ISO string check
    const directDate = new Date(clean);
    if (!isNaN(directDate.getTime())) {
      const start = new Date(directDate.getFullYear(), directDate.getMonth(), directDate.getDate(), 0, 0, 0, 0);
      const end = new Date(directDate.getFullYear(), directDate.getMonth(), directDate.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    return { startDate: null, endDate: null };
  }

  /**
   * Executes multi-dimensional document repository search with role scoping and analytics.
   */
  public static async search(user: AuthTokenPayload, params: SearchQueryParams): Promise<SearchEngineResult> {
    const {
      query: titleQuery,
      status,
      date_range,
      uploaded_by,
      include_all_versions = false,
      conversation_history = [],
    } = params;

    const { startDate, endDate } = this.resolveDateRange(date_range);

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // 1. Role Scoping & Ownership
    const userRole = user?.role || 'Advisor';
    const userId = user?.id;

    if (userRole === 'Advisor' && userId) {
      // Advisors are strictly locked to their own submissions
      conditions.push(`d.advisor_id = $${idx++}`);
      values.push(userId);
    } else if (uploaded_by) {
      const cleanUpload = uploaded_by.trim().toLowerCase();
      if ((cleanUpload === 'my uploads' || cleanUpload === 'my files' || cleanUpload === 'my submissions') && userId) {
        conditions.push(`d.advisor_id = $${idx++}`);
        values.push(userId);
      } else if (cleanUpload.length > 0 && cleanUpload !== 'all' && cleanUpload !== 'my uploads' && cleanUpload !== 'my files' && cleanUpload !== 'my submissions') {
        // Can match advisor UUID, email, or name
        conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR d.advisor_id::text = $${idx})`);
        values.push(`%${cleanUpload}%`);
        idx++;
      }
    }

    // 2. Title matching
    if (titleQuery && titleQuery.trim()) {
      conditions.push(`d.title ILIKE $${idx++}`);
      values.push(`%${titleQuery.trim()}%`);
    }

    // 3. Multi-status filtering
    if (status) {
      const statusArr = Array.isArray(status) ? status : [status];
      const validStatuses = statusArr
        .map((s) => s.trim())
        .filter((s) => ['Pending', 'Approved', 'Needs Revision', 'Rejected'].includes(s));
      if (validStatuses.length > 0) {
        conditions.push(`d.status = ANY($${idx++})`);
        values.push(validStatuses);
      }
    }

    // 4. Date ranges
    if (startDate) {
      conditions.push(`d.created_at >= $${idx++}`);
      values.push(startDate.toISOString());
    }
    if (endDate) {
      conditions.push(`d.created_at <= $${idx++}`);
      values.push(endDate.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // CTE Query calculating lineage metrics per family and fetching analyses flags
    const sql = `
      WITH family_meta AS (
        SELECT
          COALESCE(original_document_id, id) AS fam_id,
          COUNT(*)::int AS total_vers,
          MAX(version) AS max_vers
        FROM documents
        GROUP BY COALESCE(original_document_id, id)
      ),
      flag_counts AS (
        SELECT
          document_id,
          version,
          COALESCE(jsonb_array_length(flags), 0)::int AS flag_count,
          COALESCE(
            ARRAY(
              SELECT DISTINCT f->>'rule'
              FROM jsonb_array_elements(COALESCE(flags, '[]'::jsonb)) f
              WHERE f->>'rule' IS NOT NULL
            ),
            '{}'::text[]
          ) AS flag_rules
        FROM document_analyses
      )
      SELECT
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_size,
        d.mime_type,
        d.status,
        d.version,
        d.original_document_id,
        d.advisor_id,
        u.name AS advisor_name,
        u.email AS advisor_email,
        d.created_at,
        d.updated_at,
        COALESCE(d.original_document_id, d.id) AS family_id,
        COALESCE(fm.total_vers, 1) AS total_versions,
        (COALESCE(fm.total_vers, 1) > 1) AS has_revisions,
        COALESCE(fm.max_vers, d.version) AS latest_version,
        COALESCE(fc.flag_count, 0) AS active_flags_count,
        COALESCE(fc.flag_rules, '{}'::text[]) AS flagged_rules
      FROM documents d
      JOIN users u ON d.advisor_id = u.id
      LEFT JOIN family_meta fm ON COALESCE(d.original_document_id, d.id) = fm.fam_id
      LEFT JOIN flag_counts fc ON d.id = fc.document_id AND d.version = fc.version
      ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const result = await query<any>(sql, values);
    let allRecords: DocumentSearchItem[] = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      file_name: row.file_name,
      file_size: Number(row.file_size || 0),
      mime_type: row.mime_type,
      status: row.status,
      version: Number(row.version || 1),
      original_document_id: row.original_document_id,
      advisor_id: row.advisor_id,
      advisor_name: row.advisor_name,
      advisor_email: row.advisor_email,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      family_id: row.family_id,
      total_versions: Number(row.total_versions || 1),
      has_revisions: Boolean(row.has_revisions),
      latest_doc_id: row.id,
      active_flags_count: Number(row.active_flags_count || 0),
      flagged_rules: row.flagged_rules || [],
    }));

    // If include_all_versions is false, pick latest version per family
    let finalDocuments: DocumentSearchItem[] = [];
    if (include_all_versions) {
      finalDocuments = allRecords;
    } else {
      const familyMap = new Map<string, DocumentSearchItem>();
      for (const item of allRecords) {
        if (!familyMap.has(item.family_id)) {
          familyMap.set(item.family_id, item);
        } else {
          const current = familyMap.get(item.family_id)!;
          if (item.version > current.version) {
            familyMap.set(item.family_id, item);
          }
        }
      }
      finalDocuments = Array.from(familyMap.values());
    }

    // High-Density Analytics Aggregator
    const breakdown = {
      Pending: 0,
      Approved: 0,
      NeedsRevision: 0,
      Rejected: 0,
    };

    let flaggedCount = 0;
    let reversionedCount = 0;
    const temporalMap = new Map<string, number>();

    for (const doc of finalDocuments) {
      const s = doc.status;
      if (s === 'Pending') breakdown.Pending++;
      else if (s === 'Approved') breakdown.Approved++;
      else if (s === 'Needs Revision') breakdown.NeedsRevision++;
      else if (s === 'Rejected') breakdown.Rejected++;

      if (doc.active_flags_count > 0) flaggedCount++;
      if (doc.version > 1 || doc.total_versions > 1) reversionedCount++;

      // Period by YYYY-MM
      const periodKey = doc.created_at.slice(0, 7);
      temporalMap.set(periodKey, (temporalMap.get(periodKey) || 0) + 1);
    }

    const totalMatches = finalDocuments.length;
    const analytics: SearchAnalytics = {
      total_matches: totalMatches,
      breakdown_by_status: breakdown,
      regulatory_risk_summary: flaggedCount,
      revision_velocity: {
        reversioned_count: reversionedCount,
        reversioned_percentage: totalMatches > 0 ? Math.round((reversionedCount / totalMatches) * 100) : 0,
      },
      temporal_aggregation: Array.from(temporalMap.entries()).map(([period, count]) => ({
        period,
        count,
      })),
    };

    // Call AI microservice for conversational executive summary
    let conversationalReply = '';
    let suggestedChips: string[] = ['Show high-risk flags', 'Fix flagged document', 'My submissions this month'];

    try {
      const aiEndpoint = `${config.services.aiServiceUrl}/copilot-search-summary`;
      const aiResp = await fetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_context: {
            query: titleQuery || null,
            status: status || null,
            date_range: date_range || null,
            uploaded_by: uploaded_by || null,
          },
          documents: finalDocuments.slice(0, 8),
          analytics,
          conversation_history,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (aiResp.ok) {
        const aiData = (await aiResp.json()) as { conversational_reply?: string; suggested_chips?: string[] };
        if (aiData.conversational_reply) conversationalReply = aiData.conversational_reply;
        if (Array.isArray(aiData.suggested_chips) && aiData.suggested_chips.length > 0) {
          suggestedChips = aiData.suggested_chips;
        }
      }
    } catch (e) {
      console.warn('[SearchEngine] AI Copilot summary call timed out or failed; generating fallback summary:', e);
    }

    if (!conversationalReply) {
      const datePart = date_range ? ` for ${date_range}` : '';
      const queryPart = titleQuery ? ` matching "${titleQuery}"` : '';
      conversationalReply = `I located ${totalMatches} filing${totalMatches !== 1 ? 's' : ''}${queryPart}${datePart}. Status distribution: ${breakdown.Approved} Approved, ${breakdown.Pending} Pending, and ${breakdown.NeedsRevision} Needs Revision. ${flaggedCount > 0 ? `${flaggedCount} document(s) have active compliance risk flags under FINRA 2210 / SEC 206.` : 'All matches comply with baseline regulatory standards.'}`;
    }

    return {
      documents: finalDocuments,
      analytics,
      conversational_reply: conversationalReply,
      suggested_chips: suggestedChips,
    };
  }
}
