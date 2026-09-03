import type { Role } from "@/lib/validation/auth";

/**
 * Matches Sahil's backend response envelope: { success, message, data: { user, token } }
 */
export interface AuthEnvelope {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      created_at: string;
      updated_at: string;
    };
    token: string;
  };
}

export interface AuthApiResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  message?: string;
}
