/**
 * DOCU: Proxies chatbot requests from the frontend to the AI service /chat endpoint.
 * Scopes all responses to Springer Capital Compliance platform topics via Gemini.
 * Last Updated Date: September 22, 2026
 * @author Keith
 */
import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

/**
 * Generates an institutional, context-aware regulatory response when remote AI microservice is sleeping or unavailable.
 */
function generateContextualComplianceReply(message: string, role: string): string {
  const lower = message.toLowerCase().trim();

  // 1. Greetings & Identity
  if (/\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings|who\s+are\s+you)\b/i.test(lower)) {
    return `Hello! I am your Springer Capital Neural Compliance Copilot. How can I assist you today? You can ask me platform workflow questions, search repository records by uploader or status, or upload draft documents directly into this chat for automated regulatory audit and remediation.`;
  }

  // 2. Capabilities & Help
  if (/\b(what\s+can\s+you\s+do|help|features|capabilities|commands|how\s+to\s+use)\b/i.test(lower)) {
    return `As your Neural Compliance Copilot, I can assist you across the compliance lifecycle:
• **In-Chat Compliance Audit & Auto-Fix**: Drag and drop any draft document (PDF, DOCX, TXT) into this chat. I will audit every passage against FINRA 2210 and SEC 206 rules, highlight violations, and generate a 100% compliant file ready for instant download or 1-click submission.
• **Filterable Document Search**: Query records naturally (e.g., 'Show pending documents from Keith' or 'Find approved proposals from last week').
• **Regulatory Standards Guidance**: Ask about FINRA Rule 2210 (promissory statements, guaranteed returns), SEC Rule 206(4)-1 (fiduciary marketing rules), SEC 204, or KYC/AML verification.
• **Review & Versioning Workflows**: Learn about submission steps, Officer review actions, and multi-version revision lineages (v1, v2...).
• **Grammar & Compliance Memos**: Type 'check grammar: <text>' to polish and institutionalize determination notes.`;
  }

  // 3. Document Submission / Upload procedures
  if (/\b(upload|submit|new\s+document|submission|file\s+proposal|how\s+to\s+submit)\b/i.test(lower)) {
    return `To submit a proposal as an Investment Advisor:
1. Navigate to 'Dashboard' or 'My Submissions'.
2. Click the '+ Submit Proposal Document' button.
3. Enter your proposal title, optional filing remarks, and select your file (PDF, DOCX, XLSX, TXT up to 25MB).
4. Click Submit — the system automatically sanitizes PII and triggers automated compliance rule evaluation.

*Pro-Tip*: You can also drag and drop your draft directly into this chat to audit and fix any infractions before formal submission!`;
  }

  // 4. Officer Review Queue & Determinations
  if (/\b(review|queue|approve|reject|decision|officer|determination)\b/i.test(lower)) {
    return `Compliance Review Workflow:
1. Compliance Officers access the 'Review Queue' from the sidebar navigation.
2. Clicking any pending document opens the 3-Zone Institutional Review Workspace.
3. The Officer inspects automated AI risk flags, passage highlights, and precedent comparisons.
4. Available determinations:
   • **Approve Proposal**: Finalizes compliance approval and stamps the audit trail.
   • **Request Revision**: Sets status to 'Needs Revision' with actionable feedback for the Advisor.
   • **Formal Rejection**: Concludes the filing with binding supervisory notes.`;
  }

  // 5. Versioning & Lineage
  if (/\b(version|revision|v1|v2|lineage|thread|resubmit)\b/i.test(lower)) {
    return `Multi-Version Document Lineage:
• When a Compliance Officer requests a revision, the document status transitions to 'Needs Revision'.
• The Advisor can click 'Upload Revision' to upload Version 2 (v2) addressing the feedback.
• The platform maintains an unbroken lineage history (v1, v2, v3...) with audit threads, author notes, and version comparisons.`;
  }

  // 6. Regulatory Rules (FINRA 2210, SEC 206, etc.)
  if (/\b(finra|sec|2210|206|rule|rules|regulation|regulatory|standard|promissory|guarantee)\b/i.test(lower)) {
    return `Key Institutional Regulatory Standards:
• **FINRA Rule 2210 (Communications with the Public)**: All communications must be fair, balanced, and complete. Promissory language, guaranteed returns (e.g., 'our fund guarantees a 15% return'), and exaggerated claims are strictly prohibited. Historical performance cannot guarantee future returns.
• **SEC Rule 206(4)-1 (Investment Adviser Marketing Rule)**: Prohibits untrue or misleading statements of material fact. Performance metrics must be substantiated, clear fee deductions shown (net-of-fees), and appropriate risk disclosures included.
• **SEC Rule 204**: Requires rigorous books and records substantiation for all performance and advisory recommendations.`;
  }

  // 7. Formats, Sizes, and Technical Limits
  if (/\b(format|formats|size|limit|limits|pdf|docx|txt|xlsx|excel|word)\b/i.test(lower)) {
    return `Accepted File Specifications & Limits:
• **Supported Formats**: PDF (.pdf), Microsoft Word (.docx, .doc), Microsoft Excel (.xlsx, .xls), Plain Text (.txt).
• **Payload Limit**: Maximum 25MB per document.
• **Security Protocol**: Real-time MIME and binary magic-byte inspection prevents extension spoofing, and automated PII masking protects confidential client information.`;
  }

  // 8. PII Sanitization & Privacy
  if (/\b(pii|privacy|mask|unmask|redact|ssn|confidential)\b/i.test(lower)) {
    return `PII Sanitization & Privacy Gateway:
• All uploaded document text undergoes deterministic PII sanitization before AI inspection.
• Social Security Numbers, Credit Cards, and Personal Emails are masked with tokens like [REDACTED_SSN].
• Compliance Officers can toggle the 'Unmasked View' in the review workspace to inspect original identity details under strict audit logging.`;
  }

  // 9. Contextual platform answer for all other queries
  return `Thank you for your inquiry regarding "${message}".

As your Springer Capital Neural Compliance Copilot, I am here to help ensure your communications and filings adhere strictly to FINRA Rule 2210 and SEC Rule 206 guidelines.

Here are quick actions you can take:
1. **Upload a file** (PDF, DOCX, TXT) right here to audit and auto-fix compliance infractions.
2. **Search the repository** by asking me (e.g., 'Show pending documents from Keith').
3. **Ask about platform workflows** (submissions, reviews, versioning, PII sanitization).

How may I assist you further?`;
}

router.post('/', async (req: Request, res: Response) => {
  const { message, role } = req.body as { message?: string; role?: string };

  if (!message || !message.trim()) {
    res.status(400).json({ success: false, message: 'Message is required.' });
    return;
  }

  const cleanMessage = message.trim();
  const userRole = role || 'Advisor';

  // 1. Try remote AI microservice
  try {
    const aiUrl = `${config.services.aiServiceUrl}/chat`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const aiResponse = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: cleanMessage, role: userRole }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (aiResponse.ok) {
      const data = await aiResponse.json() as { reply: string };
      if (data && data.reply) {
        res.status(200).json({ success: true, reply: data.reply });
        return;
      }
    }
  } catch (err: unknown) {
    console.warn('[Chat] Remote AI service unreachable or timed out, executing direct Gemini / institutional fallback.');
  }

  // 2. Direct Gemini REST API fallback if GEMINI_API_KEY is configured
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey && !geminiApiKey.includes('your_gemini') && !geminiApiKey.includes('test-ci')) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
      const systemPrompt = `You are the Springer Capital Neural Compliance Copilot, an enterprise institutional regulatory copilot specializing in wealth management, FINRA Rule 2210, SEC Rule 206(4)-1, document review workflows, and platform navigation. Respond conversationally, concisely, and authoritatively to the user (${userRole}).`;
      
      const gResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Question: ${cleanMessage}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600,
          }
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (gResp.ok) {
        const gData: any = await gResp.json();
        const textReply = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textReply && textReply.trim()) {
          res.status(200).json({ success: true, reply: textReply.trim() });
          return;
        }
      }
    } catch (gErr) {
      console.warn('[Chat] Direct Gemini REST call warning:', gErr);
    }
  }

  // 3. High-grade in-process conversational compliance fallback
  const fallbackReply = generateContextualComplianceReply(cleanMessage, userRole);
  res.status(200).json({ success: true, reply: fallbackReply });
});

import { optionalAuth } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';
import { DocumentController } from '../controllers/document.controller';

router.post(
  '/audit-and-fix',
  optionalAuth,
  uploadDocumentFile.single('file'),
  DocumentController.auditAndFix
);

export default router;
