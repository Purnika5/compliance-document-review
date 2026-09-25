/**
 * DOCU: Centralized store for the First-Time Compliance Onboarding Action Journal.
 * Manages role-distinct journal actions for Advisors and Officers, tracking completion state per user in localStorage.
 * Last Updated Date: September 25, 2026
 * @author Keith
 */

export interface IJournalAction {
  id: string;
  role: "Advisor" | "Officer";
  category: "Statutory Setup" | "Data Security & Ingestion" | "AI Copilot" | "Workflow Lineage" | "Supervisory Audit";
  title: string;
  description: string;
  statutoryReference: string;
  actionLabel: string;
  actionType: "acknowledge_rules" | "upload_document" | "copilot_grammar" | "view_audit_trail" | "view_queue" | "review_priority" | "open_copilot_rules";
  completed: boolean;
  completedAt?: string;
}

export const ADVISOR_DEFAULT_JOURNAL_ACTIONS: Omit<IJournalAction, "completed" | "completedAt">[] = [
  {
    id: "adv-rules-ack",
    role: "Advisor",
    category: "Statutory Setup",
    title: "1. Review & Acknowledge Statutory Guidelines",
    description:
      "Familiarize yourself with FINRA Rule 2210 (Fair-Balance & Non-Promissory Standard) and Rule 2111 (Suitability). Unsubstantiated returns and guaranteed performance claims are strictly prohibited.",
    statutoryReference: "FINRA Rule 2210(d)(1)(D) & Rule 2111",
    actionLabel: "Review Regulatory Standards",
    actionType: "acknowledge_rules",
  },
  {
    id: "adv-first-upload",
    role: "Advisor",
    category: "Data Security & Ingestion",
    title: "2. Submit First Client Recommendation Draft",
    description:
      "Upload your first investment proposal, marketing flyer, or correspondence draft (.pdf, .docx, .txt). The system automatically redacts sensitive client PII (SSNs, phone numbers) before compliance ledger ingestion.",
    statutoryReference: "PII Masking & SEC Privacy Standard",
    actionLabel: "Upload Document",
    actionType: "upload_document",
  },
  {
    id: "adv-copilot-grammar",
    role: "Advisor",
    category: "AI Copilot",
    title: "3. Pre-Check Draft Phrasing with /grammar",
    description:
      "Use the Neural Compliance Copilot to evaluate sentence quality and verify English dictionary terms. The engine checks for complete subject-verb structure and flags non-words or promissory language before officer review.",
    statutoryReference: "Pre-Filing Automated Quality Gate",
    actionLabel: "Test /grammar in Copilot",
    actionType: "copilot_grammar",
  },
  {
    id: "adv-versioning-lineage",
    role: "Advisor",
    category: "Workflow Lineage",
    title: "4. Verify Document Status & Revision Lineage",
    description:
      "Learn how submissions flow through 'Pending Review', 'Needs Revision', and 'Approved'. If amendments are requested, submit version 2.0 (v2) directly to preserve complete supervisory lineage.",
    statutoryReference: "Institutional Document Lineage Standard",
    actionLabel: "Explore Submissions Workflow",
    actionType: "open_copilot_rules",
  },
  {
    id: "adv-audit-trail",
    role: "Advisor",
    category: "Supervisory Audit",
    title: "5. Inspect Permanent Regulatory Audit Ledger",
    description:
      "Review the immutable compliance ledger. Every upload timestamp, PII sanitization event, and officer determination is cryptographically logged for SEC and FINRA audit defensibility.",
    statutoryReference: "SEC Rule 206 Books & Records Mandate",
    actionLabel: "View Audit Trail",
    actionType: "view_audit_trail",
  },
];

export const OFFICER_DEFAULT_JOURNAL_ACTIONS: Omit<IJournalAction, "completed" | "completedAt">[] = [
  {
    id: "off-mandate-ack",
    role: "Officer",
    category: "Statutory Setup",
    title: "1. Acknowledge Supervisory Authority & FINRA 3110",
    description:
      "Review your supervisory mandate as Compliance Officer. Officers hold statutory determinative authority across all advisory submissions, suitability reviews, and public communication approvals.",
    statutoryReference: "FINRA Rule 3110 (Supervision Mandate)",
    actionLabel: "Review Officer Protocol",
    actionType: "acknowledge_rules",
  },
  {
    id: "off-queue-triage",
    role: "Officer",
    category: "Supervisory Audit",
    title: "2. Inspect Review Queue & Priority Triage",
    description:
      "Navigate to the Review Queue to triage incoming filings by submission date, priority, and risk severity (High, Medium, Urgent). High-risk filings with promissory claims should be addressed first.",
    statutoryReference: "FINRA Rule 2210 & SEC Rule 206(4)-1",
    actionLabel: "Open Review Queue",
    actionType: "view_queue",
  },
  {
    id: "off-priority-filter",
    role: "Officer",
    category: "Supervisory Audit",
    title: "3. Triage High-Risk Flagged Discrepancies",
    description:
      "Filter the queue for 'High' severity filings. Investigate automated pre-scan findings targeting promissory returns, unsubstantiated rankings, or omitted downside volatility disclosures.",
    statutoryReference: "Priority Risk Assessment Protocol",
    actionLabel: "Filter Priority Filings",
    actionType: "review_priority",
  },
  {
    id: "off-determination-exercise",
    role: "Officer",
    category: "Workflow Lineage",
    title: "4. Execute Statutory Determinations & Clean Exports",
    description:
      "Understand the three formal determinative actions: 'Approved', 'Needs Revision', and 'Rejected'. Verify that downloaded remediated documents automatically omit internal findings for safe client presentation.",
    statutoryReference: "Institutional Audit Determination Rules",
    actionLabel: "Review Determination Rules",
    actionType: "open_copilot_rules",
  },
  {
    id: "off-copilot-research",
    role: "Officer",
    category: "AI Copilot",
    title: "5. Query Precedents & Audit Memos with AI Copilot",
    description:
      "Consult the Copilot to research FINRA/SEC regulatory precedents, look up statutory rules, or audit supervisory memo draft text with /grammar before issuing formal sign-offs.",
    statutoryReference: "Institutional Precedent Discovery Engine",
    actionLabel: "Launch Institutional Copilot",
    actionType: "copilot_grammar",
  },
];

interface JournalState {
  isOpen: boolean;
  activeTab: "Advisor" | "Officer";
}

let journalState: JournalState = {
  isOpen: false,
  activeTab: "Advisor",
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const journalStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getState(): JournalState {
    return journalState;
  },

  getServerSnapshot(): JournalState {
    return { isOpen: false, activeTab: "Advisor" };
  },

  openJournal(role?: "Advisor" | "Officer") {
    journalState = {
      isOpen: true,
      activeTab: role || journalState.activeTab,
    };
    notify();
  },

  closeJournal() {
    journalState = {
      ...journalState,
      isOpen: false,
    };
    notify();
  },

  getStorageKey(userIdOrEmail?: string, role?: string): string {
    const user = (userIdOrEmail || "guest").toLowerCase().trim();
    const userRole = (role || "Advisor").toLowerCase().trim();
    return `springer_journal_actions_${user}_${userRole}`;
  },

  getJournalFirstTimeKey(userIdOrEmail?: string, role?: string): string {
    const user = (userIdOrEmail || "guest").toLowerCase().trim();
    const userRole = (role || "Advisor").toLowerCase().trim();
    return `springer_journal_first_seen_${user}_${userRole}`;
  },

  isFirstTime(userIdOrEmail?: string, role?: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const key = this.getJournalFirstTimeKey(userIdOrEmail, role);
      return localStorage.getItem(key) !== "true";
    } catch {
      return false;
    }
  },

  markSeen(userIdOrEmail?: string, role?: string) {
    if (typeof window === "undefined") return;
    try {
      const key = this.getJournalFirstTimeKey(userIdOrEmail, role);
      localStorage.setItem(key, "true");
    } catch (err) {
      console.warn("[Journal] Failed to mark journal as seen:", err);
    }
  },

  getActions(userIdOrEmail?: string, role: "Advisor" | "Officer" = "Advisor"): IJournalAction[] {
    const defaults = role === "Officer" ? OFFICER_DEFAULT_JOURNAL_ACTIONS : ADVISOR_DEFAULT_JOURNAL_ACTIONS;
    if (typeof window === "undefined") {
      return defaults.map((d) => ({ ...d, completed: false }));
    }

    try {
      const key = this.getStorageKey(userIdOrEmail, role);
      const stored = localStorage.getItem(key);
      if (!stored) {
        return defaults.map((d) => ({ ...d, completed: false }));
      }
      const parsed: Record<string, { completed: boolean; completedAt?: string }> = JSON.parse(stored);
      return defaults.map((d) => ({
        ...d,
        completed: Boolean(parsed[d.id]?.completed),
        completedAt: parsed[d.id]?.completedAt,
      }));
    } catch {
      return defaults.map((d) => ({ ...d, completed: false }));
    }
  },

  toggleAction(userIdOrEmail: string | undefined, role: "Advisor" | "Officer", actionId: string) {
    if (typeof window === "undefined") return;
    const currentActions = this.getActions(userIdOrEmail, role);
    const updated = currentActions.map((a) => {
      if (a.id === actionId) {
        const nextCompleted = !a.completed;
        return {
          ...a,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }
      return a;
    });

    const toStore: Record<string, { completed: boolean; completedAt?: string }> = {};
    updated.forEach((a) => {
      toStore[a.id] = { completed: a.completed, completedAt: a.completedAt };
    });

    try {
      const key = this.getStorageKey(userIdOrEmail, role);
      localStorage.setItem(key, JSON.stringify(toStore));
      notify();
    } catch (err) {
      console.warn("[Journal] Failed to save action state:", err);
    }
  },

  completeAction(userIdOrEmail: string | undefined, role: "Advisor" | "Officer", actionId: string) {
    if (typeof window === "undefined") return;
    const currentActions = this.getActions(userIdOrEmail, role);
    const toStore: Record<string, { completed: boolean; completedAt?: string }> = {};

    currentActions.forEach((a) => {
      const isTarget = a.id === actionId;
      const isCompleted = isTarget ? true : a.completed;
      toStore[a.id] = {
        completed: isCompleted,
        completedAt: isTarget && !a.completed ? new Date().toISOString() : a.completedAt,
      };
    });

    try {
      const key = this.getStorageKey(userIdOrEmail, role);
      localStorage.setItem(key, JSON.stringify(toStore));
      notify();
    } catch (err) {
      console.warn("[Journal] Failed to complete action:", err);
    }
  },

  resetJournal(userIdOrEmail: string | undefined, role: "Advisor" | "Officer") {
    if (typeof window === "undefined") return;
    try {
      const key = this.getStorageKey(userIdOrEmail, role);
      const firstTimeKey = this.getJournalFirstTimeKey(userIdOrEmail, role);
      localStorage.removeItem(key);
      localStorage.removeItem(firstTimeKey);
      notify();
    } catch (err) {
      console.warn("[Journal] Failed to reset journal:", err);
    }
  },
};
