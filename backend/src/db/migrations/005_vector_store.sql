-- Migration 005: pgvector store for Compliance Rules, Precedents, and Document Passages

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Compliance rules corpus (used by Rule Retrieval)
CREATE TABLE IF NOT EXISTS rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code       VARCHAR(50) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    embedding       VECTOR(128) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_embedding
    ON rules USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Past documents / decisions corpus (used by Precedent Search)
CREATE TABLE IF NOT EXISTS precedent_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
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

-- Document passages ingested from submitted documents (used for Absence Detection)
CREATE TABLE IF NOT EXISTS document_passages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    passage         TEXT NOT NULL,
    embedding       VECTOR(128) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_passages_embedding
    ON document_passages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_document_passages_document
    ON document_passages(document_id, version);

-- Required disclosures subset for Absence Detection
CREATE TABLE IF NOT EXISTS required_disclosures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    description     TEXT NOT NULL
);
