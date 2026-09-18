"""
Mock Third-Party AI API Service (Springer Capital Compliance Document Review)
Simulates Gemini / Groq LLM endpoints to allow 100% offline local development,
continuous integration, and automated testing without incurring rate limits or API costs.
"""

import hashlib
import re
import math
from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Mock Compliance AI API",
    description="Offline simulation service for Gemini / Groq compliance document review and Week 3 Retrieval",
    version="1.1.0",
)


# --------------------------------------------------
# Week 3 Deterministic 128D Embedding Logic
# --------------------------------------------------

STOPWORDS = {
    "the", "a", "an", "of", "in", "on", "with", "or", "and", "to", "for",
    "is", "are", "was", "were", "be", "based", "this", "that", "all",
    "no", "not", "over", "last", "including", "under", "as", "by", "it",
}


def _stem(token: str) -> str:
    if len(token) > 5 and token.endswith("ee"):
        token = token[:-1]
    for suffix in ("ations", "ation", "ing", "edly", "ed", "es", "s"):
        if len(token) > len(suffix) + 3 and token.endswith(suffix):
            return token[:-len(suffix)]
    return token


def embed_128d(text: str) -> List[float]:
    raw = re.findall(r"[a-z0-9]+", text.lower())
    tokens = [_stem(t) for t in raw if t not in STOPWORDS]
    vector = [0.0] * 128
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % 128
        vector[index] += 1.0
    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]
    return vector


def cosine_sim(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


# Sample rules and precedents from Udhayveer's Data Eng corpus
DEFAULT_RULES = [
    {
        "id": "2469c4cc-b396-4dd8-b675-2a42592b6527",
        "rule_code": "FINRA-2210",
        "title": "Communications with the Public",
        "description": "Prohibits false, exaggerated, unwarranted, or misleading statements in communications with the public, including implying guaranteed investment returns.",
    },
    {
        "id": "11a9dbe6-cd19-404c-90f9-270af4394bc8",
        "rule_code": "SEC-206",
        "title": "Fiduciary Duty Disclosure",
        "description": "Requires advisors to disclose all material conflicts of interest, including compensation received for recommending specific products.",
    },
    {
        "id": "4d8c6873-5453-478e-a102-fadd6a98edcf",
        "rule_code": "FINRA-2111",
        "title": "Suitability Obligation",
        "description": "Requires a reasonable basis to believe a recommended transaction or investment strategy is suitable for the customer based on their profile.",
    },
    {
        "id": "872e0907-2dfa-4790-9ad0-227c25f6fe2d",
        "rule_code": "SEC-RiskDisclosure",
        "title": "Risk Factor Disclosure",
        "description": "Requires clear disclosure of principal risks of loss associated with an investment, including that past performance does not guarantee future results.",
    },
    {
        "id": "d3a750a2-f653-4744-bad2-acd25f97ee35",
        "rule_code": "FINRA-2214",
        "title": "Fee and Expense Disclosure",
        "description": "Requires clear and prominent disclosure of all fees, expenses, and charges associated with a recommended product.",
    }
]

DEFAULT_PRECEDENTS = [
    {
        "id": "9607ba1d-2d3f-4e7b-b8f9-a0c88393e648",
        "document_id": "d2653c14-3c69-490d-bb3e-32a36f3dbe39",
        "passage": "Historical returns guarantee future fund performance.",
        "outcome": "flagged",
        "explanation": "Guaranteed performance statement violates FINRA 2210.",
    },
    {
        "id": "b3e2a109-1144-48cd-bfe3-94c6efd9271a",
        "document_id": "5170e7a2-fa48-433b-8531-158f47970d2f",
        "passage": "Advisor receives compensation from product sponsors without client disclosure.",
        "outcome": "flagged",
        "explanation": "Undisclosed third-party compensation violates SEC 206 fiduciary requirements.",
    },
    {
        "id": "3127dd05-e414-49c7-873b-f6be6ff6ecdf",
        "document_id": "18fbd8cc-4d37-4d92-b4c6-e63d41f3d643",
        "passage": "This portfolio seeks capital appreciation with moderate volatility appropriate for medium risk tolerance.",
        "outcome": "cleared",
        "explanation": "Balanced risk disclosures and clear suitability framing conform with FINRA 2111.",
    },
    {
        "id": "01c9c766-3d71-460d-9b55-fa771a337c78",
        "document_id": "18fbd8cc-4d37-4d92-b4c6-e63d41f3d643",
        "passage": "Annual advisory fee of 0.85% plus underlying ETF expense ratios detailed in table.",
        "outcome": "cleared",
        "explanation": "Transparent, complete fee schedules meet FINRA 2214 disclosure guidelines.",
    }
]

# Precompute embeddings
RULE_EMBEDDINGS = [
    (r, embed_128d(f"{r['title']}. {r['description']}"))
    for r in DEFAULT_RULES
]
PRECEDENT_EMBEDDINGS = [
    (p, embed_128d(p["passage"]))
    for p in DEFAULT_PRECEDENTS
]


class RetrievalQueryRequest(BaseModel):
    passage: Optional[str] = None
    text: Optional[str] = None
    top_k: int = 5
    threshold: float = 0.45


class PrecedentQueryRequest(BaseModel):
    passage: Optional[str] = None
    text: Optional[str] = None
    top_k: int = 5
    threshold: float = 0.50


class CombinedRetrievalRequest(BaseModel):
    passage: Optional[str] = None
    masked_text: Optional[str] = None
    text: Optional[str] = None
    rule_top_k: int = 5
    rule_threshold: float = 0.45
    precedent_top_k: int = 5
    precedent_threshold: float = 0.50


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
        "retrieval_ready": "true"
    }


@app.post("/retrieve/rules")
def retrieve_rules_endpoint(req: RetrievalQueryRequest) -> List[Dict[str, Any]]:
    query_text = req.passage or req.text or ""
    if not query_text.strip():
        return []
    query_vec = embed_128d(query_text)
    hits = []
    for r, r_vec in RULE_EMBEDDINGS:
        score = cosine_sim(query_vec, r_vec)
        if score >= req.threshold:
            hits.append({
                "id": r["id"],
                "rule_code": r["rule_code"],
                "title": r["title"],
                "description": r["description"],
                "similarity_score": round(score, 4)
            })
    hits.sort(key=lambda x: x["similarity_score"], reverse=True)
    return hits[:req.top_k]


@app.post("/retrieve/precedents")
def retrieve_precedents_endpoint(req: PrecedentQueryRequest) -> List[Dict[str, Any]]:
    query_text = req.passage or req.text or ""
    if not query_text.strip():
        return []
    query_vec = embed_128d(query_text)
    hits = []
    for p, p_vec in PRECEDENT_EMBEDDINGS:
        score = cosine_sim(query_vec, p_vec)
        if score >= req.threshold:
            hits.append({
                "id": p["id"],
                "document_id": p["document_id"],
                "passage": p["passage"],
                "outcome": p["outcome"],
                "explanation": p["explanation"],
                "similarity_score": round(score, 4)
            })
    hits.sort(key=lambda x: x["similarity_score"], reverse=True)
    return hits[:req.top_k]


@app.post("/retrieve")
def retrieve_combined_endpoint(req: CombinedRetrievalRequest) -> Dict[str, Any]:
    query_text = req.passage or req.masked_text or req.text or ""
    if not query_text.strip():
        return {"retrieved_rules": [], "precedents": []}
    
    rules_req = RetrievalQueryRequest(passage=query_text, top_k=req.rule_top_k, threshold=req.rule_threshold)
    prec_req = PrecedentQueryRequest(passage=query_text, top_k=req.precedent_top_k, threshold=req.precedent_threshold)
    
    return {
        "retrieved_rules": retrieve_rules_endpoint(rules_req),
        "precedents": retrieve_precedents_endpoint(prec_req)
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
