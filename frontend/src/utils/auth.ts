/**
 * DOCU: Safe browser-checked token and session storage manager.
 * Provides resilient access to local and session storage with SSR safety guards.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { UserSession } from "@/entities/interfaces/auth.interface";

const ACCESS_TOKEN_KEY = "springer_access_token";
const SESSION_KEY = "springer_user_session";

export const tokenStorage = {
  /**
   * DOCU: Retrieves raw JWT access token from session or local storage.
   * Last Updated Date: September 7, 2026
   * @returns Stored token string or null when absent or running in SSR.
   * @author Keith
   */
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) || window.localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * DOCU: Stores JWT access token into browser session or persistent local storage.
   * Last Updated Date: September 7, 2026
   * @param token - JWT access token to store.
   * @param persist - Whether to store in localStorage (true) or sessionStorage (false).
   * @author Keith
   */
  setAccessToken(token: string, persist = false): void {
    if (typeof window === "undefined") return;
    try {
      if (persist) {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      }
    } catch {
      // Storage access disabled
    }
  },

  /**
   * DOCU: Retrieves parsed UserSession object from browser session or local storage.
   * Last Updated Date: September 7, 2026
   * @returns Parsed UserSession or null when unauthenticated.
   * @author Keith
   */
  getSession(): UserSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY) || window.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * DOCU: Serializes and stores a UserSession object in browser storage.
   * Last Updated Date: September 7, 2026
   * @param session - UserSession to persist.
   * @param persist - Whether to persist across browser reboots via localStorage.
   * @author Keith
   */
  setSession(session: UserSession, persist = false): void {
    if (typeof window === "undefined") return;
    try {
      const serialized = JSON.stringify(session);
      if (persist) {
        window.localStorage.setItem(SESSION_KEY, serialized);
        window.localStorage.setItem(ACCESS_TOKEN_KEY, session.token);
      } else {
        window.sessionStorage.setItem(SESSION_KEY, serialized);
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, session.token);
      }
    } catch {
      // Storage access disabled
    }
  },

  /**
   * DOCU: Clears stored session tokens from both session and local storage.
   * Last Updated Date: September 7, 2026
   * @author Keith
   */
  clearTokens(): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Storage access disabled
    }
  },
};
