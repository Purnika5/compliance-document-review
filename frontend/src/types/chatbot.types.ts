/**
 * DOCU: Represents one message displayed in the compliance copilot conversation.
 * Last Updated Date: September 3, 2026
 * @author Keith
 */
export interface IChatMessage {
  /** Stable identifier for the message. */
  id: string;
  /** Indicates whether the message came from the copilot or user. */
  sender: "bot" | "user";
  /** Message text rendered in the conversation. */
  text: string;
  /** ISO timestamp associated with the message. */
  timestamp: string;
}
