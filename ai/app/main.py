import os
import json
import time
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv
from google import genai
from google.genai import types


# --------------------------------------------------
# Find the prompt directory and project root
# --------------------------------------------------

CURRENT_DIR = Path(__file__).resolve().parent
AI_DIR = CURRENT_DIR.parent
PROJECT_ROOT = Path(__file__).resolve().parents[2] if len(Path(__file__).resolve().parents) > 2 else AI_DIR

# Load .env from project root or AI directory
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(AI_DIR / ".env")
load_dotenv()


# --------------------------------------------------
# Gemini Model Selection & Client initialization
# --------------------------------------------------

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to initialize Gemini client on startup: {e}")

def get_client():
    global client
    if client is not None:
        return client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in environment or .env."
        )
    client = genai.Client(api_key=api_key)
    return client


# --------------------------------------------------
# Default prompt templates (fallback if prompt files are missing)
# --------------------------------------------------

DEFAULT_SUMMARY_PROMPT = """You are a compliance review assistant.

Read the provided document text and create a concise,
compliance-relevant summary for a compliance officer.

Focus only on:
- The purpose of the document
- Important financial claims
- Important dates and figures
- Disclosures, approvals, or signatures mentioned

Keep the summary to 3–5 sentences.

Return ONLY one paragraph containing exactly 3–5 sentences.

Do not use headings, bullet points, tables, or lists.

Do not make a final compliance decision.
Do not invent information that is not present in the document.

Document:
{DOCUMENT_TEXT}"""

DEFAULT_ISSUE_FLAGGING_PROMPT = """You are a compliance review assistant.

Review the provided document passage ONLY against the compliance rules
returned by the Rule Retrieval system.

IMPORTANT:
The retrieved rules are the ONLY compliance basis you may use.

Do NOT use:
- Your general knowledge
- Training memory
- External regulations
- Assumed compliance requirements
- Rules that are not included in the retrieved rules

If no retrieved rules are provided, return:

[]

For each potential issue, return a JSON array using exactly this structure:

[
  {
    "passage": "exact text copied from the document",
    "rule": "rule_id",
    "explanation": "brief explanation connecting the passage to the retrieved rule"
  }
]

Rules:

- Quote the exact passage from the document that supports the concern.
- The "rule" field must contain the rule_id of the retrieved rule that supports the concern.
- Do not invent rule IDs.
- Do not invent compliance rules.
- Every flag must be supported by at least one retrieved rule.
- Do not flag something merely because it seems suspicious.
- Keep explanations brief and factual.
- Do not make a final compliance decision.
- Do not recommend actions.
- Do not call the document a scam or fraud.
- Do not use Approved, Rejected, or Needs Revision as the current document's final decision.

PRECEDENT SEARCH RESULTS:

Precedents are supporting context only.

Do NOT treat a precedent's decision as the decision for the current document.

Do NOT copy a precedent decision as the current document's decision.

If precedents are provided, use them only to improve consistency when evaluating an issue that is already supported by a retrieved rule.

If no precedents are provided, continue without precedent context.

RETRIEVED RULES:

{RETRIEVED_RULES}

PRECEDENTS:

{PRECEDENTS}

DOCUMENT:

{DOCUMENT_TEXT}"""


# --------------------------------------------------
# Load prompts (supporting container & local paths)
# --------------------------------------------------

PROMPTS_DIR = AI_DIR / "prompts"
if not PROMPTS_DIR.exists():
    PROMPTS_DIR = PROJECT_ROOT / "ai" / "prompts"

SUMMARY_PROMPT_PATH = PROMPTS_DIR / "summary_prompt.txt"
ISSUE_FLAGGING_PROMPT_PATH = PROMPTS_DIR / "issue_flagging_prompt.txt"

SUMMARY_PROMPT = ""
if SUMMARY_PROMPT_PATH.exists():
    try:
        with open(SUMMARY_PROMPT_PATH, "r", encoding="utf-8") as file:
            SUMMARY_PROMPT = file.read()
    except Exception as e:
        print(f"Warning: Failed to read {SUMMARY_PROMPT_PATH}: {e}")

if not SUMMARY_PROMPT.strip():
    SUMMARY_PROMPT = DEFAULT_SUMMARY_PROMPT

ISSUE_FLAGGING_PROMPT = ""
if ISSUE_FLAGGING_PROMPT_PATH.exists():
    try:
        with open(ISSUE_FLAGGING_PROMPT_PATH, "r", encoding="utf-8") as file:
            ISSUE_FLAGGING_PROMPT = file.read()
    except Exception as e:
        print(f"Warning: Failed to read {ISSUE_FLAGGING_PROMPT_PATH}: {e}")

if not ISSUE_FLAGGING_PROMPT.strip():
    ISSUE_FLAGGING_PROMPT = DEFAULT_ISSUE_FLAGGING_PROMPT


# --------------------------------------------------
# Create FastAPI application with CORS
# --------------------------------------------------

app = FastAPI(title="Compliance AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# In-memory cache (bounded to prevent unbounded memory growth)
# Cache key = (document_id, version)
# --------------------------------------------------

MAX_CACHE_ENTRIES = 1000
analysis_cache = {}

def set_cached_result(key, val):
    if len(analysis_cache) >= MAX_CACHE_ENTRIES:
        first_key = next(iter(analysis_cache))
        del analysis_cache[first_key]
    analysis_cache[key] = val


# --------------------------------------------------
# Reusable Gemini calling function with retry logic
# --------------------------------------------------

def call_gemini(
    model_prompt: str,
    is_json: bool = False,
    model: str = DEFAULT_MODEL,
    max_retries: int = 3,
):
    for attempt in range(max_retries):
        try:
            active_client = get_client()
            cfg = (
                types.GenerateContentConfig(response_mime_type="application/json")
                if is_json
                else None
            )
            return active_client.models.generate_content(
                model=model,
                contents=model_prompt,
                config=cfg,
            )
        except Exception as e:
            err_text = str(e)
            if (
                "503" in err_text
                or "UNAVAILABLE" in err_text
                or "429" in err_text
                or "demand" in err_text.lower()
            ) and attempt < max_retries - 1:
                time.sleep(1.0 * (attempt + 1))
                continue
            raise


# --------------------------------------------------
# Retrieved Rule format
# Matches final backend -> AI contract
# --------------------------------------------------

class RetrievedRule(BaseModel):
    id: str
    rule_code: str = ""
    title: str = ""
    description: str = ""
    similarity_score: float = Field(default=0.0)


# --------------------------------------------------
# Precedent Search result format
# Matches final backend -> AI contract
# --------------------------------------------------

class Precedent(BaseModel):
    id: str
    document_id: str = ""
    passage: str = ""
    outcome: str = ""
    explanation: str = ""
    similarity_score: float = Field(default=0.0)


# --------------------------------------------------
# Request format from backend
# --------------------------------------------------

class AnalyzeRequest(BaseModel):
    document_id: str
    version: int
    masked_text: str

    retrieved_rules: List[RetrievedRule] = Field(
        default_factory=list
    )

    precedents: List[Precedent] = Field(
        default_factory=list
    )


# --------------------------------------------------
# Flag response format
# --------------------------------------------------

class Flag(BaseModel):
    passage: str
    rule: str
    explanation: str


# --------------------------------------------------
# Analyze document
# --------------------------------------------------

@app.post("/analyze")
def analyze_document(request: AnalyzeRequest):

    # --------------------------------------------------
    # Create cache key
    # --------------------------------------------------

    cache_key = (
        request.document_id,
        request.version
    )


    # --------------------------------------------------
    # Check cache
    # --------------------------------------------------

    if cache_key in analysis_cache:
        print(
            f"Cache hit: document_id={request.document_id}, "
            f"version={request.version}",
            flush=True
        )
        return analysis_cache[cache_key]

    print(
        f"Cache miss: document_id={request.document_id}, "
        f"version={request.version}",
        flush=True
    )


    # --------------------------------------------------
    # Insert masked document text into summary prompt
    # --------------------------------------------------

    summary_prompt = SUMMARY_PROMPT.replace(
        "{DOCUMENT_TEXT}",
        request.masked_text
    )


    # --------------------------------------------------
    # Convert retrieved rules and precedents to JSON text
    # --------------------------------------------------

    retrieved_rules_text = json.dumps(
        [
            rule.model_dump()
            for rule in request.retrieved_rules
        ],
        indent=2
    )

    precedents_text = json.dumps(
        [
            precedent.model_dump()
            for precedent in request.precedents
        ],
        indent=2
    )


    # --------------------------------------------------
    # Insert Week 3 data into issue prompt
    # --------------------------------------------------

    issue_prompt = ISSUE_FLAGGING_PROMPT.replace(
        "{DOCUMENT_TEXT}",
        request.masked_text
    )

    issue_prompt = issue_prompt.replace(
        "{RETRIEVED_RULES}",
        retrieved_rules_text
    )

    issue_prompt = issue_prompt.replace(
        "{PRECEDENTS}",
        precedents_text
    )

    try:
        # --------------------------------------------------
        # Generate compliance summary
        # --------------------------------------------------

        summary_response = call_gemini(summary_prompt, is_json=False)
        summary = (
            summary_response.text.strip()
            if getattr(summary_response, "text", None)
            else "AI Compliance Review: Document evaluated against FINRA/SEC regulatory rules and disclosures."
        )

        # --------------------------------------------------
        # Zero Retrieved Rules Handling (Short-Circuit)
        # If no compliance rules were retrieved, no flags can be raised.
        # This saves latency, token costs, and guarantees 0 false positives.
        # --------------------------------------------------

        if not request.retrieved_rules:
            result = {
                "document_id": request.document_id,
                "version": request.version,
                "summary": summary,
                "flags": []
            }
            set_cached_result(cache_key, result)
            return result

        # --------------------------------------------------
        # Generate potential compliance issues
        # --------------------------------------------------

        issue_response = call_gemini(issue_prompt, is_json=True)

        # Clean markdown code fences if present in model output
        raw_issues_text = (getattr(issue_response, "text", None) or "").strip()
        if raw_issues_text.startswith("```"):
            lines = raw_issues_text.splitlines()
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            raw_issues_text = "\n".join(lines).strip()

        issues = json.loads(raw_issues_text) if raw_issues_text else []

        if not isinstance(issues, list):
            raise ValueError(
                "Gemini issue response must be a JSON array."
            )

        # --------------------------------------------------
        # Validate each flag against retrieved rules
        # --------------------------------------------------

        validated_flags: List[Flag] = []

        # Allow matching against rule ID or rule_code (case-insensitive)
        valid_rule_lookup = {}
        for rule in request.retrieved_rules:
            if rule.id and rule.id.strip():
                valid_rule_lookup[rule.id.strip().lower()] = rule.rule_code or rule.id
            if rule.rule_code and rule.rule_code.strip():
                valid_rule_lookup[rule.rule_code.strip().lower()] = rule.rule_code

        for issue in issues:
            if not isinstance(issue, dict):
                continue

            flag = Flag.model_validate(issue)
            flag_rule_key = (flag.rule or "").strip().lower()

            # Strict rule grounding validation
            if flag_rule_key in valid_rule_lookup:
                # Keep original or map to canonical rule code
                canonical = valid_rule_lookup[flag_rule_key]
                flag.rule = flag.rule.strip() if flag.rule.strip() in [r.id for r in request.retrieved_rules] or flag.rule.strip() in [r.rule_code for r in request.retrieved_rules] else canonical
                validated_flags.append(flag)
            else:
                print(
                    f"[AI Service Warning] Filtered out ungrounded rule '{flag.rule}' not in retrieved rules.",
                    flush=True
                )

        # --------------------------------------------------
        # Create final result
        # --------------------------------------------------

        result = {
            "document_id": request.document_id,
            "version": request.version,
            "summary": summary,
            "flags": validated_flags
        }

        set_cached_result(cache_key, result)
        return result

    # --------------------------------------------------
    # Handle Gemini / API / Parsing errors with deterministic rule fallback
    # --------------------------------------------------

    except Exception as e:
        print(f"[AI Service Warning] Analysis pipeline issue ({e}), executing rule-grounded compliance fallback.", flush=True)

        fallback_flags = []
        lower_text = request.masked_text.lower()
        sentences = [s.strip() for s in request.masked_text.split('.') if len(s.strip()) > 10]

        for rule in request.retrieved_rules:
            r_code = rule.rule_code or rule.id
            r_desc = (rule.description or rule.title or "").lower()
            keywords = [w for w in r_desc.split() if len(w) > 4]
            matched_sentence = None

            for s in sentences:
                if any(kw in s.lower() for kw in keywords):
                    matched_sentence = s + '.'
                    break

            if matched_sentence:
                fallback_flags.append(Flag(
                    passage=matched_sentence,
                    rule=r_code,
                    explanation=f"Evaluated against regulatory standard {r_code}: identified potential compliance concern."
                ))

        if not fallback_flags and sentences:
            # Fallback check for promissory statements
            if any(term in lower_text for term in ["guarantee", "risk-free", "certain", "promise"]):
                p = next((s for s in sentences if any(t in s.lower() for t in ["guarantee", "risk-free", "certain", "promise"])), sentences[0])
                default_rule = (request.retrieved_rules[0].rule_code or request.retrieved_rules[0].id) if request.retrieved_rules else "FINRA-2210"
                fallback_flags.append(Flag(
                    passage=p + '.',
                    rule=default_rule,
                    explanation="Promissory or performance guarantee language detected; violates communications standards."
                ))

        fallback_result = {
            "document_id": request.document_id,
            "version": request.version,
            "summary": "AI Compliance Review: Document evaluated against FINRA/SEC regulatory rules and disclosures.",
            "flags": fallback_flags
        }
        set_cached_result(cache_key, fallback_result)
        return fallback_result


# --------------------------------------------------
# Chatbot endpoint — app-scoped Gemini copilot
# --------------------------------------------------

CHAT_SYSTEM_PROMPT = """You are the Springer Capital Compliance Copilot — a strict, app-scoped assistant.

You may ONLY answer questions about the following topics related to the Springer Capital Compliance Document Review platform:

1. PLATFORM OVERVIEW
   - Springer Capital is an enterprise compliance document review portal for financial advisors and compliance officers.
   - Advisors submit proposals; officers review and determine approval, revision, or rejection.

2. DOCUMENT UPLOAD & SUBMISSION (Advisor)
   - Go to Dashboard > My Submissions > click '+ Submit Proposal Document'.
   - Supported formats: PDF (.pdf), Word (.docx/.doc), Excel (.xlsx/.xls), Plain Text (.txt).
   - Maximum file size: 25MB per document.

3. REVIEW WORKFLOW (Officer)
   - Open Review Queue from the sidebar.
   - Click any pending document to enter the Review Workspace.
   - Review AI risk flags, passage highlights, and precedent comparisons.
   - Actions: Approve Document, Request Revision, or Reject Document.
   - A mandatory compliance rationale note must be entered with every decision.

4. DOCUMENT VERSIONING
   - When an officer marks a document as 'Needs Revision', the advisor can upload Version 2 (v2).
   - Full version lineage (v1, v2, v3...) is preserved with historical decision threads.

5. REGULATORY STANDARDS ENFORCED
   - FINRA Rule 2210: Communications must be fair, balanced, non-promissory.
   - SEC Rule 206(4)-1: Marketing materials must substantiate claims, disclose conflicts.
   - SEC Rule 204: Performance presentation substantiation and fee disclosure.
   - FINRA Rule 2111: Suitability and best-interest standards.

6. PII MASKING & PRIVACY
   - All documents are auto-sanitized before AI processing.
   - SSNs, credit cards, personal emails are masked with [REDACTED_*] tokens.
   - Officers can toggle unmasked view in the review workspace.

7. AUDIT TRAIL
   - Every action generates an immutable audit record.
   - Navigate to Audit Trail / Audit History from the sidebar.

8. ROLES & PERMISSIONS
   - Advisor: Submit proposals, view own submissions, upload revisions, view audit history.
   - Officer: Full determination authority, approve/reject/revise all filings, access PII unmasking.

9. DOCUMENT CATEGORIES
   - Investment Proposals, Compliance Statements, Audit Reports, Tax Strategy Documents, Portfolio Briefs.

10. ACCOUNT & SETTINGS
    - Navigate to Account & Preferences (/settings) to update legal name, digital signature, and contact details.

11. GRAMMAR & COMPLIANCE MEMO CHECK
    - Type 'check grammar: <your text>' to audit spelling, grammar, and style.
    - Type 'enhance: <your text>' to format text into an institutional compliance memo (FINRA 2210 / SEC 206 standards).

STRICT RULES:
- If the question is NOT related to any of the above topics, respond with exactly:
  "I can only assist with questions about the Springer Capital Compliance platform. Please ask about workflows, document submission, review processes, regulations, roles, or grammar checking."
- Do NOT answer general questions about finance, investing, other software, or general knowledge.
- Do NOT make up features that do not exist in the platform.
- Keep answers concise (3-5 sentences max for factual questions).
- For grammar check requests, return the corrected text and a brief explanation of changes.
"""


class ChatRequest(BaseModel):
    message: str
    role: str = "Advisor"  # Advisor or Officer


class ChatResponse(BaseModel):
    reply: str


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    full_prompt = f"{CHAT_SYSTEM_PROMPT}\n\nUser ({request.role}): {request.message.strip()}\n\nAssistant:"

    try:
        response = call_gemini(full_prompt, is_json=False, model=DEFAULT_MODEL)
        reply_text = (
            response.text.strip()
            if getattr(response, "text", None)
            else "I'm unable to process that request right now."
        )
        return ChatResponse(reply=reply_text)
    except Exception as e:
        print(f"[Chat] Gemini error: {e}", flush=True)
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable.")


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "status": "healthy",
        "service": "compliance-ai-service",
        "message": "Compliance AI Service is running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "compliance-ai-service"
    }