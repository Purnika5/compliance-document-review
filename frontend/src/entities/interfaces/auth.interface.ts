import { RoleType } from "../enums/auth.enum";

/**
 * DOCU: User profile contract returned by backend authentication and profile endpoints.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface UserProfile {
  /** Unique user identifier. */
  id?: string;
  /** Display name of the user. */
  name: string;
  /** Registered email address. */
  email: string;
  /** Authorization role assigned to the user. */
  role: RoleType;
  /** Account creation timestamp. */
  created_at?: string;
}

/**
 * DOCU: Frontend authenticated user session contract stored in authStore.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface UserSession {
  /** Display name returned by authentication. */
  name: string;
  /** Authenticated user email address. */
  email: string;
  /** Authorization role for client-side routing and UI authorization. */
  role: RoleType;
  /** Signed Bearer access token for authenticated API requests. */
  token: string;
}

/**
 * DOCU: Authentication API response payload containing user profile and access token.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export interface AuthResponse {
  /** Signed JWT access token. */
  token: string;
  /** User profile payload. */
  user: UserProfile;
}
