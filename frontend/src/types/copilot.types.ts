/**
 * DOCU: TypeScript definitions for the Neural Compliance Copilot and Filterable Document Search Engine.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */

export interface ISearchParams {
  query?: string;
  status?: string | string[];
  date_range?: string;
  uploaded_by?: string;
  include_all_versions?: boolean;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface ISearchDocument {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: 'Pending' | 'Approved' | 'Needs Revision' | 'Rejected';
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

export interface ISearchAnalytics {
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

export interface ISearchResponse {
  documents: ISearchDocument[];
  analytics: ISearchAnalytics;
  conversational_reply: string;
  suggested_chips: string[];
}

export interface IAuditBreakdownItem {
  rule: string;
  original_passage: string;
  issue: string;
  fixed_passage: string;
  reason: string;
}

export interface IAuditAndFixResponse {
  success: boolean;
  file_meta: {
    original_filename: string;
    file_size: number;
    mime_type: string;
  };
  conversational_summary: string;
  audit_breakdown: IAuditBreakdownItem[];
  remediated_content: {
    text: string;
    download_url: string;
    suggested_title: string;
    token: string;
  };
  one_click_actions: {
    can_submit_as_new: boolean;
    can_submit_as_revision: boolean;
    target_document_id: string | null;
  };
}
