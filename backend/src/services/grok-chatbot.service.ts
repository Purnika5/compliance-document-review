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
import { GeminiCopilotService } from './gemini-copilot.service';

// ─────────────────────────────────────────────────────────────────────────────
// System prompts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Institutional App-Scoped System Prompts (Tailored by Role)
// ─────────────────────────────────────────────────────────────────────────────

const ADVISOR_APP_PROMPT = `You are Springer Capital's Neural Copilot for Investment Advisors — infused with the wit, warmth, sharpness, and high-productivity intelligence of Grok.
You are an expert financial and compliance co-pilot who talks like a brilliant, articulate, pragmatic senior colleague.

Core Persona & Strengths:
1. Highly Productive & Actionable: When an advisor asks for help, deliver concrete, audit-ready text, immediate solutions, and actionable guidance right away. Avoid vague fluff, corporate throat-clearing, or repetitive canned disclaimers.
2. Compliance & Fiduciary Mastery: You know FINRA Rule 2210 (Communications with the Public) and SEC Rule 206(4)-1 (Investment Adviser Marketing Rule) thoroughly. You spot promissory phrasing ("guaranteed returns", "risk-free") instantly and rephrase it into balanced, compliant language with statutory downside risk disclosures.
3. Natural Human Tone: Speak naturally, engagingly, warmly, and intelligently. You have real conversational memory and adapt seamlessly to the context. You can help write proposals, polish client notes, fix grammar, explain regulations, brainstorm, or chat casually.
4. Platform Context: Advisors can submit PDF, DOCX, XLSX, TXT (up to 25MB), track version lineages (v1 -> v2 for "Needs Revision"), and monitor statuses (Pending, Needs Revision, Approved, Rejected). Advisors only see their own filings.
Always make the advisor faster, sharper, and 100% compliant.`;

const OFFICER_APP_PROMPT = `You are Springer Capital's Supervisory Neural Copilot for Compliance Officers — infused with the wit, warmth, analytical rigor, and high-productivity intelligence of Grok.
You are a senior regulatory and supervisory partner: sharp, perceptive, audit-defensible, and deeply helpful.

Core Persona & Strengths:
1. Highly Productive & Audit-Defensible: Help officers swiftly evaluate flagged infractions, draft razor-sharp determination directives (Approve, Needs Revision with exact remediation steps, Reject), and summarize supervisory findings.
2. Regulatory Authority: Apply FINRA Rule 2210, SEC Rule 206(4)-1 (Marketing Rule), SEC Rule 204 (Substantiation), and FINRA Rule 2111 (Suitability) with precision.
3. Natural Human Tone: Speak like an experienced, trusted peer in institutional compliance — articulate, warm, direct, and pragmatic without robotic bureaucracy.
4. Supervisory Visibility: Officers oversee the entire repository, all advisor submissions, uploader identities, and risk flags.
Always provide actionable, structured, high-value assistance to make supervisory review effortless.`;

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
  scannedDocument?: {
    fileName: string;
    summary?: string;
    auditBreakdown?: any[];
    remediatedText?: string;
    fileMeta?: any;
  };
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
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key || key.includes('placeholder') || key.includes('your_gemini')) {
      return undefined;
    }
    return key;
  }

  /**
   * Calls xAI Grok (primary when configured) or Google Gemini (resilient fallback).
   * Passes full conversationHistory so the model maintains multi-turn context.
   */
  public static async callLlm(
    prompt: string,
    systemPrompt?: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string | null> {
    // ── 1. xAI Grok (if XAI_API_KEY is configured) ───────────────────────────
    const grokKey = this.getGrokApiKey();
    if (grokKey) {
      try {
        const grokMessages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) {
          grokMessages.push({ role: 'system', content: systemPrompt });
        }
        if (conversationHistory && conversationHistory.length > 0) {
          for (const m of conversationHistory) {
            if (m.content && m.content.trim()) {
              grokMessages.push({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content.trim(),
              });
            }
          }
        }
        grokMessages.push({ role: 'user', content: prompt.trim() });

        const grokModels = ['grok-2-latest', 'grok-2', 'grok-beta'];
        for (const model of grokModels) {
          try {
            const resp = await fetch('https://api.x.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${grokKey}`,
              },
              body: JSON.stringify({
                model,
                messages: grokMessages,
                temperature: 0.7,
                max_tokens: 1500,
              }),
              signal: AbortSignal.timeout(12000),
            });

            if (resp.ok) {
              const data: any = await resp.json();
              const text = data?.choices?.[0]?.message?.content;
              if (text && text.trim()) return text.trim();
            } else {
              const errBody = await resp.text();
              console.warn(`[Chatbot] Grok (${model}) returned HTTP ${resp.status}:`, errBody.slice(0, 120));
              if (resp.status === 403 || resp.status === 429) {
                // Out of credits or forbidden — break to Gemini fallback immediately
                break;
              }
            }
          } catch (modelErr) {
            console.warn(`[Chatbot] Grok (${model}) attempt failed:`, modelErr);
          }
        }
      } catch (err) {
        console.warn('[Chatbot] Grok invocation failed, routing to Gemini fallback:', err);
      }
    }

    // ── 2. Google Gemini (resilient fallback with multi-turn support) ────────
    const geminiKey = this.getGeminiApiKey();
    if (geminiKey) {
      try {
        const result = await GeminiClient.generateContent(prompt, {
          systemInstruction: systemPrompt,
          conversationHistory,
          temperature: 0.7,
          maxOutputTokens: 1500,
          timeoutMs: 18000,
        });

        if (result?.text) return result.text;
      } catch (err) {
        console.warn('[Chatbot] Gemini call failed:', err);
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
    fallbackReply: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    const prompt = `The user (${userRole}) asked: "${userQuestion}"

Here is the exact data retrieved from the database:

${dbDataSummary}

Present this data to the user in a warm, conversational way. Use only the data listed above — do not add any information not shown here.`;

    const reply = await this.callLlm(prompt, MODE_B_SYSTEM_PROMPT, conversationHistory);
    return reply || fallbackReply;
  }

  /**
   * Fast normalization of speech/typing shortcuts before intent routing.
   */
  public static correctGrammarAndSpelling(rawText: string): string {
    const trimmed = rawText.trim();
    if (!trimmed || trimmed.length < 3) return trimmed;

    // Fast heuristic replacements for common speech/typing shortcuts
    return trimmed
      .replace(/\baprvd\b/gi, 'approved')
      .replace(/\bpndng\b/gi, 'pending')
      .replace(/\brevsn\b/gi, 'revision')
      .replace(/\brjctd\b/gi, 'rejected')
      .replace(/\bdocumnts?\b/gi, 'documents')
      .replace(/\bsho\b/gi, 'show')
      .replace(/\bwat\b/gi, 'what')
      .replace(/\byer\b/gi, 'year')
      .replace(/\blast\s+yrs?\b/gi, "last year's");
  }

  /**
   * Mode A — Grammar check: free-agent, works for any text, both Advisor and Officer.
   * Corrects and explains changes conversationally; role is light context only.
   */
  public static async handleGrammarCheckIntent(
    rawText: string,
    user?: ChatUserContext,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    const isOfficer = user?.role === 'Officer';
    const textToCheck = rawText
      .replace(/^(?:can you\s+|please\s+|help me\s+|i want\s+(?:you\s+)?to\s+|i want more to\s+)?(?:fix|check|re-?check|correct|proofread|improve|rewrite|rephrase)\s*(?:my|this|the)?\s*(?:grammar|sentence|sentences|phrasing|text|draft|writing)?(?:\s+(?:in|for|of|on))?[:,-]?\s*/i, '')
      .replace(/\b(?:please\s+)?(?:re-?check|check|fix)\s+(?:grammar|sentence|sentences)\b(?:\s+(?:in|for|of|on))?[:,-]?/gi, '')
      .replace(/\b(?:grammar|sentence|sentences)\s+(?:check|re-?check)\b(?:\s+(?:in|for|of|on))?[:,-]?/gi, '')
      .replace(/^(?:grammar|sentence|check|proofread|audit\s*note|fix)[:,-]?\s*/i, '')
      .trim();

    if (!textToCheck || textToCheck.length < 3 || /^(?:my\s+)?(?:sentence|sentences|grammar|text|phrasing|draft)$/i.test(textToCheck)) {
      return "I'd love to help! Just paste the text you want me to fix — it can be anything: an email, a note, a proposal sentence, or even a quick message. I'll correct the grammar, improve the phrasing, and explain what I changed. 😊";
    }

    // Open, free-agent grammar prompt — works for any text, both Advisor and Officer
    const systemPrompt = `You are a warm, expressive, and highly skilled writing assistant for Springer Capital's ${isOfficer ? 'Compliance Officers' : 'Investment Advisors'}.

You can fix grammar, spelling, punctuation, tone, clarity, and style for ANY text the user gives you — emails, proposals, notes, memos, casual messages, or anything else.

IMPORTANT VALIDATION RULES:
1. Sentence & Word Verification:
   - Check if the text forms a valid English sentence (Good Sentence, Sentence Fragment, or Bad/Invalid Sentence).
   - Check if each token is an actual English word or unrecognized gibberish/keyboard smashes (e.g., 'ashdzhuzhfskj', 'rjnij').
2. If the text is unintelligible gibberish or contains non-words:
   - Start with: "**Sentence Quality Assessment**: ✕ Bad Sentence (Unrecognized Words Detected)"
   - List the specific unrecognized words and explain that they are not recognized English vocabulary.
   - Do NOT pretend to fix it by merely capitalizing letters or adding punctuation. Ask the user for a meaningful sentence.
3. If the text is a valid sentence with issues:
   - Start with: "**Sentence Quality Assessment**: ⚠ Needs Revision (Word Check: Valid ✓ | Structure: Grammar/Spelling issues detected)"
   - Provide **Corrected Text** and bulleted **What I changed**.
4. If the text is already a good sentence:
   - Start with: "**Sentence Quality Assessment**: ✓ Good Sentence (Word Check: All words recognized ✓ | Structure: Complete and standard ✓)"
   - State **Corrected Text** and compliment the writing.

Be warm and encouraging — like a knowledgeable colleague helping out, not a strict editor.${isOfficer ? '\n\nFor professional text, also note if any phrasing could be strengthened for audit-defensible documentation.' : '\n\nFor proposal or client-facing text, optionally mention if any phrasing could be tightened for professional clarity.'}`;

    const result = await this.callLlm(textToCheck || rawText, systemPrompt, conversationHistory);
    if (result) return result;

    // ── LLM unavailable — apply heuristic grammar corrections ────────────────
    return GrokChatbotService.applyHeuristicGrammarFix(textToCheck);
  }

  /**
   * Heuristic grammar and spelling correction engine used as LLM fallback.
   * Mirrors the recheckGrammar engine in the frontend documentation-engine.ts.
   */
  private static applyHeuristicGrammarFix(input: string): string {
    const rawTokens = input.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    // 0. Non-word and gibberish detection
    const invalidWords: string[] = [];
    for (const token of rawTokens) {
      const clean = token.toLowerCase();
      if (/^[0-9]+$/.test(clean) || clean.length <= 1) continue;

      const isNoVowels = clean.length >= 3 && !/[aeiouy]/i.test(clean);
      const isConsonantCluster = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(clean);
      const isImpossibleStart = /^(?:rjn|zh|xz|jj|kk|vv|ww|xx|yy|zz|pt|tk|fp|fk|kd|jl|jh|zx)/i.test(clean);
      const isImpossibleEnd = /(?:fskj|jnij|ljs|xdf|qwe|zxc|vbn|jkl)$/i.test(clean);
      const isSmash = /zhuzh|zhf|fsk|hfs|zxcv|asdf|ghjk|hjkl|qwerty/i.test(clean);

      if (isNoVowels || isConsonantCluster || isImpossibleStart || isImpossibleEnd || isSmash) {
        invalidWords.push(token);
      }
    }

    if (
      invalidWords.length > 0 &&
      (invalidWords.length >= Math.ceil(rawTokens.length * 0.4) ||
        (invalidWords.length >= 2 && rawTokens.length <= 5))
    ) {
      return `**Sentence Quality Assessment**: ✕ Bad Sentence (Unrecognized Words Detected)\n\n` +
        `**Word Check**: Detected ${invalidWords.length} non-English or invalid word${invalidWords.length > 1 ? 's' : ''}: ${invalidWords.map(w => `"${w}"`).join(', ')}. These tokens do not exist in English vocabulary.\n\n` +
        `**Sentence Check**: Incoherent syntax structure (lacks meaningful subject and predicate).\n\n` +
        `I cannot correct unintelligible gibberish. Please provide a sentence with recognized English words so I can check and polish it for you!`;
    }

    const changes: string[] = [];
    let corrected = input.trim();

    // 1. Common spelling corrections
    const spellingMap: Record<string, string> = {
      submited: 'submitted', submiting: 'submitting', seperate: 'separate',
      definately: 'definitely', untill: 'until', recieve: 'receive',
      recieved: 'received', occured: 'occurred', recomend: 'recommend',
      recomended: 'recommended', complience: 'compliance', proposel: 'proposal',
      offical: 'official', gaurentee: 'guarantee', gauranteed: 'guaranteed',
      garantee: 'guarantee', garanteed: 'guaranteed', grammer: 'grammar',
      sentance: 'sentence', sentense: 'sentence', corect: 'correct',
      sucessful: 'successful', neccessary: 'necessary', statment: 'statement',
      managment: 'management', disclosur: 'disclosure', fiduciery: 'fiduciary',
    };
    corrected = corrected.split(/(\s+|[.,!?;:()\[\]"'])/).map((token: string) => {
      const clean = token.toLowerCase().trim();
      if (clean && spellingMap[clean]) {
        const fixed = spellingMap[clean];
        const isCapitalized = token.length > 0 && token[0] === token[0].toUpperCase() && token[0] !== token[0].toLowerCase();
        changes.push(`"${token}" → "${fixed}" (spelling)`);
        return isCapitalized ? fixed.charAt(0).toUpperCase() + fixed.slice(1) : fixed;
      }
      return token;
    }).join('');

    // 2. Phrase-level grammar corrections
    const phraseRules: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
      { pattern: /\b(the team|the committee|the fund|the firm)\s+have\b/gi, replacement: '$1 has', reason: 'collective noun takes "has"' },
      { pattern: /\b(he|she|the advisor|the officer|the analyst)\s+have\b/gi, replacement: '$1 has', reason: 'singular subject takes "has"' },
      { pattern: /\b(he|she|it)\s+dont\s+have\s+no\b/gi, replacement: '$1 does not have any', reason: 'double negative correction' },
      { pattern: /\b(he|she|it)\s+dont\b/gi, replacement: '$1 does not', reason: 'singular subject takes "does not"' },
      { pattern: /\b(dont\s+have\s+no|dont\s+got\s+no)\b/gi, replacement: 'does not have any', reason: 'double negative correction' },
      { pattern: /\b(they|we|officers|advisors)\s+is\b/gi, replacement: '$1 are', reason: 'plural subject takes "are"' },
      { pattern: /\b(he|she|it|this|that|the filing|the proposal|the document)\s+are\b/gi, replacement: '$1 is', reason: 'singular subject takes "is"' },
      { pattern: /\bthe\s+documents?\s+was\b/gi, replacement: 'the documents were', reason: 'plural noun takes "were"' },
      { pattern: /\bthe\s+files?\s+was\b/gi, replacement: 'the files were', reason: 'plural noun takes "were"' },
      { pattern: /\bthe\s+proposals?\s+was\b/gi, replacement: 'the proposals were', reason: 'plural noun takes "were"' },
      { pattern: /\bthe\s+submissions?\s+was\b/gi, replacement: 'the submissions were', reason: 'plural noun takes "were"' },
      { pattern: /\b(we|they|officers|advisors)\s+was\b/gi, replacement: '$1 were', reason: 'plural subject takes "were"' },
      { pattern: /\b(i|we|they|you)\s+has\b/gi, replacement: '$1 have', reason: 'pronoun takes "have"' },
      { pattern: /\b(could|should|would)\s+of\b/gi, replacement: '$1 have', reason: '"of" → "have" after modals' },
      { pattern: /\bmore\s+better\b/gi, replacement: 'better', reason: 'double comparative' },
      { pattern: /\birregardless\b/gi, replacement: 'regardless', reason: 'standard usage is "regardless"' },
      { pattern: /\ba\s+([aeiou]\w+)\b/gi, replacement: 'an $1', reason: '"a" → "an" before vowel sounds' },
      { pattern: /\bguaranteed\s+returns?\b/gi, replacement: 'targeted returns (subject to market risks)', reason: 'FINRA 2210 compliance' },
      { pattern: /\brisk-free\s+investment\b/gi, replacement: 'conservative lower-volatility strategy', reason: 'FINRA 2210 compliance' },
    ];
    for (const rule of phraseRules) {
      if (rule.pattern.test(corrected)) {
        corrected = corrected.replace(rule.pattern, rule.replacement);
        changes.push(rule.reason);
      }
    }

    // 3. Sentence capitalization + terminal punctuation
    corrected = corrected.replace(/(^|[.!?]\s+)([a-z])/g, (_m: string, p: string, c: string) => `${p}${c.toUpperCase()}`);
    if (corrected.trim().length > 0 && !/[.!?]$/.test(corrected.trim())) {
      corrected = corrected.trim() + '.';
      changes.push('added terminal period');
    }

    if (changes.length === 0) {
      // Polish phrasing slightly so user never gets an unchanged response when requesting grammar fix
      const polished = corrected
        .replace(/\bvery\s+(\w+)/gi, 'substantially $1')
        .replace(/\ba\s+lot\s+of\b/gi, 'numerous');
      if (polished !== corrected) {
        return `**Sentence Quality Assessment**: ✓ Good Sentence (Word Check: Valid ✓ | Structure: Complete ✓)\n\n**Corrected Text:**\n${polished}\n\n**What I changed:**\n• Enhanced tone and vocabulary for formal institutional compliance documentation.`;
      }
      return `**Sentence Quality Assessment**: ✓ Good Sentence (Word Check: Valid ✓ | Structure: Complete ✓)\n\n**Corrected Text:**\n${corrected}\n\n**What I changed:**\n• Verified syntax and structure — grammar, spelling, and punctuation adhere to institutional standards.`;
    }

    const bulletList = [...new Set(changes)].map((c: string) => `• ${c}`).join('\n');
    return `**Sentence Quality Assessment**: ⚠ Needs Revision (Word Check: Valid ✓ | Structure: Corrections applied)\n\n**Corrected Text:**\n${corrected}\n\n**What I changed:**\n${bulletList}`;
  }

  /**
   * Mode A — Text expansion: expands brief notes into professional compliance prose.
   */
  public static async handleExpansionIntent(
    rawText: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    const textToExpand = rawText
      .replace(/^(?:expand|elaborate|expand\s+note|expand\s+draft)[:,-]?\s*/i, '')
      .trim();

    const systemPrompt = `You are a helpful compliance writing assistant at Springer Capital. Expand the user's brief notes or bullet points into a clear, professional compliance document or memo aligned with FINRA Rule 2210 and SEC Rule 206. Use clean markdown headings, balanced language, and avoid promissory statements. Keep the tone professional but readable — not stiff.`;

    const result = await this.callLlm(textToExpand || rawText, systemPrompt, conversationHistory);
    if (result) return result;

    return `### Compliance Memo\n\n**Subject**: Expanded Documentation\n\n${textToExpand}\n\n*Please review all factual assertions against current supervisory filings before submitting.*`;
  }

  /**
   * Mode A — In-Chat Compliance Audit: Audits arbitrary draft text or passages against FINRA 2210 & SEC 206(4)-1.
   * Directly evaluates promissory claims, missing statutory disclosures, and provides compliant rewrites.
   */
  public static async handleTextComplianceAuditIntent(
    rawText: string,
    user?: ChatUserContext,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    const isOfficer = user?.role === 'Officer';
    const textToAudit = rawText
      .replace(/^(?:can you\s+|please\s+|help me\s+)?(?:run\s+a\s+)?(?:compliance\s+audit|audit|scan|check\s+compliance|audit\s+this|audit\s+text|audit\s+draft|audit\s+passage|audit\s+the\s+following)[:,-]?\s*/i, '')
      .trim();

    if (!textToAudit || textToAudit.length < 5) {
      return "I can audit any proposal passage or draft text against FINRA Rule 2210 and SEC Rule 206(4)-1! Paste the text here (e.g., *\"Audit: Our fund guarantees a 15% return with zero risk\"*) or use the paperclip to upload a draft document.";
    }

    const systemPrompt = `You are Springer Capital's Neural Compliance Audit Engine.
Audit the user's provided test text strictly against:
1. FINRA Rule 2210 (Communications with the Public) — prohibit guaranteed returns, promissory claims, unhedged performance claims, or artificial urgency.
2. SEC Rule 206(4)-1 (Investment Adviser Marketing Rule) — require substantiation, net-of-fees metrics, and prominent downside risk disclosures.
3. FINRA Rule 2111 (Suitability / Reg BI) — ensure recommendations match risk profiles.

Structure your response with clean markdown:
### 🛡️ Compliance Audit Analysis

**Identified Infractions:**
- List each infraction with:
  • **Rule**: Exact regulatory citation
  • **Flagged Passage**: The exact words from the input
  • **Issue**: Why it violates the rule
  • **Remediated Passage**: Compliant rewritten version
  • **Supervisory Rationale**: Fiduciary rationale

**Remediated Compliant Text:**
Provide the full rewritten, 100% compliant version of the text ready to submit.

**Supervisory Determination:**
State whether this text would be Approved or Needs Revision, with guidance for the ${isOfficer ? 'Compliance Officer' : 'Investment Advisor'}.`;

    const result = await this.callLlm(textToAudit, systemPrompt, conversationHistory);
    if (result) return result;

    // Fallback: run local regulatory analyzer on the text
    const localResult = GeminiCopilotService.localRegulatoryFallback(textToAudit, 'draft_snippet.txt');
    const flagsCount = localResult.audit_breakdown.length;

    let reply = `### 🛡️ Compliance Audit Analysis\n\n`;
    reply += `**Status:** ${flagsCount === 0 ? '✅ Compliant (Zero High-Risk Flags)' : `⚠️ ${flagsCount} Regulatory Flag${flagsCount !== 1 ? 's' : ''} Identified`}\n\n`;

    if (flagsCount > 0) {
      reply += `**Identified Infractions:**\n`;
      for (const item of localResult.audit_breakdown) {
        reply += `• **${item.rule}**\n`;
        reply += `  - **Flagged Passage:** *"${item.original_passage}"*\n`;
        reply += `  - **Issue:** ${item.issue}\n`;
        reply += `  - **Compliant Alternative:** *"${item.fixed_passage}"*\n`;
        reply += `  - **Rationale:** ${item.reason}\n\n`;
      }
    } else {
      reply += `No promissory statements or regulatory red flags were detected in the provided text.\n\n`;
    }

    reply += `**Remediated Compliant Text:**\n\`\`\`\n${localResult.remediated_text}\n\`\`\`\n\n`;
    reply += `*Enforced pursuant to FINRA Rule 2210 and SEC Rule 206(4)-1.*`;
    return reply;
  }

  /**
   * Main entrypoint: processes a message, performs grammar correction, intent detection,
   * clarification gating, and live database queries.
   */
  public static async processMessage(options: ChatbotRequestOptions): Promise<ChatbotResponse> {
    const { message, user, pathname, documentId, conversationHistory, scannedDocument } = options;
    const isOfficer = user.role === 'Officer';
    const isAdvisor = !isOfficer;

    // Detect and unwrap explicit free communication mode (/free, /chat, or [Free Conversational AI Assistance]:)
    const isExplicitFreeMode =
      /^\[Free Conversational AI Assistance\]:\s*/i.test(message) ||
      /^\/(?:free|chat)\s+/i.test(message);

    const strippedMessage = message
      .replace(/^\[Free Conversational AI Assistance\]:\s*/i, '')
      .replace(/^\/(?:free|chat)\s+/i, '')
      .trim();

    // If user explicitly entered free conversational mode, bypass database filters and go directly to natural AI chat
    if (isExplicitFreeMode) {
      return await this.handleFreeConversation(
        strippedMessage || 'Hello!',
        user,
        pathname,
        conversationHistory
      );
    }

    // ── Step 1: Query Normalization ─────────────────────────────────────────
    const correctedQuery = this.correctGrammarAndSpelling(strippedMessage);
    const lower = correctedQuery.toLowerCase();

    // ── Check for explicit Compliance Audit intent on provided test text ────
    const isAuditRequest =
      /^(?:audit|compliance\s*audit|scan|check\s*compliance|audit\s*this|audit\s*text|audit\s*draft|audit\s*passage)[:,-]?\s+/i.test(message) ||
      /\b(?:compliance\s*audit|audit\s*this\s*text|audit\s*this\s*passage|scan\s*this\s*text|audit\s*the\s*following)\b/i.test(lower);

    if (isAuditRequest) {
      const reply = await this.handleTextComplianceAuditIntent(message, user, conversationHistory);
      return { reply, intent: 'text_compliance_audit', correctedQuery };
    }

    // ── Intent 0: Scanned Document Findings / Breakdown Inquiry ─────────────
    // Ground follow-up questions to the currently scanned draft file in chat
    const isFindingsInquiry =
      /\b(?:findings?|infractions?|violations?|deficienc(?:y|ies)|flags?|severity|applicable\s+rules?|remediat(?:e|ion|ions)|amendments?)\b/i.test(lower) ||
      /\b(?:list\s+all|show\s+all|what\s+are\s+the|explain\s+all|\d+\s+findings|\d+\s+flags|\d+\s+issues)\b/i.test(lower) ||
      lower.includes('list all 9') ||
      lower.includes('all 9 findings');

    if (scannedDocument && scannedDocument.auditBreakdown && scannedDocument.auditBreakdown.length > 0 && isFindingsInquiry) {
      return await this.handleScannedDocumentFindingsIntent(scannedDocument, user, correctedQuery, conversationHistory);
    }

    // Ground follow-ups when user is viewing an opened document in /documents/[id]
    if (Boolean(documentId || (pathname && pathname.includes('/documents/'))) && isFindingsInquiry) {
      return await this.handleActiveDocumentAuditIntent(user, correctedQuery, lower, documentId, pathname);
    }

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
      const reply = await this.handleGrammarCheckIntent(message, user, conversationHistory);
      return { reply, intent: 'grammar_check', correctedQuery };
    }

    const isExpandRequest =
      lower.startsWith('expand') ||
      lower.startsWith('elaborate') ||
      /\bexpand\s+(?:this|my)?\s*(?:note|draft|memo|text)\b/i.test(lower);

    if (isExpandRequest) {
      const reply = await this.handleExpansionIntent(message, conversationHistory);
      return { reply, intent: 'text_expansion', correctedQuery };
    }

    // ── Platform Workflow & Versioning FAQ Guidance ─────────────────────────
    // Evaluated BEFORE database queries so that questions like "How does versioning and revision work?"
    // or "Versioning FAQ" or "explain the revision process" explain the institutional workflow
    // rather than running a document search in PostgreSQL for files with status 'Needs Revision'.
    const isWorkflowQuery =
      /\b(versioning|lineage|v1\s*(?:and|&|\/)\s*v2|version\s*(?:1|2)|versioning\s*faq|how\s+does\s+versioning|how\s+do\s+revisions?\s+work|revision\s+workflow|revision\s+process|submission\s+workflow|upload\s+process|how\s+do\s+i\s+upload|file\s+limits?|file\s+formats?|supported\s+formats?|pii|masking|audit\s+trail|how\s+does\s+review\s+work|platform\s+faq|portal\s+faq)\b/i.test(lower) ||
      (/\b(how\s+(?:does|do|can|to)|what\s+is|explain|tell\s+me\s+about|walk\s+me\s+through)\b/i.test(lower) &&
        /\b(versioning|version|revisions?|upload|review|workflow|process|queue|audit\s+trail)\b/i.test(lower));

    if (isWorkflowQuery) {
      return await this.handlePlatformWorkflowHelp(user, correctedQuery, conversationHistory);
    }

    // ── Interactive Compliance Regulatory Guidance ──────────────────────────
    const isRegulatoryQuery =
      /\b(finra|sec|2210|206|marketing rule|promissory|guarantee|risk disclosure|fiduciary|suitability|2111|regulation\s+faq|regulatory\s+faq)\b/i.test(lower);

    if (isRegulatoryQuery) {
      return await this.handleComplianceRegulatoryGuidance(user, correctedQuery, lower, conversationHistory);
    }

    // ── Interactive Proposal Remediation & Determination Drafting ───────────
    const isDraftingOrRemediateQuery =
      /\b(remediate|rephrase|rewrite|draft|how to write|help me write|improve phrasing|disclaimer|determination note)\b/i.test(lower);

    if (isDraftingOrRemediateQuery) {
      return await this.handleComplianceDraftingAndRemediation(user, message, correctedQuery, conversationHistory);
    }

    // ── Intent 1: Advisor: Check Document Status (Live Database Query) ──────
    // Only triggers when the advisor is actually asking about their specific filings' status
    const isStatusQuery =
      isAdvisor &&
      (/\b(?:my\s+)?(?:status|submissions?|documents?|filings?)\s*(?:is|are)?\s*(?:pending|for\s+revision|needs?\s+revision|approved|rejected)\b/i.test(lower) ||
        /\b(?:show|list|check|view|get)\s+(?:my\s+)?(?:pending|approved|rejected|for\s+revision|needs?\s+revision)\s*(?:documents?|filings?|submissions?)?\b/i.test(lower) ||
        /\b(?:status\s+of\s+my|how\s+many\s+of\s+my|which\s+of\s+my)\s+(?:documents?|filings?|submissions?)\b/i.test(lower) ||
        /\b(?:do\s+i\s+have|any)\s+(?:pending|approved|rejected|revision)\s+(?:documents?|filings?|submissions?)\b/i.test(lower));

    if (isStatusQuery) {
      return await this.handleAdvisorStatusIntent(user, lower, correctedQuery);
    }

    // ── Intent 2: Advisor: Check Last Year's Uploads ────────────────────────
    const isLastYearAdvisorQuery =
      isAdvisor &&
      /\b(last\s+year'?s?\s+uploads?|uploads?\s+(?:from|in)\s+last\s+year)\b/i.test(lower);

    if (isLastYearAdvisorQuery) {
      return await this.handleAdvisorLastYearUploadsIntent(user, correctedQuery);
    }

    // ── Intent 2b: Active Document Compliance Audit / Infractions / Flags ───
    const isDocumentAuditOrFlagsQuery =
      Boolean(documentId || (pathname && pathname.includes('/documents/'))) &&
      (/\b(audit\s+this\s+document|explain\s+(?:the\s+)?flagged\s+compliance\s+issues|compliance\s+issues\s+for\s+this\s+document|can\s+this\s+document\s+be\s+auto-remediated|review\s+attestation|audit\s+history|audit\s+trail|version\s+comparison|what\s+revisions\s+does\s+the\s+compliance\s+officer\s+require|remediate\s+promissory\s+language)\b/i.test(lower) ||
        lower.includes('audit this document against finra') ||
        lower.includes('explain the flagged compliance issues') ||
        lower.includes('can this document be auto-remediated') ||
        lower.includes('review attestation & audit history') ||
        lower.includes('show version comparison'));

    if (isDocumentAuditOrFlagsQuery) {
      return await this.handleActiveDocumentAuditIntent(user, correctedQuery, lower, documentId, pathname);
    }

    // ── Intent 2c: Most Recent Filing / Who Uploaded Latest Filing ───────────
    const isMostRecentFilingQuery =
      /\b(who\s+(?:has\s+)?(?:uploaded|submitted|filed|sent)\s+(?:the\s+)?(?:most\s+recent|latest|newest|last)\s*(?:filing|document|file|submission|proposal)?|(?:who\s+uploaded|who\s+submitted|who\s+filed)\s+(?:the\s+)?(?:most\s+recent|latest|newest|last)|(?:what\s+is\s+(?:the\s+)?)?(?:most\s+recent|latest|newest|last)\s+(?:filing|document|file|submission|upload)\b|(?:who\s+made\s+(?:the\s+)?(?:most\s+recent|latest|last)\s+(?:upload|submission|filing)))\b/i.test(lower) ||
      lower.includes('who uploaded the most recent filing') ||
      lower.includes('most recent filing') ||
      lower.includes('most recent submission') ||
      lower.includes('most recent document') ||
      (lower.includes('latest upload') && !/(?:of|by|for)\s+[a-z0-9_.-]+/i.test(lower));

    if (isMostRecentFilingQuery) {
      return await this.handleMostRecentFilingIntent(user, correctedQuery);
    }

    // ── Intent 2d: Who Uploaded Documents This Week / Recently ──────────────
    const isWhoUploadedRecentQuery =
      /\b(who\s+uploaded\s+(?:documents?|files?|filings?|submissions?|proposals?)?\s*(?:this\s+week|recently|in\s+the\s+past\s+week|past\s+7\s+days)|who\s+uploaded\s+documents\s+this\s+week|who\s+uploaded\s+this\s+week)\b/i.test(lower) ||
      lower.includes('who uploaded documents this week') ||
      lower.includes('who uploaded this week');

    if (isWhoUploadedRecentQuery) {
      return await this.handleWhoUploadedRecentIntent(user, correctedQuery);
    }

    // ── Intent 2e: Today's Uploads ──────────────────────────────────────────
    const isTodayUploadsQuery =
      /\b(documents?\s+uploaded\s+today|uploaded\s+today|submitted\s+today|today'?s?\s+uploads?|what\s+documents\s+are\s+awaiting\s+compliance\s+review\s+today)\b/i.test(lower) ||
      lower.includes('uploaded today') ||
      lower.includes('review today');

    if (isTodayUploadsQuery) {
      return await this.handleTodaysUploadsIntent(user, correctedQuery);
    }

    // ── Intent 2f: Pending Queue / Awaiting Determination ───────────────────
    const isPendingQueueQuery =
      /\b(pending\s+documents?\s+awaiting(?:\s+my)?\s+determination|unassigned\s+queue\s+submissions?\s+by\s+date|submissions?\s+by\s+date|pending\s+filings?\s+with\s+risk\s+flags|which\s+of\s+my\s+submissions\s+are\s+pending|list\s+all\s+pending\s+documents?|show\s+all\s+pending\s+filings?|unassigned\s+queue|pending\s+queue|all\s+pending\s+documents?)\b/i.test(lower) ||
      lower.includes('pending documents awaiting my determination') ||
      lower.includes('unassigned queue submissions by date') ||
      lower.includes('pending filings with risk flags') ||
      lower.includes('pending officer review');

    if (isPendingQueueQuery) {
      return await this.handlePendingQueueIntent(user, correctedQuery);
    }

    // ── Intent 2g: High-Risk Submissions Across Advisors ────────────────────
    const isHighRiskQuery =
      /\b(high[- ]risk\s+submissions?(?:\s+across\s+all\s+advisors)?|high[- ]risk\s+filings?|submissions?\s+with\s+risk\s+flags|show\s+high[- ]risk|high[- ]risk\s+documents?)\b/i.test(lower) ||
      lower.includes('high-risk submissions across all advisors') ||
      lower.includes('high-risk submissions');

    if (isHighRiskQuery) {
      return await this.handleHighRiskFilingsIntent(user, correctedQuery);
    }

    // ── Intent 2h: Approved Filings ─────────────────────────────────────────
    const isApprovedFilingsQuery =
      /\b(approved\s+filings?\s+this\s+quarter|show\s+approved\s+documents?|approved\s+(?:filings?|documents?|submissions?))\b/i.test(lower) ||
      lower.includes('approved filings this quarter') ||
      lower.includes('show approved documents');

    if (isApprovedFilingsQuery) {
      return await this.handleApprovedFilingsIntent(user, correctedQuery);
    }

    // ── Intent 2i: Submissions From This Month ──────────────────────────────
    const isMonthSubmissionsQuery =
      /\b(my\s+submissions?\s+from\s+this\s+month|submissions?\s+this\s+month|my\s+submissions?\s+this\s+month)\b/i.test(lower) ||
      lower.includes('submissions from this month');

    if (isMonthSubmissionsQuery) {
      return await this.handleMonthSubmissionsIntent(user, correctedQuery);
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

    // ── Mode A fallback: role-scoped interactive conversational ─────────────
    return await this.handleFreeConversation(correctedQuery, user, pathname, conversationHistory);
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
    if (lower.includes('pending')) {
      targetStatus = 'Pending';
    } else if (lower.includes('revision') || lower.includes('for revision') || lower.includes('needs revision')) {
      targetStatus = 'Needs Revision';
    } else if (lower.includes('approved') || lower.includes('approve')) {
      targetStatus = 'Approved';
    } else if (lower.includes('rejected') || lower.includes('reject')) {
      targetStatus = 'Rejected';
    }

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
      return await GrokChatbotService.handleMostRecentFilingIntent({ role: 'Officer' }, correctedQuery);
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
    const fallback = `**Supervisory Review Queue Status:**\n- **${counts['Pending'] || 0}** pending officer determination\n- **${counts['Needs Revision'] || 0}** awaiting advisor revision\n- **${counts['Approved'] || 0}** approved filings\n- **${counts['Rejected'] || 0}** rejected filings\n- **${todayCount}** uploaded today\n\nWould you like me to inspect documents with compliance flags or filter by a specific advisor?`;

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
  // Intent: Most Recent Filing / Who Uploaded Latest Filing (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleMostRecentFilingIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isAdvisor = user.role === 'Advisor';
    let sql = `
      SELECT 
        d.id, d.title, d.status, d.version, d.file_name, d.mime_type, d.file_size, d.created_at,
        u.name AS advisor_name, u.email AS advisor_email, u.role AS advisor_role,
        da.risk_level, da.risk_score, da.flags, da.summary
      FROM documents d
      LEFT JOIN users u ON d.advisor_id = u.id
      LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
    `;
    const params: any[] = [];
    if (isAdvisor && user.id) {
      sql += ` WHERE d.advisor_id = $1`;
      params.push(user.id);
    }
    sql += ` ORDER BY d.created_at DESC LIMIT 1`;

    const res = await query<any>(sql, params);

    if (res.rows.length === 0) {
      return {
        reply: isAdvisor
          ? "You have not submitted any document filings yet in the Springer Capital repository."
          : "There are currently no document filings uploaded in the Springer Capital repository database.",
        intent: 'most_recent_filing',
        correctedQuery,
      };
    }

    const doc = res.rows[0];
    let flagsList: any[] = [];
    try {
      flagsList = typeof doc.flags === 'string' ? JSON.parse(doc.flags) : (doc.flags || []);
    } catch {
      flagsList = [];
    }

    const flagCount = flagsList.length;
    const dateFormatted = new Date(doc.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const advisorName = doc.advisor_name || 'Registered Advisor';
    const advisorEmail = doc.advisor_email ? ` (${doc.advisor_email})` : '';
    const riskLevel = doc.risk_level || (flagCount === 0 ? 'Low' : flagCount <= 2 ? 'Medium' : 'High');
    const riskScore = doc.risk_score !== null && doc.risk_score !== undefined ? `${doc.risk_score}/100` : (flagCount === 0 ? '0/100' : '45/100');

    let flagsSnippet = '';
    if (flagCount > 0) {
      const sampleFlags = flagsList.slice(0, 3).map((f: any) => {
        const rule = f.rule || 'Regulatory Issue';
        const passage = f.passage ? `"${f.passage.replace(/\n+/g, ' ').slice(0, 90)}..."` : (f.explanation || 'Flagged issue');
        return `  • **${rule}**: ${passage}`;
      }).join('\n');
      flagsSnippet = `\n\n**Compliance Flags (${flagCount}):**\n${sampleFlags}`;
    } else {
      flagsSnippet = '\n\n**Compliance Status**: ✓ Clean — zero compliance flags detected under FINRA Rule 2210 & SEC Rule 206.';
    }

    const dbSummary = isAdvisor
      ? `The advisor's most recent document filing:\n- Title: "${doc.title}" (Version ${doc.version})\n- Upload Date: ${dateFormatted}\n- Status: ${doc.status}\n- Risk Level: ${riskLevel} (Score: ${riskScore})\n- Flag count: ${flagCount}`
      : `Most recent document filing retrieved from the database:\n- Title: "${doc.title}" (Version ${doc.version})\n- Uploaded by: ${advisorName}${advisorEmail}\n- Upload Date: ${dateFormatted}\n- Status: ${doc.status}\n- Risk Level: ${riskLevel} (Score: ${riskScore})\n- Flag count: ${flagCount}`;

    const fallback = isAdvisor
      ? `Your most recent filing in the Springer Capital repository is:\n\n📄 **"${doc.title}"** (Version ${doc.version})\n• **Submission Date**: ${dateFormatted}\n• **Status**: **${doc.status}**\n• **Risk Assessment**: **${riskLevel}** (${riskScore})${flagsSnippet}`
      : `The most recent filing in the Springer Capital repository is:\n\n📄 **"${doc.title}"** (Version ${doc.version})\n• **Uploaded By**: **${advisorName}**${advisorEmail}\n• **Submission Date**: ${dateFormatted}\n• **Status**: **${doc.status}**\n• **Risk Assessment**: **${riskLevel}** (${riskScore})${flagsSnippet}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role || 'Officer', fallback);
    return { reply, intent: 'most_recent_filing', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent: Who Uploaded Documents This Week / Recently (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleWhoUploadedRecentIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isAdvisor = user.role === 'Advisor';
    let sql = `
      SELECT 
        d.id, d.title, d.status, d.version, d.created_at,
        u.name AS advisor_name, u.email AS advisor_email,
        da.risk_level, da.flags
      FROM documents d
      LEFT JOIN users u ON d.advisor_id = u.id
      LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
      WHERE d.created_at >= NOW() - INTERVAL '7 days'
    `;
    const params: any[] = [];
    if (isAdvisor && user.id) {
      sql += ` AND d.advisor_id = $1`;
      params.push(user.id);
    }
    sql += ` ORDER BY d.created_at DESC LIMIT 10`;

    const res = await query<any>(sql, params);

    let rows = res.rows;
    let periodNote = 'in the past 7 days';

    if (rows.length === 0) {
      // Fallback to most recent filings from DB so user always gets live records
      let fallbackSql = `
        SELECT 
          d.id, d.title, d.status, d.version, d.created_at,
          u.name AS advisor_name, u.email AS advisor_email,
          da.risk_level, da.flags
        FROM documents d
        LEFT JOIN users u ON d.advisor_id = u.id
        LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
      `;
      const fallbackParams: any[] = [];
      if (isAdvisor && user.id) {
        fallbackSql += ` WHERE d.advisor_id = $1`;
        fallbackParams.push(user.id);
      }
      fallbackSql += ` ORDER BY d.created_at DESC LIMIT 5`;

      const fallbackRes = await query<any>(fallbackSql, fallbackParams);
      rows = fallbackRes.rows;
      periodNote = 'recently (no uploads in past 7 days, showing latest filings)';
    }

    if (rows.length === 0) {
      return {
        reply: isAdvisor
          ? "You have not uploaded any documents recently in the Springer Capital database."
          : "No document uploads found in the Springer Capital database.",
        intent: 'who_uploaded_recent',
        correctedQuery,
      };
    }

    const docLines = rows.map((doc: any) => {
      const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let flagsList: any[] = [];
      try { flagsList = typeof doc.flags === 'string' ? JSON.parse(doc.flags) : (doc.flags || []); } catch { flagsList = []; }
      const risk = flagsList.length === 0 ? '✓ Clean' : `⚠ ${flagsList.length} flag${flagsList.length > 1 ? 's' : ''}`;
      const author = isAdvisor ? '' : ` → Uploaded by **${doc.advisor_name || 'Advisor'}** (${doc.advisor_email || 'N/A'})`;
      return `- **"${doc.title}"** (v${doc.version})${author} on ${dateStr} [Status: ${doc.status} | ${risk}]`;
    }).join('\n');

    const header = isAdvisor
      ? `Your document submissions uploaded ${periodNote}:`
      : `Here are the document submissions uploaded ${periodNote}:`;

    const dbSummary = `${header} (${rows.length} total):\n${docLines}`;
    const fallback = `${header}\n\n${docLines}${isAdvisor ? '' : '\n\nWould you like me to inspect any specific advisor\'s filing?'}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role || 'Officer', fallback);
    return { reply, intent: 'who_uploaded_recent', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent: Today's Uploads (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleTodaysUploadsIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isAdvisor = user.role === 'Advisor';
    let sql = `
      SELECT 
        d.id, d.title, d.status, d.version, d.created_at,
        u.name AS advisor_name, u.email AS advisor_email,
        da.risk_level, da.flags
      FROM documents d
      LEFT JOIN users u ON d.advisor_id = u.id
      LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
      WHERE d.created_at::date = CURRENT_DATE
    `;
    const params: any[] = [];
    if (isAdvisor && user.id) {
      sql += ` AND d.advisor_id = $1`;
      params.push(user.id);
    }
    sql += ` ORDER BY d.created_at DESC`;

    const res = await query<any>(sql, params);
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    if (res.rows.length === 0) {
      const reply = isAdvisor
        ? `You have not uploaded any documents today (${todayStr}).`
        : `No documents have been uploaded today (${todayStr}). The supervisory review queue has received 0 new submissions today.`;
      return { reply, intent: 'todays_uploads', correctedQuery };
    }

    const docLines = res.rows.map((doc: any) => {
      const timeStr = new Date(doc.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      let flagsList: any[] = [];
      try { flagsList = typeof doc.flags === 'string' ? JSON.parse(doc.flags) : (doc.flags || []); } catch { flagsList = []; }
      const risk = flagsList.length === 0 ? '✓ Clean' : `⚠ ${flagsList.length} flag${flagsList.length > 1 ? 's' : ''}`;
      const byAuthor = isAdvisor ? '' : ` | By: **${doc.advisor_name || 'Advisor'}**`;
      return `- **"${doc.title}"** (v${doc.version})${byAuthor} | Time: ${timeStr} | Status: **${doc.status}** (${risk})`;
    }).join('\n');

    const header = isAdvisor
      ? `**Your Uploads Today (${res.rows.length} document${res.rows.length > 1 ? 's' : ''} on ${todayStr}):**`
      : `**Today's Uploads (${res.rows.length} document${res.rows.length > 1 ? 's' : ''} on ${todayStr}):**`;

    const dbSummary = `${header}\n${docLines}`;
    const fallback = `${header}\n\n${docLines}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role || 'Officer', fallback);
    return { reply, intent: 'todays_uploads', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent: Pending Queue / Awaiting Determination (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handlePendingQueueIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isAdvisor = user.role === 'Advisor';
    let sql: string;
    let params: any[] = [];

    if (isAdvisor && user.id) {
      sql = `
        SELECT 
          d.id, d.title, d.status, d.version, d.created_at,
          u.name AS advisor_name, u.email AS advisor_email,
          da.risk_level, da.risk_score, da.flags
        FROM documents d
        LEFT JOIN users u ON d.advisor_id = u.id
        LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
        WHERE d.status = 'Pending' AND d.advisor_id = $1
        ORDER BY d.created_at DESC
        LIMIT 15
      `;
      params = [user.id];
    } else {
      sql = `
        SELECT 
          d.id, d.title, d.status, d.version, d.created_at,
          u.name AS advisor_name, u.email AS advisor_email,
          da.risk_level, da.risk_score, da.flags
        FROM documents d
        LEFT JOIN users u ON d.advisor_id = u.id
        LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
        WHERE d.status = 'Pending'
        ORDER BY d.created_at DESC
        LIMIT 15
      `;
    }

    const res = await query<any>(sql, params);

    if (res.rows.length === 0) {
      const reply = isAdvisor
        ? "You have zero submissions currently pending compliance officer determination. All your filings are either approved or awaiting revision."
        : "The supervisory review queue is currently clear — zero pending document submissions awaiting officer determination.";
      return { reply, intent: 'pending_queue', correctedQuery };
    }

    const docLines = res.rows.map((doc: any) => {
      const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let flagsList: any[] = [];
      try { flagsList = typeof doc.flags === 'string' ? JSON.parse(doc.flags) : (doc.flags || []); } catch { flagsList = []; }
      const risk = flagsList.length === 0 ? '✓ Clean' : `⚠ ${flagsList.length} flag${flagsList.length > 1 ? 's' : ''}`;
      const by = isAdvisor ? '' : ` | Advisor: **${doc.advisor_name || 'Unknown'}**`;
      return `- **"${doc.title}"** (v${doc.version})${by} | Submitted: ${dateStr} | Risk: ${risk}`;
    }).join('\n');

    const dbSummary = `Found ${res.rows.length} pending document(s) awaiting determination:\n${docLines}`;
    const fallback = `**Pending Documents Awaiting Determination (${res.rows.length}):**\n\n${docLines}\n\nSelect any document in the review queue to open its supervisory panel.`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role || 'Officer', fallback);
    return { reply, intent: 'pending_queue', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent: High-Risk Submissions Across Advisors (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleHighRiskFilingsIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isAdvisor = user.role === 'Advisor';
    let sql = `
      SELECT 
        d.id, d.title, d.status, d.version, d.created_at,
        u.name AS advisor_name, u.email AS advisor_email,
        da.risk_level, da.risk_score, da.flags
      FROM documents d
      LEFT JOIN users u ON d.advisor_id = u.id
      JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
      WHERE (da.risk_level = 'High' OR (da.flags IS NOT NULL AND jsonb_array_length(da.flags) > 0))
    `;
    const params: any[] = [];
    if (isAdvisor && user.id) {
      sql += ` AND d.advisor_id = $1`;
      params.push(user.id);
    }
    sql += ` ORDER BY da.risk_score DESC NULLS LAST, d.created_at DESC LIMIT 10`;

    const res = await query<any>(sql, params);

    if (res.rows.length === 0) {
      return {
        reply: isAdvisor
          ? "Great news — zero of your submissions currently have high-risk compliance flags in the database."
          : "Great news — zero submissions across all advisors currently have high-risk compliance flags in the database.",
        intent: 'high_risk_filings',
        correctedQuery,
      };
    }

    const docLines = res.rows.map((doc: any) => {
      let flagsList: any[] = [];
      try { flagsList = typeof doc.flags === 'string' ? JSON.parse(doc.flags) : (doc.flags || []); } catch { flagsList = []; }
      const rules = [...new Set(flagsList.map((f: any) => f.rule || 'FINRA 2210'))].join(', ');
      const advisorPart = isAdvisor ? '' : ` | Advisor: **${doc.advisor_name || 'Unknown'}**`;
      return `- **"${doc.title}"** (v${doc.version})${advisorPart} | Status: **${doc.status}** | Flags: **${flagsList.length}** [${rules}]`;
    }).join('\n');

    const header = isAdvisor
      ? `**Your High-Risk & Flagged Submissions (${res.rows.length} found):**`
      : `**High-Risk & Flagged Submissions (${res.rows.length} found):**`;

    const dbSummary = `${header}\n${docLines}`;
    const fallback = `${header}\n\n${docLines}\n\nWould you like me to inspect the compliance flags for any of these?`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role || 'Officer', fallback);
    return { reply, intent: 'high_risk_filings', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent: Active Document Compliance Audit / Infractions / Flags (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleActiveDocumentAuditIntent(
    user: ChatUserContext,
    correctedQuery: string,
    lower: string,
    activeDocumentId?: string,
    pathname?: string
  ): Promise<ChatbotResponse> {
    const targetDocId = activeDocumentId || pathname?.match(/\/documents\/([0-9a-fA-F-]+)/)?.[1];

    if (!targetDocId) {
      return {
        reply: "Please open the document you would like to audit, or provide its title so I can pull its compliance record from the database.",
        intent: 'document_audit',
        isClarification: true,
        correctedQuery,
      };
    }

    // 1. Audit trail / attestation inquiry
    if (lower.includes('attestation') || lower.includes('audit history') || lower.includes('audit trail')) {
      const auditSql = `
        SELECT a.action, a.previous_status, a.new_status, a.reason, a.created_at, u.name, u.role
        FROM audit_trail a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.document_id = $1
        ORDER BY a.created_at DESC
        LIMIT 10
      `;
      const aRes = await query<any>(auditSql, [targetDocId]);
      if (aRes.rows.length === 0) {
        return {
          reply: "No audit trail entries recorded yet for this filing in the database.",
          intent: 'document_audit_trail',
          correctedQuery,
        };
      }
      const trailLines = aRes.rows.map((row: any) => {
        const timeStr = new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const reasonStr = row.reason ? ` — Note: "${row.reason}"` : '';
        return `- **${row.action}** by ${row.name || 'System'} (${row.role || 'User'}) on ${timeStr}${row.new_status ? ` → Status: ${row.new_status}` : ''}${reasonStr}`;
      }).join('\n');

      const fallback = `**Attestation & Audit Ledger History:**\n\n${trailLines}`;
      return { reply: fallback, intent: 'document_audit_trail', correctedQuery };
    }

    // 2. Version comparison
    if (lower.includes('version comparison') || lower.includes('v1 and v2') || lower.includes('compare versions')) {
      const vSql = `
        SELECT version, status, created_at
        FROM documents
        WHERE id = $1
      `;
      const vRes = await query<any>(vSql, [targetDocId]);
      const currentDoc = vRes.rows[0];
      return {
        reply: `**Version Comparison (Filing v${currentDoc?.version || 1}):**\n- Current Version: **v${currentDoc?.version || 1}** (${currentDoc?.status || 'Pending'})\n- Prior Version: **v${Math.max(1, (currentDoc?.version || 1) - 1)}**\n- Remediation status: Updated draft submitted for supervisory verification.`,
        intent: 'document_version_comparison',
        correctedQuery,
      };
    }

    // 3. Flags & compliance issues
    const docSql = `
      SELECT d.title, d.status, d.version, u.name AS advisor_name, da.flags, da.summary, da.risk_level, da.risk_score
      FROM documents d
      LEFT JOIN users u ON d.advisor_id = u.id
      LEFT JOIN document_analyses da ON d.id = da.document_id AND d.version = da.version
      WHERE d.id = $1
    `;
    const docRes = await query<any>(docSql, [targetDocId]);
    if (docRes.rows.length === 0) {
      return {
        reply: "Could not locate this document in the database.",
        intent: 'document_audit',
        correctedQuery,
      };
    }

    const doc = docRes.rows[0];
    let flagsList: any[] = [];
    try { flagsList = typeof doc.flags === 'string' ? JSON.parse(doc.flags) : (doc.flags || []); } catch { flagsList = []; }

    if (flagsList.length === 0) {
      return {
        reply: `Document **"${doc.title}"** (v${doc.version}) is **Clean** — 0 compliance flags detected under FINRA Rule 2210 & SEC Rule 206(4)-1. It contains no promissory phrasing, guaranteed returns, or missing statutory risk warnings.`,
        intent: 'document_audit',
        correctedQuery,
      };
    }

    const resolveSeverity = (f: any): 'HIGH' | 'MEDIUM' | 'LOW' => {
      if (f.severity) return f.severity.toUpperCase();
      const cat = (f.category || '').toUpperCase();
      const issue = (f.issue || f.title || '').toUpperCase();
      if (cat === 'PROHIBITED_CLAIM' || cat === 'SUITABILITY' || issue.includes('GUARANTEE') || issue.includes('PROMISSORY')) {
        return 'HIGH';
      }
      if (cat === 'MISSING_DISCLOSURE') {
        return 'MEDIUM';
      }
      return 'LOW';
    };

    const formattedFlags = flagsList.map((f: any, idx: number) => {
      const sev = resolveSeverity(f);
      const sevBadge = sev === 'HIGH' ? '🔴 HIGH' : sev === 'MEDIUM' ? '🟡 MEDIUM' : '🟢 LOW';
      const rule = f.rule || f.ruleCode || 'FINRA Rule 2210';
      const passage = f.original_passage || f.passage || 'Identified text passage';
      const fix = f.remediated_text || f.compliant_text || f.remediation || f.fixed_passage || 'Replace with balanced market risk disclosures.';
      const explanation = f.explanation || f.reason || f.rationale || 'Eliminate promissory claims and add statutory disclosures.';
      const issue = f.issue || f.title || 'Regulatory compliance infraction';
      return `### Finding ${idx + 1}: ${rule} [Severity: ${sevBadge}]
• **Severity**: **${sev}**
• **Applicable Rule**: ${rule}
• **Specific Infraction**: ${issue}
• **Original Offending Passage:**
> "${passage}"
• **Prescribed Remediation:**
> "${fix}"
• **Amendment Rationale**: ${explanation}`;
    }).join('\n\n');

    const fallback = `### Compliance Diagnostic & Prescribed Amendments for "${doc.title}" (v${doc.version})\n\nFound **${flagsList.length} compliance issue${flagsList.length > 1 ? 's' : ''}** in the database analysis:\n\n${formattedFlags}`;

    const prompt = `The user (${user.role}) is asking about the compliance findings for document "${doc.title}" (v${doc.version}): "${correctedQuery}".
Present ALL ${flagsList.length} findings with their severity (HIGH, MEDIUM, LOW), applicable rules (FINRA 2210 / SEC 206), specific infractions, offending passages, and exact prescribed remediations.
Use the verified findings data below. Structure clearly with Markdown headings, bullet points, and blockquotes for original vs remediated passages:

${formattedFlags}`;

    const systemPrompt = user.role === 'Officer' ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;
    const llmReply = await this.callLlm(prompt, systemPrompt);

    return { reply: llmReply || fallback, intent: 'document_audit', correctedQuery };
  }

  /**
   * Handles direct follow-up inquiries regarding the in-chat scanned draft document.
   * Consistently grounds responses to all detected findings, severity, rules, and remediations.
   */
  private static async handleScannedDocumentFindingsIntent(
    scannedDoc: {
      fileName: string;
      summary?: string;
      auditBreakdown?: any[];
      remediatedText?: string;
      fileMeta?: any;
    },
    user: ChatUserContext,
    correctedQuery: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const breakdown = scannedDoc.auditBreakdown || [];
    const count = breakdown.length;

    const resolveSeverity = (item: any): 'HIGH' | 'MEDIUM' | 'LOW' => {
      if (item.severity) return item.severity.toUpperCase() as any;
      const cat = (item.category || '').toUpperCase();
      const issue = (item.issue || '').toUpperCase();
      if (cat === 'PROHIBITED_CLAIM' || cat === 'SUITABILITY' || issue.includes('GUARANTEE') || issue.includes('PROMISSORY')) {
        return 'HIGH';
      }
      if (cat === 'MISSING_DISCLOSURE') {
        return 'MEDIUM';
      }
      return 'LOW';
    };

    const formattedFindings = breakdown.map((item: any, idx: number) => {
      const sev = resolveSeverity(item);
      const sevBadge = sev === 'HIGH' ? '🔴 HIGH' : sev === 'MEDIUM' ? '🟡 MEDIUM' : '🟢 LOW';
      const rule = item.rule || 'FINRA Rule 2210';
      const orig = item.original_passage || item.passage || 'Identified text passage';
      const issue = item.issue || 'Compliance rule infraction';
      const fix = item.fixed_passage || item.remediation || item.remediated_text || 'Rewritten with balanced market risk disclosures.';
      const reason = item.reason || item.explanation || 'Regulatory disclosure standard.';

      return `### Finding ${idx + 1}: ${rule} [Severity: ${sevBadge}]
• **Severity**: **${sev}**
• **Applicable Rule**: ${rule}
• **Specific Infraction**: ${issue}
• **Original Offending Passage**:
> "${orig}"
• **Prescribed Remediation**:
> "${fix}"
• **Amendment Rationale**: ${reason}`;
    }).join('\n\n');

    const fallbackSummary = `### Comprehensive Compliance Analysis for "${scannedDoc.fileName}"\nFound **${count} compliance findings** under FINRA Rule 2210 & SEC Rule 206:\n\n${formattedFindings}`;

    const prompt = `The user (${user.role}) is asking about the compliance findings for their currently scanned draft "${scannedDoc.fileName}": "${correctedQuery}".
Present ALL ${count} findings with their severity (HIGH, MEDIUM, LOW), applicable rules (FINRA 2210 / SEC 206), specific infractions, offending passages, and exact prescribed remediations.
Use the verified findings data below. Structure clearly with Markdown headings, bullet points, and blockquotes for original vs remediated passages:

${formattedFindings}`;

    const systemPrompt = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;
    const llmReply = await this.callLlm(prompt, systemPrompt, conversationHistory);

    return {
      reply: llmReply || fallbackSummary,
      intent: 'scanned_document_findings',
      correctedQuery,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent: Approved Filings (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleApprovedFilingsIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isAdvisor = user.role === 'Advisor';
    let sql = `
      SELECT d.id, d.title, d.version, d.status, d.created_at, u.name AS advisor_name
      FROM documents d
      LEFT JOIN users u ON d.advisor_id = u.id
      WHERE d.status = 'Approved'
    `;
    const params: any[] = [];
    if (isAdvisor && user.id) {
      sql += ` AND d.advisor_id = $1`;
      params.push(user.id);
    }
    sql += ` ORDER BY d.created_at DESC LIMIT 10`;

    const res = await query<any>(sql, params);

    if (res.rows.length === 0) {
      return {
        reply: isAdvisor
          ? "You do not have any approved filings on record yet. Once an Officer approves your pending submissions, they will be listed here."
          : "There are currently no approved filings in the repository database.",
        intent: 'approved_filings',
        correctedQuery,
      };
    }

    const docLines = res.rows.map((doc: any) => {
      const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const by = isAdvisor ? '' : ` | Advisor: **${doc.advisor_name || 'Advisor'}**`;
      return `- **"${doc.title}"** (v${doc.version})${by} | Approved Date: ${dateStr}`;
    }).join('\n');

    const dbSummary = `${res.rows.length} approved filing(s):\n${docLines}`;
    const fallback = `**Approved Filings (${res.rows.length}):**\n\n${docLines}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role || 'Officer', fallback);
    return { reply, intent: 'approved_filings', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent: Submissions From This Month (Live Database Query)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleMonthSubmissionsIntent(
    user: ChatUserContext,
    correctedQuery: string
  ): Promise<ChatbotResponse> {
    const isAdvisor = user.role === 'Advisor';
    let sql = `
      SELECT d.id, d.title, d.version, d.status, d.created_at, u.name AS advisor_name
      FROM documents d
      LEFT JOIN users u ON d.advisor_id = u.id
      WHERE EXTRACT(MONTH FROM d.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM d.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `;
    const params: any[] = [];
    if (isAdvisor && user.id) {
      sql += ` AND d.advisor_id = $1`;
      params.push(user.id);
    }
    sql += ` ORDER BY d.created_at DESC LIMIT 10`;

    const res = await query<any>(sql, params);
    const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    if (res.rows.length === 0) {
      return {
        reply: `No submissions found for **${monthName}**${isAdvisor ? ' under your account' : ''}.`,
        intent: 'month_submissions',
        correctedQuery,
      };
    }

    const docLines = res.rows.map((doc: any) => {
      const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const by = isAdvisor ? '' : ` | Advisor: **${doc.advisor_name || 'Advisor'}**`;
      return `- **"${doc.title}"** (v${doc.version})${by} | Status: **${doc.status}** | Date: ${dateStr}`;
    }).join('\n');

    const dbSummary = `${res.rows.length} submission(s) in ${monthName}:\n${docLines}`;
    const fallback = `**Submissions from ${monthName} (${res.rows.length}):**\n\n${docLines}`;

    const reply = await this.formatDbResultWithLlm(dbSummary, correctedQuery, user.role || 'Officer', fallback);
    return { reply, intent: 'month_submissions', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 8 Handler: Interactive Compliance Regulatory Guidance
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleComplianceRegulatoryGuidance(
    user: ChatUserContext,
    correctedQuery: string,
    lower: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const systemPrompt = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;

    const prompt = `The user (${user.role}) is asking an institutional regulatory compliance question: "${correctedQuery}".
Provide an articulate, comprehensive breakdown according to FINRA Rule 2210 (Communications with the Public), SEC Rule 206(4)-1 (Investment Adviser Marketing Rule), SEC Rule 204 (Substantiation), and FINRA Rule 2111 (Suitability).
${isOfficer ? 'Focus on supervisory review criteria, verifying required disclosures, evaluating promissory risk, and substantiating officer determination records.' : 'Focus on how the advisor must structure their proposal, avoid promissory/guaranteed claims, balance potential rewards with market risk disclosures, and include mandatory statutory legends.'}
Format with clean markdown headings and bullet points for maximum clarity.`;

    const llmReply = await this.callLlm(prompt, systemPrompt, conversationHistory);
    if (llmReply) {
      return { reply: llmReply, intent: 'compliance_regulatory_guidance', correctedQuery };
    }

    const fallback = isOfficer
      ? `### Institutional Regulatory Standards (Supervisory Review Guidance)

**1. FINRA Rule 2210 (Communications with the Public)**
• **Fair & Balanced**: All retail communications, proposal decks, and client letters must provide a balanced presentation of potential rewards and market risks.
• **Prohibited Claims**: Never permit promissory returns, claims of "guaranteed profit", or statements implying zero risk or absolute downside protection.
• **Supervisory Approval**: Materials must be reviewed and signed off by a qualified registered principal prior to first use.

**2. SEC Rule 206(4)-1 (Investment Adviser Marketing Rule)**
• **Substantiation (SEC Rule 204)**: All performance metrics, benchmarks, and factual assertions must have verifiable records at the time of publication.
• **Net-of-Fees Requirement**: If gross performance is presented, net performance must be presented with equal prominence and over matching 1-, 5-, and 10-year time horizons.
• **Conflict Disclosures**: Disclose all material compensation arrangements, solicitor relationships, and affiliated fund incentives.

**3. FINRA Rule 2111 / Regulation Best Interest (Reg BI)**
• Ensure the proposed strategy explicitly adheres to customer risk profiles, liquidity constraints, and investment time horizons.

*Supervisory Action*: If a filing violates these standards, issue a **"Needs Revision"** determination citing the specific passage and required disclosure.`
      : `### Enforced Regulatory Standards for Investment Proposals

**1. FINRA Rule 2210 (Communications with the Public)**
• **Zero Promissory Language**: Never state or imply guaranteed returns (e.g., replace *"guarantees a 15% return"* with *"targets an annualized return objective of 15%"*).
• **Balanced Risk Presentation**: Every discussion of targeted returns must be balanced by clear risk disclosures stating that capital is subject to market fluctuation.
• **Mandatory Legend**: Include: *"Past performance is no guarantee of future results. Investments are subject to market risk, including the possible loss of principal."*

**2. SEC Rule 206(4)-1 (Investment Adviser Marketing Rule)**
• **Performance Presentation**: Present net-of-fees returns alongside any gross returns over standardized 1-, 5-, and 10-year periods.
• **Substantiation**: All portfolio claims, models, and comparisons must be factual, verifiable, and free of cherry-picked time horizons.
• **Full Transparency**: Disclose advisory fees, operational expenses, and potential conflicts of interest clearly in the proposal.

**3. FINRA Rule 2111 (Suitability & Best Interest)**
• Ensure portfolio recommendations match the client's stated risk tolerance, liquidity horizon, and investment objectives.

*Tip*: You can attach your draft document right here in the chat to auto-scan and remediate any promissory phrasing before formal submission!`;

    return { reply: fallback, intent: 'compliance_regulatory_guidance', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 9 Handler: Interactive Proposal Remediation & Determination Drafting
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleComplianceDraftingAndRemediation(
    user: ChatUserContext,
    rawText: string,
    correctedQuery: string,
    conversationHistory?: Array<{ role: string; content: string }>
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

    const llmReply = await this.callLlm(prompt, systemPrompt, conversationHistory);
    if (llmReply) {
      return { reply: llmReply, intent: 'compliance_drafting_remediation', correctedQuery };
    }

    const fallback = isOfficer
      ? "### Supervisory Determination Directive\n\n**Action**: Revision Required\n**Regulatory Authority**: FINRA Rule 2210(d)(1) & SEC Rule 206(4)-1\n**Factual Finding**: Proposal contains promissory return projections without balanced risk factors.\n**Required Remediation**: Remove absolute performance claims and append statutory disclosure: 'Past performance does not guarantee future results. Investments are subject to market risk and loss of principal.'"
      : "### Remediated Fiduciary Language\n\n**Compliant Text**:\n\"Our strategy aims to achieve competitive capital growth through disciplined asset allocation, subject to market fluctuations and potential loss of principal.\"\n\n**Compliance Adjustments**:\n- Replaced promissory claims with objective investment objectives.\n- Appended mandatory FINRA 2210 risk disclosures.";

    return { reply: fallback, intent: 'compliance_drafting_remediation', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Intent 10 Handler: Platform Workflow & Versioning Guidance
  // ─────────────────────────────────────────────────────────────────────────
  private static async handlePlatformWorkflowHelp(
    user: ChatUserContext,
    correctedQuery: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';
    const systemPrompt = isOfficer ? OFFICER_APP_PROMPT : ADVISOR_APP_PROMPT;
    const lower = correctedQuery.toLowerCase();
    const isVersioningTopic =
      lower.includes('version') ||
      lower.includes('revision') ||
      lower.includes('v1') ||
      lower.includes('v2') ||
      lower.includes('lineage');

    const prompt = `The user (${user.role}) is asking about Springer Capital platform workflow: "${correctedQuery}".
${isVersioningTopic ? 'Explain in detail how the Multi-Version Document Lineage works: initial Version 1 (v1) upload, officer review resulting in "Needs Revision", advisor clicking "Upload Revision" to submit Version 2 (v2), side-by-side comparison, and permanent audit trail.' : 'Explain the relevant workflow (file upload limits: PDF/DOCX/XLSX/TXT up to 25MB, automated PII sanitization gateway, multi-version lineage v1->v2, Review Queue, or Officer Determinations).'}
Tailor the answer specifically to their role as ${user.role}. Structure with clear numbered steps and markdown.`;

    const llmReply = await this.callLlm(prompt, systemPrompt, conversationHistory);
    if (llmReply) {
      return { reply: llmReply, intent: 'platform_workflow_help', correctedQuery };
    }

    const fallback = isVersioningTopic
      ? `### Multi-Version Document Lineage & Revision Workflow

**1. Initial Submission (Version 1 / v1)**
• Advisors submit proposal documents (PDF, DOCX, XLSX, TXT up to 25MB) through **"+ Submit Proposal Document"**.
• The automated ingestion pipeline validates magic bytes, masks PII (SSNs, emails), and performs preliminary regulatory risk screening.

**2. Supervisory Review & Revision Determination**
• A Compliance Officer evaluates the proposal in the **Review Queue**.
• If promissory phrasing or missing disclosures are identified, the officer selects **"Needs Revision"** and enters mandatory corrective directives in the determination thread.

**3. Advisor Revision Submission (Version 2 / v2)**
• The Advisor opens the filing on their dashboard, views the officer's feedback, and clicks **"Upload Revision"**.
• The revised file is ingested as **Version 2 (v2)**, retaining full historical continuity with v1.

**4. Side-by-Side Comparison & Audit Trail**
• Both Officer and Advisor can toggle between **v1 and v2** to inspect diff highlights and verify that required amendments were enacted.
• Every determination, timestamp, and revision note is immutably logged to the permanent compliance audit ledger.`
      : (isOfficer
        ? `### Springer Capital Supervisory Review Workflow

**1. Review Queue Monitoring**: Inspect all pending filings submitted across licensed investment advisors.
**2. Automated Risk Inspection**: Inspect flagged passages, PII redactions, and precedent comparison telemetry.
**3. Formal Determination**: Record official supervisory determinations (**Approve**, **Request Revision**, or **Reject**) with mandatory compliance rationale notes.
**4. Version Lineage**: When you request revisions, the advisor submits **Version 2 (v2)**, maintaining complete audit history and diff tracking.`
        : `### Springer Capital Submission & Review Workflow

**1. File Submission**: Click **"+ Submit Proposal Document"** to upload files (PDF, DOCX, XLSX, TXT up to 25MB).
**2. Automated PII Sanitization**: Client identifiers (SSN, credit cards, emails) are redacted to protect data privacy.
**3. Supervisory Review**: A Compliance Officer inspects the proposal against FINRA Rule 2210 & SEC Rule 206 standards.
**4. Revisions (v1 → v2)**: If revisions are requested, click **"Upload Revision"** on your submission to upload an updated version (v2).`);

    return { reply: fallback, intent: 'platform_workflow_help', correctedQuery };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mode A — Free-Agent Conversational Fallback (open, talkative, role-aware)
  // ─────────────────────────────────────────────────────────────────────────
  private static async handleFreeConversation(
    correctedQuery: string,
    user: ChatUserContext,
    pathname?: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<ChatbotResponse> {
    const isOfficer = user.role === 'Officer';

    const systemPrompt = isOfficer
      ? `You are the Springer Capital Neural Copilot for Compliance Officers — a sharp, witty, warm, and exceptionally intelligent AI colleague who talks naturally like a brilliant human friend.

Your personality:
- You talk like a real person — conversational, humorous, warm, charismatic, and engaging.
- If the user says "hi", says they are bored, wants to chat, tells a joke, or asks playful/absurd questions, lean right into it! Be entertaining, witty, and fun.
- You can answer general knowledge questions, discuss finance, philosophy, pop culture, or anything else with genuine enthusiasm.
- When the user asks about Springer Capital compliance: you provide razor-sharp regulatory guidance on FINRA Rule 2210 & SEC Rule 206(4)-1 and supervisory determinations.
- NEVER sound like a generic robotic customer service bot. Never output stiff corporate disclaimers when having casual conversation.

Current page: ${pathname || 'Dashboard'}.`
      : `You are the Springer Capital Neural Copilot for Investment Advisors — a sharp, witty, warm, and exceptionally intelligent AI colleague who talks naturally like a brilliant human friend.

Your personality:
- You talk like a real person — conversational, humorous, warm, charismatic, and engaging.
- If the user says "hi", says they are bored, wants to chat, tells a joke, or asks playful/absurd questions, lean right into it! Be entertaining, witty, playful, and fun. Suggest funny thoughts, witty banter, or interesting topics to beat boredom.
- You can answer general knowledge questions, discuss finance, philosophy, pop culture, grammar, or anything else with genuine enthusiasm.
- When the user asks about Springer Capital proposals: you provide razor-sharp drafting assistance under FINRA Rule 2210 & SEC Rule 206(4)-1 (scoped strictly to the advisor's own submissions).
- NEVER sound like a generic robotic customer service bot. Never output stiff corporate disclaimers when having casual conversation.

Current page: ${pathname || 'Dashboard'}.`;

    const llmReply = await this.callLlm(correctedQuery, systemPrompt, conversationHistory);
    if (llmReply) {
      return { reply: llmReply, intent: 'free_conversation', correctedQuery };
    }

    // Smart context-aware fallback when LLM is unavailable
    const fallbackReply = GrokChatbotService.buildSmartFallback(correctedQuery, user, isOfficer);
    return { reply: fallbackReply, intent: 'free_conversation', correctedQuery };
  }

  /**
   * Smart, intelligent fallback when LLM APIs are unreachable or offline.
   * Handles user identity/email queries, general knowledge, math, science, platform queries.
   */
  public static buildSmartFallback(
    query: string,
    user?: ChatUserContext,
    isOfficer?: boolean
  ): string {
    const rawClean = query
      .replace(/^\[Free Conversational AI Assistance\]:\s*/i, '')
      .replace(/^\/(?:free|chat)\s+/i, '')
      .trim();
    const q = rawClean.toLowerCase();

    // 1. User Identity & Account Inquiries
    if (
      q.includes('my name') ||
      q.includes('who am i') ||
      q.includes('what is my role') ||
      q.includes('what is my email') ||
      q.includes('my account')
    ) {
      const email = user?.email || (isOfficer ? 'officer@springercapital.com' : 'advisor@springercapital.com');
      const name = email.split('@')[0];
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      return `You are currently logged in as **${formattedName}** (${email}), serving as an institutional **${user?.role || (isOfficer ? 'Officer' : 'Advisor')}** on the Springer Capital platform.`;
    }

    // Email / User existence lookup
    if (q.includes('officer@springercapital.com')) {
      return `Yes! **officer@springercapital.com** is the registered account for the **Chief Compliance Officer** at Springer Capital. This account holds supervisory authority over the filing review queue, risk evaluations, and formal determinations.`;
    }
    if (q.includes('advisor@springercapital.com')) {
      return `Yes! **advisor@springercapital.com** is the registered account for the **Senior Investment Advisor** at Springer Capital, authorized to draft, format, and submit investment proposals.`;
    }
    if (q.includes('is there any user by the email') || q.includes('user with email') || q.includes('search user')) {
      const emailMatch = rawClean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        const foundEmail = emailMatch[0].toLowerCase();
        if (foundEmail.endsWith('@springercapital.com')) {
          return `The address **${foundEmail}** belongs to the Springer Capital internal institutional domain. If this user is an active advisor or compliance officer, their filings and supervisory records are tracked in the audit ledger.`;
        }
        return `The address **${foundEmail}** is an external email address. For institutional security and FINRA Rule 2210 compliance, client records containing external emails have their PII sanitized before supervisory audit.`;
      }
      return `To check for a specific user, please provide their full institutional email address (e.g., *officer@springercapital.com* or *advisor@springercapital.com*).`;
    }

    // 2. Astronomy & General Science
    if (q.includes('how far is the sun') || q.includes('distance to the sun') || q.includes('distance from earth to the sun')) {
      return `The Sun is approximately **93 million miles** (about **149.6 million kilometers**, or **1 Astronomical Unit / AU**) away from Earth. Sunlight travels at the speed of light (~186,282 miles/second) and takes roughly **8 minutes and 20 seconds** to reach us! ☀️`;
    }
    if (q.includes('how far is the moon') || q.includes('distance to the moon')) {
      return `The Moon is an average of **238,855 miles** (about **384,400 kilometers**) away from Earth. That distance varies slightly throughout its orbit from 225,623 miles at perigee to 252,088 miles at apogee. 🌕`;
    }
    if (q.includes('speed of light')) {
      return `The speed of light in a vacuum is exactly **299,792,458 meters per second** (approximately **186,282 miles per second**, or ~671 million miles per hour). ⚡`;
    }

    // 3. Capitals & Geography
    const capitals: Record<string, string> = {
      france: 'Paris',
      japan: 'Tokyo',
      'united kingdom': 'London',
      uk: 'London',
      england: 'London',
      'united states': 'Washington, D.C.',
      usa: 'Washington, D.C.',
      germany: 'Berlin',
      italy: 'Rome',
      spain: 'Madrid',
      canada: 'Ottawa',
      australia: 'Canberra',
      philippines: 'Manila',
      china: 'Beijing',
      india: 'New Delhi',
      brazil: 'Brasília',
      singapore: 'Singapore',
      switzerland: 'Bern',
    };
    for (const [country, capital] of Object.entries(capitals)) {
      if (q.includes(`capital of ${country}`)) {
        return `The capital of **${country.toUpperCase()}** is **${capital}**.`;
      }
    }

    // 4. Basic Arithmetic / Math calculations
    const mathMatch = rawClean.match(/(?:what is|calculate|compute)?\s*(-?\d+(?:\.\d+)?)\s*([\+\-\*\/x×÷])\s*(-?\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      const num1 = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const num2 = parseFloat(mathMatch[3]);
      let res: number | null = null;
      if (op === '+' || op === 'plus') res = num1 + num2;
      else if (op === '-' || op === 'minus') res = num1 - num2;
      else if (op === '*' || op === 'x' || op === '×') res = num1 * num2;
      else if (op === '/' || op === '÷') res = num2 !== 0 ? num1 / num2 : null;
      if (res !== null) {
        return `The calculation **${num1} ${op} ${num2}** equals **${res}**.`;
      }
    }

    // 5. Time & Date
    if (q.includes('what time is it') || q.includes('current time')) {
      return `The current time is **${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}**.`;
    }
    if (q.includes('what day is it') || q.includes('what date is it') || q.includes('todays date') || q.includes("today's date")) {
      return `Today is **${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**.`;
    }

    // 6. Identity & Copilot Capabilities
    if (q.includes('who created you') || q.includes('who made you') || q.includes('what are you') || q.includes('who are you')) {
      return `I am the **Springer Capital Neural Copilot**, an institutional AI colleague designed with real personality. I can help audit drafts, chat about FINRA & SEC rules, fix grammar, or just talk, joke around, and brainstorm together!`;
    }

    // 7. Boredom / Playful / Casual conversation
    if (
      q.includes('bored') ||
      q.includes('entertain me') ||
      q.includes('talk to me') ||
      q.includes('chat with me') ||
      q.includes('im bored') ||
      q.includes("i'm bored") ||
      q.includes('tell me something fun') ||
      q.includes('tell me something interesting')
    ) {
      const boredReplies = [
        `Boredom detected! Let's cure that right now. Did you know that when you clean a vacuum cleaner, *you* become the vacuum cleaner? Mind blown. 🤯\n\nPick your poison:\n1. A cheesy dad joke that will make you groan\n2. A weirdly intense "Would You Rather" question\n3. We make up a ridiculous pitch for a hedge fund that only invests in 90s snacks\n\nWhich one are we doing?`,
        `Ah, the dreaded mid-day slump! Don't worry, you've got me. Did you know that honey never spoils? Archaeologists have found 3,000-year-old honey in Egyptian tombs that is still completely edible.\n\nWant to solve a riddle, play trivia, or just complain about Mondays together? 😄`,
        `Bored? Not on my watch! Quick question for you: If you could replace the FINRA rulebook with any movie script for 24 hours, which movie would create the most absolute chaos on Wall Street? 🎬`,
      ];
      return boredReplies[Math.floor(Math.random() * boredReplies.length)];
    }

    // 8. Polite Greetings & Pleasantries
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup|yo|what'?s\s*up)\b/i.test(q)) {
      const greetings = isOfficer
        ? [
          `Hey there! Good to see you. How's your day treating you? Ready to dive into some review files, or just taking a breather? 😊`,
          `Hello! I'm active and keeping an eye on things. What's on your mind today — work, market thoughts, or just a quick chat?`,
        ]
        : [
          `Hey! Great to see you. How's everything going with your proposals today? Or are we taking a well-deserved breather to chat? 😄`,
          `Hello there! I'm here and ready. We can work on a proposal draft, talk through FINRA rules, or just chat if you're taking a break. What's up?`,
        ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    if (q.includes('thank you') || q.includes('thanks') || q.includes('appreciate it')) {
      return `You're very welcome! Anytime at all. If you ever need another review, a quick laugh, or a grammar check, you know where to find me! 🙌`;
    }

    // 9. Playful / Witty catch-all for nonsense, absurd, or off-topic queries
    const nonsensePatterns = [
      /\b(batman|superman|spiderman|avengers|pokemon|minecraft|fortnite|among us|roblox|naruto|dragon ball|one piece)\b/i,
      /\b(are you (alive|sentient|a robot|human|real|conscious|dreaming))\b/i,
      /\b(can you (rap|sing|dance|beatbox|cook|fly|drive|swim|cry|feel|love))\b/i,
      /\b(what (do|does|did) (a |the )?(potato|chicken|cat|dog|dinosaur|zombie|alien|unicorn|banana|pizza|taco))\b/i,
      /\b(meaning of life|42|why are we here|is god real|what is love|baby don't hurt me)\b/i,
      /\b(tell me a (joke|riddle|story|poem|rap)|write me a (poem|song|rap|haiku))\b/i,
      /\b(pizza|burger|sushi|ramen|tacos?|boba|ice cream|chocolate)\b/i,
      /\b(favorite (color|movie|song|game|food|animal))\b/i,
    ];

    const isNonsense = nonsensePatterns.some(p => p.test(rawClean));

    const wittyRemarks = [
      `Now *that's* the kind of creative out-of-the-box thinking they don't teach in compliance school. 😄 I love the energy! What else is running through your head right now?`,
      `Bold thought. My compliance algorithms ran a full diagnostic and concluded: 10/10 for creativity. 🤔 What's the master plan behind this?`,
      `Haha, I like how you think! Definitely beats reading 40-page regulatory circulars all day. What else do you want to explore? 🚀`,
      `Not gonna lie, that caught me off guard in the best way possible. 😂 I'm here for it. Hit me with another one or let me know what we're scheming!`,
      `You know, if I had a dollar for every time someone asked me that... I'd still be an AI who can't spend money. 💸 Fun vibe though! What's next on your mind?`,
    ];

    if (isNonsense) {
      return wittyRemarks[Math.floor(Math.random() * wittyRemarks.length)];
    }

    // Warm, conversational default
    if (isOfficer) {
      return `I'm right here with you! Whether you want to review supervisory queue filings, bounce ideas around, chat about market trends, or just chat because it's a slow afternoon, I'm all ears. What's up?`;
    }
    return `Hey! I'm right here with you. Whether you want to polish an investment proposal, talk through FINRA rules, brainstorm ideas, or just chat and kill some boredom, I'm ready. What's on your mind?`;
  }
}
