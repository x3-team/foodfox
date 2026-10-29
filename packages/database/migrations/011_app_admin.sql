-- App sections of the shared admin (apps/site /admin): more staff roles, TOTP two-factor sign-in, time-boxed access
-- to a client's medical data, blocking of app accounts and the moderation trail of reports. Numbered 011 to stay
-- clear of 006–010 used on other branches; safe to run more than once (apps/site applies it on start).

-- Staff roles. The list lives in apps/site/lib/admin/auth.ts; the CHECK only guards against typos.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
      FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'admin_users' AND con.contype = 'c' AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE admin_users DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'manager', 'accountant', 'moderator', 'editor', 'support', 'analyst'));

-- Two-factor sign-in. The secret is set when enrolment starts and counts only once totp_enabled_at is set;
-- totp_last_step stops a code from being used twice.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_last_step BIGINT NOT NULL DEFAULT 0;
-- A session that passed the password but not yet the code.
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS mfa_pending BOOLEAN NOT NULL DEFAULT false;

-- Opening a client's medical data (PDF, values, zones) is granted per client for a short time, with a reason.
CREATE TABLE IF NOT EXISTS admin_medical_grants (
    id         BIGSERIAL PRIMARY KEY,
    staff_id   UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    client_id  UUID NOT NULL,
    reason     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_medical_grants_active ON admin_medical_grants (staff_id, client_id, expires_at DESC);

-- The tables below belong to apps/web. On a database where apps/web has not created them yet, skip.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
    -- Access tokens issued before this moment are refused (the admin's "sign out everywhere").
    ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_users_blocked ON users (blocked_at) WHERE blocked_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_created ON users (created_at DESC);
  END IF;
  IF to_regclass('public.reports') IS NOT NULL THEN
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by UUID;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_note TEXT;
    CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports (status, created_at DESC);
  END IF;
END $$;

-- Moderation trail of one report: approve, reject, edit a value, reprocess. Values live in before/after.
CREATE TABLE IF NOT EXISTS report_reviews (
    id          BIGSERIAL PRIMARY KEY,
    report_id   UUID NOT NULL,
    staff_id    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    staff_name  TEXT NOT NULL DEFAULT '',
    action      TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'edit', 'reprocess', 'note')),
    note        TEXT NOT NULL DEFAULT '',
    before      JSONB,
    after       JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_reviews_report ON report_reviews (report_id, created_at DESC);
