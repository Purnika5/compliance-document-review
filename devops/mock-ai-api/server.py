"""
Mock Third-Party AI API Service (Springer Capital Compliance Document Review)
Simulates Gemini / Groq LLM endpoints to allow 100% offline local development,
continuous integration, and automated testing without incurring rate limits or API costs.
"""

from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="Mock Compliance AI API",
    description="Offline simulation service for Gemini / Groq compliance document review",
    version="1.0.0",
)


class AnalysisRequest(BaseModel):
    text: Optional[str] = None
    document_id: Optional[str] = None


class GeminiContentPart(BaseModel):
    text: Optional[str] = None


class GeminiContent(BaseModel):
    parts: Optional[List[GeminiContentPart]] = None
    role: Optional[str] = "user"


class GeminiGenerateContentRequest(BaseModel):
    contents: Optional[List[Any]] = None


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": "mock-ai-api",
        "mode": "offline-simulation",
    }


@app.post("/analyze")
def mock_analyze(request: AnalysisRequest) -> Dict[str, Any]:
    """
    Direct compliance analysis endpoint mimicking the internal AI service.
    """
    return {
        "summary": "Mock Compliance Summary: Document reviewed for institutional regulatory compliance under FINRA/SEC guidelines. Disclosures and fee schedules identified.",
        "issues": [
          {
            "passage": "Historical returns guarantee future fund performance.",
            "rule": "FINRA Rule 2210 - Communications with the Public",
            "explanation": "Promissory statements and performance guarantees are strictly prohibited in marketing and disclosure materials."
          }
        ],
        "status": "flagged",
        "model": "mock-gemini-3.6-flash",
    }


@app.post("/v1beta/models/{model_name}:generateContent")
@app.post("/v1/models/{model_name}:generateContent")
def mock_gemini_generate_content(model_name: str, payload: GeminiGenerateContentRequest) -> Dict[str, Any]:
    """
    Native Gemini REST API mock endpoint. Returns JSON matching Google genai response structure.
    """
    mock_json_response = (
        "{\n"
        '  "summary": "Mock Compliance Summary: Analysis completed offline for institutional review.",\n'
        '  "issues": [\n'
        "    {\n"
        '      "passage": "Historical returns guarantee future fund performance.",\n'
        '      "rule": "FINRA Rule 2210 - Communications with the Public",\n'
        '      "explanation": "Promissory statements and performance guarantees are strictly prohibited."\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    return {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": mock_json_response
                        }
                    ],
                    "role": "model",
                },
                "finishReason": "STOP",
                "index": 0,
            }
        ],
        "usageMetadata": {
            "promptTokenCount": 120,
            "candidatesTokenCount": 85,
            "totalTokenCount": 205,
        },
    }
