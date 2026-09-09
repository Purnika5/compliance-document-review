-- Add version tracking and parent document reference
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS original_document_id UUID REFERENCES documents(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_documents_original_doc_id ON documents(original_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(version);

-- Revision threads for tracking document versions
CREATE TABLE IF NOT EXISTS revision_threads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_threads_root ON revision_threads(root_document_id);

-- Revision thread entries for submissions and decisions
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

