import { Role } from "@/lib/validation/auth";

export interface UserSession {
  name: string;
  email: string;
  role: Role;
  token: string;
}

// In-memory token & auth session store (not stored in localStorage)
let currentSession: UserSession | null = null;
const listeners: Set<() => void> = new Set();

export const authStore = {
  getSession(): UserSession | null {
    return currentSession;
  },

  getServerSnapshot(): UserSession | null {
    return null;
  },

  getToken(): string | null {
    return currentSession?.token || null;
  },

  getRole(): Role | null {
    return currentSession?.role || null;
  },

  setSession(session: UserSession | null) {
    currentSession = session;
    listeners.forEach((listener) => listener());
  },

  clearSession() {
    currentSession = null;
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
