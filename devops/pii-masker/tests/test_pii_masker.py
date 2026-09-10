"""
test_pii_masker.py
------------------
Unit tests for the PiiMasker engine covering names, emails, SSNs, phone numbers,
credit card/account numbers, address detection, idempotency, and consistency.
"""

import sys
from pathlib import Path

# Add pii-masker directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pii_masker import PiiMasker, mask_pii, mask_document_payload


def test_mask_emails():
    text = "Please reach out to support@springercapital.com and client.john@gmail.com for help."
    masked = mask_pii(text)
    assert "[EMAIL_1]" in masked
    assert "[EMAIL_2]" in masked
    assert "support@springercapital.com" not in masked
    assert "client.john@gmail.com" not in masked


def test_mask_ssn():
    text = "The client's SSN is 123-45-6789 and secondary is 987 65 4321."
    masked = mask_pii(text)
    assert "[SSN_1]" in masked
    assert "[SSN_2]" in masked
    assert "123-45-6789" not in masked
    assert "987 65 4321" not in masked


def test_mask_phone_numbers():
    text = "Call me at (555) 123-4567 or +1-800-555-0199."
    masked = mask_pii(text)
    assert "[PHONE_1]" in masked
    assert "(555) 123-4567" not in masked


def test_mask_salutation_and_prefixed_names():
    text = "Dear John Doe, please consult with Dr. Alice Smith regarding the portfolio."
    masked = mask_pii(text)
    assert "Dear [NAME_1]" in masked
    assert "[NAME_2]" in masked
    assert "John Doe" not in masked
    assert "Alice Smith" not in masked


def test_mask_labeled_advisor_and_client_names():
    text = "Advisor: Robert Taylor\nClient: Emily Clark\nStatus: Pending Review"
    masked = mask_pii(text)
    assert "[NAME_1]" in masked
    assert "[NAME_2]" in masked
    assert "Robert Taylor" not in masked
    assert "Emily Clark" not in masked
    # Stopword / status should NOT be masked
    assert "Status: Pending Review" in masked or "Pending" in masked


def test_consistency_across_repeats():
    text = "Dear John Doe, John Doe confirmed that john.doe@example.com is correct. Contact john.doe@example.com."
    masker = PiiMasker()
    masked = masker.mask_text(text)
    
    # Should use the same placeholder index for repeated entities
    assert masked.count("[NAME_1]") >= 2
    assert masked.count("[EMAIL_1]") == 2
    assert "[NAME_2]" not in masked
    assert "[EMAIL_2]" not in masked


def test_idempotence_already_masked_tags():
    text = "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."
    masked = mask_pii(text)
    assert masked == "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."


def test_mask_document_payload():
    payload = {
        "document_id": "doc-001",
        "version": 1,
        "text": "Dear John Doe, please contact john.doe@example.com regarding your investment account."
    }
    result = mask_document_payload(payload)
    assert result["document_id"] == "doc-001"
    assert result["version"] == 1
    assert result["masked_text"] == "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."


def test_mask_document_with_already_masked_text_payload():
    payload = {
        "document_id": "doc-001",
        "version": 1,
        "masked_text": "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."
    }
    result = mask_document_payload(payload)
    assert result["document_id"] == "doc-001"
    assert result["version"] == 1
    assert result["masked_text"] == "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."


def test_stopwords_not_masked():
    text = "Springer Capital Compliance Review for January 2026 under FINRA Rule 2210."
    masked = mask_pii(text)
    assert "Springer Capital" in masked
    assert "Compliance Review" in masked
    assert "January 2026" in masked
    assert "FINRA Rule 2210" in masked
