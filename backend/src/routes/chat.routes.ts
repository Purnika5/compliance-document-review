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
 * Strictly grounds output in actual database rows instead of generic placeholders.
 */
function generateContextualComplianceReply(
  message: string,
  role: string,
  data: LiveTelemetryData
): string {
  const lower = message.toLowerCase().trim();
  const isOfficer = role === 'Officer';
  const { statusCounts, recentDocs, activeDoc } = data;

  // 1. Specific inquiries about submissions, filings, documents, or queue
  if (
    /\b(submission|submissions|filing|filings|document|documents|proposal|proposals|queue|pending|approved|revision|status|my uploads|my files|what documents|show my)\b/i.test(
      lower
    )
  ) {
    if (recentDocs.length === 0) {
      return isOfficer
        ? `There are currently no document submissions in the supervisory review queue. All institutional filings are up-to-date.`
        : `You do not have any active proposal submissions on file yet. You can submit a new proposal via the **Submit Proposal Document** button or upload a draft right here in this chat to audit and auto-fix it.`;
    }

    const countList = Object.entries(statusCounts)
      .map(([s, c]) => `**${c} ${s}**`)
      .join(', ') || '0 documents';

    const docItems = recentDocs
      .slice(0, 5)
      .map(
        (d) =>
          `• **${d.title}** — Status: \`${d.status}\` | Version: v${d.version} | File: \`${d.file_name}\`${
            d.advisor_name ? ` | Advisor: ${d.advisor_name}` : ''
          }`
      )
      .join('\n');

    return isOfficer
      ? `### 📋 Supervisory Compliance Review Queue\n**Telemetry Summary**: ${countList}\n\n**Recent Institutional Filings**:\n${docItems}\n\nYou can click any document in the **Review Queue** to open the 3-Zone Workspace and issue formal supervisory determinations (Approve, Request Revision, Reject).`
      : `### 📂 Your Proposal Filings\n**Telemetry Summary**: ${countList}\n\n**Recent Submissions**:\n${docItems}\n\nWould you like me to inspect any of these documents, or drag and drop a draft into this chat to audit and auto-fix infractions before submission?`;
  }

  // 2. Active document inspection if viewing a specific document
  if (activeDoc && /\b(this document|this file|current document|infractions?|flags?|violations?|fix)\b/i.test(lower)) {
    const flagsCount = activeDoc.flags?.length || 0;
    const flagsList = (activeDoc.flags || [])
      .map((f: any) => `• **${f.rule || 'FINRA Rule 2210'}**: "${f.passage || 'Flagged passage'}" — *${f.explanation || 'Infraction detected'}*`)
      .join('\n') || '• No active regulatory risk flags detected on this version.';

    return `### 🛡️ Active Document Review: "${activeDoc.title}" (v${activeDoc.version})\n**Status**: \`${activeDoc.status}\`\n**Executive AI Summary**: ${activeDoc.summary || 'Summary unavailable'}\n\n**Compliance Audit Breakdown (${flagsCount} flags)**:\n${flagsList}\n\n${
      isOfficer
        ? 'As a Compliance Officer, you can evaluate these flags in the review workspace and issue an official supervisory determination.'
        : 'You can upload a revised version addressing these flags using the **Upload Revision** button.'
    }`;
  }

  // 3. Greetings & Role Identity
  if (/\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings|who\s+are\s+you)\b/i.test(lower)) {
    return isOfficer
      ? `Hello Officer! I am your Springer Capital Neural Compliance Copilot. I monitor the institutional review queue, evaluate filings against FINRA Rule 2210 & SEC Rule 206 standards, and assist with supervisory determinations. How may I assist your review workflow today?`
      : `Hello! I am your Springer Capital Neural Compliance Copilot. How can I assist you today? You can ask me about your proposal submissions, search platform filings, or upload any draft file (PDF, DOCX, TXT) right here to audit and auto-fix regulatory infractions before submission.`;
  }

  // 4. Regulatory Rules (FINRA 2210, SEC 206)
  if (/\b(finra|sec|2210|206|rule|rules|regulation|regulatory|promissory|guarantee)\b/i.test(lower)) {
    return `### 📜 Institutional Regulatory Standards Guidance
• **FINRA Rule 2210 (Communications with the Public)**: Prohibits promissory language, guaranteed returns (e.g., 'guaranteed 8% yield with zero downside risk'), exaggerated claims, and unhedged historical performance. All communications must be fair, balanced, and state that investments are subject to loss of principal.
• **SEC Rule 206(4)-1 (Adviser Marketing Rule)**: Prohibits untrue or misleading statements of material fact. Performance metrics must be substantiated, clear fee deductions shown (net-of-fees), and full suitability disclosures provided.
• **SEC Rule 204**: Requires rigorous books and records substantiation for all performance metrics and advisory claims.

*Pro-Tip*: Drag and drop any draft into this chat—I will highlight exact rule infractions and generate a 100% compliant file for you.`;
  }

  // 5. General platform guidance
  return `I am your Springer Capital Neural Compliance Copilot.
You can:
1. Ask about your live submissions (e.g., *"Show my submissions from this month"*).
2. Upload any draft file (PDF, DOCX, TXT) directly into this chat to audit and auto-fix FINRA 2210 & SEC 206 infractions.
3. Query supervisory review actions and multi-version lineages.

How may I assist your compliance workflow today?`;
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
    ? `\nCURRENT DOCUMENT ON SCREEN:
Title: "${telemetryData.activeDoc.title}" (Version: v${telemetryData.activeDoc.version}, Status: ${telemetryData.activeDoc.status})
Summary: ${telemetryData.activeDoc.summary || 'None'}
Active Risk Flags: ${JSON.stringify(telemetryData.activeDoc.flags || [])}`
    : '';

  // 2. Direct Google Gemini Engine Execution
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey && !geminiApiKey.includes('your_gemini') && !geminiApiKey.includes('test-ci')) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const systemPrompt = `You are Springer Capital's Neural Compliance Copilot, an elite Wall Street regulatory compliance intelligence copilot.
You are interacting with an authenticated platform user.
User Role: ${userRole}
Current Page Context: ${pathname || 'Dashboard'}

LIVE DATABASE RECORDS:
Document Status Counts: ${countsFormatted}
Recent Repository Filings:
${recentFormatted}
${activeDocFormatted}

ROLE-SPECIFIC INSTRUCTIONS:
${
  isOfficer
    ? `- The user is a Compliance Officer responsible for supervisory review across all advisors.
- When they ask about the review queue, pending filings, or compliance infractions, CITE THE REAL DATABASE RECORDS ABOVE. Give exact counts, titles, and advisor names.
- If asked to fix or evaluate a file, enforce strict FINRA Rule 2210 (promissory claims, guaranteed returns) and SEC Rule 206 (fiduciary marketing, net-of-fees disclosures).
- Help them draft precise, professional supervisory determination notes (for Approve, Request Revision, or Rejection). Do not invent fictitious issues.`
    : `- The user is an Investment Advisor who submits proposals and client communications.
- When they ask about their submissions, pending documents, or filings that need revision, CITE THE REAL DATABASE RECORDS ABOVE. Give exact document titles, statuses, and version numbers.
- If they ask how to fix or audit a document, guide them on removing promissory statements and adding required downside risk disclosures under FINRA Rule 2210 & SEC Rule 206.
- Encourage them to attach or drag-and-drop their draft file into this chat for automated compliance auditing and 1-click remediation.`
}

CRITICAL RULES:
1. Speak naturally, politely, and authoritatively like a senior Wall Street regulatory director.
2. NEVER output generic canned apologies or placeholder responses like "Thank you for your inquiry regarding...".
3. ALWAYS ground answers in the LIVE DATABASE RECORDS above whenever repository documents, statuses, or metrics are asked.
4. Format responses cleanly with GitHub markdown (bullet points, bold titles, concise actionable steps).`;

      const gResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Question: ${cleanMessage}` }],
            },
          ],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 750,
          },
        }),
        signal: AbortSignal.timeout(9000),
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
