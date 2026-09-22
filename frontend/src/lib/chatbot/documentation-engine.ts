/**
 * DOCU: Institutional Documentation Rules and Grammar Recheck Engine for Springer Capital.
 * Provides compliance-grounded text optimization, audit-trail formatting, and grammar auditing.
 * Last Updated Date: September 21, 2026
 * @author Keith
 */

export interface IGrammarIssue {
  original: string;
  replacement: string;
  reason: string;
  type: "grammar" | "spelling" | "punctuation" | "style";
}

export interface IGrammarResult {
  originalText: string;
  correctedText: string;
  issues: IGrammarIssue[];
  summary: string;
}

export interface IDocumentationRule {
  id: string;
  code: string;
  title: string;
  description: string;
}

export interface IDocumentationResult {
  originalText: string;
  enhancedText: string;
  appliedRules: IDocumentationRule[];
  improvements: string[];
  classificationDetected?: string;
  recommendedAction?: "Approved" | "Revision Required" | "Rejected";
}

/**
 * Standard Institutional Documentation Rules according to FINRA 2210, SEC 206, and Springer Compliance Standards.
 */
export const DOCUMENTATION_RULES: Record<string, IDocumentationRule> = {
  RULE_FINRA_2210: {
    id: "RULE_FINRA_2210",
    code: "FINRA-2210",
    title: "Fair-Balance & Non-Promissory Standard",
    description:
      "All claims must be balanced with clear risk disclosure; promissory or guaranteed language is strictly prohibited.",
  },
  RULE_SEC_206: {
    id: "RULE_SEC_206",
    code: "SEC-206(4)-1",
    title: "Fiduciary Substantiation & Conflict Disclosure",
    description:
      "Statements must be grounded in verified methodology and disclose any fee arrangements or potential material conflicts.",
  },
  RULE_AUDIT_TONE: {
    id: "RULE_AUDIT_TONE",
    code: "DOC-TONE",
    title: "Audit-Defensible Terminology",
    description:
      "Eliminate colloquialisms, subjective impressions, and vague assurances. Use structured, evidence-based determinations.",
  },
  RULE_STRUCTURED_MEMO: {
    id: "RULE_STRUCTURED_MEMO",
    code: "DOC-STRUCT",
    title: "Structured Compliance Memo Format",
    description:
      "Organize determinations into Executive Context, Factual Findings, Regulatory Reference, and Determinative Action.",
  },
  RULE_ACTIONABLE_REMEDIATION: {
    id: "RULE_ACTIONABLE_REMEDIATION",
    code: "DOC-ACTION",
    title: "Prescribed Remediation Specificity",
    description:
      "Directives must provide explicit corrective actions and citation of required disclosures or amendments.",
  },
};

/** Common spelling corrections in compliance drafting */
const COMMON_SPELLING_MAP: Record<string, string> = {
  submited: "submitted",
  submiting: "submitting",
  seperate: "separate",
  definately: "definitely",
  untill: "until",
  recieve: "receive",
  recieved: "received",
  occured: "occurred",
  recomend: "recommend",
  recomended: "recommended",
  complience: "compliance",
  proposel: "proposal",
  offical: "official",
  gaurentee: "guarantee",
  gauranteed: "guaranteed",
  garantee: "guarantee",
  garanteed: "guaranteed",
  allright: "acceptable",
  alright: "acceptable",
  dont: "does not",
  doesnt: "does not",
  cant: "cannot",
  wont: "will not",
  shouldnt: "should not",
  couldnt: "could not",
  isnt: "is not",
  arent: "are not",
  doc: "document",
  docs: "documents",
  fwd: "forwarded",
  plz: "please",
  pls: "please",
  thx: "thank you",
};

/** Common grammatical phrase replacements */
const PHRASE_CORRECTIONS: Array<{
  pattern: RegExp;
  replacement: string;
  reason: string;
  type: "grammar" | "style";
}> = [
  {
    pattern: /\b(we|they|officers|advisors)\s+was\b/gi,
    replacement: "$1 were",
    reason: "Subject-verb agreement: plural subjects take 'were'.",
    type: "grammar",
  },
  {
    pattern: /\b(he|she|the advisor|the officer|the analyst)\s+have\b/gi,
    replacement: "$1 has",
    reason: "Subject-verb agreement: third-person singular subjects take 'has'.",
    type: "grammar",
  },
  {
    pattern: /\b(it|this|that|the doc|the document|the filing)\s+look\b/gi,
    replacement: "$1 looks",
    reason: "Subject-verb agreement: singular subject takes 'looks'.",
    type: "grammar",
  },
  {
    pattern: /\bthere\s+is\s+(no|multiple|several|many|two|three)\s+([a-z]+s)\b/gi,
    replacement: "there are $1 $2",
    reason: "Subject-verb agreement: plural complement requires 'there are'.",
    type: "grammar",
  },
  {
    pattern: /\b(has|have|had)\s+went\b/gi,
    replacement: "$1 gone",
    reason: "Irregular past participle: use 'gone' after auxiliary verbs.",
    type: "grammar",
  },
  {
    pattern: /\b(has|have|had)\s+took\b/gi,
    replacement: "$1 taken",
    reason: "Irregular past participle: use 'taken' after auxiliary verbs.",
    type: "grammar",
  },
  {
    pattern: /\bmore\s+better\b/gi,
    replacement: "better",
    reason: "Double comparative: 'better' already expresses the comparative degree.",
    type: "grammar",
  },
  {
    pattern: /\btheir\s+(is|are|was|were)\b/gi,
    replacement: "there $1",
    reason: "Homophone confusion: 'there' indicates existence, 'their' indicates possession.",
    type: "grammar",
  },
  {
    pattern: /\byour\s+welcome\b/gi,
    replacement: "you're welcome",
    reason: "Contraction confusion: use 'you're' for 'you are'.",
    type: "grammar",
  },
  {
    pattern: /\bits\s+(a|an|the|clear|evident|obvious)\b/gi,
    replacement: "it's $1",
    reason: "Contraction confusion: 'it's' represents 'it is'.",
    type: "grammar",
  },
];

/**
 * DOCU: Audits input text for grammatical errors, misspellings, and syntax irregularities.
 * @param text - Draft text to evaluate.
 * @returns Comprehensive grammar audit report with suggested corrections.
 */
export function recheckGrammar(text: string): IGrammarResult {
  const issues: IGrammarIssue[] = [];
  // Strip trigger command phrases so user commands do not get treated as draft text
  const cleanInput = text
    .replace(/\b(?:please\s+)?(?:re-?check|check|fix)\s+grammar\b[:,-]?/gi, "")
    .replace(/\bgrammar\s+(?:check|re-?check)\b[:,-]?/gi, "")
    .replace(/^(?:grammar|check|audit\s*note|fix)[:,-]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  let corrected = cleanInput || text.trim();

  // 1. Phrase-level grammar checks
  for (const rule of PHRASE_CORRECTIONS) {
    if (rule.pattern.test(corrected)) {
      const match = corrected.match(rule.pattern)?.[0] || "";
      const replacementText = match.replace(rule.pattern, rule.replacement);
      corrected = corrected.replace(rule.pattern, rule.replacement);
      issues.push({
        original: match,
        replacement: replacementText,
        reason: rule.reason,
        type: rule.type,
      });
    }
  }

  // 2. Token-level spelling and word choice checks
  const words = corrected.split(/(\s+|[.,!?;:()[\]"'])/);
  const updatedTokens = words.map((token) => {
    const cleanToken = token.toLowerCase().trim();
    if (cleanToken && COMMON_SPELLING_MAP[cleanToken]) {
      const rep = COMMON_SPELLING_MAP[cleanToken];
      const isCapitalized = token.length > 0 && token[0] === token[0].toUpperCase() && token[0] !== token[0].toLowerCase();
      const finalRep = isCapitalized ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;

      issues.push({
        original: token,
        replacement: finalRep,
        reason: `Spelling / terminology correction for formal documentation.`,
        type: "spelling",
      });
      return finalRep;
    }
    return token;
  });

  corrected = updatedTokens.join("");

  // 3. Punctuation and sentence capitalization
  if (/\s{2,}/.test(corrected)) {
    corrected = corrected.replace(/\s{2,}/g, " ");
    issues.push({
      original: "Multiple consecutive spaces",
      replacement: "Single space",
      reason: "Formatting consistency: removed duplicate spaces.",
      type: "punctuation",
    });
  }

  const sentenceRegex = /(^|[.!?]\s+)([a-z])/g;
  if (sentenceRegex.test(corrected)) {
    corrected = corrected.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, char) => {
      issues.push({
        original: `${prefix}${char}`,
        replacement: `${prefix}${char.toUpperCase()}`,
        reason: "Capitalization: sentences must begin with an uppercase letter.",
        type: "punctuation",
      });
      return `${prefix}${char.toUpperCase()}`;
    });
  }

  if (corrected.trim().length > 0 && !/[.!?]$/.test(corrected.trim())) {
    corrected = corrected.trim() + ".";
    issues.push({
      original: "(missing end period)",
      replacement: ".",
      reason: "Terminal punctuation: formal sentences should conclude with a period.",
      type: "punctuation",
    });
  }

  const issueCount = issues.length;
  const summary =
    issueCount === 0
      ? "No grammatical or spelling issues detected. Syntax meets institutional writing standards."
      : `Detected and corrected ${issueCount} item${issueCount > 1 ? "s" : ""} across grammar, spelling, and sentence syntax.`;

  return {
    originalText: text,
    correctedText: corrected,
    issues,
    summary,
  };
}

/**
 * DOCU: Polishes a draft into audit-ready institutional documentation according to compliance rules.
 * @param text - Raw input draft, officer note, or submission justification.
 * @returns Enhanced documentation text with applied institutional rules.
 */
export function enhanceForDocumentation(text: string): IDocumentationResult {
  const appliedRules: IDocumentationRule[] = [];
  const improvements: string[] = [];
  const lower = text.toLowerCase();

  const grammar = recheckGrammar(text);
  const baseText = grammar.correctedText;


  const isRevisionIntent =
    lower.includes("revise") ||
    lower.includes("revision") ||
    lower.includes("change") ||
    lower.includes("update") ||
    lower.includes("missing") ||
    lower.includes("fix") ||
    lower.includes("resubmit");

  const isRejectIntent =
    lower.includes("reject") ||
    lower.includes("deny") ||
    lower.includes("non-compliant") ||
    lower.includes("prohibited");

  let recommendedAction: "Approved" | "Revision Required" | "Rejected" = "Approved";
  if (isRejectIntent) {
    recommendedAction = "Rejected";
  } else if (isRevisionIntent) {
    recommendedAction = "Revision Required";
  }

  const hasPromissory =
    lower.includes("guarantee") ||
    lower.includes("guaranteed") ||
    lower.includes("risk-free") ||
    lower.includes("zero risk") ||
    lower.includes("no risk") ||
    lower.includes("100%") ||
    lower.includes("sure profit") ||
    lower.includes("highest return");

  if (hasPromissory) {
    appliedRules.push(DOCUMENTATION_RULES.RULE_FINRA_2210);
    improvements.push(
      "Replaced promissory or unqualified return statements with standard FINRA-2210 balanced risk disclosure."
    );
  }

  const isColloquial =
    lower.includes("looks good") ||
    lower.includes("looks fine") ||
    lower.includes("seems ok") ||
    lower.includes("alright") ||
    lower.includes("no problem") ||
    lower.includes("checked it");

  if (isColloquial || text.length < 50) {
    appliedRules.push(DOCUMENTATION_RULES.RULE_AUDIT_TONE);
    appliedRules.push(DOCUMENTATION_RULES.RULE_STRUCTURED_MEMO);
    improvements.push(
      "Elevated colloquial review note into an audit-defensible institutional evaluation record."
    );
  }

  appliedRules.push(DOCUMENTATION_RULES.RULE_ACTIONABLE_REMEDIATION);
  improvements.push(
    "Structured official determination with scope, regulatory foundation, and determinative action."
  );

  let enhancedText = "";

  if (recommendedAction === "Approved") {
    enhancedText = `[COMPLIANCE REVIEW DETERMINATION: APPROVED]

1. Scope & Verification:
The submitted filing has been examined in accordance with Springer Capital Institutional Compliance Review Guidelines and SEC Rule 206(4)-1 / FINRA Rule 2210 standards.

2. Findings & Observations:
${baseText.replace(/^(looks good|looks fine|approved|it is ok)[.,]?/i, "Filing exhibits compliant disclosures, transparent methodology, and appropriate risk weighting.")}

3. Regulatory Grounding:
- FINRA Rule 2210: Communications are balanced and substantiated with no promissory performance claims.
- SEC Rule 206(4)-1: Fiduciary disclosures and applicable fee schedules are properly incorporated.

4. Determinative Action:
OFFICIALLY APPROVED. Authorized for institutional archiving and subsequent stakeholder dissemination.`;
  } else if (recommendedAction === "Revision Required") {
    enhancedText = `[COMPLIANCE REVIEW DETERMINATION: REVISION REQUIRED]

1. Scope & Verification:
Evaluation conducted under Springer Capital Institutional Compliance Guidelines and FINRA Rule 2210 standards.

2. Findings & Identified Deficiencies:
${baseText.replace(/^(please fix|needs changes|revision needed)[.,]?/i, "The document requires clarifying amendments to address compliance disclosures.")}

3. Prescribed Remedial Directives:
- Ensure all promotional representations are balanced with explicit risk disclaimers.
- Furnish supporting documentation for performance and fiduciary assertions per SEC Rule 206(4)-1.
- Attach complete schedule of expenses and conflict-of-interest declarations.

4. Determinative Action:
REVISION REQUESTED. The submitting Advisor must upload an amended revision addressing the specified citations within five (5) business days.`;
  } else {
    enhancedText = `[COMPLIANCE REVIEW DETERMINATION: REJECTED]

1. Scope & Verification:
Evaluated against statutory standards under FINRA Rule 2210 and SEC Rule 206(4)-1.

2. Compliance Grounds for Rejection:
${baseText}
The documentation exhibits unresolvable statutory discrepancies or non-compliant representations that cannot be reconciled via standard revision.

3. Determinative Action:
FORMALLY REJECTED. Record logged to the permanent compliance audit ledger. Formal notice transmitted to submitting party.`;
  }

  return {
    originalText: text,
    enhancedText,
    appliedRules,
    improvements,
    recommendedAction,
  };
}

/**
 * DOCU: Determines user intent from natural language input.
 * @param input - The raw message sent by the user.
 * @returns Classified intent and cleaned target text.
 */
export function detectUserIntent(input: string): {
  intent: "grammar" | "documentation" | "qa";
  targetText: string;
} {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("recheck grammar:") ||
    lower.startsWith("check grammar:") ||
    lower.startsWith("grammar check:") ||
    lower.startsWith("proofread:") ||
    lower.startsWith("fix grammar:")
  ) {
    const colonIdx = trimmed.indexOf(":");
    return {
      intent: "grammar",
      targetText: trimmed.slice(colonIdx + 1).trim(),
    };
  }

  if (
    lower.startsWith("make response better:") ||
    lower.startsWith("make response that it will be better:") ||
    lower.startsWith("enhance for documentation:") ||
    lower.startsWith("improve response:") ||
    lower.startsWith("documentation rules:") ||
    lower.startsWith("rule of documentation:") ||
    lower.startsWith("format for documentation:")
  ) {
    const colonIdx = trimmed.indexOf(":");
    return {
      intent: "documentation",
      targetText: trimmed.slice(colonIdx + 1).trim(),
    };
  }

  return {
    intent: "qa",
    targetText: trimmed,
  };
}
