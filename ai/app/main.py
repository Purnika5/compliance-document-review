import os
import json
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ValidationError
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
# Request format from backend
# --------------------------------------------------

class AnalyzeRequest(BaseModel):
    document_id: str
    version: int
    masked_text: str


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

    cache_key = (request.document_id, request.version)


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
    # Insert masked document text into prompts
    # --------------------------------------------------

    summary_prompt = SUMMARY_PROMPT.replace(
        "{DOCUMENT_TEXT}",
        request.masked_text
    )

    issue_prompt = ISSUE_FLAGGING_PROMPT.replace(
        "{DOCUMENT_TEXT}",
        request.masked_text
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

        issues = json.loads(issue_response.text)


        if not isinstance(issues, list):
            raise ValueError(
                "Gemini issue response must be a JSON array."
            )


        # --------------------------------------------------
        # Validate each flag
        # --------------------------------------------------

        validated_flags: List[Flag] = []

        for issue in issues:

            if not isinstance(issue, dict):
                raise ValueError(
                    "Each flag must be a JSON object."
                )

            flag = Flag.model_validate(issue)

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


    except json.JSONDecodeError:

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini returned an invalid JSON response "
                "for issue flagging."
            )
        )


    except ValidationError:

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini returned an invalid flag structure. "
                "Each flag must contain passage, rule, "
                "and explanation."
            )
        )


    except ValueError as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


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