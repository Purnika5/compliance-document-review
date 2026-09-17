"""
test_data_devops_integration.py
--------------------------------
End-to-end integration test demonstrating the Data Engineering pipeline
wiring into the DevOps PII Masking service before reaching the AI analysis API.

Flow:
  1. Data Ingestion: Advisor uploads a document -> validates file type, extracts metadata.
  2. Text Extraction: Raw text contains sensitive advisor/client PII.
  3. DevOps PII Boundary: Strips names, SSNs, emails, phones -> produces structured masked payload.
  4. Pipeline Output: Validates document_id & version preserved, masked_text ready for AI / storage.
"""

import sys
from pathlib import Path
import pytest

# Safely locate project root if running from within repo
curr = Path(__file__).resolve()
PROJECT_ROOT = None
for parent in curr.parents:
    if (parent / "data").exists() and (parent / "devops").exists():
        PROJECT_ROOT = parent
        break

if PROJECT_ROOT:
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    if str(PROJECT_ROOT / "data") not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT / "data"))
    if str(PROJECT_ROOT / "data" / "week1") not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT / "data" / "week1"))
    if str(PROJECT_ROOT / "devops" / "pii-masker") not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT / "devops" / "pii-masker"))
else:
    app_root = curr.parents[1] if len(curr.parents) > 1 else curr.parent
    if str(app_root) not in sys.path:
        sys.path.insert(0, str(app_root))

import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import List

# Import Data Engineering ingestion logic
ingest_document = None
validate_file = None
DocumentMetadata = None

try:
    from ingestion import ingest_document, validate_file, DocumentMetadata
except ImportError:
    try:
        from week1.ingestion import ingest_document, validate_file, DocumentMetadata
    except ImportError:
        pass

# Import DevOps PII Masking Engine
from pii_masker import PiiMasker, mask_pii, mask_document_payload


def test_data_to_devops_pii_integration():
    if ingest_document is None:
        pytest.skip("Data Engineering ingestion module not mounted in standalone container environment")
    print("================================================================")
    print("  SPRINGER CAPITAL — DATA ENGINEERING + DEVOPS INTEGRATION TEST  ")
    print("================================================================")

    # Step 1: Advisor uploads a compliance document containing PII
    advisor_id = uuid.uuid4()
    file_name = "q1_compliance_disclosure.pdf"
    raw_document_content = (
        "Dear John Doe, please contact john.doe@example.com or call (555) 123-4567 "
        "regarding your investment account with SSN 123-45-6789. "
        "Advisor: Robert Taylor has reviewed your portfolio. "
        "Historical returns guarantee future fund performance."
    )
    raw_file_bytes = raw_document_content.encode("utf-8")

    print(f"\n[Step 1] Ingesting Document: '{file_name}' ({len(raw_file_bytes)} bytes)")
    doc_meta = ingest_document(
        advisor_id=advisor_id,
        file_name=file_name,
        file_bytes=raw_file_bytes
    )
    print(f" -> File Type: {doc_meta.file_type}")
    print(f" -> Storage Path: {doc_meta.storage_path}")
    print(f" -> Advisor ID: {doc_meta.advisor_id}")

    # Step 2: Data Engineering prepares document payload with raw extracted text
    document_id = f"doc-{uuid.uuid4().hex[:8]}"
    version = 1
    input_payload = {
        "document_id": document_id,
        "version": version,
        "text": raw_document_content
    }
    print(f"\n[Step 2] Raw Document Payload Prepared (Pre-Masking):")
    print(f" -> document_id: {input_payload['document_id']}")
    print(f" -> Raw Text Preview: {input_payload['text'][:70]}...")

    # Step 3: DevOps PII Masking Gateway sanitizes text before DB/AI ingestion
    print(f"\n[Step 3] Processing through DevOps PII Masker...")
    sanitized_output = mask_document_payload(input_payload)

    print(f" -> Masked Output Received:")
    print(f"    document_id : {sanitized_output['document_id']}")
    print(f"    version     : {sanitized_output['version']}")
    print(f"    masked_text : {sanitized_output['masked_text']}")

    # Step 4: Verification & Assertions
    assert sanitized_output["document_id"] == document_id, "document_id mismatch!"
    assert sanitized_output["version"] == version, "version mismatch!"
    assert "john.doe@example.com" not in sanitized_output["masked_text"], "Raw email leaked!"
    assert "123-45-6789" not in sanitized_output["masked_text"], "Raw SSN leaked!"
    assert "(555) 123-4567" not in sanitized_output["masked_text"], "Raw phone leaked!"
    assert "John Doe" not in sanitized_output["masked_text"], "Raw client name leaked!"
    assert "Robert Taylor" not in sanitized_output["masked_text"], "Raw advisor name leaked!"

    assert "[EMAIL_1]" in sanitized_output["masked_text"], "Missing [EMAIL_1] tag"
    assert "[SSN_1]" in sanitized_output["masked_text"], "Missing [SSN_1] tag"
    assert "[PHONE_1]" in sanitized_output["masked_text"], "Missing [PHONE_1] tag"
    assert "[NAME_1]" in sanitized_output["masked_text"], "Missing [NAME_1] tag"
    assert "[NAME_2]" in sanitized_output["masked_text"], "Missing [NAME_2] tag"

    print("\n================================================================")
    print("  ALL DATA + DEVOPS INTEGRATION CHECKS PASSED (0% PII LEAKAGE)  ")
    print("================================================================")


if __name__ == "__main__":
    test_data_to_devops_pii_integration()
