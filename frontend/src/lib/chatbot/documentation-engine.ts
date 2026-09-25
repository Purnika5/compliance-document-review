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
  type: "grammar" | "spelling" | "punctuation" | "style" | "unrecognized_word" | "sentence_structure";
}

export interface ISentenceQuality {
  status: "good" | "needs_revision" | "invalid";
  label: "Good Sentence" | "Needs Revision" | "Bad Sentence (Unrecognized Words)" | "Sentence Fragment (Missing Verb)";
  details: string;
  unrecognizedWords: string[];
  isWordValid: boolean;
  hasSubjectVerb: boolean;
}

export interface IGrammarResult {
  originalText: string;
  correctedText: string;
  issues: IGrammarIssue[];
  summary: string;
  sentenceQuality?: ISentenceQuality;
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
  grammer: "grammar",
  gramar: "grammar",
  gramer: "grammar",
  sentance: "sentence",
  sentense: "sentence",
  prooffread: "proofread",
  corect: "correct",
  sucessful: "successful",
  neccessary: "necessary",
  unfortuantly: "unfortunately",
  statment: "statement",
  managment: "management",
  disclosur: "disclosure",
  fiduciery: "fiduciary",
};

/** Common grammatical phrase replacements */
const PHRASE_CORRECTIONS: Array<{
  pattern: RegExp;
  replacement: string;
  reason: string;
  type: "grammar" | "style";
}> = [
  {
    pattern: /\bi\s+want\s+more\s+to\s+fix\b/gi,
    replacement: "I would like to fix",
    reason: "Phrasing: 'I would like to fix' provides clearer, more natural phrasing.",
    type: "grammar",
  },
  {
    pattern: /\bi\s+is\b/gi,
    replacement: "I am",
    reason: "Subject-verb agreement: first-person singular 'I' takes 'am'.",
    type: "grammar",
  },
  {
    pattern: /\b(we|they|officers|advisors)\s+is\b/gi,
    replacement: "$1 are",
    reason: "Subject-verb agreement: plural subjects take 'are'.",
    type: "grammar",
  },
  {
    pattern: /\b(he|she|it|this|that|the filing|the proposal|the document)\s+are\b/gi,
    replacement: "$1 is",
    reason: "Subject-verb agreement: singular subjects take 'is'.",
    type: "grammar",
  },
  {
    pattern: /\b(the team|the committee|the fund|the firm)\s+have\b/gi,
    replacement: "$1 has",
    reason: "Subject-verb agreement: collective entities take 'has' in formal writing.",
    type: "grammar",
  },
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
    pattern: /\b(dont|does not|doesn't)\s+have\s+no\b/gi,
    replacement: "does not have any",
    reason: "Double negative: replace with 'does not have any'.",
    type: "grammar",
  },
  {
    pattern: /\b(could|should|would)\s+of\b/gi,
    replacement: "$1 have",
    reason: "Grammatical confusion: use 'have' instead of 'of' after modal auxiliaries.",
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
  {
    pattern: /\bguaranteed\s+returns?\b/gi,
    replacement: "targeted returns (subject to market risks)",
    reason: "FINRA Rule 2210 & SEC Rule 206: Prohibits guaranteed performance claims in public communications.",
    type: "style",
  },
  {
    pattern: /\brisk-free\s+investment\b/gi,
    replacement: "conservative lower-volatility strategy",
    reason: "FINRA Rule 2210: Investment products cannot be characterized as 'risk-free'.",
    type: "style",
  },
];

/** Common English vocabulary (core words, finance, compliance, and institutional terms) */
const ENGLISH_VOCABULARY = new Set([
  // Articles, prepositions, conjunctions, pronouns
  "a", "an", "the", "in", "on", "at", "by", "for", "with", "about", "against", "between",
  "into", "through", "during", "before", "after", "above", "below", "to", "from", "up",
  "down", "of", "off", "over", "under", "again", "further", "then", "once", "here", "there",
  "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "can", "will", "just", "should", "now", "and", "but", "if", "or", "because", "as", "until",
  "while", "upon", "out", "i", "me", "my", "myself", "we", "our", "ours", "ourselves",
  "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
  "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs",
  "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having",
  "do", "does", "did", "doing", "would", "could", "ought", "must", "shall", "might", "may",
  // Common verbs
  "say", "says", "said", "get", "gets", "got", "make", "makes", "made", "go", "goes", "went",
  "gone", "know", "knows", "knew", "known", "take", "takes", "took", "taken", "see", "sees",
  "saw", "seen", "come", "comes", "came", "think", "thinks", "thought", "look", "looks",
  "looked", "want", "wants", "wanted", "give", "gives", "gave", "given", "use", "uses", "used",
  "find", "finds", "found", "tell", "tells", "told", "ask", "asks", "asked", "work", "works",
  "worked", "seem", "seems", "seemed", "feel", "feels", "felt", "try", "tries", "tried",
  "leave", "leaves", "left", "call", "calls", "called", "need", "needs", "needed", "become",
  "becomes", "became", "put", "puts", "mean", "means", "meant", "keep", "keeps", "kept",
  "let", "lets", "begin", "begins", "began", "begun", "help", "helps", "helped", "talk",
  "talks", "talked", "turn", "turns", "turned", "start", "starts", "started", "show", "shows",
  "showed", "shown", "hear", "hears", "heard", "run", "runs", "ran", "move", "moves", "moved",
  "like", "likes", "liked", "live", "lives", "lived", "believe", "believes", "believed",
  "hold", "holds", "held", "bring", "brings", "brought", "happen", "happens", "happened",
  "write", "writes", "wrote", "written", "provide", "provides", "provided", "sit", "sits",
  "sat", "stand", "stands", "stood", "lose", "loses", "lost", "pay", "pays", "paid",
  "meet", "meets", "met", "include", "includes", "included", "continue", "continues",
  "continued", "set", "sets", "learn", "learns", "learned", "change", "changes", "changed",
  "lead", "leads", "led", "understand", "understands", "understood", "watch", "watches",
  "watched", "follow", "follows", "followed", "stop", "stops", "stopped", "create", "creates",
  "created", "speak", "speaks", "spoke", "spoken", "read", "reads", "allow", "allows",
  "allowed", "add", "adds", "added", "spend", "spends", "spent", "grow", "grows", "grew",
  "grown", "open", "opens", "opened", "walk", "walks", "walked", "win", "wins", "won",
  "offer", "offers", "offered", "remember", "remembers", "remembered", "consider", "considers",
  "considered", "appear", "appears", "appeared", "buy", "buys", "bought", "wait", "waits",
  "waited", "serve", "serves", "served", "send", "sends", "sent", "expect", "expects",
  "expected", "build", "builds", "built", "stay", "stays", "stayed", "fall", "falls", "fell",
  "cut", "cuts", "reach", "reaches", "reached", "remain", "remains", "remained", "suggest",
  "suggests", "suggested", "raise", "raises", "raised", "pass", "passes", "passed", "sell",
  "sells", "sold", "require", "requires", "required", "report", "reports", "reported",
  "decide", "decides", "decided", "pull", "pulls", "pulled",
  // Financial, Compliance, Legal, Institutional terms
  "compliance", "audit", "audits", "audited", "auditing", "proposal", "proposals",
  "invest", "invests", "invested", "investing", "investment", "investments", "investor",
  "investors", "fiduciary", "regulatory", "regulation", "regulations", "rule", "rules",
  "section", "sections", "disclosure", "disclosures", "disclose", "discloses", "disclosed",
  "disclosing", "suitability", "suitable", "transaction", "transactions", "portfolio",
  "portfolios", "return", "returns", "risk", "risks", "principal", "asset", "assets",
  "liability", "liabilities", "market", "markets", "security", "securities", "equity",
  "equities", "bond", "bonds", "fund", "funds", "sleeve", "sleeves", "rate", "rates",
  "yield", "yields", "client", "clients", "advisor", "advisors", "advisory", "officer",
  "officers", "supervisory", "supervisor", "supervisors", "manager", "managers", "review",
  "reviews", "reviewed", "reviewing", "queue", "memo", "memos", "note", "notes", "finding",
  "findings", "severity", "deadline", "penalty", "penalties", "surrender", "fee", "fees",
  "expense", "expenses", "cost", "costs", "index", "annuity", "annuities", "contract",
  "contracts", "strategy", "strategies", "performance", "loss", "losses", "gain", "gains",
  "profit", "profits", "allocation", "allocations", "allocate", "allocated", "allocating",
  "laddered", "duration", "liquidity", "liquid", "emergency", "documentation", "document",
  "documents", "documented", "documenting", "approval", "approvals", "approve", "approved",
  "approving", "reject", "rejects", "rejected", "rejecting", "status", "verified", "verify",
  "verifies", "verifying", "policy", "policies", "procedure", "procedures", "guidance",
  "requirement", "requirements", "determination", "determinations", "legal", "counsel",
  "registration", "representative", "representatives", "firm", "firms", "broker", "dealer",
  "brokers", "dealers", "account", "accounts", "statement", "statements", "financial",
  "capital", "growth", "balance", "balances", "debt", "debts", "credit", "credits", "payment",
  "payments", "interest", "dividend", "dividends", "tax", "taxes", "irs", "finra", "sec",
  "crd", "ria", "fia", "precedent", "precedents", "benchmark", "benchmarks", "volatility",
  "volatile", "prospectus", "endorsement", "endorsements", "testimonial", "testimonials",
  "conflict", "conflicts", "disclaimer", "disclaimers", "caveat", "caveats", "filing",
  "filings", "submission", "submissions", "submit", "submits", "submitted", "submitting",
  "revision", "revisions", "deck", "decks", "draft", "drafts", "drafted", "drafting",
  "sentence", "sentences", "grammar", "spelling", "syntax", "polish", "correct",
  "correction", "corrections", "corrected", "correcting", "proofread", "proofreading",
  "word", "words", "text", "message", "messages", "email", "emails", "letter", "letters",
  "file", "files", "filed", "paperwork", "signature", "sign", "signed", "signing",
  "remediation", "remediated", "remediate", "remediating", "fix", "fixed", "fixing",
  "check", "checked", "checking", "item", "items", "issue", "issues",
  // Common nouns
  "time", "year", "years", "people", "way", "day", "days", "man", "men", "woman", "women",
  "life", "world", "school", "state", "family", "student", "students", "group", "groups",
  "country", "problem", "problems", "hand", "hands", "part", "parts", "place", "places",
  "case", "cases", "week", "weeks", "company", "system", "program", "question", "questions",
  "number", "numbers", "night", "point", "points", "home", "room", "area", "money",
  "fact", "facts", "month", "months", "lot", "right", "rights", "study", "book", "eye",
  "job", "jobs", "business", "side", "kind", "head", "house", "service", "services",
  "power", "hour", "hours", "line", "lines", "end", "member", "members", "law", "laws",
  "car", "city", "name", "names", "team", "teams", "minute", "minutes", "idea", "information",
  "level", "office", "health", "person", "history", "result", "results", "reason", "reasons",
  // Common adjectives & adverbs
  "good", "new", "first", "last", "long", "great", "little", "own", "other", "old", "right",
  "big", "high", "different", "small", "large", "next", "early", "young", "important", "few",
  "public", "bad", "same", "able", "well", "even", "back", "there", "down", "still", "as",
  "too", "never", "really", "most", "out", "now", "always", "today", "yesterday", "tomorrow",
  "already", "almost", "often", "together", "probably", "actually", "especially", "usually",
  "sometimes", "hard", "far", "clear", "clearly", "fair", "full", "fully", "easy", "easily",
  "simple", "simply", "true", "truly", "free", "freely", "certain", "certainly", "sure",
  "surely", "safe", "safely", "total", "totally", "direct", "directly", "formal", "formally",
  "standard", "structured", "accurate", "accurately", "balanced", "complete", "completely",
  "institutional", "promissory", "unsubstantiated",
  // Names
  "karen", "whitfield", "daniel", "marchetti", "keith", "hester", "ifeoma", "john", "mary", "james"
]);

/**
 * Validates whether a token represents a legitimate English word or recognized terminology.
 */
export function isRecognizedEnglishWord(rawWord: string): { isValid: boolean; reason?: string } {
  const clean = rawWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "").toLowerCase();
  if (!clean) return { isValid: true };

  // Numbers, currency, percentages are valid
  if (/^[0-9]+$/.test(clean) || /^[$€£¥]?[0-9]+(?:\.[0-9]+)?%?$/.test(clean)) {
    return { isValid: true };
  }

  // Single letters: only 'a' and 'i' are standard English words
  if (clean.length === 1) {
    if (clean === "a" || clean === "i") return { isValid: true };
    return { isValid: false, reason: `Single letter '${clean}' is not an English word.` };
  }

  // Direct dictionary hit
  if (ENGLISH_VOCABULARY.has(clean)) return { isValid: true };

  // Common spelling errors map
  if (COMMON_SPELLING_MAP[clean]) return { isValid: true };

  // Morphological rules
  const suffixes = [
    { suffix: "s", strip: 1 },
    { suffix: "es", strip: 2 },
    { suffix: "ed", strip: 2 },
    { suffix: "ing", strip: 3 },
    { suffix: "ly", strip: 2 },
    { suffix: "ment", strip: 4 },
    { suffix: "tion", strip: 4 },
    { suffix: "ness", strip: 4 },
    { suffix: "able", strip: 4 },
    { suffix: "ible", strip: 4 },
  ];
  for (const s of suffixes) {
    if (clean.length > s.strip + 2 && clean.endsWith(s.suffix)) {
      const base = clean.slice(0, -s.strip);
      if (ENGLISH_VOCABULARY.has(base) || ENGLISH_VOCABULARY.has(base + "e")) {
        return { isValid: true };
      }
    }
  }

  // Common prefixes
  const prefixes = ["un", "re", "dis", "non", "pre", "mis", "in", "im", "anti"];
  for (const p of prefixes) {
    if (clean.length > p.length + 2 && clean.startsWith(p)) {
      const base = clean.slice(p.length);
      if (ENGLISH_VOCABULARY.has(base)) {
        return { isValid: true };
      }
    }
  }

  // ── Gibberish / Non-Word Heuristics ──
  // 1. Missing vowels in multi-letter word
  if (clean.length >= 3 && !/[aeiouy]/i.test(clean)) {
    return { isValid: false, reason: "No vowels detected in word." };
  }

  // 2. Unnatural consonant sequences (5 or more consecutive consonants)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(clean)) {
    return { isValid: false, reason: "Unnatural consonant cluster (keyboard smash or non-word)." };
  }

  // 3. Impossible English consonant clusters
  if (/^(?:rjn|zh|xz|jj|kk|vv|ww|xx|yy|zz|pt|tk|fp|fk|kd|jl|jh|zx|cvb)/i.test(clean)) {
    return { isValid: false, reason: "Invalid starting character sequence." };
  }
  if (/(?:fskj|jnij|ljs|xdf|qwe|zxc|vbn|jkl)$/i.test(clean)) {
    return { isValid: false, reason: "Invalid ending character sequence." };
  }
  if (/zhuzh|zhf|fsk|hfs|zxcv|asdf|ghjk|hjkl|qwerty/i.test(clean)) {
    return { isValid: false, reason: "Keyboard smash / random characters detected." };
  }

  // 4. Excessive repeating characters
  if (/(.)\1{2,}/i.test(clean)) {
    return { isValid: false, reason: "Excessive repeating characters." };
  }

  // 5. Unrecognized non-dictionary term
  if (clean.length >= 4) {
    return { isValid: false, reason: "Unrecognized term: not found in English vocabulary." };
  }

  return { isValid: true };
}

const COMMON_VERBS = new Set([
  "is", "am", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "done", "doing",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "approve", "approved", "approves", "approving", "reject", "rejected", "rejects", "rejecting",
  "review", "reviewed", "reviews", "reviewing", "submit", "submitted", "submits", "submitting",
  "audit", "audited", "audits", "auditing", "check", "checked", "checks", "checking",
  "verify", "verified", "verifies", "verifying", "remediate", "remediated", "remediates", "remediating",
  "file", "filed", "files", "filing", "sign", "signed", "signs", "signing",
  "ensure", "ensured", "ensures", "ensuring", "require", "required", "requires", "requiring",
  "provide", "provided", "provides", "providing", "recommend", "recommended", "recommends", "recommending",
  "invest", "invested", "invests", "investing", "manage", "managed", "manages", "managing",
  "update", "updated", "updates", "updating", "note", "noted", "notes", "noting",
  "state", "stated", "states", "stating", "say", "said", "says", "saying",
  "see", "saw", "seen", "seeing", "make", "made", "makes", "making",
  "take", "took", "taken", "taking", "get", "got", "gotten", "getting",
  "give", "gave", "given", "giving", "find", "found", "finds", "finding",
  "think", "thought", "thinks", "thinking", "tell", "told", "tells", "telling",
  "become", "became", "becomes", "becoming", "show", "showed", "shown", "shows", "showing",
  "leave", "left", "leaves", "leaving", "feel", "felt", "feels", "feeling",
  "put", "puts", "putting", "bring", "brought", "brings", "bringing",
  "begin", "began", "begun", "begins", "beginning", "keep", "kept", "keeps", "keeping",
  "hold", "held", "holds", "holding", "write", "wrote", "written", "writes", "writing",
  "stand", "stood", "stands", "standing", "hear", "heard", "hears", "hearing",
  "let", "lets", "letting", "mean", "meant", "means", "meaning",
  "set", "sets", "setting", "meet", "met", "meets", "meeting",
  "run", "ran", "runs", "running", "pay", "paid", "pays", "paying",
  "sit", "sat", "sits", "sitting", "speak", "spoke", "spoken", "speaks", "speaking",
  "lead", "led", "leads", "leading", "read", "reads", "reading",
  "grow", "grew", "grown", "grows", "growing", "lose", "lost", "loses", "losing",
  "fall", "fell", "fallen", "falls", "falling", "send", "sent", "sends", "sending",
  "build", "built", "builds", "building", "understand", "understood", "understands", "understanding",
  "spend", "spent", "spends", "spending", "cut", "cuts", "cutting",
  "rise", "rose", "risen", "rises", "rising", "buy", "bought", "buys", "buying",
  "raise", "raised", "raises", "raising", "pass", "passed", "passes", "passing",
  "sell", "sold", "sells", "selling", "report", "reported", "reports", "reporting",
  "decide", "decided", "decides", "deciding", "pull", "pulled", "pulls", "pulling",
  "include", "included", "includes", "including", "continue", "continued", "continues", "continuing",
  "change", "changed", "changes", "changing", "watch", "watched", "watches", "watching",
  "follow", "followed", "follows", "following", "stop", "stopped", "stops", "stopping",
  "create", "created", "creates", "creating", "allow", "allowed", "allows", "allowing",
  "add", "added", "adds", "adding", "open", "opened", "opens", "opening",
  "walk", "walked", "walks", "walking", "win", "won", "wins", "winning",
  "offer", "offered", "offers", "offering", "remember", "remembered", "remembers", "remembering",
  "consider", "considered", "considers", "considering", "appear", "appeared", "appears", "appearing",
  "wait", "waited", "waits", "waiting", "serve", "served", "serves", "serving",
  "expect", "expected", "expects", "expecting", "stay", "stayed", "stays", "staying",
  "reach", "reached", "reaches", "reaching", "remain", "remained", "remains", "remaining",
  "suggest", "suggested", "suggests", "suggesting", "disclose", "disclosed", "discloses", "disclosing",
  "allocate", "allocated", "allocates", "allocating", "guarantee", "guaranteed", "guarantees", "guaranteeing",
  "target", "targeted", "targets", "targeting", "generate", "generated", "generates", "generating",
  "comply", "complied", "complies", "complying", "mitigate", "mitigated", "mitigates", "mitigating",
  "execute", "executed", "executes", "executing", "perform", "performed", "performs", "performing"
]);

/**
 * Evaluates sentence completeness, syntactic coherence, and grammatical quality.
 */
export function evaluateSentenceQuality(
  tokens: string[],
  cleanText: string,
  issues: IGrammarIssue[]
): ISentenceQuality {
  const wordTokens = tokens.map((t) => t.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")).filter(Boolean);
  const unrecognizedWords: string[] = [];

  for (const w of wordTokens) {
    const res = isRecognizedEnglishWord(w);
    if (!res.isValid) {
      unrecognizedWords.push(w);
    }
  }

  const isWordValid = unrecognizedWords.length === 0;

  // Check if the input is heavily corrupted with gibberish / non-words
  if (
    unrecognizedWords.length > 0 &&
    (unrecognizedWords.length >= Math.ceil(wordTokens.length * 0.4) ||
      (unrecognizedWords.length >= 2 && wordTokens.length <= 5))
  ) {
    return {
      status: "invalid",
      label: "Bad Sentence (Unrecognized Words)",
      details: `Input contains ${unrecognizedWords.length} unrecognized word${
        unrecognizedWords.length > 1 ? "s" : ""
      } ("${unrecognizedWords.join('", "')}"). It does not form a coherent English sentence.`,
      unrecognizedWords,
      isWordValid: false,
      hasSubjectVerb: false,
    };
  }

  const lowerWords = wordTokens.map((w) => w.toLowerCase());

  // Comprehensive Verb Check
  const hasVerb = lowerWords.some((w) => {
    if (COMMON_VERBS.has(w)) return true;
    if (w.endsWith("ed") && (COMMON_VERBS.has(w.slice(0, -2)) || COMMON_VERBS.has(w.slice(0, -1)))) return true;
    if (w.endsWith("ing") && (COMMON_VERBS.has(w.slice(0, -3)) || COMMON_VERBS.has(w.slice(0, -3) + "e"))) return true;
    if (w.endsWith("s") && (COMMON_VERBS.has(w.slice(0, -1)) || COMMON_VERBS.has(w.slice(0, -2)))) return true;
    return false;
  });
  const hasSubjectVerb = hasVerb;

  // If 3 or more words and completely missing a verb
  if (wordTokens.length >= 3 && !hasVerb) {
    return {
      status: "needs_revision",
      label: "Sentence Fragment (Missing Verb)",
      details: "Sentence fragment: missing a main verb or complete predicate to express a full thought.",
      unrecognizedWords,
      isWordValid,
      hasSubjectVerb: false,
    };
  }

  // If there are issues found or unrecognized words
  if (issues.length > 0 || unrecognizedWords.length > 0) {
    return {
      status: "needs_revision",
      label: "Needs Revision",
      details: `Identified ${issues.length + unrecognizedWords.length} item${
        issues.length + unrecognizedWords.length > 1 ? "s" : ""
      } across grammar, spelling, or vocabulary.`,
      unrecognizedWords,
      isWordValid,
      hasSubjectVerb,
    };
  }

  // Good, complete sentence
  return {
    status: "good",
    label: "Good Sentence",
    details: "Sentence structure is complete, vocabulary is verified, and syntax meets institutional standards.",
    unrecognizedWords: [],
    isWordValid: true,
    hasSubjectVerb: true,
  };
}

/**
 * DOCU: Audits input text for grammatical errors, misspellings, and syntax irregularities.
 * Validates whether words are real English words, checks sentence quality (good vs bad/fragment/gibberish),
 * and provides institutional compliant syntax polish.
 * @param text - Draft text to evaluate.
 * @returns Comprehensive grammar audit report with sentence quality evaluation and corrections.
 */
export function recheckGrammar(text: string): IGrammarResult {
  const issues: IGrammarIssue[] = [];
  // Strip trigger command phrases so user commands do not get treated as draft text
  const cleanInput = text
    .replace(/^(?:can you\s+|please\s+|help me\s+|i want\s+(?:you\s+)?to\s+|i want more to\s+)?(?:fix|check|re-?check|correct|proofread|improve|rewrite|rephrase)\s*(?:my|this|the)?\s*(?:grammar|sentence|sentences|phrasing|text|draft|writing)?\s*(?:in|for|of|on)?[:,-]?\s*/i, "")
    .replace(/\b(?:please\s+)?(?:re-?check|check|fix)\s+(?:grammar|sentence|sentences)\b[:,-]?/gi, "")
    .replace(/\b(?:grammar|sentence|sentences)\s+(?:check|re-?check)\b[:,-]?/gi, "")
    .replace(/^(?:grammar|sentence|check|audit\s*note|fix)[:,-]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  let targetText = cleanInput || text.trim();
  const rawWordTokens = targetText.split(/\s+/).map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")).filter(Boolean);

  // 1. Check if tokens are recognized English words or gibberish
  const unrecognizedWords: string[] = [];
  for (const token of rawWordTokens) {
    const res = isRecognizedEnglishWord(token);
    if (!res.isValid) {
      unrecognizedWords.push(token);
      issues.push({
        original: token,
        replacement: "(unrecognized word)",
        reason: res.reason || "Non-dictionary term: not recognized in English vocabulary.",
        type: "unrecognized_word",
      });
    }
  }

  // Evaluate sentence quality
  const initialSentenceQuality = evaluateSentenceQuality(rawWordTokens, targetText, issues);

  // If the sentence is invalid / gibberish: stop here, do not apply fake periods or capitalizations
  if (initialSentenceQuality.status === "invalid") {
    issues.push({
      original: "Sentence Syntax",
      replacement: "(incoherent structure)",
      reason: "Syntax structure: input lacks recognizable subject and verb to form a valid sentence.",
      type: "sentence_structure",
    });

    return {
      originalText: text,
      correctedText: "[Cannot correct: text contains unrecognized words or gibberish. Please provide a coherent English sentence.]",
      issues,
      summary: `Invalid sentence: The input contains ${unrecognizedWords.length} unrecognized or nonsensical word${unrecognizedWords.length > 1 ? "s" : ""} (${unrecognizedWords.map(w => `"${w}"`).join(", ")}). Please enter valid words to evaluate.`,
      sentenceQuality: initialSentenceQuality,
    };
  }

  let corrected = targetText;

  // 2. Phrase-level grammar checks
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

  // 3. Token-level spelling and word choice checks
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

  // 4. Punctuation and sentence capitalization
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

  // Re-evaluate quality after corrections
  const finalQuality = evaluateSentenceQuality(rawWordTokens, corrected, issues);

  const issueCount = issues.length;
  const summary =
    issueCount === 0
      ? "Good sentence: No grammatical or spelling issues detected. Syntax meets institutional writing standards."
      : `Detected and corrected ${issueCount} item${issueCount > 1 ? "s" : ""} across grammar, spelling, and sentence syntax.`;

  return {
    originalText: text,
    correctedText: corrected,
    issues,
    summary,
    sentenceQuality: finalQuality,
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
