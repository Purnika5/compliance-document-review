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
