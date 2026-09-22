export interface ICopilotFlag {
  rule: string;
  passage: string;
  explanation: string;
}

export interface ICopilotRecord {
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
  flags: ICopilotFlag[];
}

export interface ICopilotAnalytics {
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

export interface ICopilotConversationalResponse {
  engine: 'xai-grok' | 'gemini-fallback' | 'algorithmic-fallback';
  greeting: string;
  text: string;
  suggested_followups: string[];
}

export interface ICopilotSearchRequest {
  query?: string;
  status?: string | string[];
  date_range?: string;
  uploaded_by?: string;
  include_all_versions?: boolean;
  conversation_history?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export interface ICopilotSearchResponse {
  success: boolean;
  conversational_response: ICopilotConversationalResponse;
  analytics: ICopilotAnalytics;
  records: ICopilotRecord[];
}
