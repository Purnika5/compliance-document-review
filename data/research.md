# Data Engineering — Research & Decisions Log

## Week 1: Schema Design + Ingestion

### 1. Database Choice: PostgreSQL

**Options considered:**
- PostgreSQL — relational, strong support for constraints/foreign keys, native
  support for vector search via `pgvector` extension (needed later in Week 3)
- MongoDB — flexible schema, but weaker for enforcing relational integrity
  between documents, users, and audit trail entries

**Decision:** PostgreSQL — chosen because the app's data is inherently
relational (documents belong to users, audit entries belong to documents,
revision threads link multiple document versions), and because we'll need
`pgvector` in Week 3 for the RAG retrieval work, so standardizing on Postgres
now avoids a migration later.

---

### 2. Audit Trail Design: Append-Only Log vs. Versioned Rows

**Options considered:**
- Append-only `audit_trail` table (one row per change event)
- Storing full document snapshots on every change

**Decision:** Append-only log. Each row records `actor_id`, `action`,
`old_value`, `new_value`, and `occurred_at`. This is far cheaper to store than
full snapshots, and satisfies the roadmap's requirement that history be
reconstructible exactly as it happened, since rows are never updated or
deleted.

---

### 3. Revision Threads: Self-Referencing Column vs. Separate Thread Table

**Options considered:**
- Just a `original_document_id` self-reference on `documents`, with no
  separate thread table
- A dedicated `revision_threads` + `revision_thread_entries` pair of tables

**Decision:** Both. `documents.original_document_id` gives a fast, simple way
to trace a resubmission back to its root. The separate `revision_threads` /
`revision_thread_entries` tables exist because the roadmap also requires
displaying *comments* and *decisions* inline in the same thread (not just
document versions) — a single self-reference on `documents` can't hold
comment text or decision notes, so a dedicated entries table was necessary.

---

### 4. File Storage: Local Disk vs. Cloud Object Storage

**Options considered:**
- Save directly to S3/Azure Blob from day one
- Save to local disk now, abstract the storage call behind one function

**Decision:** Local disk for now, via a single `save_to_storage()` function.
Since the team doesn't have cloud credentials configured yet, hardcoding a
cloud SDK call now would block local development for everyone. Isolating
storage behind one function means swapping in S3/Blob later is a one-line
change, not a rewrite.

---

### 5. File Validation Rules

**Options considered:**
- No size cap (rely on infra limits)
- Hard size cap in application code

**Decision:** 20MB cap enforced in `validate_file()`. Compliance documents
(PDF/DOCX/XLSX) are rarely larger than a few MB; capping early prevents
oversized uploads from reaching storage or the (future) masking/extraction
pipeline, where they'd be more expensive to reject.
