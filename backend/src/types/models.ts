export type UserRole = 'Advisor' | 'Officer';

export type DocumentStatus = 'Pending' | 'Approved' | 'Needs Revision' | 'Rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = Omit<User, 'password_hash'>;

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface DocumentRecord {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  version: number;
  original_document_id: string | null;
  advisor_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentWithAdvisor extends DocumentRecord {
  advisor_name: string;
  advisor_email: string;
  ai_summary?: string | null;
  ai_flags?: ComplianceFlag[];
  masked_text?: string | null;
}

export interface RevisionThread {
  id: string;
  root_document_id: string;
  created_at: Date;
}

export type RevisionEntryType = 'submission' | 'comment' | 'decision';

export interface RevisionThreadEntry {
  id: string;
  thread_id: string;
  document_id: string;
  author_id: string;
  author_name?: string;
  author_role?: UserRole;
  entry_type: RevisionEntryType;
  message: string | null;
  created_at: Date;
}

export interface ComplianceFlag {
  passage: string;
  rule: string;
  explanation: string;
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
  category?: 'PROHIBITED_CLAIM' | 'MISSING_DISCLOSURE' | 'SUITABILITY' | 'PRECEDENT_MATCH';
  fixed_passage?: string;
  confidenceScore?: number;
}

export interface DocumentAnalysis {
  id: string;
  document_id: string;
  version: number;
  masked_text: string;
  summary: string | null;
  flags: ComplianceFlag[];
  created_at: Date;
  updated_at: Date;
}

export interface RetrievedRule {
  id: string;
  rule_code: string;
  title: string;
  description: string;
  similarity_score: number;
}

export interface PrecedentItem {
  id: string;
  document_id: string;
  passage: string;
  outcome: string;
  explanation: string;
  similarity_score: number;
}

