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
    const user = (userIdOrEmail || "").toLowerCase().trim();
    const userRole = (role || "Advisor").toLowerCase().trim();
    return `springer_guided_tour_v9_${user}_${userRole}`;
  },

  /**
   * Checks if the specific user and role has already completed the walkthrough.
   * Strictly isolated per user identity so newly created users always get the walkthrough once.
   */
  hasCompleted(userIdOrEmail?: string, role?: string): boolean {
    if (typeof window === "undefined") return true;
    try {
      const user = (userIdOrEmail || "").toLowerCase().trim();
      const userRole = (role || "Advisor").toLowerCase().trim();

      // If user identity is missing or unauthenticated, do not prematurely treat as completed
      if (!user) return false;

      const exactKey = this.getStorageKey(user, userRole);

      // In-memory dismissal check for current SPA lifecycle for THIS specific user & role
      if (completedInSession.has(exactKey)) {
        return true;
      }

      // Check user-specific sessionStorage
      if (sessionStorage.getItem(`springer_guided_tour_dismissed_${user}_${userRole}`) === "true") {
        return true;
      }

      // Check user-specific persistent localStorage
      if (localStorage.getItem(exactKey) === "true") {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  },

  /**
   * Marks the walkthrough as completed for the current user and role.
   * Guarantees the walkthrough displays only once per user.
   */
  markCompleted(userIdOrEmail?: string, role?: string) {
    if (typeof window === "undefined") return;
    try {
      const user = (userIdOrEmail || "").toLowerCase().trim();
      const userRole = (role || "Advisor").toLowerCase().trim();
      if (!user) return;

      const exactKey = this.getStorageKey(user, userRole);

      // Record in-memory for this specific user
      completedInSession.add(exactKey);

      // Record in sessionStorage for this specific user
      sessionStorage.setItem(`springer_guided_tour_dismissed_${user}_${userRole}`, "true");

      // Record in persistent localStorage for this specific user
      localStorage.setItem(exactKey, "true");
    } catch (err) {
      console.warn("[Walkthrough] Failed to save completion to storage:", err);
    }
  },

  /**
   * Resets the completion status (useful for testing or manual re-onboarding).
   */
  resetCompletion(userIdOrEmail?: string, role?: string) {
    if (typeof window === "undefined") return;
    try {
      const user = (userIdOrEmail || "").toLowerCase().trim();
      const userRole = (role || "Advisor").toLowerCase().trim();
      if (!user) return;

      const exactKey = this.getStorageKey(user, userRole);
      completedInSession.delete(exactKey);
      sessionStorage.removeItem(`springer_guided_tour_dismissed_${user}_${userRole}`);
      localStorage.removeItem(exactKey);

      // Clean up legacy v8 keys for this user to prevent any stale state
      localStorage.removeItem(`springer_guided_tour_v8_${user}_${userRole}`);
      localStorage.removeItem(`springer_guided_tour_v8_role_${userRole}`);
      localStorage.removeItem("springer_guided_tour_v8_any");
      localStorage.removeItem(`springer_guided_tour_v8_user_${userRole}`);
      sessionStorage.removeItem("springer_guided_tour_dismissed");
    } catch (err) {
      console.warn("[Walkthrough] Failed to reset completion in storage:", err);
    }
  },
};
