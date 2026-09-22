/**
 * DOCU: Defines platform workflow guidelines, pre-login guidance, and quick-reference answers for the help widget.
 * Last Updated Date: September 22, 2026
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
    text: "Welcome to the Springer Capital Compliance Portal. I can assist with platform orientation, accepted file formats, regulatory standards (FINRA 2210 & SEC 206), and account access before you sign in.",
    timestamp: "Live",
  },
];

/**
 * DOCU: Quick-select topics displayed on the login screen.
 */
export const LOGIN_SUGGESTED_QUESTIONS: string[] = [
  "What is the Springer Capital portal?",
  "What document formats and limits are accepted?",
  "How does compliance review work?",
  "What regulatory standards are enforced?",
  "How do role permissions work?",
];

/**
 * DOCU: Informative knowledge base for pre-login inquiries.
 */
export const LOGIN_KNOWLEDGE_BASE: Record<string, string> = {
  default:
    "Springer Capital Compliance Portal Assistant. Before signing in, you can inquire about platform features, supported file formats, regulatory requirements, or institutional security standards.",
  access:
    "System Access & Account Inquiries:\n\nSpringer Capital operates a restricted institutional compliance platform. Accounts are provisioned directly by your compliance administrator.\n\n• Compliance Officers: Authorized compliance personnel with review and determination authority.\n• Investment Advisors: Licensed advisors provisioned for proposal submission and portfolio tracking.\n\nTo request access or reset credentials, contact your enterprise compliance administrator at admin@springercapital.com.",
  overview:
    "Springer Capital Compliance Document Review is an enterprise institutional platform designed for financial compliance teams. It automates proposal vetting, verifies regulatory requirements (SEC Rule 206(4)-1, SEC Rule 204, and FINRA Rule 2210), strips PII before AI processing, and maintains an immutable audit trail of officer determinations.",
  formats:
    "Supported Document Formats & Limits:\n\n• Accepted File Formats:\n  - PDF (.pdf) with standard %PDF- magic byte verification\n  - Microsoft Word (.docx, .doc)\n  - Microsoft Excel (.xlsx, .xls)\n  - Plain Text (.txt)\n• Maximum File Size: Up to 25MB per upload\n• Supported Classifications:\n  1. Investment Proposals\n  2. Compliance Statements\n  3. Audit Reports\n  4. Tax Strategy Documents\n  5. Portfolio Briefs",
  workflow:
    "Institutional Workflow Overview:\n1. Advisors upload proposal documents with assigned classifications.\n2. Ingestion pipeline strips PII and performs automated regulatory checks.\n3. Compliance Officers evaluate submissions in the Review Queue.\n4. Decisions (Approve, Request Revision, Reject) are signed with official compliance notes and audit-stamped in the immutable log.",
  regulations:
    "Enforced Regulatory Standards:\n\n• FINRA Rule 2210 (Communications with the Public): Prohibits exaggerated, promissory, or misleading claims; mandates balanced risk disclosures.\n• SEC Rule 206(4)-1 (Investment Adviser Marketing): Regulates performance claims, testimonials, substantiation, and clear disclosure of conflicts of interest.\n• SEC Rule 204: Mandates performance metric substantiation and fee transparency.\n• FINRA Rule 2111 (Suitability): Enforces customer risk profiling and best-interest suitability standards.",
  privacy:
    "Privacy & PII Protection:\nAll uploaded documents pass through an automated PII Masking Gateway. Social Security Numbers (SSN), Credit Cards, and Personal Emails are redacted prior to external AI analysis. Authorized officers can safely toggle unmasking in the review workspace.",
};

/**
 * DOCU: Initial greeting message when authenticated in the dashboard.
 */
export const DASHBOARD_INITIAL_MESSAGES: IChatMessage[] = [
  {
    id: "dash-greeting",
    sender: "bot",
    text: "Springer Capital Compliance Copilot active. You can ask workflow questions, check regulatory rules (FINRA 2210, SEC 206), verify accepted formats, or submit text to audit grammar and enhance compliance notes.",
    timestamp: "Live",
  },
];

/**
 * DOCU: Quick-select topics displayed in the authenticated dashboard.
 */
export const DASHBOARD_SUGGESTED_QUESTIONS: string[] = [
  "How do I upload and submit a proposal?",
  "What is the review process for Officers?",
  "How does versioning and revision work?",
  "What document formats and limits are accepted?",
  "What are FINRA 2210 & SEC 206 standards?",
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
    "Springer Capital Compliance Assistant. Ask any platform questions regarding submission procedures, review workflows, document versioning, regulatory rules, or type a draft note to recheck grammar.",
  upload:
    "To upload a new document as an Advisor:\n1. Navigate to the 'Dashboard' / 'My Submissions' workspace.\n2. Click the '+ Submit Proposal Document' button.\n3. Enter the document title, optional description, and select the file (PDF, DOCX, XLSX, TXT up to 25MB).\n4. Submit to trigger automatic PII sanitization and compliance analysis.",
  review:
    "Review Workflow for Compliance Officers:\n1. Open the 'Review Queue' from the sidebar navigation.\n2. Click on any pending document to enter the Document Review Workspace.\n3. Inspect AI risk flags, passage highlights, and precedent comparisons.\n4. Click 'Approve Document', 'Request Revision', or 'Reject Document'.\n5. Enter mandatory compliance rationale notes and submit the determination.",
  versions:
    "Multi-Version Document Lineage:\n• When an officer marks a document as 'Needs Revision', the Advisor can click 'Upload Revision' to submit Version 2 (v2).\n• The platform maintains full lineage history (v1, v2, v3...) with side-by-side comparison and historical decision threads.",
  categories:
    "Supported Document Classifications:\n1. Investment Proposals — Client portfolio models, asset allocation, and strategy decks.\n2. Compliance Statements — Regulatory filings, annual disclosures, and conflict statements.\n3. Audit Reports — Third-party verification and internal compliance audits.\n4. Tax Strategy Documents — Institutional tax mitigation and structuring briefs.\n5. Portfolio Briefs — Executive performance summaries and market risk assessments.",
  formats:
    "Supported File Formats & File Limits:\n• Accepted Formats: PDF (.pdf), Microsoft Word (.docx, .doc), Microsoft Excel (.xlsx, .xls), Plain Text (.txt).\n• Maximum File Size: 25MB per document.\n• Binary Security: Real-time magic byte inspection protects against spoofed file extensions.",
  rules:
    "Key Regulatory Standards:\n\n• FINRA Rule 2210: Communications with the public must be fair, balanced, and free from promissory or guaranteed language.\n• SEC Rule 206(4)-1: Marketing materials must substantiate claims, disclose compensation/conflicts, and provide balanced performance metrics.\n• SEC Rule 204: Requires performance presentation substantiation and clear disclosure of net-of-fees metrics.\n• FINRA Rule 2111: Ensures recommended investments adhere to investor risk suitability criteria.",
  pii:
    "PII Masking & Privacy Gateway:\n• All document text is automatically sanitized before transmission to AI models.\n• SSNs, Credit Cards, and Personal Emails are masked with [REDACTED_*] tokens.\n• Authorized Officers can click the 'Show Unmasked' toggle in the review workspace to inspect original identifying information securely.",
  audit:
    "Audit Trail & Compliance History:\n• Every state change, submission, decision, and file upload generates an immutable audit record.\n• Navigate to 'Audit Trail' / 'Audit History' to search, filter by role or date, and verify regulatory attestation logs.",
  circuit_breaker:
    "System Resilience & Circuit Breaker:\n• If external AI services experience high latency or 5xx outages, the system circuit breaker trips to OPEN mode.\n• The application seamlessly transitions to degraded mode, using local regex sanitization and deterministic fallback rules without disrupting submissions.",
  settings:
    "Account & Preferences Management:\n• Navigate to 'Account & Preferences' (/settings) to manage your legal full name, digital signature credentials, and desk contact details.\n• Updates are securely synchronized with the database and reflected in all audit attestation logs.",
  permissions:
    "Role-Based Access Control (RBAC):\n• Advisors: Can submit proposals, view personal submissions, upload revisions upon request, and inspect audit history.\n• Officers: Have complete determination authority across the Review Queue, can approve/reject filings, toggle unmasked PII, and sign compliance memos.",
  grammar:
    "Grammar & Compliance Memo Assistant:\n• To check grammar or polish a compliance note, type 'check grammar: <your text>' or 'enhance note: <your text>'.\n• The assistant will identify spelling, grammatical, and stylistic issues, and format the text into an institutional determination memo.",
};
