-- ============================================================================
-- Compliance Document Review App — Data Engineering Week 1
-- Schema: Core tables + Audit Trails + Revision Threads
-- ============================================================================

-- Users (Advisors and Officers)
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('advisor', 'officer')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents submitted by Advisors
CREATE TABLE IF NOT EXISTS documents (
    id                  SERIAL PRIMARY KEY,
    advisor_id          INTEGER NOT NULL REFERENCES users(id),
    file_name           VARCHAR(255) NOT NULL,
    file_type           VARCHAR(20) NOT NULL,        -- pdf, docx, xlsx
    file_size_bytes     INTEGER NOT NULL,
    storage_path        TEXT NOT NULL,                -- where the raw file lives (disk/S3 path)
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'needs_revision', 'rejected')),
    -- Self-reference: a resubmission points back to the original document
    original_document_id INTEGER REFERENCES documents(id),
    submitted_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT TRAIL
-- Records every state change (who, what, when) — never leaks PII (per DevOps
-- masking service; this table only stores structured metadata, not raw text).
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_trail (
    id              SERIAL PRIMARY KEY,
    document_id     INTEGER NOT NULL REFERENCES documents(id),
    actor_id        INTEGER NOT NULL REFERENCES users(id),   -- who made the change
    action          VARCHAR(50) NOT NULL,                     -- e.g. 'submitted', 'status_changed', 'commented'
    old_value       VARCHAR(50),                              -- e.g. previous status
    new_value       VARCHAR(50),                              -- e.g. new status
    occurred_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for the common "get full history for this document" query
CREATE INDEX IF NOT EXISTS idx_audit_trail_document ON audit_trail(document_id, occurred_at);

-- ============================================================================
-- REVISION THREADS
-- A single conversation thread per document lineage (original + all
-- resubmissions), so the frontend can render it as one continuous thread.
-- ============================================================================
CREATE TABLE IF NOT EXISTS revision_threads (
    id                  SERIAL PRIMARY KEY,
    root_document_id    INTEGER NOT NULL REFERENCES documents(id),  -- the very first submission in the chain
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revision_thread_entries (
    id                  SERIAL PRIMARY KEY,
    thread_id           INTEGER NOT NULL REFERENCES revision_threads(id),
    document_id         INTEGER NOT NULL REFERENCES documents(id),   -- which version this entry refers to
    author_id           INTEGER NOT NULL REFERENCES users(id),
    entry_type          VARCHAR(20) NOT NULL CHECK (entry_type IN ('submission', 'comment', 'decision')),
    message              TEXT,                                       -- comment text or decision note
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_thread_entries_thread ON revision_thread_entries(thread_id, created_at);

-- ============================================================================
-- Design notes:
-- - documents.original_document_id + revision_threads let us link every
--   resubmission back to the original, satisfying "Revision Logic" and
--   "Revision Threads" from the roadmap.
-- - audit_trail is append-only (no updates/deletes) so history is always
--   reconstructible exactly as it happened.
-- - No raw file content or PII lives in these tables — only metadata,
--   consistent with the DevOps PII Masking Engine boundary.
-- ============================================================================
