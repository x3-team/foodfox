-- FoodFox v0.2 — auth tokens, telemetry indexes, row-level security
-- Apply after schema.sql

-- Refresh tokens (mobile / long-lived sessions)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)
  WHERE revoked_at IS NULL;

-- Consent / privacy metadata on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- LLM audit: link to chat thread, no prompt text (PII-safe)
ALTER TABLE llm_requests ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES chat_threads(id) ON DELETE SET NULL;

-- ─── Row Level Security (defense in depth) ───────────────────────────
-- App sets: SELECT set_config('app.client_id', '<uuid>', true) per transaction

CREATE OR REPLACE FUNCTION app_current_client_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.client_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_client_isolation ON reports;
CREATE POLICY reports_client_isolation ON reports
  USING (client_id = app_current_client_id());

DROP POLICY IF EXISTS plans_client_isolation ON nutrition_plans;
CREATE POLICY plans_client_isolation ON nutrition_plans
  USING (client_id = app_current_client_id());

DROP POLICY IF EXISTS chat_threads_client_isolation ON chat_threads;
CREATE POLICY chat_threads_client_isolation ON chat_threads
  USING (client_id = app_current_client_id());

DROP POLICY IF EXISTS chat_messages_client_isolation ON chat_messages;
CREATE POLICY chat_messages_client_isolation ON chat_messages
  USING (
    thread_id IN (
      SELECT id FROM chat_threads WHERE client_id = app_current_client_id()
    )
  );

DROP POLICY IF EXISTS analytics_client_isolation ON analytics_events;
CREATE POLICY analytics_client_isolation ON analytics_events
  USING (client_id IS NULL OR client_id = app_current_client_id());

-- plan_days via nutrition_plans
ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_days_client_isolation ON plan_days;
CREATE POLICY plan_days_client_isolation ON plan_days
  USING (
    plan_id IN (
      SELECT id FROM nutrition_plans WHERE client_id = app_current_client_id()
    )
  );

-- test_results via reports
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS test_results_client_isolation ON test_results;
CREATE POLICY test_results_client_isolation ON test_results
  USING (
    report_id IN (
      SELECT id FROM reports WHERE client_id = app_current_client_id()
    )
  );
