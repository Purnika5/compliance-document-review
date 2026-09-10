/**
 * pii.service.ts
 * --------------
 * Backend TypeScript service for PII masking.
 * Provides deterministic anonymization and integration with the DevOps PII Masker service.
 */

export interface MaskRequestPayload {
  document_id?: string;
  version?: number;
  text?: string;
  raw_text?: string;
  masked_text?: string;
  content?: string;
}

export interface MaskResponsePayload {
  document_id: string;
  version: number;
  masked_text: string;
}

const STOPWORDS = new Set([
  'Springer', 'Capital', 'Compliance', 'Document', 'Review', 'Securities',
  'Exchange', 'Commission', 'Financial', 'Industry', 'Regulatory', 'Authority',
  'Rule', 'Section', 'Article', 'Table', 'Report', 'Audit', 'Account',
  'Investment', 'Fund', 'Advisor', 'Officer', 'User', 'Admin', 'Page',
  'Version', 'Date', 'Status', 'Pending', 'Approved', 'Rejected', 'Revision',
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
  'Dear', 'Please', 'Thank', 'Thanks', 'Regards', 'Sincerely', 'Best'
]);

export class PiiService {
  /**
   * Masks text deterministically using the standardized placeholder formats:
   * [NAME_1], [SSN_1], [EMAIL_1], [PHONE_1], [ACCOUNT_1], etc.
   */
  public static maskText(text: string): string {
    if (!text) return '';

    const entityMap = new Map<string, string>();
    const counters: Record<string, number> = {
      NAME: 0,
      EMAIL: 0,
      SSN: 0,
      PHONE: 0,
      CARD: 0,
      ACCOUNT: 0,
    };

    const getPlaceholder = (type: string, raw: string): string => {
      const key = `${type}:${raw.trim().toLowerCase()}`;
      if (!entityMap.has(key)) {
        counters[type] = (counters[type] || 0) + 1;
        entityMap.set(key, `[${type}_${counters[type]}]`);
      }
      return entityMap.get(key)!;
    };

    // 0. Protect existing placeholders
    const protectedPlaceholders = new Map<string, string>();
    let workingText = text.replace(/(\[(?:NAME|EMAIL|SSN|PHONE|ACCOUNT|CARD|ADDRESS|ZIP|DATE)_[0-9]+\])/g, (match) => {
      const token = `__PII_PROTECTED_${protectedPlaceholders.size}__`;
      protectedPlaceholders.set(token, match);
      return token;
    });

    // 1. Email pattern
    workingText = workingText.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      (email) => getPlaceholder('EMAIL', email)
    );

    // 2. SSN pattern (000-00-0000 or labeled 9 digits)
    workingText = workingText.replace(
      /(?:\b\d{3}[-\s]\d{2}[-\s]\d{4}\b)|(?:(?:ssn|social\s+security|ss#)[\s:]*(\b\d{9}\b|\b\d{3}[-\s]\d{2}[-\s]\d{4}\b))/gi,
      (match, g1) => {
        const target = g1 || match;
        const digits = target.replace(/\D/g, '');
        if (digits.length === 9) {
          const ph = getPlaceholder('SSN', digits);
          return match.replace(target, ph);
        }
        return match;
      }
    );

    // 3. Card pattern
    workingText = workingText.replace(
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      (card) => getPlaceholder('CARD', card.replace(/\D/g, ''))
    );

    // 4. Phone pattern
    workingText = workingText.replace(
      /(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
      (phone) => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 10 && !phone.startsWith('[')) {
          return getPlaceholder('PHONE', digits);
        }
        return phone;
      }
    );

    // 5. Salutation and prefixed names
    workingText = workingText.replace(
      /(?:(?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Prof\.)\s+|(?:Dear|Attn:|Attention:|Advisor:|Client:|Customer:)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,
      (match, namePart) => {
        if (namePart && !STOPWORDS.has(namePart.trim())) {
          const ph = getPlaceholder('NAME', namePart);
          return match.replace(namePart, ph);
        }
        return match;
      }
    );

    // 6. Restore protected placeholders
    for (const [token, original] of protectedPlaceholders.entries()) {
      workingText = workingText.replace(token, original);
    }

    return workingText;
  }

  /**
   * Process a document payload matching the platform input/output contract.
   */
  public static maskDocument(payload: MaskRequestPayload): MaskResponsePayload {
    const documentId = payload.document_id || 'doc-001';
    const version = payload.version !== undefined ? payload.version : 1;
    const rawText = payload.text || payload.raw_text || payload.content || payload.masked_text || '';

    const maskedText = this.maskText(rawText);

    return {
      document_id: documentId,
      version: version,
      masked_text: maskedText,
    };
  }
}
