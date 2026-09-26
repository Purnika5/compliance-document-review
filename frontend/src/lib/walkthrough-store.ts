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

const completedInSession = new Set<string>();

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

  closeWalkthrough(userIdOrEmail?: string, role?: string) {
    this.markCompleted(userIdOrEmail, role);
    state = { isOpen: false, forcedRole: undefined };
    notify();
  },

  /**
   * Generates a deterministic storage key per user identity and role.
   */
  getStorageKey(userIdOrEmail?: string, role?: string): string {
    const user = (userIdOrEmail || "user").toLowerCase().trim();
    const userRole = (role || "user").toLowerCase().trim();
    return `springer_guided_tour_v8_${user}_${userRole}`;
  },

  /**
   * Checks if the user has already completed the walkthrough.
   */
  hasCompleted(userIdOrEmail?: string, role?: string): boolean {
    if (typeof window === "undefined") return true;
    try {
      const user = (userIdOrEmail || "user").toLowerCase().trim();
      const userRole = (role || "user").toLowerCase().trim();

      // In-memory dismissal check for current SPA lifecycle
      if (
        completedInSession.has(`${user}_${userRole}`) ||
        completedInSession.has(user) ||
        completedInSession.has(userRole) ||
        completedInSession.has("all")
      ) {
        return true;
      }

      // Tab session storage check
      if (sessionStorage.getItem("springer_guided_tour_dismissed") === "true") {
        return true;
      }

      // Persistent localStorage checks (exact, role-based, or universal)
      const exactKey = this.getStorageKey(user, userRole);
      if (localStorage.getItem(exactKey) === "true") return true;
      if (localStorage.getItem(`springer_guided_tour_v8_role_${userRole}`) === "true") return true;
      if (localStorage.getItem("springer_guided_tour_v8_any") === "true") return true;
      if (localStorage.getItem(`springer_guided_tour_v8_user_${userRole}`) === "true") return true;

      return false;
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
      const user = (userIdOrEmail || "user").toLowerCase().trim();
      const userRole = (role || "user").toLowerCase().trim();

      // Record in-memory
      completedInSession.add(`${user}_${userRole}`);
      completedInSession.add(user);
      completedInSession.add(userRole);
      completedInSession.add("all");

      // Record in sessionStorage
      sessionStorage.setItem("springer_guided_tour_dismissed", "true");

      // Record in localStorage
      const exactKey = this.getStorageKey(user, userRole);
      localStorage.setItem(exactKey, "true");
      localStorage.setItem(`springer_guided_tour_v8_role_${userRole}`, "true");
      localStorage.setItem("springer_guided_tour_v8_any", "true");
    } catch (err) {
      console.warn("[Walkthrough] Failed to save completion to storage:", err);
    }
  },

  /**
   * Resets the completion status (useful for testing or full re-onboarding).
   */
  resetCompletion(userIdOrEmail?: string, role?: string) {
    if (typeof window === "undefined") return;
    try {
      const user = (userIdOrEmail || "user").toLowerCase().trim();
      const userRole = (role || "user").toLowerCase().trim();

      completedInSession.clear();
      sessionStorage.removeItem("springer_guided_tour_dismissed");

      const exactKey = this.getStorageKey(user, userRole);
      localStorage.removeItem(exactKey);
      localStorage.removeItem(`springer_guided_tour_v8_role_${userRole}`);
      localStorage.removeItem("springer_guided_tour_v8_any");
      localStorage.removeItem(`springer_guided_tour_v8_user_${userRole}`);
    } catch (err) {
      console.warn("[Walkthrough] Failed to reset completion in storage:", err);
    }
  },
};
