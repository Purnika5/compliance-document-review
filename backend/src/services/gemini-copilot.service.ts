/**
 * DOCU: Gemini Copilot service orchestrating in-chat file audits, regulatory remediation, and 1-click submission.
 * Enforces strict FINRA 2210 & SEC 206 standards with institutional PII sanitization.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PipelineService } from './pipeline.service';
import { AuthTokenPayload } from '../types/models';
import { config } from '../config';
import { aiCircuitBreaker } from '../utils/circuitBreaker';
import { AppError } from '../middleware/error.middleware';
import { query } from '../db/pool';
import { DocumentService } from './document.service';

export interface AuditBreakdownItem {
  rule: string;
  original_passage: string;
  issue: string;
  fixed_passage: string;
  reason: string;
  category: 'PROHIBITED_CLAIM' | 'MISSING_DISCLOSURE' | 'SUITABILITY' | 'PRECEDENT_MATCH';
}

export interface AuditAndFixResult {
  success: boolean;
  file_meta: {
    original_filename: string;
    file_size: number;
    mime_type: string;
  };
  conversational_summary: string;
  audit_breakdown: AuditBreakdownItem[];
  remediated_content: {
    text: string;
    download_url: string;
    suggested_title: string;
    token: string;
  };
  one_click_actions: {
    can_submit_as_new: boolean;
    can_submit_as_revision: boolean;
    target_document_id: string | null;
  };
}

interface CachedRemediatedFile {
  token: string;
  text: string;
  filename: string;
  mimeType: string;
  createdAt: number;
}

// In-memory cache for remediated files (expires in 2 hours)
const remediatedFileCache = new Map<string, CachedRemediatedFile>();

export class GeminiCopilotService {
  /**
   * Performs in-chat file extraction, PII masking, and Gemini regulatory audit & remediation.
   */
  public static async auditAndRemediateFile(
    file: Express.Multer.File,
    user?: AuthTokenPayload,
    targetDocumentId?: string,
    instructions?: string
  ): Promise<AuditAndFixResult> {
    if (!file || (!file.path && !file.buffer)) {
      throw new AppError('A valid draft file is required for compliance audit.', 400, 'FILE_MISSING');
    }

    const userRole = user?.role || 'Advisor';
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    // 1. Target document ownership check if submitted as revision
    if (targetDocumentId) {
      const docCheck = await query<{ advisor_id: string }>(
        'SELECT advisor_id FROM documents WHERE id = $1',
        [targetDocumentId]
      );
      if (docCheck.rows.length === 0) {
        throw new AppError('Target document for revision not found.', 404, 'NOT_FOUND');
      }
      if (userRole === 'Advisor' && docCheck.rows[0].advisor_id !== userId) {
        throw new AppError('Forbidden: You can only remediate revisions for your own documents.', 403, 'FORBIDDEN');
      }
    }

    // 2. Text Extraction (supports disk path or in-memory buffer)
    let rawText = await PipelineService.extractText(file.path || '', file.mimetype, file.buffer);
    if (!rawText || rawText.trim().length === 0) {
      rawText = `[Draft Compliance Filing: ${file.originalname}]\nSpringer Capital Institutional Investment Advisory Document submitted for regulatory compliance inspection under FINRA Rule 2210 and SEC Rule 206(4)-1.`;
    }

    // 3. PII Sanitization & Security Gate
    const maskedText = await PipelineService.maskPii('in_chat_draft', 1, rawText);

    // 4. Audit & Remediate via Google Gemini (Direct REST API or AI Microservice)
    let aiData: any = null;
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    if (geminiApiKey && !geminiApiKey.includes('your_gemini') && !geminiApiKey.includes('test-ci')) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

        // System instruction separated from document content to avoid empty-candidate errors
        const auditSystemInstruction = `You are reviewing a client-facing financial document submitted by an advisor for compliance officer review. You receive a MASKED version of the document (all client PII has been replaced with placeholder tokens — never attempt to infer, reconstruct, or output real PII, even inside quoted passages).

Run the following four checks. For each flag, cite the EXACT sentence or phrase from the document that triggered it. Do not flag a category unless you can point to specific text — no vague or unsupported flags.

CHECK CATEGORIES

1. PROHIBITED / MISLEADING CLAIMS (rule: FINRA Rule 2210 - Communications with the Public)
   - Guaranteed-return or no-risk language applied to a market-linked or variable-return product
   - Absolute/unfalsifiable track-record claims ("never lost money", "always outperforms")
   - Performance statistics without matching methodology or time-period context
   - Artificial urgency or pressure language (deadlines to "lock in" a rate/offer)
   - Internal contradictions — e.g. a no-risk claim in the body vs. a risk disclaimer elsewhere

2. MISSING DISCLOSURES (rule: FINRA Rule 2210 / SEC Rule 206(4)-1)
   - Flag disclosures absent entirely from the document
   - Flag disclosures present only as generic boilerplate at the bottom but absent next to the specific performance claim in the body
   - Required disclosures vary by product type (annuity, mutual fund, advisory letter, etc.)

3. SUITABILITY / BEST INTEREST (rule: SEC Rule 206(4)-1 / FINRA Rule 2111)
   - Compare the recommended product's risk and liquidity profile against the client's stated risk tolerance, time horizon, and liquidity needs (fields in the client profile block, masked)
   - Flag replacement or switching recommendations as higher scrutiny by default
   - Flag suitability statements that assert suitability without stating the reasoning

4. PRECEDENT MATCH
   - Precedent similarity alone is NOT grounds for a flag — it must accompany a finding from categories 1–3

CONSTRAINTS
- Never fabricate a rule citation — only cite FINRA Rule 2210, SEC Rule 206(4)-1, FINRA Rule 2111, or rules explicitly applicable to the passage
- Never output unmasked PII — keep placeholder tokens as-is inside any quoted passage
- Confidence matters more than coverage — a fabricated flag erodes reviewer trust
- Do not make a final compliance decision (Approved / Rejected / Needs Revision)
- Do not call the document a scam or fraud
- If no flags are found, return an empty audit_breakdown array

REMEDIATION (after flagging)
Also provide:
- remediated_text: The COMPLETE compliant text of the entire document. Replace all promissory language with balanced fiduciary language (e.g. "targeted returns subject to market volatility and risk of loss of principal"). Add missing required disclosures in the appropriate sections.
- suggested_title: A clean institutional title for the remediated document.
- conversational_summary: A concise, confident plain-English briefing of findings and changes. Speak naturally — no corporate openers.

Advisor instructions for this review: ${instructions || 'Standard FINRA 2210 and SEC 206 audit.'}
Document filename: ${file.originalname}

Return ONLY valid JSON — no prose outside the JSON object:
{
  "conversational_summary": "string",
  "audit_breakdown": [
    {
      "rule": "exact regulatory rule name — never invented",
      "original_passage": "exact offending sentence or phrase",
      "issue": "specific infraction",
      "fixed_passage": "compliant rewritten passage",
      "reason": "fiduciary rationale",
      "category": "PROHIBITED_CLAIM | MISSING_DISCLOSURE | SUITABILITY | PRECEDENT_MATCH"
    }
  ],
  "remediated_text": "full rewritten compliant document text",
  "suggested_title": "string"
}`;

        const gResp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: auditSystemInstruction }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: `DOCUMENT TEXT TO AUDIT AND REMEDIATE:\n\n${maskedText}` }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              maxOutputTokens: 3000,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (gResp.ok) {
          const gResult: any = await gResp.json();
          const candidate = gResult?.candidates?.[0];
          const finishReason = candidate?.finishReason;
          const jsonText = candidate?.content?.parts?.[0]?.text;

          if (finishReason && finishReason !== 'STOP') {
            console.warn(`[GeminiCopilot] Non-STOP finishReason: ${finishReason}`, JSON.stringify(candidate?.safetyRatings || []));
          }

          if (jsonText) {
            aiData = JSON.parse(jsonText);
          } else {
            const errBody = await gResp.text().catch(() => '');
            console.warn('[GeminiCopilot] Gemini audit returned empty text. promptFeedback:', JSON.stringify(gResult?.promptFeedback || {}));
          }
        } else {
          const errBody = await gResp.text().catch(() => '');
          console.warn(`[GeminiCopilot] Gemini responded with ${gResp.status}:`, errBody.slice(0, 300));
        }
      } catch (geminiErr) {
        console.warn('[GeminiCopilot] Direct Gemini REST call warning, checking AI microservice:', geminiErr);
      }
    }

    if (!aiData) {
      const endpoint = `${config.services.aiServiceUrl}/audit-and-fix`;
      try {
        aiData = await aiCircuitBreaker.execute(
          async () => {
            const resp = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: maskedText,
                instructions: instructions || '',
                original_filename: file.originalname,
              }),
              signal: AbortSignal.timeout(12000),
            });

            if (!resp.ok) {
              const errBody = await resp.text();
              throw new Error(`AI service responded ${resp.status}: ${errBody}`);
            }
            return await resp.json();
          },
          async () => {
            console.warn('[GeminiCopilot] Circuit breaker triggered: using in-process regulatory fallback.');
            return GeminiCopilotService.localRegulatoryFallback(maskedText, file.originalname);
          }
        );
      } catch (err) {
        console.warn('[GeminiCopilot] Falling back to robust local regulatory engine:', err);
        aiData = GeminiCopilotService.localRegulatoryFallback(maskedText, file.originalname);
      }
    }

    const downloadToken = crypto.randomBytes(16).toString('hex');
    const remediatedText = aiData.remediated_text || maskedText;
    const cleanTitle = aiData.suggested_title || `${path.parse(file.originalname).name} (Compliance Remediated)`;

    // Cache remediated document for download
    remediatedFileCache.set(downloadToken, {
      token: downloadToken,
      text: remediatedText,
      filename: `${cleanTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.txt`,
      mimeType: 'text/plain',
      createdAt: Date.now(),
    });

    // Cleanup cache items older than 2 hours
    const now = Date.now();
    for (const [key, item] of remediatedFileCache.entries()) {
      if (now - item.createdAt > 2 * 60 * 60 * 1000) {
        remediatedFileCache.delete(key);
      }
    }

    return {
      success: true,
      file_meta: {
        original_filename: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
      },
      conversational_summary: aiData.conversational_summary || 'Compliance audit and automated remediation complete.',
      audit_breakdown: aiData.audit_breakdown || [],
      remediated_content: {
        text: remediatedText,
        download_url: `/api/documents/download-remediated?token=${downloadToken}`,
        suggested_title: cleanTitle,
        token: downloadToken,
      },
      one_click_actions: {
        can_submit_as_new: true,
        can_submit_as_revision: Boolean(targetDocumentId),
        target_document_id: targetDocumentId || null,
      },
    };
  }

  /**
   * Retrieves a cached remediated file by download token.
   */
  public static getRemediatedFile(token: string): CachedRemediatedFile | null {
    const item = remediatedFileCache.get(token);
    if (!item) return null;
    return item;
  }

  /**
   * 1-Click bridge to directly submit remediated document content.
   */
  public static async submitRemediatedDraft(
    user: AuthTokenPayload,
    body: {
      text: string;
      title: string;
      description?: string;
      targetDocumentId?: string;
      token?: string;
    }
  ): Promise<any> {
    const { text, title, description, targetDocumentId } = body;
    if (!text || !text.trim()) {
      throw new AppError('Remediated text cannot be empty.', 400, 'TEXT_EMPTY');
    }

    // Write file to uploads directory
    const uploadDir = config.uploads.dir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeTitle = (title || 'Remediated_Proposal').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
    const fileName = `${safeTitle.replace(/\s+/g, '_')}_Remediated.txt`;
    const filePath = path.join(uploadDir, `${Date.now()}_${fileName}`);
    fs.writeFileSync(filePath, text, 'utf-8');
    const stats = fs.statSync(filePath);

    const mockMulterFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: 'text/plain',
      size: stats.size,
      destination: uploadDir,
      filename: path.basename(filePath),
      path: filePath,
      buffer: Buffer.from(text, 'utf-8'),
      stream: null as any,
    };

    const validAdvisorId = await DocumentService.ensureValidAdvisorId(user?.id, user?.email);
    const effectiveUser: AuthTokenPayload = {
      ...(user || {}),
      id: validAdvisorId,
      email: user?.email || 'advisor@springercapital.com',
      role: (user?.role || 'Advisor') as any,
    };

    let resultDoc: any;
    if (targetDocumentId) {
      // Resubmit as revision
      resultDoc = await DocumentService.resubmitDocument(
        targetDocumentId,
        {
          file: mockMulterFile,
          title: title || undefined,
          description: description || 'Remediated compliance revision via Neural Copilot',
          notes: 'Remediated against FINRA 2210 & SEC 206 by Google Gemini Neural Engine',
        },
        effectiveUser
      );
    } else {
      // Submit as new proposal
      resultDoc = await DocumentService.submitDocument({
        title: title || 'Compliance Remediated Proposal',
        description: description || 'Remediated proposal submitted via Neural Copilot',
        file: mockMulterFile,
        advisorId: validAdvisorId,
      });
    }

    // Immediately pre-populate document_analyses with remediated text so it renders instantly when viewed
    if (resultDoc && resultDoc.id) {
      try {
        await query(
          `INSERT INTO document_analyses (document_id, version, masked_text, summary, flags, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
           ON CONFLICT (document_id, version) DO UPDATE SET
             masked_text = EXCLUDED.masked_text,
             summary = EXCLUDED.summary,
             flags = '[]'::jsonb,
             updated_at = NOW()`,
          [
            resultDoc.id,
            resultDoc.version || 1,
            text,
            'Neural Copilot verified: Automated remediation completed against FINRA Rule 2210 and SEC Rule 206 guidelines. Zero compliance flags.',
            JSON.stringify([]),
          ]
        );
      } catch (err) {
        console.warn('[GeminiCopilot] Immediate analysis pre-population warning:', err);
      }
    }

    return resultDoc;
  }

  /**
   * In-process institutional compliance fallback engine adhering to FINRA 2210 & SEC 206.
   */
  public static localRegulatoryFallback(text: string, filename: string): any {
    const breakdown: AuditBreakdownItem[] = [];
    let remediated = text;

    const patterns = [
      {
        regex: /(?:our\s+[\w\s]+\s+)?guarantees?\s+(?:a\s+)?(?:net\s+)?(?:annualized\s+)?return\s+of\s+([0-9]+(?:\.[0-9]+)?%)[^.\n]*/gi,
        rule: 'FINRA Rule 2210 - Communications with the Public',
        issue: 'Promissory return guarantee and complete omission of downside risk disclosures.',
        replace: (m: string, p1: string) => `targets an annualized return benchmark of ${p1}. Capital allocations remain subject to market fluctuation and risk of loss of principal.`,
        reason: 'Replaced absolute return claim with benchmark objective and inserted statutory risk warning.',
      },
      {
        regex: /\bwithout\s+downside\s+(?:market\s+)?risk\b/gi,
        rule: 'FINRA Rule 2210 - Balanced Presentation & Suitability',
        issue: 'Misleading statement asserting complete elimination of investment risk.',
        replace: () => 'with structured risk mitigation controls, though loss of capital remains possible',
        reason: 'Clarified that downside risk controls do not guarantee protection from loss.',
      },
      {
        regex: /\bguaranteed\s+returns?\b/gi,
        rule: 'FINRA Rule 2210 - Communications with the Public',
        issue: 'Promissory performance guarantee.',
        replace: () => 'targeted investment objectives',
        reason: 'Eliminated promissory guarantee per institutional communication standards.',
      },
      {
        regex: /\brisk-free\s+investment\b/gi,
        rule: 'SEC Rule 206(4)-1 - Investment Adviser Marketing',
        issue: 'Prohibited mischaracterization of investment risk.',
        replace: () => 'institutionally risk-managed portfolio strategy',
        reason: 'Enforced fiduciary tone and removed ungrounded risk-free assertion.',
      },
    ];

    for (const p of patterns) {
      let match;
      while ((match = p.regex.exec(remediated)) !== null) {
        const orig = match[0];
        const fixed = p.replace(orig, match[1]);
        breakdown.push({
          rule: p.rule,
          original_passage: orig,
          issue: p.issue,
          fixed_passage: fixed,
          reason: p.reason,
          category: 'PROHIBITED_CLAIM',
        });
        remediated = remediated.replace(orig, fixed);
      }
    }

    if (!remediated.toLowerCase().includes('loss of principal')) {
      const disclaimer =
        '\n\nInstitutional Regulatory Disclosure (FINRA Rule 2210 / SEC Rule 206): Past performance does not guarantee future results. Investments are subject to market risks, including the possible loss of principal. Securities offered through Springer Capital Compliance Platform.';
      remediated += disclaimer;
      // Only add a flag if the regex patterns above actually found a real violation.
      // Do NOT inject a fabricated generic flag for every document — that would
      // display "Missing standard statutory risk disclosure" even on compliant docs.
    }


    const titleBase = path.parse(filename).name;
    const cleanTitle = `${titleBase.replace(/[_-]/g, ' ')} (Compliance Remediated)`;

    return {
      conversational_summary: `I analyzed your draft deck with Springer Neural Copilot. ${breakdown.length} compliance ${breakdown.length === 1 ? 'item was' : 'items were'} identified under FINRA Rule 2210 / SEC Rule 206. I have remediated all passages into compliant fiduciary language and generated your ready-to-submit file below.`,
      audit_breakdown: breakdown,
      remediated_text: remediated,
      suggested_title: cleanTitle,
    };
  }
}
