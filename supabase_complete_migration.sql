-- ==========================================================================
-- COMPLETE SPRINGER CAPITAL COMPLIANCE DATABASE SCHEMA FOR SUPABASE
-- Project: wpvchfdjirdxtcxorzjb
-- Generated: 2026-09-23 (Standard PostgreSQL schema - Vector-free)
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/wpvchfdjirdxtcxorzjb/sql/new
-- 2. Paste this entire script into the SQL Editor
-- 3. Click 'Run' (or press Ctrl+Enter)
-- ==========================================================================

-- ==========================================================
-- Migration: 001_initial_schema.sql
-- ==========================================================
-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Advisor', 'Officer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Needs Revision', 'Rejected')),
    advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for document filtering and dashboard queries
CREATE INDEX IF NOT EXISTS idx_documents_advisor_id ON documents(advisor_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);


-- ==========================================================
-- Migration: 002_versioning_and_revisions.sql
-- ==========================================================
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


-- ==========================================================
-- Migration: 003_audit_trail_and_notifications.sql
-- ==========================================================
-- Create audit_trail table for tracking document actions and full history
CREATE TABLE IF NOT EXISTS audit_trail (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action          VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    new_status      VARCHAR(50),
    reason          TEXT,
    file_size       BIGINT,
    file_type       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_document_id ON audit_trail(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);

-- Create notifications table for in-app advisor notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    type        VARCHAR(50) NOT NULL CHECK (type IN ('STATUS_CHANGE', 'REVISION_COMMENT', 'COMPLIANCE_ALERT')),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);


-- ==========================================================
-- Migration: 004_document_analysis.sql
-- ==========================================================
-- Document Analyses table for storing sanitized text, AI compliance summaries, and issue flags
CREATE TABLE IF NOT EXISTS document_analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL DEFAULT 1,
    masked_text     TEXT NOT NULL,
    summary         TEXT,
    flags           JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_analysis_doc_ver UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_analyses_doc ON document_analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_document_analyses_doc_ver ON document_analyses(document_id, version);


-- ==========================================================
-- Migration: 005_user_quotas.sql
-- ==========================================================
-- User quota tracking table for Advisor-side rate limiting
-- File analyses: 2 per 4-day period | Chat messages: 20 per 4-day period
-- Officers are never quota-limited.
CREATE TABLE IF NOT EXISTS user_quotas (
    user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    file_analyses_used    INT NOT NULL DEFAULT 0,
    file_analyses_limit   INT NOT NULL DEFAULT 2,
    chat_messages_used    INT NOT NULL DEFAULT 0,
    chat_messages_limit   INT NOT NULL DEFAULT 20,
    period_started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_resets_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '4 days',
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_quotas_reset ON user_quotas(period_resets_at);


-- ==========================================================
-- Track applied migrations in schema_migrations
-- ==========================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (migration_name) VALUES ('001_initial_schema.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('002_versioning_and_revisions.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('003_audit_trail_and_notifications.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('004_document_analysis.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('005_user_quotas.sql') ON CONFLICT (migration_name) DO NOTHING;

-- ==========================================================
-- Seed Institutional Users (Password is: Password123!)
-- ==========================================================
INSERT INTO users (id, name, email, password_hash, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Marcus Vance', 'advisor1@springer.capital', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Advisor'),
    ('00000000-0000-0000-0000-000000000002', 'Elena Rostova', 'officer1@springer.capital', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Officer'),
    ('00000000-0000-0000-0000-000000000003', 'Sarah Jenkins', 'sarah.j@springercapital.com', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Advisor'),
    ('00000000-0000-0000-0000-000000000004', 'Alex Smith', 'alex.smith@springercapital.com', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Officer'),
    ('0678188c-93ba-419e-973a-a8d6a9f7bc35', 'Active Investment Advisor', 'active.advisor@springercapital.com', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Advisor')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash;

-- ==========================================================
-- Seed Sample Documents for Advisors
-- ==========================================================
INSERT INTO documents (id, title, description, file_name, file_path, file_size, mime_type, status, advisor_id)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Q3 Institutional Asset Allocation Model', 'Quarterly portfolio review and strategic allocation model for HNW institutional clients.', 'Q3_Asset_Allocation_Model.pdf', 'uploads/documents/sample_compliance_filing.pdf', 1024, 'application/pdf', 'Pending', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000002', 'Private Wealth Portfolio Disclosure Statement', 'Annual disclosure regarding fiduciary management and risk suitability standards.', 'Private_Wealth_Disclosure.pdf', 'uploads/documents/sample_compliance_filing.pdf', 1024, 'application/pdf', 'Approved', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000003', 'Global Equity ESG Strategy Filing', 'Sustainable equity strategy documentation with carbon metrics and exclusionary screening.', 'ESG_Strategy_Filing.pdf', 'uploads/documents/sample_compliance_filing.pdf', 1024, 'application/pdf', 'Needs Revision', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000004', 'Institutional Portfolio Strategy & Risk Brief', 'Institutional strategy deck with multi-asset performance projections and standard disclosures.', 'sample_compliance_filing.docx', 'uploads/documents/sample_compliance_filing.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Pending', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;
