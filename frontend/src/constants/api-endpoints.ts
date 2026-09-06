/**
 * DOCU: Backend REST API route endpoints registry for authentication, document management, and audit trailing.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
export const API_ENDPOINTS = {
  HEALTH: "/health",
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    ME: "/auth/me",
    REFRESH: "/auth/refresh",
  },
  DOCUMENTS: {
    BASE: "/documents",
    DETAIL: (id: string) => `/documents/${id}`,
    STATUS: (id: string) => `/documents/${id}/status`,
    AUDIT: (id: string) => `/documents/${id}/audit`,
  },
} as const;
