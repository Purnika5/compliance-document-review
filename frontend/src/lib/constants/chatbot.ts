/**
 * DOCU: Defines platform workflow guidelines, pre-login guidance, and quick-reference answers for the help widget.
 * Last Updated Date: September 21, 2026
 * @returns Shared assistant constants used by the widget.
 * @author Keith
 */
import type { IChatMessage } from "@/types/chatbot.types";

/**
 * DOCU: Initial informative greeting message loaded when visiting the login page.
 */
export const LOGIN_INITIAL_MESSAGES: IChatMessage[] = [
  {
    id: "login-greeting",
    sender: "bot",
    text: "Welcome to the Springer Capital Compliance Portal. I can provide platform orientation, supported submission formats, and institutional access guidelines before you sign in.",
    timestamp: "Live",
  },
];

/**
 * DOCU: Quick-select topics displayed on the login screen.
 */
export const LOGIN_SUGGESTED_QUESTIONS: string[] = [
  "What is the Springer Capital portal?",
  "What document formats are accepted?",
  "How does compliance review work?",
  "How do role permissions work?",
];

/**
 * DOCU: Informative knowledge base for pre-login inquiries.
 */
export const LOGIN_KNOWLEDGE_BASE: Record<string, string> = {
  default:
    "Springer Capital Compliance Portal Assistant. Before signing in, you can inquire about platform features, supported file formats, or institutional security standards.",
  access:
    "System Access & Account Inquiries:\n\nSpringer Capital operates a restricted institutional compliance platform. Accounts are provisioned directly by your compliance administrator.\n\n• Compliance Officers: Authorized compliance personnel with review and determination authority.\n• Investment Advisors: Licensed advisors provisioned for proposal submission and portfolio tracking.\n\nTo request access or reset credentials, contact your enterprise compliance administrator.",
  overview:
    "Springer Capital Compliance Document Review is an enterprise institutional platform designed for financial compliance teams. It automates proposal vetting, verifies regulatory requirements (SEC Rule 206(4)-1 and FINRA Rule 2210), and maintains an immutable audit trail of officer determinations.",
  formats:
    "Supported Document Formats & Classifications:\n\n• File Formats: PDF (.pdf) and Microsoft Word (.docx) up to 25MB.\n• Supported Classifications:\n  1. Investment Proposals\n  2. Compliance Statements\n  3. Audit Reports\n  4. Tax Strategy Documents\n  5. Portfolio Briefs",
  workflow:
    "Institutional Workflow Overview:\n1. Advisors upload proposal documents with assigned classifications.\n2. Platform performs automated regulatory checks (FINRA 2210 & SEC 206).\n3. Compliance Officers evaluate submissions in the Review Queue.\n4. Decisions (Approve, Request Revision, Reject) are signed with official compliance notes and audit-stamped.",
};

/**
 * DOCU: Initial greeting message when authenticated in the dashboard.
 */
export const DASHBOARD_INITIAL_MESSAGES: IChatMessage[] = [
  {
    id: "dash-greeting",
    sender: "bot",
    text: "Springer Capital Compliance Copilot active. You can ask workflow questions, check regulatory guidelines, or review platform submission and approval procedures.",
    timestamp: "Live",
  },
];

/**
 * DOCU: Quick-select topics displayed in the authenticated dashboard.
 */
export const DASHBOARD_SUGGESTED_QUESTIONS: string[] = [
  "How do I upload a proposal?",
  "What is the review process for Officers?",
  "What document classifications are supported?",
  "Who has permission to approve filings?",
];

/**
 * DOCU: Legacy INITIAL_MESSAGES export maintained for backward compatibility.
 */
export const INITIAL_MESSAGES: IChatMessage[] = DASHBOARD_INITIAL_MESSAGES;
export const SUGGESTED_QUESTIONS: string[] = DASHBOARD_SUGGESTED_QUESTIONS;

/**
 * DOCU: Institutional knowledge base for application workflows.
 */
export const PLATFORM_KNOWLEDGE_BASE: Record<string, string> = {
  default:
    "Springer Capital Compliance Assistant. Ask any platform questions regarding submission procedures, review workflows, or regulatory guidelines.",
  upload:
    "To upload a new document as an Advisor:\n1. Navigate to the 'My Submissions' workspace.\n2. Click the '+ Submit Proposal Document' button.\n3. Enter the title, select category, attach your file, and submit.",
  review:
    "Compliance Officers evaluate pending filings in the 'Review Queue'. Within the review workspace, officers can record official decisions (Approve, Request Revision, or Reject) with signed compliance notes.",
  categories:
    "Supported document classifications:\n- Investment Proposals\n- Compliance Statements\n- Audit Reports\n- Tax Strategy Documents\n- Portfolio Briefs",
  permissions:
    "Access Control:\n- Advisors: Create and manage submissions; view personal document portfolio and revision requests.\n- Officers: Manage full review queue, inspect filings, record official compliance determinations, and review audit logs.",
};
