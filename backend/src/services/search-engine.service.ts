import { query } from '../db/pool';

export interface ISearchFilterParams {
  query?: string;
  status?: string | string[];
  date_range?: string | { start?: string; end?: string };
  uploaded_by?: string;
  include_all_versions?: boolean;
}

export interface IRequestUser {
  id: string;
  role: 'Advisor' | 'Officer';
  name?: string;
  email?: string;
}

export interface ISearchFlag {
  rule: string;
  passage: string;
  explanation: string;
}

export interface ISearchRecord {
  id: string;
  title: string;
  description?: string;
  status: 'Pending' | 'Approved' | 'Needs Revision' | 'Rejected';
  version: number;
  total_versions: number;
  has_revisions: boolean;
  latest_doc_id: string;
  advisor_id: string;
  advisor_name: string;
  advisor_email: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  flags_count: number;
  flags: ISearchFlag[];
}

export interface ISearchAnalytics {
  total_records: number;
  latest_versions_only: boolean;
  by_status: {
    Pending: number;
    Approved: number;
    'Needs Revision': number;
    Rejected: number;
  };
  documents_with_revisions: number;
  flagged_documents_count: number;
}

export interface ISearchEngineResult {
  records: ISearchRecord[];
  analytics: ISearchAnalytics;
}

export class SearchEngineService {
  /**
   * Resolves natural language date range queries and ISO date strings into SQL start and end Date bounds.
   */
  public static parseDateRange(input?: string | { start?: string; end?: string }): { start?: Date; end?: Date } {
    if (!input) return {};

    if (typeof input === 'object') {
      const s = input.start ? new Date(input.start) : undefined;
      const e = input.end ? new Date(input.end) : undefined;
      if (e) e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }

    const raw = input.trim().toLowerCase();
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (raw === 'today') {
      return { start: startOfToday, end: endOfToday };
    }

    if (raw === 'yesterday') {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfYesterday = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);
      return { start: startOfYesterday, end: endOfYesterday };
    }

    if (raw === 'past 7 days' || raw === 'last 7 days') {
      const past7 = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: past7, end: endOfToday };
    }

    if (raw === 'past 30 days' || raw === 'last 30 days') {
      const past30 = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: past30, end: endOfToday };
    }

    if (raw === 'past 90 days' || raw === 'last 90 days') {
      const past90 = new Date(startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start: past90, end: endOfToday };
    }

    if (raw === 'this month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: startOfMonth, end: endOfMonth };
    }

    if (raw === 'last month' || raw === 'past month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: startOfLastMonth, end: endOfLastMonth };
    }

    if (raw === 'quarter to date' || raw === 'qtd') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
      return { start: startOfQuarter, end: endOfToday };
    }

    // Specific 4-digit year e.g. "2024", "2025", "2026"
    if (/^\d{4}$/.test(raw)) {
      const year = parseInt(raw, 10);
      const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start: startOfYear, end: endOfYear };
    }

    // "YYYY-MM-DD to YYYY-MM-DD"
    const rangeMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s*(?:to|-)\s*(\d{4})-(\d{2})-(\d{2})$/);
    if (rangeMatch) {
      const s = new Date(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10) - 1, parseInt(rangeMatch[3], 10), 0, 0, 0, 0);
      const e = new Date(parseInt(rangeMatch[4], 10), parseInt(rangeMatch[5], 10) - 1, parseInt(rangeMatch[6], 10), 23, 59, 59, 999);
      return { start: s, end: e };
    }

    // Single ISO date string YYYY-MM-DD
    const singleMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (singleMatch) {
      const s = new Date(parseInt(singleMatch[1], 10), parseInt(singleMatch[2], 10) - 1, parseInt(singleMatch[3], 10), 0, 0, 0, 0);
      const e = new Date(parseInt(singleMatch[1], 10), parseInt(singleMatch[2], 10) - 1, parseInt(singleMatch[3], 10), 23, 59, 59, 999);
      return { start: s, end: e };
    }

    return {};
  }

  /**
   * Executes multi-dimensional filtered document query with lineage analysis and real-time metrics.
   */
  public static async executeSearch(
    filters: ISearchFilterParams,
    user: IRequestUser
  ): Promise<ISearchEngineResult> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 1. Role Security Scoping
    if (user.role === 'Advisor') {
      conditions.push(`d.advisor_id = $${paramIndex++}`);
      values.push(user.id);
    } else if (filters.uploaded_by) {
      // Officer querying specific uploader
      const uploaderStr = filters.uploaded_by.trim().toLowerCase();
      if (['my uploads', 'my files', 'me', 'mine'].includes(uploaderStr)) {
        conditions.push(`d.advisor_id = $${paramIndex++}`);
        values.push(user.id);
      } else {
        // Query by advisor name, email, or exact UUID
        conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR d.advisor_id::text = $${paramIndex})`);
        values.push(`%${uploaderStr}%`);
        paramIndex++;
      }
    }

    // 2. Title Matching
    if (filters.query && filters.query.trim().length > 0) {
      conditions.push(`d.title ILIKE $${paramIndex++}`);
      values.push(`%${filters.query.trim()}%`);
    }

    // 3. Multi-Select Status
    if (filters.status) {
      const statusArr = (Array.isArray(filters.status) ? filters.status : [filters.status])
        .map((s) => s.trim())
        .filter((s) => ['Pending', 'Approved', 'Needs Revision', 'Rejected'].includes(s));

      if (statusArr.length > 0) {
        conditions.push(`d.status = ANY($${paramIndex++}::varchar[])`);
        values.push(statusArr);
      }
    }

    // 4. Date Range
    const { start: dateStart, end: dateEnd } = this.parseDateRange(filters.date_range);
    if (dateStart) {
      conditions.push(`d.created_at >= $${paramIndex++}`);
      values.push(dateStart);
    }
    if (dateEnd) {
      conditions.push(`d.created_at <= $${paramIndex++}`);
      values.push(dateEnd);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 5. Version Lineage CTE Query
    const sql = `
      WITH family_meta AS (
        SELECT 
          COALESCE(original_document_id, id) AS family_root_id,
          MAX(version) AS max_version,
          COUNT(id) AS total_family_versions
        FROM documents
        GROUP BY COALESCE(original_document_id, id)
      ),
      family_latest_doc AS (
        SELECT DISTINCT ON (COALESCE(original_document_id, id))
          COALESCE(original_document_id, id) AS family_root_id,
          id AS latest_doc_id
        FROM documents
        ORDER BY COALESCE(original_document_id, id), version DESC, created_at DESC
      )
      SELECT 
        d.id,
        d.title,
        d.description,
        d.status,
        d.version,
        fm.total_family_versions,
        fld.latest_doc_id,
        d.advisor_id,
        u.name AS advisor_name,
        u.email AS advisor_email,
        d.file_name,
        d.file_size,
        d.mime_type,
        d.created_at,
        da.flags AS analysis_flags,
        da.summary AS analysis_summary,
        (d.version = fm.max_version) AS is_latest_version
      FROM documents d
      JOIN users u ON d.advisor_id = u.id
      JOIN family_meta fm ON fm.family_root_id = COALESCE(d.original_document_id, d.id)
      JOIN family_latest_doc fld ON fld.family_root_id = COALESCE(d.original_document_id, d.id)
      LEFT JOIN document_analyses da ON da.document_id = d.id AND da.version = d.version
      ${whereClause}
      ORDER BY d.created_at DESC, d.version DESC;
    `;

    const res = await query(sql, values);
    const rawRows = res.rows || [];

    // Filter by latest active version if include_all_versions is not true
    const includeAll = filters.include_all_versions === true;
    const filteredRows = includeAll ? rawRows : rawRows.filter((r: any) => r.is_latest_version);

    // Format Records
    const records: ISearchRecord[] = filteredRows.map((row: any) => {
      let parsedFlags: ISearchFlag[] = [];
      if (row.analysis_flags) {
        if (Array.isArray(row.analysis_flags)) {
          parsedFlags = row.analysis_flags;
        } else if (typeof row.analysis_flags === 'string') {
          try {
            parsedFlags = JSON.parse(row.analysis_flags);
          } catch {
            parsedFlags = [];
          }
        }
      }

      const totalVers = parseInt(row.total_family_versions || '1', 10);
      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        status: row.status,
        version: row.version,
        total_versions: totalVers,
        has_revisions: totalVers > 1,
        latest_doc_id: row.latest_doc_id || row.id,
        advisor_id: row.advisor_id,
        advisor_name: row.advisor_name || 'Institutional Advisor',
        advisor_email: row.advisor_email || '',
        file_name: row.file_name,
        file_size: parseInt(row.file_size || '0', 10),
        mime_type: row.mime_type,
        created_at: new Date(row.created_at).toISOString(),
        flags_count: parsedFlags.length,
        flags: parsedFlags,
      };
    });

    // Compute Analytics
    const analytics: ISearchAnalytics = {
      total_records: records.length,
      latest_versions_only: !includeAll,
      by_status: {
        Pending: 0,
        Approved: 0,
        'Needs Revision': 0,
        Rejected: 0,
      },
      documents_with_revisions: 0,
      flagged_documents_count: 0,
    };

    records.forEach((rec) => {
      if (analytics.by_status[rec.status] !== undefined) {
        analytics.by_status[rec.status]++;
      }
      if (rec.has_revisions || rec.version > 1) {
        analytics.documents_with_revisions++;
      }
      if (rec.flags_count > 0) {
        analytics.flagged_documents_count++;
      }
    });

    return { records, analytics };
  }
}
