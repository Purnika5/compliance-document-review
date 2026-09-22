/**
 * DOCU: Represents one message displayed in the compliance copilot conversation.
 * Last Updated Date: September 21, 2026
 * @author Keith
 */
import type { IGrammarResult, IDocumentationResult } from "@/lib/chatbot/documentation-engine";
import type { ICopilotSearchResponse } from "@/types/copilot.types";

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
  /** Optional Neural Copilot structured search & analytics data for interactive telemetry cards. */
  copilotData?: ICopilotSearchResponse;
}
