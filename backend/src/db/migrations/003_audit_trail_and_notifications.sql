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
