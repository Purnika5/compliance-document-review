/**
 * DOCU: Generic API response and query payload contracts for REST communication.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */

/**
 * DOCU: Standard JSON response envelope returned by backend endpoints.
 */
export interface ApiResponseEnvelope<T> {
  /** Indicates whether the operation succeeded. */
  success: boolean;
  /** Human-readable status message. */
  message: string;
  /** Typed payload payload. */
  data: T;
}

/**
 * DOCU: Paginated API list result contract.
 */
export interface PaginatedResult<T> {
  /** Array of items in current page. */
  items: T[];
  /** Total count of matching items across all pages. */
  total: number;
  /** Current page index (1-based). */
  page: number;
  /** Items per page limit. */
  limit: number;
  /** Calculated total page count. */
  totalPages: number;
}

/**
 * DOCU: Standardized error payload structure.
 */
export interface ApiErrorShape {
  /** HTTP status code. */
  status: number;
  /** Error explanation message. */
  message: string;
  /** Optional nested validation errors or debug data. */
  data?: unknown;
}
