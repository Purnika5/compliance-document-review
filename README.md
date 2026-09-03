# Data Engineering — Week 1

## Deliverables

### 1. Schema Design (`schema.sql`)
Relational schema covering:
- `users`, `documents` — core tables
- `audit_trail` — append-only log of every state change (who/what/when), no PII
- `revision_threads` + `revision_thread_entries` — links a document's original
  submission to all its resubmissions/comments so the frontend can render one
  continuous conversation thread

### 2. Ingestion Logic (`ingestion.py`)
- `ingest_document()` — validates an uploaded file (type: pdf/docx/xlsx, size ≤ 20MB),
  saves it to storage, and extracts metadata (size, type, advisor ID, filename)
- Storage-agnostic: currently saves to local disk (`storage/documents/`), but
  `save_to_storage()` is the single place to swap in S3/Blob later
- `to_insert_dict()` converts the result into a dict matching the `documents`
  table columns for insertion

## How to Run
```bash
python ingestion.py
```
Runs a quick manual test that ingests a fake PDF and prints the resulting
metadata + DB-ready dict.

To apply the schema to a Postgres database:
```bash
psql -U <user> -d <database> -f schema.sql
```

## Notes for the Team
- `documents.original_document_id` is how a resubmission links back to the
  original — Backend's "Revision Logic" and Frontend's "Revision Threads" both
  read off this.
- No raw file content or PII lives in these tables — everything here is
  structured metadata, consistent with the DevOps PII Masking boundary.
- Next up (Week 2): text extraction (PDF/DOCX/XLSX → clean text) and wiring
  this ingestion flow to the DevOps masking service before storage.
