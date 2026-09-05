-- ============================================================================
-- Compliance Document Review App — Data Engineering Week 1
-- Schema: Core tables + Audit Trails + Revision Threads
-- Updated per code review round 2:
--   - status normalized into its own lookup table (foreign key, lighter for backend)
--   - index added on users.role
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- needed for gen_random_uuid()

-- Users (Advisors and Officers)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('Advisor', 'Officer')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index on role for fast filtering (e.g. "all Advisors", "all Officers")
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- DOCUMENT STATUSES (lookup table)
-- Normalized out of `documents` so status is a lightweight UUID foreign key
-- instead of repeating the full text value on every row.
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_statuses (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('Pending', 'Approved', 'Needs Revision', 'Rejected'))
);

-- Seed the fixed set of statuses
INSERT INTO document_statuses (name) VALUES
    ('Pending'), ('Approved'), ('Needs Revision'), ('Rejected')
ON CONFLICT (name) DO NOTHING;

-- Documents submitted by Advisors
CREATE TABLE IF NOT EXISTS documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id          UUID NOT NULL REFERENCES users(id),
    file_name           VARCHAR(255) NOT NULL,
    file_type           VARCHAR(20) NOT NULL,        -- pdf, docx, xlsx
    file_size_bytes     INTEGER NOT NULL,
    storage_path        TEXT NOT NULL,                -- where the raw file lives (disk/S3 path)
    status_id           UUID NOT NULL REFERENCES document_statuses(id),
    -- Self-reference: a resubmission points back to the original document
    original_document_id UUID REFERENCES documents(id),
    submitted_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status_id);

-- ============================================================================
-- AUDIT TRAIL
-- Records every state change (who, what, when) — never leaks PII (per DevOps
-- masking service; this table only stores structured metadata, not raw text).
-- old_value / new_value reference document_statuses(id) since they track
-- status transitions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_trail (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id),
    actor_id        UUID NOT NULL REFERENCES users(id),   -- who made the change
    action          VARCHAR(50) NOT NULL,                  -- e.g. 'Submitted', 'Status Changed', 'Commented'
    old_status_id   UUID REFERENCES document_statuses(id),
    new_status_id   UUID REFERENCES document_statuses(id),
    occurred_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_document ON audit_trail(document_id, occurred_at);

-- ============================================================================
-- REVISION THREADS
-- A single conversation thread per document lineage (original + all
-- resubmissions), so the frontend can render it as one continuous thread.
-- entry_type stays lowercase per team convention.
-- ============================================================================
CREATE TABLE IF NOT EXISTS revision_threads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_document_id    UUID NOT NULL REFERENCES documents(id),  -- the very first submission in the chain
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revision_thread_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id           UUID NOT NULL REFERENCES revision_threads(id),
    document_id         UUID NOT NULL REFERENCES documents(id),   -- which version this entry refers to
    author_id           UUID NOT NULL REFERENCES users(id),
    entry_type          VARCHAR(20) NOT NULL CHECK (entry_type IN ('submission', 'comment', 'decision')),
    message             TEXT,                                      -- comment text or decision note
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_thread_entries_thread ON revision_thread_entries(thread_id, created_at);

-- ============================================================================
-- Design notes:
-- - Primary keys use UUID (gen_random_uuid()) instead of SERIAL, to align
--   with the Backend team's ID convention across the app.
-- - Status is normalized into `document_statuses`, a lookup table, so
--   `documents.status_id` and `audit_trail.old_status_id/new_status_id`
--   store a lightweight UUID foreign key instead of repeating text.
-- - Added an index on users.role for fast role-based filtering.
-- - role uses Title Case ('Advisor', 'Officer'); entry_type stays lowercase.
-- - documents.original_document_id + revision_threads let us link every
--   resubmission back to the original, satisfying "Revision Logic" and
--   "Revision Threads" from the roadmap.
-- - audit_trail is append-only (no updates/deletes) so history is always
--   reconstructible exactly as it happened.
-- - No raw file content or PII lives in these tables — only metadata,
--   consistent with the DevOps PII Masking Engine boundary.
-- ============================================================================
