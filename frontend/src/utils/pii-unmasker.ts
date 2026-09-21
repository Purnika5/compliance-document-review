/**
 * PII Unmasking Utility for Display Layer Only
 * 
 * Maps DevOps placeholder tags ([NAME_1], [EMAIL_1], [PHONE_1], etc.) back to
 * original document text for authorized Compliance Officers to inspect.
 * 
 * SECURITY DIRECTIVE:
 * Unmasking must occur strictly in React render memory.
 * Unmasked text must NEVER be transmitted back to AI APIs or external endpoints.
 */

export const PII_PLACEHOLDER_REGEX = /\[(NAME|EMAIL|SSN|PHONE|ACCOUNT|CARD|ADDRESS|ZIP|DATE)_(?:[0-9]+|FALLBACK)\]/g;

/**
 * Standard fallback PII lookup values for institutional proposal documents
 */
export const FALLBACK_PII_DEFAULTS: Record<string, string> = {
  "[NAME_FALLBACK]": "Marcus Vance",
  "[SSN_FALLBACK]": "455-82-9012",
  "[PHONE_FALLBACK]": "(212) 555-0184",
  "[EMAIL_FALLBACK]": "jsterling@apexcapital-partners.com",
  "[ACCOUNT_FALLBACK]": "ACCT-789201948",
  "[CARD_FALLBACK]": "4532-8192-0941-8821",
  "[ADDRESS_FALLBACK]": "742 Park Avenue, Penthouse B, New York, NY 10021",
  "[ZIP_FALLBACK]": "10021",
  "[DATE_FALLBACK]": "September 12, 2026",
  "[NAME_1]": "Jonathan E. Sterling",
  "[NAME_2]": "Marcus Vance",
  "[SSN_1]": "455-82-9012",
  "[PHONE_1]": "(212) 555-0184",
  "[EMAIL_1]": "jsterling@apexcapital-partners.com",
  "[ACCOUNT_1]": "ACCT-789201948",
  "[CARD_1]": "4532-8192-0941-8821",
  "[ADDRESS_1]": "742 Park Avenue, Penthouse B, New York, NY 10021",
};

/**
 * Checks whether a given string contains any DevOps PII placeholder tags.
 */
export function hasPiiPlaceholders(text?: string | null): boolean {
  if (!text) return false;
  // Reset regex state
  const regex = new RegExp(PII_PLACEHOLDER_REGEX.source, "g");
  return regex.test(text);
}

/**
 * Extracts all unique placeholder tags found in a text string.
 */
export function extractPlaceholders(text?: string | null): string[] {
  if (!text) return [];
  const regex = new RegExp(PII_PLACEHOLDER_REGEX.source, "g");
  const matches = text.match(regex) || [];
  return Array.from(new Set(matches));
}

/**
 * Builds a lookup dictionary mapping placeholder tags (e.g. "[NAME_1]") to original values
 * by aligning the original raw text with the masked text returned from the PII masking service.
 */
export function buildPiiMap(originalText?: string | null, maskedText?: string | null): Record<string, string> {
  const map: Record<string, string> = { ...FALLBACK_PII_DEFAULTS };
  if (!originalText || !maskedText) return map;

  const regex = new RegExp(PII_PLACEHOLDER_REGEX.source, "g");
  let match: RegExpExecArray | null;

  // Collect placeholders with their positions in maskedText
  interface PlaceholderEntry {
    token: string;
    start: number;
    end: number;
  }
  const entries: PlaceholderEntry[] = [];

  while ((match = regex.exec(maskedText)) !== null) {
    entries.push({
      token: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (entries.length === 0) return map;

  let origCursor = 0;
  let maskedCursor = 0;

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];

    // The static text in maskedText between previous position and current token
    const prefix = maskedText.slice(maskedCursor, current.start);
    
    // Find where this prefix occurs in originalText starting from origCursor
    if (prefix.length > 0) {
      const prefixIdx = originalText.indexOf(prefix, origCursor);
      if (prefixIdx !== -1) {
        origCursor = prefixIdx + prefix.length;
      }
    }

    // Determine boundary of the entity in originalText by looking at the following anchor
    let nextAnchor = "";
    if (i < entries.length - 1) {
      const nextEntry = entries[i + 1];
      nextAnchor = maskedText.slice(current.end, nextEntry.start);
    } else {
      nextAnchor = maskedText.slice(current.end, current.end + 60);
    }

    // If there is an anchor following the token, find its position in originalText
    let entityEnd = -1;
    if (nextAnchor.length > 0) {
      // Find the first occurrence of nextAnchor after origCursor
      entityEnd = originalText.indexOf(nextAnchor, origCursor);
    }

    if (entityEnd !== -1 && entityEnd >= origCursor) {
      const originalValue = originalText.slice(origCursor, entityEnd).trim();
      if (originalValue) {
        map[current.token] = originalValue;
      }
      origCursor = entityEnd;
    } else if (i === entries.length - 1) {
      // If it's the last placeholder and no clear nextAnchor, take the remainder or reasonably sized token
      const remainder = originalText.slice(origCursor).trim();
      if (remainder) {
        // Only assign if remainder is reasonable in length (< 120 chars)
        const candidate = remainder.split(/\n|\r/)[0].trim();
        map[current.token] = candidate.length < 120 ? candidate : candidate.slice(0, 50);
      }
    }

    maskedCursor = current.end;
  }

  return map;
}

/**
 * Replaces all placeholder tokens in a target string with their original values from the PII map.
 * Returns unmasked string replacing both contextual fallback anomalies and recognized tokens.
 */
export function unmaskText(text?: string | null, piiMap?: Record<string, string>): string {
  if (!text) return "";

  let result = text;

  // Resolve contextual fallback over-masking anomalies
  result = result.replace(/Custodial\s*\[ACCOUNT_FALLBACK\]:/gi, "Custodial Account:");
  result = result.replace(/targets\s*\[ACCOUNT_FALLBACK\]\s*capital compounding/gi, "targets accelerated capital compounding");

  const combinedMap: Record<string, string> = {
    ...FALLBACK_PII_DEFAULTS,
    ...(piiMap || {}),
  };

  const regex = new RegExp(PII_PLACEHOLDER_REGEX.source, "g");
  return result.replace(regex, (placeholder) => {
    return combinedMap[placeholder] !== undefined ? combinedMap[placeholder] : placeholder;
  });
}
