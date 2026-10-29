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

-- Assistant settings edited in the admin: every save is a new version, one is active. apps/web reads the active
-- one (lib/assistant-config.ts) and falls back to DEFAULT_INSTRUCTIONS in lib/heli.ts when there is none.
CREATE TABLE IF NOT EXISTS assistant_prompts (
    id              BIGSERIAL PRIMARY KEY,
    instructions    TEXT NOT NULL,
    model           TEXT,
    temperature     NUMERIC(3, 2),
    max_tokens      INT,
    note            TEXT NOT NULL DEFAULT '',
    is_active       BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS assistant_prompts_one_active ON assistant_prompts (is_active) WHERE is_active;

-- Recipes: a recipe the admin edited is no longer overwritten by the catalogue in code (apps/web syncRecipesCatalog);
-- source_title keeps the catalogue title of a renamed one so it is not seeded again.
DO $$
BEGIN
  IF to_regclass('public.recipes') IS NOT NULL THEN
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS admin_edited_at TIMESTAMPTZ;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_title TEXT;
  END IF;
END $$;

-- In-app messages sent from the admin to a segment of clients (they land in the assistant chat as system messages).
CREATE TABLE IF NOT EXISTS push_campaigns (
    id              BIGSERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    segment         TEXT NOT NULL,
    channel         TEXT NOT NULL DEFAULT 'inapp' CHECK (channel IN ('inapp', 'push')),
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
    recipients      INT NOT NULL DEFAULT 0,
    created_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_push_campaigns_created ON push_campaigns (created_at DESC);
