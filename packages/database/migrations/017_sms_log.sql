-- SMS with sign-in codes (apps/web/src/lib/sms.ts): one row per send, for limits and for «Уведомления → SMS» in the
-- admin. The phone is stored masked; the code never is.
CREATE TABLE IF NOT EXISTS sms_log (
  id BIGSERIAL PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  phone_mask TEXT NOT NULL,
  ip TEXT,
  provider TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  error TEXT,
  cost NUMERIC(8, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_log_phone ON sms_log (phone_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_log_ip ON sms_log (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_log_time ON sms_log (created_at DESC);
