/**
 * DOCU: AI Chatbot & Database-Grounded Intent Service.
 *
 * Dual-mode conversational assistant:
 *   Mode A — Free conversational (grammar, rewriting, small talk, general Q&A via Gemini).
 *   Mode B — Grounded data lookup: DB is queried first; real results are fed to Gemini
 *             so it phrases them naturally — the model never invents DB facts.
 *
 * Primary LLM : Google Gemini 2.0 Flash (free tier, GEMINI_API_KEY).
 * Secondary LLM: xAI Grok (optional — only when XAI_API_KEY is configured).
 *
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import { query } from '../db/pool';

// ─────────────────────────────────────────────────────────────────────────────
// System prompts
// ─────────────────────────────────────────────────────────────────────────────

const MODE_A_SYSTEM_PROMPT = `You are a helpful, warm, conversational AI assistant embedded in Springer Capital's document management platform. Think of yourself like a knowledgeable colleague — friendly, sharp, and easy to talk to.

You can help with:
- Fixing grammar, rewriting sentences, adjusting tone, proofreading text the user pastes in.
- General questions, small talk, brainstorming, drafting short messages or emails.
- Explaining concepts related to compliance, finance, or anything the user asks.

Keep your responses natural and human — like you're chatting with a colleague, not filling out a form. Be concise unless the user asks for detail. Skip unnecessary disclaimers.

IMPORTANT: You do NOT have access to live database records. If the user asks about specific documents, submission statuses, upload dates, advisor names, or risk scores — let them know you'll need to check the system, and suggest they rephrase as a direct request (e.g. "show my pending documents" or "check risk for [title]"). Never guess or invent any factual data.`;

const MODE_B_SYSTEM_PROMPT = `You are a helpful, warm AI assistant embedded in Springer Capital's document management platform. You have just retrieved real, live data from the database and your job is to present it to the user conversationally — like a knowledgeable colleague sharing what they found.

Rules:
1. Use ONLY the data provided in the context. Do not add, invent, or infer any names, dates, titles, statuses, or risk scores not explicitly listed there.
2. Phrase the answer naturally — like a person talking, not a database printout. Example: "Looks like your most recent upload, 'Q3 Compliance Report,' went in on Sept 12 and it's still sitting as Pending." instead of "Title: Q3 Compliance Report | Status: Pending".
3. If the data shows zero results, say so naturally and offer to help further.
4. Mention revision notes briefly and warmly if present.
5. Keep it concise — one to three short paragraphs unless the dataset is large.`;

export interface ChatUserContext {
  id?: string;
  email?: string;
  role: 'Advisor' | 'Officer' | string;
}

export interface ChatbotRequestOptions {
  message: string;
  user: ChatUserContext;
  pathname?: string;
  documentId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatbotResponse {
  reply: string;
  intent?: string;
  correctedQuery?: string;
  isClarification?: boolean;
}

export class GrokChatbotService {
  private static getGrokApiKey(): string | undefined {
    const key = (process.env.GROK_API_KEY || process.env.XAI_API_KEY || '').trim();
    if (!key || key.includes('placeholder') || key.includes('your_grok')) {
      return undefined;
    }
    return key;
  }

  private static getGeminiApiKey(): string | undefined {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key || key.includes('placeholder') || key.includes('your_gemini')) {
      return undefined;
    }
    return key;
  }

  /**
   * Calls Google Gemini (primary, free tier) or xAI Grok (secondary, if configured).
   */
  public static async callLlm(prompt: string, systemPrompt?: string): Promise<string | null> {
    // ── Primary: Gemini (free tier) ──────────────────────────────────────────
    const geminiKey = this.getGeminiApiKey();
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) return text.trim();
        }
      } catch (err) {
        console.warn('[Chatbot] Gemini call failed, trying Grok:', err);
      }
    }

    // ── Secondary: xAI Grok (optional — only if XAI_API_KEY is set) ─────────
    const grokKey = this.getGrokApiKey();
    if (grokKey) {
      try {
        const resp = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${grokKey}`,
          },
          body: JSON.stringify({
            model: 'grok-2',
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 900,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text && text.trim()) return text.trim();
        }
      } catch (err) {
        console.warn('[Chatbot] Grok call failed:', err);
      }
    }

    return null;
  }

  /**
   * Mode B helper: feeds real DB result to the LLM so it can phrase it naturally.
   * The model only rephrases what it was given — it cannot invent missing data.
   */
  private static async formatDbResultWithLlm(
    dbDataSummary: string,
    userQuestion: string,
    userRole: string,
    fallbackReply: string
  ): Promise<string> {
    const prompt = `The user (${userRole}) asked: "${userQuestion}"

Here is the exact data retrieved from the database:

${dbDataSummary}

Present this data to the user in a warm, conversational way. Use only the data listed above — do not add any information not shown here.`;

    const reply = await this.callLlm(prompt, MODE_B_SYSTEM_PROMPT);
    return reply || fallbackReply;
  }

  /**
   * Corrects grammar and spelling on user input before intent classification.
   */
  public static async correctGrammarAndSpelling(rawText: string): Promise<string> {
    const trimmed = rawText.trim();
    if (!trimmed || trimmed.length < 3) return trimmed;

    // Fast heuristic replacements for common speech/typing shortcuts
    const quickNormalized = trimmed
      .replace(/\baprvd\b/gi, 'approved')
      .replace(/\bpndng\b/gi, 'pending')
      .replace(/\brevsn\b/gi, 'revision')
      .replace(/\bdocumnts?\b/gi, 'documents')
      .replace(/\bsho\b/gi, 'show')
      .replace(/\bwat\b/gi, 'what')
      .replace(/\byer\b/gi, 'year')
      .replace(/\blast\s+yrs?\b/gi, "last year's");

    const systemPrompt = `You are a strict, ultra-fast spelling and grammar normalizer for financial and compliance search queries.
Output ONLY the corrected sentence. Do NOT add quotes, preamble, explanations, or punctuation changes that alter intent.
Preserve proper nouns, names, years, and specific document titles exactly as intended.`;

    const llmResult = await this.callLlm(`Correct spelling and grammar in this query:\n"${quickNormalized}"`, systemPrompt);
    if (llmResult) {
      const clean = llmResult.replace(/^["']|["']$/g, '').trim();
      if (clean && clean.length > 0) return clean;
    }

    return quickNormalized;
  }

  /**
   * Mode A — Grammar check: corrects and explains changes conversationally.
   */
  public static async handleGrammarCheckIntent(rawText: string): Promise<string> {
    const textToCheck = rawText
      .replace(/\b(?:check|fix|re-?check)\s+grammar\b[:,-]?/gi, '')
      .replace(/\bgrammar\s+(?:check|re-?check)\b[:,-]?/gi, '')
      .replace(/^(?:grammar|check|proofread)[:,-]?\s*/i, '')
      .trim();

    const systemPrompt = `You are a friendly, expert editor helping a user clean up their text. Correct any grammar, spelling, or style issues and give your response in two parts:
- **Corrected Text**: the fixed version
- **What I changed**: a brief, friendly bullet list of what you improved

Keep the tone warm — like a helpful colleague reviewing a draft, not a strict teacher grading an essay.`;

    const result = await this.callLlm(textToCheck || rawText, systemPrompt);
    if (result) return result;

    return `**Corrected Text:**\n${textToCheck}\n\n**What I changed:** Looks good — no major issues spotted!`;
  }

  /**
   * Mode A — Text expansion: expands brief notes into professional compliance prose.
   */
  public static async handleExpansionIntent(rawText: string): Promise<string> {
    const textToExpand = rawText
      .replace(/^(?:expand|elaborate|expand\s+note|expand\s+draft)[:,-]?\s*/i, '')
      .trim();

    const systemPrompt = `You are a helpful compliance writing assistant at Springer Capital. Expand the user's brief notes or bullet points into a clear, professional compliance document or memo aligned with FINRA Rule 2210 and SEC Rule 206. Use clean markdown headings, balanced language, and avoid promissory statements. Keep the tone professional but readable — not stiff.`;

    const result = await this.callLlm(textToExpand || rawText, systemPrompt);
    if (result) return result;

    return `### Compliance Memo\n\n**Subject**: Expanded Documentation\n\n${textToExpand}\n\n*Please review all factual assertions against current supervisory filings before submitting.*`;
  }

  /**
   * Main entrypoint: processes a message, performs grammar correction, intent detection,
   * clarification gating, and live database queries.
   */
  public static async processMessage(options: ChatbotRequestOptions): Promise<ChatbotResponse> {
    const { message, user, pathname, documentId } = options;
    const isOfficer = user.role === 'Officer';
    const isAdvisor = !isOfficer;

    // ── Step 1: Grammar Correction ──────────────────────────────────────────
    const correctedQuery = await this.correctGrammarAndSpelling(message);
    const lower = correctedQuery.toLowerCase();

    // ── Check for explicit Grammar Check or Expansion intent ────────────────
    const isGrammarRequest =
      lower.startsWith('check grammar') ||
      lower.startsWith('grammar:') ||
      lower.startsWith('proofread') ||
      /\b(check|fix)\s+my\s+grammar\b/i.test(lower);

    if (isGrammarRequest) {
      const reply = await this.handleGrammarCheckIntent(message);
      return { reply, intent: 'grammar_check', correctedQuery };
    }

    const isExpandRequest =
      lower.startsWith('expand') ||
      lower.startsWith('elaborate') ||
      /\bexpand\s+(?:this|my)?\s*(?:note|draft|memo|text)\b/i.test(lower);

    if (isExpandRequest) {
      const reply = await this.handleExpansionIntent(message);
      return { reply, intent: 'text_expansion', correctedQuery };
    }

    // ── Intent 1: Advisor: Check Document Status ────────────────────────────
    // Trigger: advisor asks about "pending", "for revision", or "approved" documents.
    const isStatusQuery =
      isAdvisor &&
      /\b(pending|for revision|needs revision|revision|approved|my status|status of my)\b/i.test(lower);

    if (isStatusQuery) {
      return await this.handleAdvisorStatusIntent(user, lower, correctedQuery);
    }

    // ── Intent 2: Advisor: Check Last Year's Uploads ────────────────────────
    // Trigger: advisor asks about "last year's upload(s)".
    const isLastYearAdvisorQuery =
      isAdvisor &&
      /\b(last\s+year'?s?\s+uploads?|uploads?\s+(?:from|in)\s+last\s+year)\b/i.test(lower);

    if (isLastYearAdvisorQuery) {
      return await this.handleAdvisorLastYearUploadsIntent(user, correctedQuery);
    }

    // ── Intent 3: Officer: Check Latest Upload (per advisor) ────────────────
    const isLatestUploadQuery =
      isOfficer &&
      /\b(latest\s+upload|most\s+recent\s+upload|last\s+upload|newest\s+upload)\b/i.test(lower);

    if (isLatestUploadQuery) {
      return await this.handleOfficerLatestUploadIntent(correctedQuery, lower);
    }

    // ── Intent 4: Officer: Filter Uploads by Year ───────────────────────────
    const isYearFilterQuery =
      isOfficer &&
      (/\b(?:in|from|during)\s+(20\d\d)\b/i.test(lower) ||
        /\b(?:filter|show|display|list)\s+(?:uploads|documents|files)?\s*(?:by|in|for)\s*year\b/i.test(lower) ||
        /\b(?:uploads|documents|files)\s+in\s+(20\d\d)\b/i.test(lower));

    if (isYearFilterQuery) {
      return await this.handleOfficerFilterByYearIntent(correctedQuery, lower);
    }

    // ── Intent 5: Officer: Document Risk Assessment ─────────────────────────
    const isRiskQuery =
      isOfficer &&
      /\b(risk|risks|risk\s+assessment|risk\s+level|risk\s+score)\b/i.test(lower);

    if (isRiskQuery) {
      return await this.handleOfficerDocumentRiskIntent(correctedQuery, lower, documentId);
    }

    // ── Mode A fallback: free conversational (no DB lookup) ─────────────────
    return await this.handleFreeConversation(correctedQuery, user, pathname);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 1 Handler: Advisor Document Status
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleAdvisorStatusIntent(
    user: ChatUserContext,
    lower: string,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    if (!user.id) {
      return {
        reply: "You'll need to be logged in for me to pull your submission statuses. Log in and ask again!",
        intent: 'advisor_document_status',
        correctedQuery,
      };
    }

    let targetStatus: string | null = null;
    if (lower.includes('pending')) targetStatus = 'Pending';
    else if (lower.includes('revision') || lower.includes('for revision')) targetStatus = 'Needs Revision';
    else if (lower.includes('approved')) targetStatus = 'Approved';

    let sql: string;
    let params: any[];

    if (targetStatus) {
      sql = `
        SELECT d.title, d.status, d.created_at,
          COALESCE(
            (SELECT reason FROM audit_trail WHERE document_id = d.id AND new_status = 'Needs Revision' ORDER BY created_at DESC LIMIT 1),
            (SELECT message FROM revision_thread_entries WHERE document_id = d.id ORDER BY created_at DESC LIMIT 1)
          ) AS revision_notes
        FROM documents d
        WHERE d.advisor_id = $1 AND LOWER(d.status) = LOWER($2)
        ORDER BY d.created_at DESC
      `;
      params = [user.id, targetStatus];
    } else {
      sql = `
        SELECT d.title, d.status, d.created_at,
          COALESCE(
            (SELECT reason FROM audit_trail WHERE document_id = d.id AND new_status = 'Needs Revision' ORDER BY created_at DESC LIMIT 1),
            (SELECT message FROM revision_thread_entries WHERE document_id = d.id ORDER BY created_at DESC LIMIT 1)
          ) AS revision_notes
        FROM documents d
        WHERE d.advisor_id = $1
        ORDER BY d.created_at DESC
        LIMIT 10
      `;
      params = [user.id];
    }

    const res = await query<any>(sql, params);
    const statusLabel = targetStatus ? ` ${targetStatus.toLowerCase()}` : '';

    if (res.rows.length === 0) {
      return {
        reply: `You don't have any${statusLabel} documents on file right now. If you were expecting something, it might be worth double-checking your submissions.`,
        intent: 'advisor_document_status',
        correctedQuery,
      };
    }

    // Build structured DB summary → feed to Gemini for natural phrasing
    const docLines = res.rows.map((doc: any) => {
      const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const notes = doc.revision_notes ? ` | Revision Notes: "${doc.revision_notes}"` : '';
      return `- Title: "${doc.title}" | Status: ${doc.status} | Submitted: ${dateStr}${notes}`;
    }).join('\n');

    const dbSummary = `The advisor has ${res.rows.length}${statusLabel} document(s):\n${docLines}`;
    const fallback = `Here are your${statusLabel} documents:\n\n${docLines}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role, fallback);
    return { reply, intent: 'advisor_document_status', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 2 Handler: Advisor Last Year's Uploads
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleAdvisorLastYearUploadsIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    if (!user.id) {
      return {
        reply: "Log in to your Advisor account and I can pull up your uploads from last year!",
        intent: 'advisor_last_year_uploads',
        correctedQuery,
      };
    }

    const lastYear = new Date().getFullYear() - 1;

    const sql = `
      SELECT title, created_at
      FROM documents
      WHERE advisor_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
      ORDER BY created_at DESC
    `;
    const res = await query<any>(sql, [user.id, lastYear]);

    if (res.rows.length === 0) {
      return {
        reply: `I couldn't find any uploads from last year (${lastYear}) under your account. Want me to check a different year?`,
        intent: 'advisor_last_year_uploads',
        correctedQuery,
      };
    }

    const docLines = res.rows.map((doc: any) => {
      const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `- Title: "${doc.title}" | Upload Date: ${dateStr}`;
    }).join('\n');

    const dbSummary = `The advisor uploaded ${res.rows.length} document(s) in ${lastYear}:\n${docLines}`;
    const fallback = `Here's what you uploaded in ${lastYear}:\n\n${docLines}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role, fallback);
    return { reply, intent: 'advisor_last_year_uploads', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 3 Handler: Officer Check Latest Upload (per advisor)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleOfficerLatestUploadIntent(
    correctedQuery: string,
    lower: string
  ): Promise<ChatbotResponse> {
    const nameMatch =
      correctedQuery.match(/(?:latest|recent)\s+upload\s+(?:of|by|for)\s+([A-Za-z0-9\s._'-]+)/i) ||
      correctedQuery.match(/(?:check|what\s+did)\s+([A-Za-z0-9\s._'-]+?)(?:'s)?\s+(?:latest|recent|last)\s+upload/i) ||
      correctedQuery.match(/advisor\s+([A-Za-z0-9\s._'-]+)/i);

    let rawAdvisorName = nameMatch ? nameMatch[1].trim() : null;
    if (rawAdvisorName) {
      rawAdvisorName = rawAdvisorName
        .replace(/^(the|an?)\s+/i, '')
        .replace(/\s+(in|on|at|during|for).*$/i, '')
        .trim();
      if (/^(advisor|user|someone|document|file)$/i.test(rawAdvisorName)) rawAdvisorName = null;
    }

    if (!rawAdvisorName) {
      return {
        reply: "Sure! Whose latest upload would you like me to check?",
        intent: 'officer_latest_upload',
        isClarification: true,
        correctedQuery,
      };
    }

    const userRes = await query<any>(
      `SELECT id, name, email FROM users WHERE role = 'Advisor' AND (name ILIKE $1 OR email ILIKE $1) LIMIT 1`,
      [`%${rawAdvisorName}%`]
    );

    if (userRes.rows.length === 0) {
      return {
        reply: `I couldn't find an advisor named "${rawAdvisorName}" in the system. Could you double-check the name?`,
        intent: 'officer_latest_upload',
        correctedQuery,
      };
    }

    const advisor = userRes.rows[0];
    const docRes = await query<any>(
      `SELECT title, created_at FROM documents WHERE advisor_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [advisor.id]
    );

    if (docRes.rows.length === 0) {
      return {
        reply: `It looks like ${advisor.name} hasn't uploaded any documents yet.`,
        intent: 'officer_latest_upload',
        correctedQuery,
      };
    }

    const doc = docRes.rows[0];
    const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const dbSummary = `Latest upload for advisor ${advisor.name}:\n- Document Title: "${doc.title}"\n- Upload Date: ${dateStr}`;
    const fallback = `**${advisor.name}'s** latest upload is **"${doc.title}"**, submitted on ${dateStr}.`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, 'Officer', fallback);
    return { reply, intent: 'officer_latest_upload', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 4 Handler: Officer Filter Uploads by Year
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleOfficerFilterByYearIntent(
    correctedQuery: string,
    lower: string
  ): Promise<ChatbotResponse> {
    // Extract year
    const yearMatch = correctedQuery.match(/\b(20\d\d)\b/);
    if (!yearMatch) {
      return {
        reply: "Which year do you want me to filter by?",
        intent: 'officer_filter_by_year',
        isClarification: true,
        correctedQuery,
      };
    }

    const targetYear = parseInt(yearMatch[1], 10);

    // Optional advisor filter
    const advisorMatch =
      correctedQuery.match(/(?:for|by|of)\s+advisor\s+([A-Za-z0-9\s._'-]+)/i) ||
      correctedQuery.match(/(?:for|by|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);

    let advisorFilter = advisorMatch ? advisorMatch[1].trim() : null;
    if (advisorFilter && /^(the|an|all|any|year|documents|files|uploads)$/i.test(advisorFilter)) {
      advisorFilter = null;
    }

    let sql: string;
    let params: any[];

    if (advisorFilter) {
      sql = `
        SELECT 
          d.title,
          COALESCE(u.name, 'Unknown Advisor') AS advisor_name,
          d.created_at
        FROM documents d
        LEFT JOIN users u ON d.advisor_id = u.id
        WHERE EXTRACT(YEAR FROM d.created_at) = $1
          AND (u.name ILIKE $2 OR u.email ILIKE $2)
        ORDER BY d.created_at DESC
      `;
      params = [targetYear, `%${advisorFilter}%`];
    } else {
      sql = `
        SELECT 
          d.title,
          COALESCE(u.name, 'Unknown Advisor') AS advisor_name,
          d.created_at
        FROM documents d
        LEFT JOIN users u ON d.advisor_id = u.id
        WHERE EXTRACT(YEAR FROM d.created_at) = $1
        ORDER BY d.created_at DESC
      `;
      params = [targetYear];
    }

    const res = await query<any>(sql, params);

    if (res.rows.length === 0) {
      const advPart = advisorFilter ? ` for "${advisorFilter}"` : '';
      return {
        reply: `I couldn't find any documents from ${targetYear}${advPart}. Want me to try a different year?`,
        intent: 'officer_filter_by_year',
        correctedQuery,
      };
    }

    const docLines = res.rows.map((doc: any) => {
      const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `- Title: "${doc.title}" | Advisor: ${doc.advisor_name} | Date: ${dateStr}`;
    }).join('\n');

    const dbSummary = `${res.rows.length} document(s) found for ${targetYear}:\n${docLines}`;
    const fallback = `**Documents from ${targetYear}** (${res.rows.length} found):\n\n${docLines}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, 'Officer', fallback);
    return { reply, intent: 'officer_filter_by_year', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 5 Handler: Officer Document Risk Assessment
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleOfficerDocumentRiskIntent(
    correctedQuery: string,
    lower: string,
    activeDocumentId?: string
  ): Promise<ChatbotResponse> {
    let titleCandidate: string | null = null;

    const quoteMatch = correctedQuery.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      titleCandidate = quoteMatch[1].trim();
    } else {
      const afterKeyword = correctedQuery.match(
        /(?:risk\s+(?:of|for|on|in)|assess\s+risk\s+(?:of|for)|evaluate\s+risk\s+(?:of|for))\s+(.+)$/i
      );
      if (afterKeyword) titleCandidate = afterKeyword[1].replace(/[?.!]+$/, '').trim();
    }

    if (titleCandidate && /^(the document|this document|the file|this file|document|file|a document)$/i.test(titleCandidate)) {
      titleCandidate = null;
    }

    if (!titleCandidate && activeDocumentId) {
      const activeDoc = await query<any>('SELECT title FROM documents WHERE id = $1', [activeDocumentId]);
      if (activeDoc.rows.length > 0) titleCandidate = activeDoc.rows[0].title;
    }

    if (!titleCandidate) {
      return {
        reply: "Which document do you want me to check the risk level for? You can give me its title.",
        intent: 'officer_document_risk',
        isClarification: true,
        correctedQuery,
      };
    }

    const sql = `
      SELECT d.title, d.version, d.status,
        COALESCE(da.risk_level,
          CASE WHEN jsonb_array_length(da.flags) = 0 THEN 'Low'
               WHEN jsonb_array_length(da.flags) <= 2 THEN 'Medium'
               ELSE 'High' END, 'Low') AS risk_level,
        COALESCE(da.risk_score,
          CASE WHEN jsonb_array_length(da.flags) = 0 THEN 0
               WHEN jsonb_array_length(da.flags) <= 2 THEN 45
               ELSE 85 END, 0) AS risk_score,
        da.flags, da.summary
      FROM documents d
      LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
      WHERE d.title ILIKE $1
      ORDER BY d.created_at DESC
      LIMIT 1
    `;
    const res = await query<any>(sql, [`%${titleCandidate}%`]);

    if (res.rows.length === 0) {
      return {
        reply: `I couldn't find a document matching "${titleCandidate}" in the system. Could you check the title?`,
        intent: 'officer_document_risk',
        correctedQuery,
      };
    }

    const doc = res.rows[0];
    let flagsList: any[] = [];
    try { flagsList = typeof doc.flags === 'string' ? JSON.parse(doc.flags) : doc.flags || []; } catch { flagsList = []; }

    const flagsSummary =
      flagsList.length === 0
        ? 'No compliance flags recorded.'
        : flagsList.map((f: any) => {
            const rule = f.rule || 'Regulatory Rule';
            const exp = f.explanation || f.reason || 'Compliance flag';
            const pass = f.passage ? ` — "${f.passage}"` : '';
            return `  - ${rule}: ${exp}${pass}`;
          }).join('\n');

    const dbSummary = `Risk assessment for "${doc.title}" (version ${doc.version}, status: ${doc.status}):\n- Risk Level: ${doc.risk_level}\n- Risk Score: ${doc.risk_score}/100\n- Compliance Flags:\n${flagsSummary}`;
    const fallback = `**Risk Assessment — "${doc.title}"**\n- Risk Level: **${doc.risk_level}** (Score: ${doc.risk_score}/100)\n\n**Compliance Flags:**\n${flagsSummary}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, 'Officer', fallback);
    return { reply, intent: 'officer_document_risk', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mode A — Free Conversational Fallback (no DB lookup)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleFreeConversation(
    correctedQuery: string,
    user: ChatUserContext,
    pathname?: string
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const contextNote = isOfficer
      ? 'The user is a Compliance Officer who reviews advisors\' documents in the Springer Capital platform.'
      : 'The user is a Financial Advisor who submits compliance documents through the Springer Capital platform.';

    const enrichedSystemPrompt = `${MODE_A_SYSTEM_PROMPT}\n\nContext: ${contextNote} Current page: ${pathname || 'Dashboard'}.`;

    const llmReply = await this.callLlm(correctedQuery, enrichedSystemPrompt);
    if (llmReply) {
      return { reply: llmReply, intent: 'general_conversational', correctedQuery };
    }

    // Static fallback when both LLMs are unavailable
    const fallbackReply = isOfficer
      ? "I'm here to help! You can ask me to check an advisor's latest upload, filter documents by year, or look up the risk level for any document. What do you need?"
      : "I'm here to help! Ask me about your pending or approved documents, check last year's uploads, or paste in some text and I'll help you tidy it up.";

    return { reply: fallbackReply, intent: 'general_conversational', correctedQuery };
  }
}
