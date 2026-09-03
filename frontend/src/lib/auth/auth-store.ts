import { Role } from "@/lib/validation/auth";

/** Represents the authenticated user's frontend session. */
export interface UserSession {
  /** Display name returned by the authentication API. */
  name: string;
  /** Email address returned by the authentication API. */
  email: string;
  /** Authorization role used by frontend route guards. */
  role: Role;
  /** Signed access token used for authenticated API requests. */
  token: string;
}

const SESSION_STORAGE_KEY = "springer-capital-session";

/** Restores the current session when running in the browser. */
function getStoredSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  try {
    const storedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return storedSession ? (JSON.parse(storedSession) as UserSession) : null;
  } catch {
    return null;
  }
}

/** Holds the current session for the browser tab and its page refreshes. */
let currentSession: UserSession | null = getStoredSession();

/** Subscribers notified whenever the current session changes. */
const listeners: Set<() => void> = new Set();

export const authStore = {
  /** Returns the current authenticated session, or null when signed out. */
  getSession(): UserSession | null {
    return currentSession;
  },

  /** Returns the server snapshot used during SSR to avoid exposing client auth state. */
  getServerSnapshot(): UserSession | null {
    return null;
  },

  /**
   * DOCU: Returns the signed access token for the current frontend session.
   * JWT verification and refresh-token handling are performed by the backend.
   * Last Updated Date: September 3, 2026
   * @returns Raw access token for the Authorization header, or null when signed out.
   * @author Keith
   */
  getToken(): string | null {
    return currentSession?.token || null;
  },

  /** Returns the current user's role, or null when no session exists. */
  getRole(): Role | null {
    return currentSession?.role || null;
  },

  /** Replaces the current session and notifies all subscribed consumers. */
  setSession(session: UserSession | null) {
    currentSession = session;
    if (typeof window !== "undefined") {
      if (session) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    listeners.forEach((listener) => listener());
  },

  /** Clears the current session and notifies all subscribed consumers. */
  clearSession() {
    currentSession = null;
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    listeners.forEach((listener) => listener());
  },

  /** Subscribes to session changes and returns an unsubscribe function. */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
