import type { IChatMessage } from "@/types/chatbot.types";

export const INITIAL_MESSAGES: IChatMessage[] = [
  {
    id: "1",
    sender: "bot",
    text: "Hello! I am Springer AI, your intelligent assistant for document compliance, advisor proposals, and officer review workflows. How can I help you today?",
    timestamp: "Just now",
  },
];

export const SUGGESTED_QUESTIONS: string[] = [
  "How do I upload a proposal?",
  "What is the review process for Officers?",
  "What document categories are supported?",
  "How do role permissions work?",
];

export const MOCK_BOT_RESPONSES: Record<string, string> = {
  upload:
    "To upload a new document as an Advisor:\n1. Go to 'My Submissions' dashboard.\n2. Click the '+ Upload Document' button.\n3. Fill in the title, category, and notes, then click 'Submit Document'.",
  review:
    "Officers can view all pending advisor submissions in the 'Review Queue'. Officers can evaluate proposals and mark them as 'Approved', 'Needs Revision', or 'Rejected' with reviewer notes.",
  categories:
    "Supported document categories include:\n- Investment Proposals\n- Compliance Statements\n- Audit Reports\n- Tax Strategy Documents\n- Portfolio Briefs",
  permissions:
    "Springer Capital uses role-based access control:\n- Advisors: Can submit proposals and track personal submission history.\n- Officers: Can review, evaluate, and approve queue submissions across all departments.",
};
