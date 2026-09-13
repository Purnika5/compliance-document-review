import os
import json
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv
from google import genai


# --------------------------------------------------
# Find the project root
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]


# --------------------------------------------------
# Load .env from project root
# --------------------------------------------------

load_dotenv(PROJECT_ROOT / ".env")


# --------------------------------------------------
# Get Gemini API key
# --------------------------------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in .env")


# --------------------------------------------------
# Create Gemini client
# --------------------------------------------------

client = genai.Client(api_key=GEMINI_API_KEY)


# --------------------------------------------------
# Load prompts
# --------------------------------------------------

SUMMARY_PROMPT_PATH = (
    PROJECT_ROOT / "ai" / "prompts" / "summary_prompt.txt"
)

ISSUE_FLAGGING_PROMPT_PATH = (
    PROJECT_ROOT / "ai" / "prompts" / "issue_flagging_prompt.txt"
)


with open(SUMMARY_PROMPT_PATH, "r", encoding="utf-8") as file:
    SUMMARY_PROMPT = file.read()


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
    rule_code: str
    title: str
    description: str
    similarity_score: float


# --------------------------------------------------
# Precedent Search result format
# Matches final backend -> AI contract
# --------------------------------------------------

class Precedent(BaseModel):
    id: str
    document_id: str
    passage: str
    outcome: str
    explanation: str
    similarity_score: float


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
    # Convert retrieved rules to JSON text
    # --------------------------------------------------

    retrieved_rules_text = json.dumps(
        [
            rule.model_dump()
            for rule in request.retrieved_rules
        ],
        indent=2
    )


    # --------------------------------------------------
    # Convert precedents to JSON text
    # --------------------------------------------------

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

        summary_response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=summary_prompt
        )

        summary = summary_response.text.strip()


        # --------------------------------------------------
        # Generate potential compliance issues
        # --------------------------------------------------

        issue_response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=issue_prompt,
            config={
                "response_mime_type": "application/json"
            }
        )


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
        # Validate each flag
        # --------------------------------------------------

        validated_flags: List[Flag] = []


        # Get only the rule IDs supplied by retrieval
        retrieved_rule_ids = {
            rule.id
            for rule in request.retrieved_rules
        }


        for issue in issues:

            if not isinstance(issue, dict):

                raise ValueError(
                    "Each flag must be a JSON object."
                )


            # Validate flag structure
            flag = Flag.model_validate(issue)


            # --------------------------------------------------
            # Strict rule grounding validation
            # Gemini can only use retrieved rule IDs
            # --------------------------------------------------

            if flag.rule not in retrieved_rule_ids:

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
    # Handle Gemini/API errors
    # --------------------------------------------------

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error: {str(e)}"
        )


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "message": "Compliance AI Service is running"
    }