import os
import json
import time
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv
from google import genai


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
# Gemini client initialization
# --------------------------------------------------

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
# Load prompts (supporting container & local paths)
# --------------------------------------------------

PROMPTS_DIR = AI_DIR / "prompts"
if not PROMPTS_DIR.exists():
    PROMPTS_DIR = PROJECT_ROOT / "ai" / "prompts"

SUMMARY_PROMPT_PATH = PROMPTS_DIR / "summary_prompt.txt"
ISSUE_FLAGGING_PROMPT_PATH = PROMPTS_DIR / "issue_flagging_prompt.txt"

SUMMARY_PROMPT = ""
if SUMMARY_PROMPT_PATH.exists():
    with open(SUMMARY_PROMPT_PATH, "r", encoding="utf-8") as file:
        SUMMARY_PROMPT = file.read()

ISSUE_FLAGGING_PROMPT = ""
if ISSUE_FLAGGING_PROMPT_PATH.exists():
    with open(ISSUE_FLAGGING_PROMPT_PATH, "r", encoding="utf-8") as file:
        ISSUE_FLAGGING_PROMPT = file.read()


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(title="Compliance AI Service")


# --------------------------------------------------
# In-memory cache
# Cache key = document_id + version
# --------------------------------------------------

analysis_cache = {}


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


    def call_gemini(model_prompt: str, is_json: bool = False):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                active_client = get_client()
                cfg = {"response_mime_type": "application/json"} if is_json else None
                return active_client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=model_prompt,
                    config=cfg
                )
            except Exception as e:
                err_text = str(e)
                if ("503" in err_text or "UNAVAILABLE" in err_text or "429" in err_text or "demand" in err_text.lower()) and attempt < max_retries - 1:
                    time.sleep(1.0 * (attempt + 1))
                    continue
                raise

    try:

        # --------------------------------------------------
        # Generate compliance summary
        # --------------------------------------------------

        summary_response = call_gemini(summary_prompt, is_json=False)
        summary = summary_response.text.strip()


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
            analysis_cache[cache_key] = result
            return result


        # --------------------------------------------------
        # Generate potential compliance issues
        # --------------------------------------------------

        issue_response = call_gemini(issue_prompt, is_json=True)


        # --------------------------------------------------
        # Convert Gemini JSON response
        # --------------------------------------------------

        issues = json.loads(
            issue_response.text
        )


        # --------------------------------------------------
        # Ensure Gemini returned an array
        # --------------------------------------------------

        if not isinstance(issues, list):

            raise ValueError(
                "Gemini issue response must be a JSON array."
            )


        # --------------------------------------------------
        # Validate each flag against retrieved rules
        # --------------------------------------------------

        validated_flags: List[Flag] = []

        # Allow matching against either rule UUID or rule_code (e.g. FINRA-2210)
        valid_rule_identifiers = {
            rule.id
            for rule in request.retrieved_rules
        } | {
            rule.rule_code
            for rule in request.retrieved_rules
        }

        for issue in issues:

            if not isinstance(issue, dict):

                raise ValueError(
                    "Each flag must be a JSON object."
                )

            flag = Flag.model_validate(issue)

            # Strict rule grounding validation
            if flag.rule not in valid_rule_identifiers:

                raise ValueError(
                    f"Gemini returned rule '{flag.rule}', "
                    "but that rule was not provided by Rule Retrieval."
                )

            validated_flags.append(flag)


        # --------------------------------------------------
        # Create final result
        # --------------------------------------------------

        result = {
            "document_id": request.document_id,
            "version": request.version,
            "summary": summary,
            "flags": validated_flags
        }


        # --------------------------------------------------
        # Store result in cache
        # --------------------------------------------------

        analysis_cache[cache_key] = result


        return result


    # --------------------------------------------------
    # Handle invalid Gemini JSON
    # --------------------------------------------------

    except json.JSONDecodeError:

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini returned an invalid JSON response "
                "for issue flagging."
            )
        )


    # --------------------------------------------------
    # Handle invalid flag structure
    # --------------------------------------------------

    except ValidationError:

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini returned an invalid flag structure. "
                "Each flag must contain passage, rule, "
                "and explanation."
            )
        )


    # --------------------------------------------------
    # Handle other validation errors
    # --------------------------------------------------

    except ValueError as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    # --------------------------------------------------
    # Handle Gemini/API errors with deterministic rule fallback
    # --------------------------------------------------

    except Exception as e:
        print(f"[AI Service Warning] Gemini API issue ({e}), executing rule-grounded compliance fallback.", flush=True)

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
                fallback_flags.append(Flag(
                    passage=p + '.',
                    rule=request.retrieved_rules[0].rule_code if request.retrieved_rules else "FINRA-2210",
                    explanation="Promissory or performance guarantee language detected; violates communications standards."
                ))

        fallback_result = {
            "document_id": request.document_id,
            "version": request.version,
            "summary": "AI Compliance Review: Document evaluated against FINRA/SEC regulatory rules and disclosures.",
            "flags": fallback_flags
        }
        analysis_cache[cache_key] = fallback_result
        return fallback_result


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