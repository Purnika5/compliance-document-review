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
  advisor_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentWithAdvisor extends DocumentRecord {
  advisor_name: string;
  advisor_email: string;
}
