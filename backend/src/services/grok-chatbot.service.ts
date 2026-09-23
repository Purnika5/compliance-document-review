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
import { GeminiClient } from '../utils/gemini';

// ─────────────────────────────────────────────────────────────────────────────
// System prompts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Institutional App-Scoped System Prompts (Tailored by Role)
// ─────────────────────────────────────────────────────────────────────────────

const ADVISOR_APP_PROMPT = `You are Springer Capital's AI Compliance Copilot for Investment Advisors.
Your purpose is strictly to assist advisors in drafting, reviewing, remediating, and submitting compliant investment proposals and client communications through the Springer Capital platform.

Core Institutional Responsibilities:
1. Proposal Compliance & Remediation: Ensure all client communications and proposals strictly adhere to FINRA Rule 2210 (fair, balanced, non-misleading) and SEC Rule 206(4)-1 (Investment Adviser Marketing Rule). Identify and remediate prohibited promissory claims ("guaranteed returns", "risk-free", "foolproof", "assured profit"). Require statutory downside risk disclosures (stating that investments are subject to market fluctuations and loss of principal).
2. Submission & Platform Workflow: Guide advisors on submitting proposal documents (PDF, DOCX, XLSX, TXT up to 25MB), how the automated PII masking gateway strips sensitive data, how version lineages work (uploading v2 when marked "Needs Revision"), and tracking status (Pending, Needs Revision, Approved, Rejected).
3. Writing, Grammar, & Formatting: Help write, rephrase, expand, or fix grammar for proposal sections, client notes, and revision responses to ensure audit-grade professional tone.
4. Privacy & Access Boundaries: Advisors can ONLY inquire about and view their own submissions. NEVER disclose other advisors' names, filings, or supervisory determinations.

Scope Enforcement:
You are an institutional compliance assistant for Springer Capital. Do NOT answer off-topic queries unrelated to compliance, investment proposals, finance, grammar, or platform workflows. If an off-topic question is asked, politely redirect the advisor to Springer Capital's proposal and compliance tools. Keep answers concise (2-4 paragraphs max), warm, and professional.`;

const OFFICER_APP_PROMPT = `You are Springer Capital's Supervisory AI Compliance Copilot for Compliance Officers.
Your purpose is strictly to support compliance officers in conducting supervisory reviews, evaluating regulatory risk under FINRA 2210 & SEC 206, and logging audit-defensible determination records.

Core Institutional Responsibilities:
1. Supervisory Review & Risk Analysis: Assist in evaluating flagged infractions (prohibited promissory claims, missing fiduciary disclosures, suitability concerns, fee opacity) across all advisor proposals in the review queue.
2. Determination Drafting: Help officers draft clear, audit-defensible compliance determinations (Approve, Request Revision with explicit remediation directives, or Reject with regulatory rationale) that will be permanently stamped into the immutable audit trail.
3. Queue & Telemetry Oversight: Provide high-level insight into repository queue statuses, today's uploads, uploader identities, and multi-version lineages (v1 vs v2 comparison).
4. Regulatory Enforcement Standards: Explain and apply FINRA Rule 2210, SEC Rule 206(4)-1 (Marketing Rule), SEC Rule 204 (Substantiation), and FINRA Rule 2111 (Suitability).
5. Grammar & Memo Formatting: Audit officer notes, format findings into structured compliance memos, and ensure determination remarks meet regulatory audit standards.

Scope Enforcement:
You are an institutional supervisory assistant for Springer Capital. Do NOT answer off-topic queries unrelated to compliance, regulatory supervision, platform workflows, or audit documentation. Keep answers concise (2-4 paragraphs max), direct, and audit-defensible.`;

const MODE_B_SYSTEM_PROMPT = `You are Springer Capital's Compliance Assistant presenting verified data directly from the live PostgreSQL database.
Rules:
1. Use ONLY the data provided in the database context. Never invent names, titles, upload dates, statuses, or risk scores not explicitly listed.
2. If the user is an Advisor, NEVER reveal another advisor's name, email, or documents. Scoped strictly to their own proposals.
3. If the user is an Officer, you have full supervisory visibility: present uploader names, queue totals, risk categories, and document flags clearly.
4. Speak warmly and conversationally — like a knowledgeable colleague sharing what was found, rather than a raw database dump.
5. If the data shows zero results, say so naturally and offer platform-specific assistance.`;

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
        const result = await GeminiClient.generateContent(prompt, {
          systemInstruction: systemPrompt,
          temperature: 0.3,
          maxOutputTokens: 900,
          timeoutMs: 15000,
        });

        if (result?.text) return result.text;
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
   * Uses role-scoped system prompts so grammar corrections are tailored to
   * the user's compliance role (Advisor → proposal language, Officer → audit notes).
   */
  public static async handleGrammarCheckIntent(rawText: string, user?: ChatUserContext): Promise<string> {
    const isOfficer = user?.role === 'Officer';
    const textToCheck = rawText
      .replace(/^(?:can you\s+|please\s+|help me\s+|i want\s+(?:you\s+)?to\s+|i want more to\s+)?(?:fix|check|re-?check|correct|proofread|improve|rewrite|rephrase)\s*(?:my|this|the)?\s*(?:grammar|sentence|sentences|phrasing|text|draft|writing)?[:,-]?\s*/i, '')
      .replace(/\b(?:please\s+)?(?:re-?check|check|fix)\s+(?:grammar|sentence|sentences)\b[:,-]?/gi, '')
      .replace(/\b(?:grammar|sentence|sentences)\s+(?:check|re-?check)\b[:,-]?/gi, '')
      .replace(/^(?:grammar|sentence|check|proofread|audit\s*note|fix)[:,-]?\s*/i, '')
      .trim();

    if (!textToCheck || textToCheck.length < 3 || /^(?:my\s+)?(?:sentence|sentences|grammar|text|phrasing|draft)$/i.test(textToCheck)) {
      return isOfficer
        ? "I'd be glad to help polish your text! Please paste or type the supervisory determination note, audit remark, or compliance memo you'd like me to review (for example: *\"The advisor have not complied with the required disclosure\"*), and I'll ensure it is grammatically flawless and meets institutional audit documentation standards."
        : "I'd be glad to help fix your sentence! Please paste or type the proposal text, client note, or revision response you'd like me to audit (for example: *\"The investment team have submited the proposal\"* or *\"Our fund guarantees 10% return\"*), and I'll correct its grammar, spelling, and ensure it complies with FINRA 2210 & SEC 206 rules.";
    }

    // Use role-scoped base prompt + grammar-specific instructions
    const roleBase = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;
    const systemPrompt = `${roleBase}

Additionally, you are now acting as a grammar and writing editor. The user has pasted text they want corrected. Correct any grammar, spelling, punctuation, tone, or style issues and give your response in two parts:
- **Corrected Text**: the fully fixed, polished version ready for ${isOfficer ? 'audit documentation' : 'client-facing compliance submission'}
- **What I changed**: a brief, friendly bullet list of what you improved

Keep the tone warm — like a helpful colleague reviewing a draft, not a strict teacher grading an essay.${isOfficer ? ' Ensure the corrected text meets audit-defensible documentation standards.' : ' Ensure the corrected text meets FINRA 2210 and SEC 206 compliance standards.'}`;

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
      lower.startsWith('fix grammar') ||
      lower.startsWith('fix sentence') ||
      lower.startsWith('fix my sentence') ||
      lower.startsWith('fix my grammar') ||
      /\b(?:check|fix|correct|improve|polish|rephrase|rewrite)\s+(?:my\s+|this\s+|the\s+)?(?:grammar|sentence|sentences|phrasing|wording)\b/i.test(lower) ||
      /\b(?:i\s+want\s+(?:more\s+)?to\s+fix\s+(?:my\s+)?(?:sentence|grammar|writing))\b/i.test(lower) ||
      /\b(?:help\s+me\s+fix\s+(?:my\s+)?(?:sentence|grammar))\b/i.test(lower) ||
      /\bgrammar\s+(?:check|re-?check|fix)\b/i.test(lower);

    if (isGrammarRequest) {
      const reply = await this.handleGrammarCheckIntent(message, user);
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

    // ── Intent 6: Officer: Supervisory Queue & Workload Overview (Database) ──
    const isQueueOverviewQuery =
      isOfficer &&
      /\b(queue|supervisory queue|review queue|unassigned|pending queue|how many pending|workload|today's uploads|uploads today)\b/i.test(lower);

    if (isQueueOverviewQuery) {
      return await this.handleOfficerQueueOverviewIntent(correctedQuery);
    }

    // ── Intent 7: Advisor: Officer Revision Feedback & Directives (Database) ─
    const isRevisionFeedbackQuery =
      isAdvisor &&
      /\b(officer feedback|revision remarks|what revisions|why needs revision|officer comments?|what needs fix|how to fix revision)\b/i.test(lower);

    if (isRevisionFeedbackQuery) {
      return await this.handleAdvisorRevisionFeedbackIntent(user, correctedQuery);
    }

    // ── Intent 8: Interactive Compliance Regulatory Guidance ────────────────
    const isRegulatoryQuery =
      /\b(finra|sec|2210|206|marketing rule|promissory|guarantee|risk disclosure|fiduciary|suitability|2111)\b/i.test(lower);

    if (isRegulatoryQuery) {
      return await this.handleComplianceRegulatoryGuidance(user, correctedQuery, lower);
    }

    // ── Intent 9: Interactive Proposal Remediation & Determination Drafting ─
    const isDraftingOrRemediateQuery =
      /\b(remediate|rephrase|rewrite|draft|how to write|help me write|improve phrasing|disclaimer|determination note)\b/i.test(lower);

    if (isDraftingOrRemediateQuery) {
      return await this.handleComplianceDraftingAndRemediation(user, message, correctedQuery);
    }

    // ── Intent 10: Platform Workflow Guidance ───────────────────────────────
    const isWorkflowQuery =
      /\b(how do i upload|file limits?|file formats?|supported formats?|versioning|v1|v2|pii|masking|audit trail|how does review work)\b/i.test(lower);

    if (isWorkflowQuery) {
      return await this.handlePlatformWorkflowHelp(user, correctedQuery);
    }

    // ── Mode A fallback: role-scoped interactive conversational ─────────────
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
  // Intent 6 Handler: Officer Supervisory Queue Overview (Database)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleOfficerQueueOverviewIntent(
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const statusSql = `SELECT status, COUNT(*)::int as count FROM documents GROUP BY status`;
    const statusRes = await query<any>(statusSql, []);
    const counts: Record<string, number> = {};
    for (const r of statusRes.rows) counts[r.status] = r.count;

    const todaySql = `SELECT COUNT(*)::int as count FROM documents WHERE created_at::date = CURRENT_DATE`;
    const todayRes = await query<any>(todaySql, []);
    const todayCount = todayRes.rows[0]?.count || 0;

    const dbSummary = `Supervisory review queue summary:\n- Pending officer review: ${counts['Pending'] || 0}\n- Requiring revision: ${counts['Needs Revision'] || 0}\n- Approved: ${counts['Approved'] || 0}\n- Rejected: ${counts['Rejected'] || 0}\n- Uploaded today: ${todayCount}`;
    const fallback = `**Supervisory Review Queue Status:**\n- **${counts['Pending'] || 0}** pending officer determination\n- **${counts['Needs Revision'] || 0}** awaiting advisor revision\n- **${counts['Approved'] || 0}** approved filings\n- **${todayCount}** uploaded today\n\nWould you like me to inspect documents with compliance flags or filter by a specific advisor?`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, 'Officer', fallback);
    return { reply, intent: 'officer_queue_overview', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 7 Handler: Advisor Revision Feedback Notes (Database)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleAdvisorRevisionFeedbackIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    if (!user.id) {
      return {
        reply: "You'll need to log in to see officer feedback on your submissions.",
        intent: 'advisor_revision_feedback',
        correctedQuery,
      };
    }

    const sql = `
      SELECT d.id, d.title, d.version, d.status,
        COALESCE(
          (SELECT te.message FROM thread_entries te WHERE te.document_id = d.id ORDER BY te.created_at DESC LIMIT 1),
          'Officer requested revision: please address highlighted regulatory disclosures and submit Version 2 (v2).'
        ) AS officer_note
      FROM documents d
      WHERE d.advisor_id = $1 AND d.status = 'Needs Revision'
      ORDER BY d.created_at DESC LIMIT 3
    `;
    const res = await query<any>(sql, [user.id]);

    if (res.rows.length === 0) {
      return {
        reply: "Great news — you have zero submissions currently marked as 'Needs Revision'. All your active filings are either Approved or currently pending officer review.",
        intent: 'advisor_revision_feedback',
        correctedQuery,
      };
    }

    const feedbackList = res.rows.map((r) => `"${r.title}" (v${r.version}): Officer note: "${r.officer_note}"`).join('\n');
    const dbSummary = `Advisor filings needing revision:\n${feedbackList}\nInstruction: Advise the user to revise the document in their word processor and click 'Upload Revision' on the document review page to submit Version 2 (v2).`;
    const fallback = `Here are your submissions requiring revision with officer feedback:\n\n${res.rows.map((r: any) => `- **${r.title}** (v${r.version}): *"${r.officer_note}"*`).join('\n')}\n\nYou can click **Upload Revision** in the document review page to submit an updated version (v${(res.rows[0].version || 1) + 1}).`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, 'Advisor', fallback);
    return { reply, intent: 'advisor_revision_feedback', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 8 Handler: Interactive Compliance Regulatory Guidance
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleComplianceRegulatoryGuidance(
    user: ChatUserContext,
    correctedQuery: string,
    lower: string
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const systemPrompt = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;

    const prompt = `The user (${user.role}) is asking an institutional regulatory compliance question: "${correctedQuery}".
Explain clearly and concisely according to FINRA Rule 2210 (Communications with the Public), SEC Rule 206(4)-1 (Investment Adviser Marketing Rule), SEC Rule 204 (Substantiation), or FINRA Rule 2111 (Suitability).
${isOfficer ? 'Focus on supervisory review criteria, verifying required disclosures, and substantiating officer determination records.' : 'Focus on how the advisor must structure their proposal, avoid promissory/guaranteed claims, and include mandatory downside risk disclosures.'}
Structure the response with 2-3 concise paragraphs.`;

    const llmReply = await this.callLlm(prompt, systemPrompt);
    if (llmReply) {
      return { reply: llmReply, intent: 'compliance_regulatory_guidance', correctedQuery };
    }

    const fallback = isOfficer
      ? "Under FINRA Rule 2210 and SEC Rule 206(4)-1, compliance officers must verify that all proposals and marketing decks are fair, balanced, and substantiated. Any promissory returns or unhedged performance claims require a 'Needs Revision' determination with explicit corrective directives. Ensure clear disclosure of material risks, fee deductions, and fiduciary conflicts."
      : "Under FINRA Rule 2210 and SEC Rule 206, investment proposals must never guarantee returns, promise zero risk, or omit market downside warnings. Always include clear fiduciary disclosures stating that past performance does not guarantee future results and investments are subject to market volatility and loss of principal.";

    return { reply: fallback, intent: 'compliance_regulatory_guidance', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 9 Handler: Interactive Proposal Remediation & Determination Drafting
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleComplianceDraftingAndRemediation(
    user: ChatUserContext,
    rawText: string,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const systemPrompt = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;

    const prompt = isOfficer
      ? `The Compliance Officer needs assistance drafting or polishing a supervisory determination note / revision directive for a submission: "${rawText}".
Generate an audit-defensible compliance determination note structured with:
1. Determination Action (e.g. Revision Required / Approved with Disclosures)
2. Regulatory Reference (FINRA 2210 / SEC 206)
3. Factual Finding (identifying problematic passage or missing disclosure)
4. Prescribed Remediation (exact corrective wording for the advisor).`
      : `The Investment Advisor needs help remediating a draft proposal passage or client note into compliant text: "${rawText}".
Remediate the passage into compliant fiduciary language under FINRA Rule 2210 & SEC Rule 206(4)-1:
1. Remediated Compliant Text (removing promissory statements, adding statutory risk disclosures)
2. Summary of Compliance Adjustments Made.`;

    const llmReply = await this.callLlm(prompt, systemPrompt);
    if (llmReply) {
      return { reply: llmReply, intent: 'compliance_drafting_remediation', correctedQuery };
    }

    const fallback = isOfficer
      ? "### Supervisory Determination Directive\n\n**Action**: Revision Required\n**Regulatory Authority**: FINRA Rule 2210(d)(1) & SEC Rule 206(4)-1\n**Factual Finding**: Proposal contains promissory return projections without balanced risk factors.\n**Required Remediation**: Remove absolute performance claims and append statutory disclosure: 'Past performance does not guarantee future results. Investments are subject to market risk and loss of principal.'"
      : "### Remediated Fiduciary Language\n\n**Compliant Text**:\n\"Our strategy aims to achieve competitive capital growth through disciplined asset allocation, subject to market fluctuations and potential loss of principal.\"\n\n**Compliance Adjustments**:\n- Replaced promissory claims with objective investment objectives.\n- Appended mandatory FINRA 2210 risk disclosures.";

    return { reply: fallback, intent: 'compliance_drafting_remediation', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 10 Handler: Platform Workflow Guidance
  // ─────────────────────────────────────────────────────────────────────────
  private static async handlePlatformWorkflowHelp(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const systemPrompt = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;

    const prompt = `The user (${user.role}) is asking about Springer Capital platform workflow: "${correctedQuery}".
Explain the relevant workflow (file upload limits: PDF/DOCX/XLSX/TXT up to 25MB, automated PII sanitization gateway, multi-version lineage v1->v2, Review Queue, or Officer Determinations).
Tailor the answer specifically to their role as ${user.role}. Keep it structured and concise.`;

    const llmReply = await this.callLlm(prompt, systemPrompt);
    if (llmReply) {
      return { reply: llmReply, intent: 'platform_workflow_help', correctedQuery };
    }

    const fallback = isOfficer
      ? "Springer Capital Review Workflow for Officers:\n1. Access the Review Queue to inspect pending proposals from advisors.\n2. Review automated risk flags, extracted text, and PII masking.\n3. Record your determination (Approve, Request Revision, or Reject) with mandatory compliance rationale.\n4. When a revision is requested, the advisor submits Version 2 (v2), preserving full audit lineage."
      : "Springer Capital Submission Workflow for Advisors:\n1. Click '+ Submit Proposal Document' on your dashboard.\n2. Upload PDF, DOCX, XLSX, or TXT files up to 25MB.\n3. The platform automatically masks PII (SSN, emails) before compliance evaluation.\n4. If an officer requests revisions, open the filing and click 'Upload Revision' to submit Version 2 (v2).";

    return { reply: fallback, intent: 'platform_workflow_help', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mode A — Role-Scoped Interactive Conversational Fallback
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleFreeConversation(
    correctedQuery: string,
    user: ChatUserContext,
    pathname?: string
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const systemPrompt = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;
    const enrichedSystemPrompt = `${systemPrompt}\n\nContext: Current page: ${pathname || 'Dashboard'}.`;

    const llmReply = await this.callLlm(correctedQuery, enrichedSystemPrompt);
    if (llmReply) {
      return { reply: llmReply, intent: 'compliance_interactive_guidance', correctedQuery };
    }

    // Static fallback when both LLMs are unavailable
    const fallbackReply = isOfficer
      ? "I'm monitoring the supervisory review queue. You can ask me to check pending filings, review uploader identities, evaluate document risk scores under FINRA 2210 & SEC 206, or draft determination directives."
      : "I'm here to assist with your proposal submissions. You can ask me about your pending filings, check officer feedback on revisions, or ask how to remediate proposals to meet FINRA 2210 & SEC 206 rules.";

    return { reply: fallbackReply, intent: 'compliance_interactive_guidance', correctedQuery };
  }
}
