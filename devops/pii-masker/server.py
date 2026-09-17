"""
server.py
---------
DevOps Server-Side PII Masking Microservice (Springer Capital Compliance Platform).

Provides high-performance, deterministic PII anonymization before raw text reaches:
  1. Data Engineering's storage and ingestion pipeline.
  2. The Gemini AI API compliance review service.
"""

import os
import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pii_masker import PiiMasker, mask_pii, mask_document_payload

START_TIME = time.time()
PROCESSED_COUNT = 0

app = FastAPI(
    title="Springer Capital PII Masking Service",
    description="Server-side PII stripping & replacement gateway for Data Eng and AI pipelines.",
    version="1.0.0",
)

# Enable CORS for cross-service communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MaskRequest(BaseModel):
    document_id: Optional[str] = Field(default="doc-001", description="Unique document ID")
    version: Optional[int] = Field(default=1, description="Document revision version")
    text: Optional[str] = Field(default=None, description="Raw text containing PII")
    raw_text: Optional[str] = Field(default=None, description="Alias for text")
    masked_text: Optional[str] = Field(default=None, description="Input text or already masked text")
    content: Optional[str] = Field(default=None, description="Alias for text content")


class MaskResponse(BaseModel):
    document_id: str
    version: int
    masked_text: str


class BatchMaskRequest(BaseModel):
    documents: List[MaskRequest]


class BatchMaskResponse(BaseModel):
    results: List[MaskResponse]
    total_processed: int


@app.get("/health")
def health_check() -> Dict[str, Any]:
    """Health check endpoint for Docker Compose and orchestrator liveness checks."""
    return {
        "status": "healthy",
        "service": "pii-masker",
        "mode": "production-ready",
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }


@app.get("/")
def root_info() -> Dict[str, str]:
    return {
        "message": "Springer Capital Server-Side PII Masking Service is active",
        "documentation": "/docs",
        "health": "/health",
    }


@app.post("/mask", response_model=MaskResponse, status_code=status.HTTP_200_OK)
def mask_document(request: MaskRequest) -> MaskResponse:
    """
    Primary PII stripping and replacement endpoint.
    Guarantees deterministic masking, idempotency, and preserves document_id & version.
    """
    global PROCESSED_COUNT
    try:
        masker = PiiMasker()
        payload = request.model_dump()
        result = masker.mask_document(payload)
        PROCESSED_COUNT += 1
        return MaskResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PII Masking Error: {str(e)}"
        )


@app.post("/mask/batch", response_model=BatchMaskResponse, status_code=status.HTTP_200_OK)
def mask_batch_documents(request: BatchMaskRequest) -> BatchMaskResponse:
    """
    High-throughput batch masking endpoint for Data Engineering bulk ingestion jobs.
    """
    global PROCESSED_COUNT
    results: List[MaskResponse] = []
    try:
        for doc in request.documents:
            masker = PiiMasker()
            payload = doc.model_dump()
            res = masker.mask_document(payload)
            results.append(MaskResponse(**res))
            PROCESSED_COUNT += 1
        return BatchMaskResponse(results=results, total_processed=len(results))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch PII Masking Error: {str(e)}"
        )


@app.get("/metrics")
def get_metrics() -> Dict[str, Any]:
    """Basic service metrics."""
    return {
        "total_documents_processed": PROCESSED_COUNT,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "status": "operational",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
