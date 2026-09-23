-- Document Analyses table for storing sanitized text, AI compliance summaries, and issue flags
CREATE TABLE IF NOT EXISTS document_analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL DEFAULT 1,
    masked_text     TEXT NOT NULL,
    summary         TEXT,
    flags           JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_level      VARCHAR(50) DEFAULT 'Low',
    risk_score      NUMERIC DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_analysis_doc_ver UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_analyses_doc ON document_analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_document_analyses_doc_ver ON document_analyses(document_id, version);
