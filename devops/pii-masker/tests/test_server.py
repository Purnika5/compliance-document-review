"""
test_server.py
--------------
Integration tests for the FastAPI PII Masker service endpoints:
  - GET /health
  - POST /mask
  - POST /mask/batch
  - GET /metrics
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add pii-masker directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "pii-masker"


def test_mask_endpoint_contract():
    payload = {
        "document_id": "doc-001",
        "version": 1,
        "text": "Dear John Doe, please contact john.doe@example.com regarding your investment account."
    }
    response = client.post("/mask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["document_id"] == "doc-001"
    assert data["version"] == 1
    assert data["masked_text"] == "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."


def test_mask_endpoint_with_already_masked_text():
    payload = {
        "document_id": "doc-001",
        "version": 1,
        "masked_text": "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."
    }
    response = client.post("/mask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["document_id"] == "doc-001"
    assert data["version"] == 1
    assert data["masked_text"] == "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."


def test_batch_mask_endpoint():
    payload = {
        "documents": [
            {
                "document_id": "doc-001",
                "version": 1,
                "text": "Client: Jane Smith, SSN: 123-45-6789"
            },
            {
                "document_id": "doc-002",
                "version": 2,
                "text": "Advisor: John Doe, Email: john@springercapital.com"
            }
        ]
    }
    response = client.post("/mask/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_processed"] == 2
    assert len(data["results"]) == 2
    assert data["results"][0]["document_id"] == "doc-001"
    assert "[NAME_1]" in data["results"][0]["masked_text"]
    assert "[SSN_1]" in data["results"][0]["masked_text"]
    assert data["results"][1]["document_id"] == "doc-002"
    assert "[EMAIL_1]" in data["results"][1]["masked_text"]


def test_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_documents_processed" in data
    assert data["status"] == "operational"
