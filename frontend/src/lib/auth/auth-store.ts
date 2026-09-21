/**
 * DOCU: Centralized in-memory and session storage authentication store for frontend session state.
 * Manages user session persistence, subscriber notifications, and token retrieval.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { RoleType } from "@/entities/enums/auth.enum";
import { UserSession } from "@/entities/interfaces/auth.interface";

export type { UserSession };

const SESSION_STORAGE_KEY = "springer-capital-session";

export const DEMO_USERS: Record<RoleType, UserSession> = {
  Officer: {
    name: "Alex Smith",
    email: "alex.smith@springercapital.com",
    role: "Officer",
    token: "mock-officer-jwt",
  },
  Advisor: {
    name: "Sarah Jenkins",
    email: "sarah.j@springercapital.com",
    role: "Advisor",
    token: "mock-advisor-jwt",
  },
  Admin: {
    name: "Platform Admin",
    email: "admin@springercapital.com",
    role: "Admin",
    token: "mock-admin-jwt",
  },
};

/**
 * DOCU: Restores the current user session from browser session storage.
 * Last Updated Date: September 8, 2026
 * @returns Stored UserSession object, or null when not authenticated.
 * @author Keith
 */
function getStoredSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  try {
    const storedSession =
      window.sessionStorage.getItem(SESSION_STORAGE_KEY) ||
      window.localStorage.getItem(SESSION_STORAGE_KEY);
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
  /**
   * DOCU: Returns the current authenticated user session snapshot.
   * Last Updated Date: September 7, 2026
   * @returns Active UserSession or null when unauthenticated.
   * @author Keith
   */
  getSession(): UserSession | null {
    return currentSession;
  },

  /**
   * DOCU: Returns the server snapshot used during SSR to avoid exposing client auth state.
   * Last Updated Date: September 7, 2026
   * @returns Always null on server renders.
   * @author Keith
   */
  getServerSnapshot(): UserSession | null {
    return null;
  },

  /**
   * DOCU: Returns the signed access token for the current frontend session.
   * JWT verification and refresh-token handling are performed by the backend.
   * Last Updated Date: September 7, 2026
   * @returns Raw access token for the Authorization header, or null when signed out.
   * @author Keith
   */
  getToken(): string | null {
    return currentSession?.token || null;
  },

  /**
   * DOCU: Returns the current user's authorization role.
   * Last Updated Date: September 7, 2026
   * @returns User RoleType ("Advisor" | "Officer" | "Admin"), or null when unauthenticated.
   * @author Keith
   */
  getRole(): RoleType | null {
    return currentSession?.role || null;
  },

  /**
   * DOCU: Returns whether a valid user session token exists.
   * Last Updated Date: September 18, 2026
   */
  isAuthenticated(): boolean {
    return Boolean(currentSession?.token);
  },

  /**
   * DOCU: Replaces the current session, persists to storage, and notifies all subscribers.
   * Last Updated Date: September 7, 2026
   * @param session - New UserSession object or null to log out.
   * @author Keith
   */
  setSession(session: UserSession | null) {
    currentSession = session;
    if (typeof window !== "undefined") {
      if (session) {
        const serialized = JSON.stringify(session);
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
        window.localStorage.setItem(SESSION_STORAGE_KEY, serialized);
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    listeners.forEach((listener) => listener());
  },

  /**
   * DOCU: Clears the current session from memory and session storage, notifying subscribers.
   * Last Updated Date: September 7, 2026
   * @author Keith
   */
  clearSession() {
    currentSession = null;
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    listeners.forEach((listener) => listener());
  },

  /**
   * DOCU: Subscribes a listener to session store updates for reactivity.
   * Last Updated Date: September 7, 2026
   * @param listener - Callback invoked upon state change.
   * @returns Unsubscribe cleanup callback.
   * @author Keith
   */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
