-- Week 3 - Data Engineering - Gold Layer (pgvector)
-- Team-aligned schema: 128-dimensional deterministic embeddings, UUID ids via
-- pgcrypto, table names `rules` / `precedent_decisions`, ivfflat lists = 10.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Compliance rules corpus (used by Rule Retrieval)
CREATE TABLE IF NOT EXISTS rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code       VARCHAR(50) NOT NULL UNIQUE,   -- e.g. "FINRA-2210"
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    embedding       VECTOR(128) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_embedding
    ON rules USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Past documents / decisions corpus (used by Precedent Search)
--
-- NOTE on document_id: this references the `documents` table owned by the
-- Backend track (document submission / CRUD). That table isn't created by
-- this file, so the FK constraint below is commented out -- uncomment it
-- once this migration runs *after* Backend's `documents` table migration in
-- the deploy order, otherwise `CREATE TABLE` will fail on a fresh database.
CREATE TABLE IF NOT EXISTS precedent_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL,  -- REFERENCES documents(id) -- uncomment once Backend's table exists
    passage         TEXT NOT NULL,
    outcome         VARCHAR(20) NOT NULL CHECK (outcome IN ('flagged', 'cleared')),
    explanation     TEXT NOT NULL,
    embedding       VECTOR(128) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_precedent_decisions_embedding
    ON precedent_decisions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_precedent_decisions_document
    ON precedent_decisions(document_id);

-- Document passages ingested from the advisor's submitted documents
-- (used for Absence Detection - checking which required disclosures are missing)
CREATE TABLE IF NOT EXISTS document_passages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL,  -- REFERENCES documents(id) -- uncomment once Backend's table exists
    version         INT NOT NULL,
    passage         TEXT NOT NULL,          -- masked/sanitized text only
    embedding       VECTOR(128) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_passages_embedding
    ON document_passages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_document_passages_document
    ON document_passages(document_id, version);

-- Rules that MUST appear as a disclosure somewhere in a document
-- (subset of `rules`, used specifically for Absence Detection)
CREATE TABLE IF NOT EXISTS required_disclosures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID NOT NULL REFERENCES rules(id),
    description     TEXT NOT NULL
);
