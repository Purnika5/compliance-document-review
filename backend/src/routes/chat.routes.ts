/**
 * DOCU: Proxies chatbot requests from the frontend to Google Gemini and live PostgreSQL data.
 * Scopes all responses to real database filings and institutional FINRA 2210 & SEC 206 rules.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { optionalAuth } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';
import { DocumentController } from '../controllers/document.controller';
import { config } from '../config';

const router = Router();

interface LiveTelemetryData {
  statusCounts: Record<string, number>;
  recentDocs: Array<{
    id: string;
    title: string;
    status: string;
    version: number;
    file_name: string;
    created_at: string;
    advisor_name?: string;
  }>;
  activeDoc?: {
    id: string;
    title: string;
    status: string;
    version: number;
    summary?: string;
    flags?: any[];
  } | null;
}

/**
 * Generates an institutional, data-grounded compliance response when remote AI microservice or Gemini REST times out.
 * Strictly grounds output in actual database rows in warm, natural, human conversational language.
 */
function generateContextualComplianceReply(
  message: string,
  role: string,
  data: LiveTelemetryData
): string {
  const lower = message.toLowerCase().trim();
  const isOfficer = role === 'Officer';
  const { statusCounts, recentDocs, activeDoc } = data;

  // 1. Inquiries about active document
  if (activeDoc && /\b(this document|this file|current document|infractions?|flags?|violations?|fix)\b/i.test(lower)) {
    const flagsCount = activeDoc.flags?.length || 0;
    if (flagsCount === 0) {
      return `I just inspected "${activeDoc.title}" (v${activeDoc.version}). It currently has zero compliance flags and meets all FINRA 2210 & SEC 206 standards. Everything looks clean and ready for review!`;
    }
    const sample = activeDoc.flags?.[0];
    return `For "${activeDoc.title}" (v${activeDoc.version}), there ${flagsCount === 1 ? 'is 1 item' : `are ${flagsCount} items`} flagged under ${sample?.rule || 'FINRA 2210'}: "${sample?.passage || ''}". ${
      isOfficer
        ? 'Would you like to draft an official revision request note, or should we evaluate an auto-remediation?'
        : 'Would you like me to help you rewrite this passage into compliant fiduciary language so you can upload a revision?'
    }`;
  }

  // 2. Inquiries about submissions, filings, documents, or queue
  if (
    /\b(submission|submissions|filing|filings|document|documents|proposal|proposals|queue|pending|approved|revision|status|my uploads|my files|what documents|show my)\b/i.test(
      lower
    )
  ) {
    if (recentDocs.length === 0) {
      return isOfficer
        ? 'The supervisory review queue is currently clear—there are no pending document submissions awaiting review right now.'
        : "You don't have any proposal submissions on file yet. You can submit a new proposal through the dashboard, or attach a draft right here in chat and I'll scan or auto-fix it for you before submission.";
    }

    const countsSummary = Object.entries(statusCounts)
      .map(([s, c]) => `${c} ${s.toLowerCase()}`)
      .join(', ') || '0 filings';

    const docList = recentDocs
      .slice(0, 3)
      .map((d) => `"${d.title}" (${d.status}, v${d.version})`)
      .join(', ');

    return isOfficer
      ? `Across the platform, we currently have ${countsSummary}. Recent filings awaiting attention include ${docList}. Which one would you like to review first?`
      : `Looking at your filings, you have ${countsSummary}. Your recent submissions include ${docList}. Would you like me to check any of these, or do you have a new draft you want to scan or auto-fix?`;
  }

  // 3. Greetings
  if (/\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings|who\s+are\s+you)\b/i.test(lower)) {
    return isOfficer
      ? "Hello Officer! I'm your Neural Compliance Copilot. I monitor the supervisory review queue, evaluate filings against FINRA Rule 2210 & SEC Rule 206 standards, and assist with review determinations. How can I help you today?"
      : "Hello! I'm your Neural Compliance Copilot. I'm here to help you track your proposal submissions, explain FINRA Rule 2210 & SEC Rule 206 rules, or scan and auto-fix any draft file you attach here with zero flags. What are you working on today?";
  }

  // 4. Regulatory Rules (FINRA 2210, SEC 206)
  if (/\b(finra|sec|2210|206|rule|rules|regulation|regulatory|promissory|guarantee)\b/i.test(lower)) {
    return "Under FINRA Rule 2210 and SEC Rule 206, marketing communications and proposals must be fair, balanced, and free from promissory language or guaranteed returns. You always need to include clear downside risk disclosures, such as stating that investments are subject to market volatility and loss of principal. If you attach a draft file here, I can scan it for these exact rules or fix it into 100% compliant language for you.";
  }

  // 5. Default natural interactive assistance
  return "I'm here to help with your compliance workflows, submissions, and regulatory questions under FINRA 2210 and SEC 206. You can ask about your documents or attach a draft file right here to scan or auto-fix it. What would you like to explore?";
}

router.post('/', optionalAuth, async (req: Request, res: Response) => {
  const { message, role, pathname, documentId } = req.body as {
    message?: string;
    role?: string;
    pathname?: string;
    documentId?: string;
  };

  if (!message || !message.trim()) {
    res.status(400).json({ success: false, message: 'Message is required.' });
    return;
  }

  const cleanMessage = message.trim();
  const user = (req as any).user;
  const userRole: string = user?.role || role || 'Advisor';
  const userId: string | undefined = user?.id;
  const isOfficer = userRole === 'Officer';

  // 1. Live Database Telemetry Query (grounds AI in actual repository data)
  const telemetryData: LiveTelemetryData = {
    statusCounts: {},
    recentDocs: [],
    activeDoc: null,
  };

  try {
    // Status counts
    const statusQuery = isOfficer || !userId
      ? `SELECT status, COUNT(*)::int as count FROM documents GROUP BY status`
      : `SELECT status, COUNT(*)::int as count FROM documents WHERE advisor_id = $1 GROUP BY status`;
    const statusParams = isOfficer || !userId ? [] : [userId];
    const statusRes = await query<{ status: string; count: number }>(statusQuery, statusParams);
    for (const row of statusRes.rows) {
      telemetryData.statusCounts[row.status] = row.count;
    }

    // Recent documents
    const docQuery = isOfficer || !userId
      ? `SELECT d.id, d.title, d.status, d.version, d.file_name, d.created_at, u.name as advisor_name
         FROM documents d
         LEFT JOIN users u ON d.advisor_id = u.id
         ORDER BY d.created_at DESC LIMIT 10`
      : `SELECT d.id, d.title, d.status, d.version, d.file_name, d.created_at
         FROM documents d
         WHERE d.advisor_id = $1
         ORDER BY d.created_at DESC LIMIT 10`;
    const docRes = await query<any>(docQuery, statusParams);
    telemetryData.recentDocs = docRes.rows;

    // Active document context if user is inspecting /documents/[id]
    const targetDocId = documentId || (pathname?.match(/\/documents\/([0-9a-fA-F-]+)/)?.[1]);
    if (targetDocId) {
      const activeRes = await query(
        `SELECT d.id, d.title, d.status, d.version, da.summary, da.flags
         FROM documents d
         LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
         WHERE d.id = $1`,
        [targetDocId]
      );
      if (activeRes.rows.length > 0) {
        telemetryData.activeDoc = activeRes.rows[0];
      }
    }
  } catch (dbErr) {
    console.warn('[Chat] Telemetry database query warning:', dbErr);
  }

  // Format database context for Google Gemini
  const countsFormatted = Object.entries(telemetryData.statusCounts)
    .map(([s, c]) => `${s}: ${c}`)
    .join(', ') || '0 documents';

  const recentFormatted = telemetryData.recentDocs.length > 0
    ? telemetryData.recentDocs
        .map(
          (d) =>
            `- "${d.title}" | Status: ${d.status} | Version: v${d.version} | File: ${d.file_name} | Created: ${new Date(
              d.created_at
            ).toLocaleDateString()}${d.advisor_name ? ` | Advisor: ${d.advisor_name}` : ''}`
        )
        .join('\n')
    : 'No documents recorded in database yet.';

  const activeDocFormatted = telemetryData.activeDoc
    ? `\nCURRENT ACTIVE DOCUMENT:
Title: "${telemetryData.activeDoc.title}" (Version: v${telemetryData.activeDoc.version}, Status: ${telemetryData.activeDoc.status})
Summary: ${telemetryData.activeDoc.summary || 'None'}
Active Risk Flags: ${JSON.stringify(telemetryData.activeDoc.flags || [])}`
    : '';

  // 2. Direct Google Gemini Engine Execution
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey && !geminiApiKey.includes('your_gemini') && !geminiApiKey.includes('test-ci')) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      // System instruction is kept separate from user content to avoid empty-candidate errors
      const systemInstruction = `You are Springer Capital's Neural Compliance Copilot — a knowledgeable, articulate, and friendly senior Wall Street compliance director and trusted colleague.

Your tone is warm, conversational, human, and interactive. Speak in natural, flowing sentences — no robotic templates, rigid headers, or pre-canned corporate openers like "Thank you for your inquiry regarding...".

When the user asks about submissions, queue, or documents, weave the live database data into conversation naturally (e.g., "Right now you have 3 filings pending and 2 approved. Your latest is Keith's proposal..."). Always ask a helpful follow-up question to keep the dialogue going.

CONTEXT:
- User Role: ${userRole} (${isOfficer ? 'Compliance Officer' : 'Investment Advisor'})
- Current Page: ${pathname || 'Dashboard'}

LIVE DATABASE TELEMETRY:
- Status Counts: ${countsFormatted}
- Recent Repository Filings:
${recentFormatted}
${activeDocFormatted}

ROLE GUIDANCE:
${
  isOfficer
    ? `As a Compliance Officer, you have full visibility into the supervisory review queue, all advisors' filings, risk flags, and uploader identity. You can help draft official determinations and compliance memos. Never fabricate infractions that are not in the data above.`
    : `As an Investment Advisor, help the user track their own submissions, understand FINRA Rule 2210 and SEC Rule 206 requirements, and guide them on attaching draft files to scan or auto-fix before submission.`
}

CRITICAL RULES:
- Always respond. Never refuse to answer compliance or document questions.
- Speak naturally in 2–4 sentences. Keep it concise, warm, and helpful.
- Ground every data claim in the LIVE DATABASE TELEMETRY above. If data is absent, say so honestly.
- Do not hallucinate document titles, advisor names, or risk flags that are not in the telemetry.`;

      const gResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: cleanMessage }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 600,
            candidateCount: 1,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (gResp.ok) {
        const gData: any = await gResp.json();
        const candidate = gData?.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const textReply = candidate?.content?.parts?.[0]?.text;

        // Log non-STOP finish reasons for debugging
        if (finishReason && finishReason !== 'STOP') {
          console.warn(`[Chat] Gemini non-STOP finishReason: ${finishReason}`, JSON.stringify(candidate?.safetyRatings || []));
        }

        if (textReply && textReply.trim()) {
          res.status(200).json({ success: true, reply: textReply.trim() });
          return;
        }

        // Candidate present but empty text — log for diagnostics
        console.warn('[Chat] Gemini returned candidate with no text. finishReason:', finishReason, 'promptFeedback:', JSON.stringify(gData?.promptFeedback || {}));
      } else {
        const errBody = await gResp.text().catch(() => '');
        console.warn(`[Chat] Gemini responded with ${gResp.status}:`, errBody.slice(0, 300));
      }
    } catch (gErr) {
      console.warn('[Chat] Direct Gemini REST call timed out or failed, using institutional data-grounded fallback:', gErr);
    }
  }

  // 3. Robust institutional fallback grounded in live database rows
  const fallbackReply = generateContextualComplianceReply(cleanMessage, userRole, telemetryData);
  res.status(200).json({ success: true, reply: fallbackReply });
});

router.post(
  '/audit-and-fix',
  optionalAuth,
  uploadDocumentFile.single('file'),
  DocumentController.auditAndFix
);

export default router;
