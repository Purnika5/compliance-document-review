-- ============================================================================
-- Compliance Document Review Platform - Migration 002
-- Week 2: Document Versioning & Revision Threads
-- ============================================================================

-- 1. Add version tracking and self-referential parent link to documents
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS original_document_id UUID REFERENCES documents(id) ON DELETE RESTRICT;

-- Index on original_document_id for fast lineage lookups
CREATE INDEX IF NOT EXISTS idx_documents_original_doc_id ON documents(original_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(version);

-- 2. Revision Threads (one conversation thread per document lineage)
CREATE TABLE IF NOT EXISTS revision_threads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index ensuring one thread per root document
CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_threads_root ON revision_threads(root_document_id);

-- 3. Revision Thread Entries (submissions, officer comments, review decisions)
CREATE TABLE IF NOT EXISTS revision_thread_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id           UUID NOT NULL REFERENCES revision_threads(id) ON DELETE CASCADE,
    document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entry_type          VARCHAR(20) NOT NULL CHECK (entry_type IN ('submission', 'comment', 'decision')),
    message             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_entries_thread ON revision_thread_entries(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_thread_entries_doc ON revision_thread_entries(document_id);
