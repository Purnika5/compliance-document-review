/**
 * DOCU: Defines platform workflow guidelines and quick-reference answers for the help widget.
 * Last Updated Date: September 8, 2026
 * @returns Shared assistant constants used by the widget.
 * @author Keith
 */
import type { IChatMessage } from "@/types/chatbot.types";

/**
 * DOCU: Initial greeting message loaded when opening the assistant.
 */
export const INITIAL_MESSAGES: IChatMessage[] = [
  {
    id: "1",
    sender: "bot",
    text: "Welcome to the Springer Capital Help Assistant. You can reference institutional submission rules, officer evaluation workflows, and supported document formats.",
    timestamp: "Live",
  },
];

/**
 * DOCU: Quick-select workflow topics displayed in the help panel.
 */
export const SUGGESTED_QUESTIONS: string[] = [
  "How do I upload a proposal?",
  "What is the review process for Officers?",
  "What document categories are supported?",
  "How do role permissions work?",
];

/**
 * DOCU: Institutional knowledge base for application workflows.
 */
export const PLATFORM_KNOWLEDGE_BASE: Record<string, string> = {
  default:
    "Springer Capital Compliance Assistant. For assistance, select a workflow topic above or consult the user documentation.",
  upload:
    "To upload a new document as an Advisor:\n1. Navigate to the 'My Submissions' workspace.\n2. Click the '+ Submit Proposal Document' button.\n3. Enter the title, select category, attach your file, and submit.",
  review:
    "Compliance Officers evaluate pending filings in the 'Review Queue'. Within the review workspace, officers can record official decisions (Approve, Request Revision, or Reject) with signed compliance notes.",
  categories:
    "Supported document classifications:\n- Investment Proposals\n- Compliance Statements\n- Audit Reports\n- Tax Strategy Documents\n- Portfolio Briefs",
  permissions:
    "Access Control:\n- Advisors: Create and manage submissions; view personal document portfolio and revision requests.\n- Officers: Manage full review queue, inspect filings, record official compliance determinations, and review audit logs.",
};
