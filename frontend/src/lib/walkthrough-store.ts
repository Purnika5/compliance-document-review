/**
 * DOCU: Centralized walkthrough store for first-time onboarding tours for Advisors and Officers.
 * Tracks tour completion per user/role in localStorage and enables manual re-triggering.
 * Last Updated Date: September 25, 2026
 * @author Keith
 */

export type WalkthroughListener = () => void;

export interface WalkthroughState {
  isOpen: boolean;
  forcedRole?: "Advisor" | "Officer";
}

const defaultState: WalkthroughState = {
  isOpen: false,
};

let state: WalkthroughState = defaultState;

const listeners = new Set<WalkthroughListener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const walkthroughStore = {
  subscribe(listener: WalkthroughListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getState(): WalkthroughState {
    return state;
  },

  getServerSnapshot(): WalkthroughState {
    return defaultState;
  },

  openWalkthrough(role?: "Advisor" | "Officer") {
    state = { isOpen: true, forcedRole: role };
    notify();
  },

  closeWalkthrough() {
    state = { isOpen: false, forcedRole: undefined };
    notify();
  },

  /**
   * Generates a deterministic storage key per user identity and role.
   */
  getStorageKey(userIdOrEmail?: string, role?: string): string {
    const user = (userIdOrEmail || "guest").toLowerCase().trim();
    const userRole = (role || "user").toLowerCase().trim();
    return `springer_guided_tour_v5_${user}_${userRole}`;
  },

  /**
   * Checks if the user has already completed the walkthrough.
   */
  hasCompleted(userIdOrEmail?: string, role?: string): boolean {
    if (typeof window === "undefined") return true;
    try {
      const key = this.getStorageKey(userIdOrEmail, role);
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  },

  /**
   * Marks the walkthrough as completed for the current user and role.
   */
  markCompleted(userIdOrEmail?: string, role?: string) {
    if (typeof window === "undefined") return;
    try {
      const key = this.getStorageKey(userIdOrEmail, role);
      localStorage.setItem(key, "true");
    } catch (err) {
      console.warn("[Walkthrough] Failed to save completion to localStorage:", err);
    }
  },

  /**
   * Resets the completion status (useful for testing or full re-onboarding).
   */
  resetCompletion(userIdOrEmail?: string, role?: string) {
    if (typeof window === "undefined") return;
    try {
      const key = this.getStorageKey(userIdOrEmail, role);
      localStorage.removeItem(key);
    } catch (err) {
      console.warn("[Walkthrough] Failed to reset completion in localStorage:", err);
    }
  },
};
