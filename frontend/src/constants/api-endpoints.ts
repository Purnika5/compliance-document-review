/**
 * DOCU: Backend REST API route endpoints registry for authentication, document management, and audit trailing.
 * Last Updated Date: September 13, 2026
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
    QUEUE: "/documents/queue",
    DETAIL: (id: string) => `/documents/${id}`,
    STATUS: (id: string) => `/documents/${id}/status`,
    VERSIONS: (id: string) => `/documents/${id}/versions`,
    AUDIT: (id: string) => `/documents/${id}/versions`,
    ANALYSIS: (id: string) => `/documents/${id}/analysis`,
    RESUBMIT: (id: string) => `/documents/${id}/resubmit`,
  },
} as const;
