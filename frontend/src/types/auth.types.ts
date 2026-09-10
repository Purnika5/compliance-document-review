import type { RoleType } from "@/entities/enums/auth.enum";

/**
 * DOCU: Describes the standardized authentication response envelope from the backend.
 * Last Updated Date: September 3, 2026
 * @author Keith
 */
export interface AuthEnvelope {
  /** Indicates whether the request completed successfully. */
  success: boolean;
  /** Human-readable result message. */
  message: string;
  /** Authenticated user data and signed access token. */
  data: {
    /** Authenticated user profile returned by the API. */
    user: {
      /** Unique user identifier. */
      id: string;
      /** User's display name. */
      name: string;
      /** User's email address. */
      email: string;
      /** User role used for authorization. */
      role: RoleType;
      /** User creation timestamp. */
      created_at: string;
      /** Timestamp of the most recent user update. */
      updated_at: string;
    };
    /** Signed JWT returned for authenticated requests. */
    token: string;
  };
}

/**
 * DOCU: Defines the normalized authentication data consumed by frontend actions.
 * Last Updated Date: September 3, 2026
 * @author Keith
 */
export interface AuthApiResponse {
  /** Signed access token for the current session. */
  token: string;
  /** Authenticated user profile. */
  user: {
    /** Unique user identifier. */
    id: string;
    /** User's display name. */
    name: string;
    /** User's email address. */
    email: string;
    /** User role used by frontend guards. */
    role: RoleType;
  };
  /** Optional message returned by the backend. */
  message?: string;
}
