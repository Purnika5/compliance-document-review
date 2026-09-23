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
        "passage": "Past performance is indicative of future returns across all economic cycles.",
        "outcome": "flagged",
        "explanation": "Misleading performance projection violates FINRA Rule 2210.",
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
    masked_text: Optional[str] = None
    document_id: Optional[str] = None
    version: Optional[int] = 1
    retrieved_rules: Optional[List[Any]] = None
    precedents: Optional[List[Any]] = None


class GeminiContentPart(BaseModel):
    text: Optional[str] = None


class GeminiContent(BaseModel):
    parts: Optional[List[GeminiContentPart]] = None
    role: Optional[str] = "user"


class GeminiGenerateContentRequest(BaseModel):
    contents: Optional[List[Any]] = None


import os
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


def _get_db_conn():
    if not PSYCOPG2_AVAILABLE:
        return None
    db_url = os.getenv("DATABASE_URL")
    try:
        if db_url:
            return psycopg2.connect(db_url, connect_timeout=3)
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        dbname = os.getenv("DB_NAME", "compliance_doc_review")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "postgres")
        return psycopg2.connect(
            host=host, port=port, dbname=dbname, user=user, password=password, connect_timeout=3
        )
    except Exception as err:
        return None


def query_pgvector_rules(query_vec: List[float], top_k: int, threshold: float) -> Optional[List[Dict[str, Any]]]:
    conn = _get_db_conn()
    if not conn:
        return None
    try:
        vec_str = "[" + ",".join(str(v) for v in query_vec) + "]"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, rule_code, title, description,
                       (1 - (embedding <=> %s::vector)) AS similarity_score
                FROM rules
                WHERE (1 - (embedding <=> %s::vector)) >= %s
                ORDER BY similarity_score DESC
                LIMIT %s;
            """, (vec_str, vec_str, threshold, top_k))
            rows = cur.fetchall()
            if rows:
                results = []
                for row in rows:
                    results.append({
                        "id": str(row["id"]),
                        "rule_code": row["rule_code"],
                        "title": row["title"],
                        "description": row["description"],
                        "similarity_score": round(float(row["similarity_score"]), 4)
                    })
                return results
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return None


def query_pgvector_precedents(query_vec: List[float], top_k: int, threshold: float) -> Optional[List[Dict[str, Any]]]:
    conn = _get_db_conn()
    if not conn:
        return None
    try:
        vec_str = "[" + ",".join(str(v) for v in query_vec) + "]"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, document_id, passage, outcome, explanation,
                       (1 - (embedding <=> %s::vector)) AS similarity_score
                FROM precedent_decisions
                WHERE (1 - (embedding <=> %s::vector)) >= %s
                ORDER BY similarity_score DESC
                LIMIT %s;
            """, (vec_str, vec_str, threshold, top_k))
            rows = cur.fetchall()
            if rows:
                results = []
                for row in rows:
                    results.append({
                        "id": str(row["id"]),
                        "document_id": str(row["document_id"]) if row["document_id"] else None,
                        "passage": row["passage"],
                        "outcome": row["outcome"],
                        "explanation": row["explanation"],
                        "similarity_score": round(float(row["similarity_score"]), 4)
                    })
                return results
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return None


@app.get("/health")
def health_check() -> Dict[str, str]:
    db_connected = _get_db_conn() is not None
    return {
        "status": "ok",
        "service": "mock-ai-api",
        "mode": "vector-store-connected" if db_connected else "offline-simulation",
        "retrieval_ready": "true",
        "pgvector_active": str(db_connected).lower()
    }


@app.post("/retrieve/rules")
def retrieve_rules_endpoint(req: RetrievalQueryRequest) -> List[Dict[str, Any]]:
    query_text = req.passage or req.text or ""
    if not query_text.strip():
        return []
    query_vec = embed_128d(query_text)
    
    # Attempt Postgres pgvector lookup first
    pg_results = query_pgvector_rules(query_vec, req.top_k, req.threshold)
    if pg_results is not None:
        return pg_results

    # Fallback to in-memory cosine matching
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
    
    # Attempt Postgres pgvector lookup first
    pg_results = query_pgvector_precedents(query_vec, req.top_k, req.threshold)
    if pg_results is not None:
        return pg_results

    # Fallback to in-memory cosine matching
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
    Analyzes document text against FINRA/SEC rules and returns structured flags.
    """
    doc_text = request.masked_text or request.text or ""
    flags = []

    # Dynamic rule scanning fallback
    lower_text = doc_text.lower()
    if "guarantee" in lower_text or "promissory" in lower_text or "returns" in lower_text:
        flags.append({
            "passage": "Historical returns guarantee future fund performance." if "guarantee" not in lower_text else [s for s in doc_text.split(".") if "guarantee" in s.lower()][0] + ".",
            "rule": "FINRA Rule 2210 - Communications with the Public",
            "explanation": "Promissory statements and guaranteed return claims violate FINRA 2210 rules regarding public communications."
        })


    if not flags:
        flags.append({
            "passage": "Historical returns guarantee future fund performance.",
            "rule": "FINRA Rule 2210 - Communications with the Public",
            "explanation": "Promissory statements and performance guarantees are strictly prohibited in marketing and disclosure materials."
        })

    return {
        "summary": "AI Compliance Summary: Document evaluated against FINRA/SEC regulatory rules. Excerpt analysis, risk disclosure verifications, and fee structure checks completed.",
        "flags": flags,
        "issues": flags,
        "status": "flagged" if flags else "compliant",
        "model": "gemini-3.6-flash-compliance",
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
