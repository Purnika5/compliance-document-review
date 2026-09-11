# DevOps — PII Masking Service (`pii-masker`)

Deterministic, server-side PII stripping & replacement gateway for the Springer Capital Compliance Document Review platform.

## 🚀 Overview

Guarantees that sensitive Personally Identifiable Information (Names, Social Security Numbers, Emails, Phone Numbers, Financial Accounts, Physical Addresses) is completely sanitized and replaced with structured placeholders (`[NAME_1]`, `[SSN_1]`, `[EMAIL_1]`, etc.) **before** text reaches:
- Data Engineering's extraction & storage pipelines
- AI analysis models & Gemini LLM endpoints

---

## 📡 API Contract

### `POST /mask`
Primary endpoint for single document masking.

#### Request Body
```json
{
  "document_id": "doc-001",
  "version": 1,
  "text": "Dear John Doe, please contact john.doe@example.com regarding your investment account."
}
```
*(Also supports `masked_text`, `raw_text`, or `content` fields)*

#### Response Body (`200 OK`)
```json
{
  "document_id": "doc-001",
  "version": 1,
  "masked_text": "Dear [NAME_1], please contact [EMAIL_1] regarding your investment account."
}
```

---

### `POST /mask/batch`
High-throughput endpoint for Data Engineering batch ingestion jobs.

#### Request Body
```json
{
  "documents": [
    {
      "document_id": "doc-001",
      "version": 1,
      "text": "Client: Jane Smith, SSN: 123-45-6789"
    },
    {
      "document_id": "doc-002",
      "version": 1,
      "text": "Advisor: Robert Taylor, Email: robert@springercapital.com"
    }
  ]
}
```

---

## 🐍 Python Direct Import Usage (Data Eng & AI)

Data Engineering and AI scripts can also use the masking engine directly in-process:

```python
from devops.pii_masker import PiiMasker, mask_pii, mask_document_payload

# 1. Quick string masking
clean_text = mask_pii("Dear John Doe, call 555-123-4567")
# -> "Dear [NAME_1], call [PHONE_1]"

# 2. Document payload dictionary
payload = {
    "document_id": "doc-001",
    "version": 1,
    "text": "Contact john@example.com"
}
result = mask_document_payload(payload)
# -> {"document_id": "doc-001", "version": 1, "masked_text": "Contact [EMAIL_1]"}
```

---

## 🧪 Testing

Run the full pytest suite:

```bash
python -m pytest devops/pii-masker/tests/ -v
```

---

## 🐳 Docker Deployment

The service is pre-configured in `docker-compose.yml`:
```bash
docker compose up pii-masker
```
Listening on port `8002` with automated container healthcheck.
