export interface IChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
}
