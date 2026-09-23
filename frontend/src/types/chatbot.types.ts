/**
 * DOCU: Represents one message displayed in the compliance copilot conversation.
 * Last Updated Date: September 21, 2026
 * @author Keith
 */
import type { IGrammarResult, IDocumentationResult } from "@/lib/chatbot/documentation-engine";
import type { ISearchResponse, IAuditAndFixResponse } from "./copilot.types";

export interface IChatMessage {
  /** Stable identifier for the message. */
  id: string;
  /** Indicates whether the message came from the copilot or user. */
  sender: "bot" | "user";
  /** Message text rendered in the conversation. */
  text: string;
  /** ISO timestamp associated with the message. */
  timestamp: string;
  /** True while the bot is still streaming characters into this message. */
  isTyping?: boolean;
  /** Optional structured grammar recheck result for rich rendering. */
  grammarResult?: IGrammarResult;
  /** Optional structured documentation enhancement result for rich rendering. */
  documentationResult?: IDocumentationResult;
  /** Optional multi-dimensional repository search telemetry and document result. */
  searchResult?: ISearchResponse;
  /** Optional in-chat compliance audit & automated remediation result. */
  auditResult?: IAuditAndFixResponse;
  /** Optional in-chat compliance flag scan result rendered for Officers (supervisory view, no download/submit). */
  officerAuditResult?: IAuditAndFixResponse;
  /** Dynamic contextual suggestion chips. */
  suggestedChips?: string[];
  /** Set when the remediated version has been submitted — holds the submission timestamp. */
  submittedAt?: string;
}

