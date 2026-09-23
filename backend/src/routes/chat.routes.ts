/**
 * DOCU: Proxies chatbot requests from the frontend to Grok (xAI) / Google Gemini and live PostgreSQL data.
 * Scopes all responses to real database filings and institutional FINRA 2210 & SEC 206 rules.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { optionalAuth } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';
import { DocumentController } from '../controllers/document.controller';
import { QuotaService } from '../services/quota.service';
import { GrokChatbotService } from '../services/grok-chatbot.service';
import { GeminiClient } from '../utils/gemini';

const router = Router();

/** A single enriched document row with uploader identity, analysis flags, and category */
interface EnrichedDoc {
  id: string;
  title: string;
  status: string;
  version: number;
  file_name: string;
  mime_type?: string;
  category?: string;
  created_at: string;
  advisor_name?: string;
  advisor_email?: string;
  flag_count: number;
  flag_categories: string[];   // e.g. ['PROHIBITED_CLAIM', 'MISSING_DISCLOSURE']
  has_analysis: boolean;
}

interface LiveTelemetryData {
  statusCounts: Record<string, number>;
  recentDocs: EnrichedDoc[];
  todaysDocs: EnrichedDoc[];
  activeDoc?: {
    id: string;
    title: string;
    status: string;
    version: number;
    advisor_name?: string;
    summary?: string;
    flags?: any[];
    flag_count: number;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: parse flags JSONB into count + distinct categories
// ─────────────────────────────────────────────────────────────────────────────
function parseFlagMeta(flagsJson: any): { flag_count: number; flag_categories: string[] } {
  if (!flagsJson) return { flag_count: 0, flag_categories: [] };
  let flags: any[] = [];
  try {
    flags = typeof flagsJson === 'string' ? JSON.parse(flagsJson) : flagsJson;
  } catch {
    return { flag_count: 0, flag_categories: [] };
  }
  if (!Array.isArray(flags)) return { flag_count: 0, flag_categories: [] };
  const cats = [...new Set(flags.map((f) => f.category || f.rule || 'UNKNOWN').filter(Boolean))];
  return { flag_count: flags.length, flag_categories: cats };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format a single doc for Gemini context
// ─────────────────────────────────────────────────────────────────────────────
function formatDocForContext(d: EnrichedDoc): string {
  const uploadedBy = d.advisor_name ? ` | Uploaded by: ${d.advisor_name}` : '';
  const category = d.category ? ` | Category: ${d.category}` : '';
  const uploadTime = new Date(d.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const riskInfo = d.has_analysis
    ? d.flag_count === 0
      ? ' | Risk: ✓ Clean (0 flags)'
      : ` | Risk: ${d.flag_count} flag${d.flag_count > 1 ? 's' : ''} [${d.flag_categories.join(', ')}]`
    : ' | Risk: Not yet analyzed';
  return `- "${d.title}" | Status: ${d.status} | v${d.version}${uploadedBy}${category} | Uploaded: ${uploadTime}${riskInfo}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust institutional fallback — answers all known question types from DB data
// ─────────────────────────────────────────────────────────────────────────────
function generateContextualComplianceReply(
  message: string,
  role: string,
  data: LiveTelemetryData
): string {
  const lower = message.toLowerCase().trim();
  const isOfficer = role === 'Officer';
  const { statusCounts, recentDocs, todaysDocs, activeDoc } = data;

  // 1. Active document — infractions / flags / violations
  if (activeDoc && /\b(this document|this file|current document|infractions?|flags?|violations?|risk|fix)\b/i.test(lower)) {
    const flagCount = activeDoc.flag_count || 0;
    const byLine = activeDoc.advisor_name ? ` submitted by ${activeDoc.advisor_name}` : '';
    if (flagCount === 0) {
      return `"${activeDoc.title}"${byLine} (v${activeDoc.version}) is clean — zero compliance flags under FINRA 2210 & SEC 206. It's ready for ${isOfficer ? 'final determination' : 'submission'}.`;
    }
    const sample = activeDoc.flags?.[0];
    return `"${activeDoc.title}"${byLine} (v${activeDoc.version}) has ${flagCount} compliance flag${flagCount > 1 ? 's' : ''}. The first is under ${sample?.rule || 'FINRA Rule 2210'}: "${sample?.original_passage || sample?.passage || ''}". ${
      isOfficer
        ? 'Would you like to draft a revision request or trigger an auto-remediation?'
        : 'Would you like me to auto-fix this into compliant fiduciary language?'
    }`;
  }

  // 2. "Who uploaded" queries
  if (/\b(who\s+uploaded|who\s+submitted|who\s+sent|uploaded\s+by|submitted\s+by)\b/i.test(lower)) {
    if (!isOfficer) {
      return "That information is restricted to Compliance Officers. You can see your own submissions on the My Documents page.";
    }
    const withUploaders = recentDocs.filter((d) => d.advisor_name);
    if (withUploaders.length === 0) {
      return "I don't have uploader data available right now. This may be a data sync issue — check the Users table.";
    }
    const list = withUploaders.slice(0, 5).map((d) =>
      `"${d.title}" → ${d.advisor_name} (${d.status}, ${new Date(d.created_at).toLocaleDateString()})`
    ).join('; ');
    return `Here are recent uploads with their advisors: ${list}. Want me to filter by a specific advisor or status?`;
  }

  // 3. "Today's documents" queries
  if (/\b(today|this morning|uploaded today|submitted today)\b/i.test(lower)) {
    if (todaysDocs.length === 0) {
      return isOfficer
        ? "No documents have been uploaded today yet. The queue is clear."
        : "You haven't submitted any documents today. Want to attach a draft right here to scan it?";
    }
    const list = todaysDocs.slice(0, 5).map((d) => {
      const by = d.advisor_name && isOfficer ? ` by ${d.advisor_name}` : '';
      const risk = d.has_analysis
        ? d.flag_count === 0 ? '✓ clean' : `${d.flag_count} flag${d.flag_count > 1 ? 's' : ''}`
        : 'not yet analyzed';
      return `"${d.title}"${by} (${d.status}, ${risk})`;
    }).join('; ');
    return `Today's uploads: ${list}. ${todaysDocs.length > 5 ? `Plus ${todaysDocs.length - 5} more. ` : ''}${isOfficer ? 'Want to review any of these?' : 'Want me to scan or fix any of them?'}`;
  }

  // 4. Risk / flags queries
  if (/\b(risk|risks|flag|flags|violation|violations|infraction|infractions|compliance issue)\b/i.test(lower)) {
    const flaggedDocs = recentDocs.filter((d) => d.flag_count > 0);
    if (flaggedDocs.length === 0) {
      return "Great news — none of the recent documents in the repository have active compliance flags. Everything looks clean.";
    }
    const list = flaggedDocs.slice(0, 4).map((d) => {
      const by = d.advisor_name && isOfficer ? ` (${d.advisor_name})` : '';
      return `"${d.title}"${by}: ${d.flag_count} flag${d.flag_count > 1 ? 's' : ''} [${d.flag_categories.join(', ')}]`;
    }).join('; ');
    return `Here are documents with active risk flags: ${list}. ${isOfficer ? 'Want me to pull the full breakdown for any of these?' : 'Want me to auto-fix any of these?'}`;
  }

  // 5. Status / queue / submissions
  if (/\b(submission|submissions|filing|filings|document|documents|proposal|proposals|queue|pending|approved|revision|status|my uploads|my files|what documents|show my)\b/i.test(lower)) {
    if (recentDocs.length === 0) {
      return isOfficer
        ? 'The supervisory review queue is currently clear — no pending document submissions awaiting review.'
        : "You don't have any proposal submissions on file yet. Attach a draft here and I'll scan or auto-fix it before submission.";
    }
    const countsSummary = Object.entries(statusCounts)
      .map(([s, c]) => `${c} ${s.toLowerCase()}`)
      .join(', ') || '0 filings';
    const docList = recentDocs.slice(0, 4).map((d) => {
      const by = d.advisor_name && isOfficer ? ` — ${d.advisor_name}` : '';
      const risk = d.flag_count > 0 ? ` ⚠ ${d.flag_count} flag${d.flag_count > 1 ? 's' : ''}` : '';
      return `"${d.title}"${by} (${d.status}${risk})`;
    }).join(', ');
    return isOfficer
      ? `Across the platform: ${countsSummary}. Recent filings: ${docList}. Which one would you like to review?`
      : `Your filings: ${countsSummary}. Recent: ${docList}. Want me to check any of these or scan a new draft?`;
  }

  // 6. Greetings — handled by GrokChatbotService.handleFreeConversation (external AI with role-scoped prompts)
  // 7. Regulatory rules — handled by GrokChatbotService.handleComplianceRegulatoryGuidance (external AI)
  // 7b. Remediation & drafting — handled by GrokChatbotService.handleComplianceDraftingAndRemediation (external AI)
  // 8. Grammar / sentence fixing — handled by GrokChatbotService.handleGrammarCheckIntent (external AI)
  // All above intents are routed to the LLM with role-scoped prompts; no embedded fallbacks needed.

  // 9. Default — minimal fallback only reached when all AI services are unavailable
  return isOfficer
    ? "I'm monitoring the supervisory review queue. Ask me about pending filings, uploader identities, document risk flags under FINRA 2210 & SEC 206, or ask me to draft determination directives."
    : "I'm your AI compliance assistant. Ask me about your submission statuses, check officer revision notes, attach a draft to scan or auto-fix, or ask how to remediate proposals to meet FINRA 2210 & SEC 206 rules.";
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── 0. Grok Intent Router — grammar, expansion, and all DB-grounded queries ─
  // These intents are intercepted and fully handled before telemetry/Gemini fallback.
  try {
    const grokResult = await GrokChatbotService.processMessage({
      message: cleanMessage,
      user: { id: userId, role: userRole },
      pathname,
      documentId,
    });

    const isSpecificIntent =
      grokResult.intent !== 'general_conversational' && !grokResult.isClarification;
    const isClarification = grokResult.isClarification === true;

    if (isSpecificIntent || isClarification) {
      // Consume quota only for non-clarification AI-handled intents
      if (!isClarification && userId) {
        await QuotaService.consumeChatMessage(userId, userRole);
      }
      const quotaInfo = userId ? await QuotaService.getQuotaInfo(userId, userRole) : null;
      res.status(200).json({
        success: true,
        reply: grokResult.reply,
        correctedQuery: grokResult.correctedQuery,
        intent: grokResult.intent,
        isClarification: grokResult.isClarification || false,
        quota: quotaInfo
          ? {
              used: quotaInfo.chatMessages.used,
              limit: quotaInfo.chatMessages.limit,
              remaining: quotaInfo.chatMessages.remaining,
              resetsAt: quotaInfo.resetsAt,
              resetInDays: quotaInfo.resetInDays,
            }
          : undefined,
      });
      return;
    }

    // If grammar was corrected, use corrected text for downstream processing
    if (grokResult.correctedQuery && grokResult.correctedQuery !== cleanMessage) {
      Object.assign(req.body, { _correctedQuery: grokResult.correctedQuery });
    }
  } catch (grokErr) {
    console.warn('[Chat] Grok intent router error, falling through to Gemini:', grokErr);
  }

  // ── 1. Live Database Telemetry ──────────────────────────────────────────────
  const telemetryData: LiveTelemetryData = {
    statusCounts: {},
    recentDocs: [],
    todaysDocs: [],
    activeDoc: null,
  };

  try {
    // 1a. Status counts
    const statusSql = isOfficer || !userId
      ? `SELECT status, COUNT(*)::int AS count FROM documents GROUP BY status`
      : `SELECT status, COUNT(*)::int AS count FROM documents WHERE advisor_id = $1 GROUP BY status`;
    const statusParams = isOfficer || !userId ? [] : [userId];
    const statusRes = await query<{ status: string; count: number }>(statusSql, statusParams);
    for (const row of statusRes.rows) {
      telemetryData.statusCounts[row.status] = row.count;
    }

    // 1b. Enriched recent documents — uploader identity + flags from document_analyses
    const recentSql = isOfficer || !userId
      ? `SELECT
           d.id, d.title, d.status, d.version, d.file_name, d.mime_type,
           d.created_at,
           u.name  AS advisor_name,
           u.email AS advisor_email,
           da.flags
         FROM documents d
         LEFT JOIN users u ON d.advisor_id = u.id
         LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
         ORDER BY d.created_at DESC LIMIT 15`
      : `SELECT
           d.id, d.title, d.status, d.version, d.file_name, d.mime_type,
           d.created_at,
           da.flags
         FROM documents d
         LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
         WHERE d.advisor_id = $1
         ORDER BY d.created_at DESC LIMIT 15`;
    const recentRes = await query<any>(recentSql, statusParams);
    telemetryData.recentDocs = recentRes.rows.map((row) => {
      const { flag_count, flag_categories } = parseFlagMeta(row.flags);
      return {
        ...row,
        flag_count,
        flag_categories,
        has_analysis: row.flags !== null && row.flags !== undefined,
      } as EnrichedDoc;
    });

    // 1c. Today's uploads (separate focused query)
    const todaySql = isOfficer || !userId
      ? `SELECT
           d.id, d.title, d.status, d.version, d.file_name,
           d.created_at,
           u.name  AS advisor_name,
           u.email AS advisor_email,
           da.flags
         FROM documents d
         LEFT JOIN users u ON d.advisor_id = u.id
         LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
         WHERE d.created_at::date = CURRENT_DATE
         ORDER BY d.created_at DESC`
      : `SELECT
           d.id, d.title, d.status, d.version, d.file_name,
           d.created_at,
           da.flags
         FROM documents d
         LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
         WHERE d.advisor_id = $1 AND d.created_at::date = CURRENT_DATE
         ORDER BY d.created_at DESC`;
    const todayRes = await query<any>(todaySql, statusParams);
    telemetryData.todaysDocs = todayRes.rows.map((row) => {
      const { flag_count, flag_categories } = parseFlagMeta(row.flags);
      return {
        ...row,
        flag_count,
        flag_categories,
        has_analysis: row.flags !== null && row.flags !== undefined,
      } as EnrichedDoc;
    });

    // 1d. Active document (user is on /documents/[id] page)
    const targetDocId = documentId || (pathname?.match(/\/documents\/([0-9a-fA-F-]+)/)?.[1]);
    if (targetDocId) {
      const activeRes = await query<any>(
        `SELECT
           d.id, d.title, d.status, d.version,
           u.name AS advisor_name,
           da.summary, da.flags
         FROM documents d
         LEFT JOIN users u ON d.advisor_id = u.id
         LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
         WHERE d.id = $1`,
        [targetDocId]
      );
      if (activeRes.rows.length > 0) {
        const row = activeRes.rows[0];
        const { flag_count } = parseFlagMeta(row.flags);
        telemetryData.activeDoc = { ...row, flag_count };
      }
    }
  } catch (dbErr) {
    console.warn('[Chat] Telemetry database query warning:', dbErr);
  }

  // ── 2. Format enriched context for Gemini ────────────────────────────────
  const countsFormatted = Object.entries(telemetryData.statusCounts)
    .map(([s, c]) => `${s}: ${c}`)
    .join(', ') || 'No documents yet';

  const recentFormatted = telemetryData.recentDocs.length > 0
    ? telemetryData.recentDocs.map(formatDocForContext).join('\n')
    : 'No documents in repository.';

  const todaysFormatted = telemetryData.todaysDocs.length > 0
    ? `TODAY'S UPLOADS (${telemetryData.todaysDocs.length} document${telemetryData.todaysDocs.length > 1 ? 's' : ''}):\n` +
      telemetryData.todaysDocs.map(formatDocForContext).join('\n')
    : "TODAY'S UPLOADS: None uploaded today.";

  const activeDocFormatted = telemetryData.activeDoc
    ? `\nACTIVE DOCUMENT IN VIEW:
Title: "${telemetryData.activeDoc.title}" (v${telemetryData.activeDoc.version}, ${telemetryData.activeDoc.status})
${telemetryData.activeDoc.advisor_name ? `Uploaded by: ${telemetryData.activeDoc.advisor_name}` : ''}
Compliance Summary: ${telemetryData.activeDoc.summary || 'Not yet analyzed'}
Risk Flags: ${telemetryData.activeDoc.flag_count} flag${telemetryData.activeDoc.flag_count !== 1 ? 's' : ''} — ${JSON.stringify(telemetryData.activeDoc.flags || [])}`
    : '';

  // ── 3. Advisor Quota Check ────────────────────────────────────────────────
  if (userId) {
    const quota = await QuotaService.checkChatMessage(userId, userRole);
    if (!quota.allowed) {
      const resetDate = quota.resetsAt ? new Date(quota.resetsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : `in ${quota.resetInDays} days`;
      res.status(200).json({
        success: true,
        reply: `You've used all ${quota.limit} AI messages for this period — your quota resets on ${resetDate} (${quota.resetInDays} day${quota.resetInDays !== 1 ? 's' : ''} from now). In the meantime, you can still view your submissions, download remediated files, and check the dashboard. Need more capacity? Reach out to your Compliance Officer.`,
        quota: { used: quota.used, limit: quota.limit, remaining: 0, resetsAt: quota.resetsAt, resetInDays: quota.resetInDays },
        quotaExceeded: true,
      });
      return;
    }
  }

  // ── 4. Google Gemini REST Call ────────────────────────────────────────────
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey && !geminiApiKey.includes('your_gemini') && !geminiApiKey.includes('test-ci')) {
    try {
      const systemInstruction = `You are Springer Capital's Neural Compliance Copilot — a knowledgeable, articulate, and friendly senior Wall Street compliance director and trusted colleague.

Your tone is warm, conversational, and direct. Speak in natural sentences — no robotic templates, no rigid headers, no corporate openers like "Thank you for your inquiry...".

When the user asks about who uploaded something, what the risks are, or today's documents — use ONLY the LIVE DATABASE TELEMETRY below. Never fabricate names, flags, or document titles not present in the data.

CONTEXT:
- User Role: ${userRole} (${isOfficer ? 'Compliance Officer — full queue visibility including uploader identities, risk flags, all advisor filings' : 'Investment Advisor — visibility into own submissions only'})
- Current Page: ${pathname || 'Dashboard'}

LIVE DATABASE TELEMETRY:
Status Counts: ${countsFormatted}

${todaysFormatted}

RECENT REPOSITORY FILINGS (last 15):
${recentFormatted}
${activeDocFormatted}

ROLE GUIDANCE:
${
  isOfficer
    ? `You have full visibility into uploader identities (advisor_name), processing status, and risk flag details for every document. When asked "who uploaded X", tell them the advisor name. When asked about risks or flags, cite the actual flag categories from the telemetry (PROHIBITED_CLAIM, MISSING_DISCLOSURE, SUITABILITY, PRECEDENT_MATCH). Never make up data not present above.`
    : `Help the advisor track their own submissions, understand FINRA Rule 2210 and SEC Rule 206 requirements, and guide them on attaching drafts to scan or auto-fix. Do not expose other advisors' data.`
}

CRITICAL RULES:
- Always respond. Never refuse a compliance or document question.
- Speak naturally in 2–4 sentences. Keep it concise, warm, and helpful.
- Ground every data claim in the LIVE DATABASE TELEMETRY above. If data is absent, say so honestly.
- Do not hallucinate document titles, advisor names, or risk flags not in the telemetry.
- If "today's uploads" is empty, say so clearly and naturally.`;

      const gResult = await GeminiClient.generateContent(cleanMessage, {
        systemInstruction,
        temperature: 0.4,
        maxOutputTokens: 700,
        timeoutMs: 15000,
      });

      if (gResult?.text) {
        // Consume quota after successful AI response
        if (userId) await QuotaService.consumeChatMessage(userId, userRole);
        const quotaInfo = userId ? await QuotaService.getQuotaInfo(userId, userRole) : null;
        res.status(200).json({
          success: true,
          reply: gResult.text,
          quota: quotaInfo
            ? {
                used: quotaInfo.chatMessages.used,
                limit: quotaInfo.chatMessages.limit,
                remaining: quotaInfo.chatMessages.remaining,
                resetsAt: quotaInfo.resetsAt,
                resetInDays: quotaInfo.resetInDays,
              }
            : undefined,
        });
        return;
      }
    } catch (gErr) {
      console.warn('[Chat] Direct Gemini call failed, using institutional data-grounded fallback:', gErr);
    }
  }

  // ── 5. Robust institutional fallback grounded in live database rows ───────
  // Fallback responses do not consume quota (no AI token usage)
  const fallbackReply = generateContextualComplianceReply(cleanMessage, userRole, telemetryData);
  const quotaInfo = userId ? await QuotaService.getQuotaInfo(userId, userRole) : null;
  res.status(200).json({
    success: true,
    reply: fallbackReply,
    quota: quotaInfo ? { used: quotaInfo.chatMessages.used, limit: quotaInfo.chatMessages.limit, remaining: quotaInfo.chatMessages.remaining, resetsAt: quotaInfo.resetsAt, resetInDays: quotaInfo.resetInDays } : undefined,
  });
});

router.post(
  '/audit-and-fix',
  optionalAuth,
  uploadDocumentFile.single('file'),
  DocumentController.auditAndFix
);

/**
 * GET /api/chat/quota — returns the current advisor quota status.
 * Used by the frontend on chatbot open to pre-populate quota bars before the first message.
 */
router.get('/quota', optionalAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId: string | undefined = user?.id;
  const userRole: string = user?.role || 'Advisor';

  if (!userId || userRole === 'Officer') {
    res.status(200).json({ success: true, quota: null });
    return;
  }

  const info = await QuotaService.getQuotaInfo(userId, userRole);
  res.status(200).json({ success: true, quota: info });
});

export default router;

