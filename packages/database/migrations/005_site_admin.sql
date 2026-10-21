-- Site admin (apps/site /admin): its own staff accounts, sessions, audit log,
-- and the leads from the marketing site forms. Only new tables; the client
-- and partner tables of apps/web are not changed. Safe to run more than once:
-- apps/site applies it on start (lib/admin/db.ts).

CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
    password_hash TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique ON admin_users (lower(email));

-- Only a hash of the session token is stored, so a dump cannot be replayed.
CREATE TABLE IF NOT EXISTS admin_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash   TEXT NOT NULL UNIQUE,
    user_id      UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    ip           TEXT,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions (user_id);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT NOT NULL,
    ip         TEXT,
    ok         BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_recent ON admin_login_attempts (created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    actor_name  TEXT NOT NULL DEFAULT '',
    actor_role  TEXT,
    action      TEXT NOT NULL,
    entity      TEXT NOT NULL,
    entity_id   TEXT,
    summary     TEXT NOT NULL DEFAULT '',
    before      JSONB,
    after       JSONB,
    ip          TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log (actor_id, created_at DESC);

-- Every form of the marketing site (POST /api/lead).
CREATE TABLE IF NOT EXISTS leads (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    kind        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done', 'spam')),
    name        TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    city        TEXT NOT NULL DEFAULT '',
    company     TEXT NOT NULL DEFAULT '',
    message     TEXT NOT NULL DEFAULT '',
    payload     JSONB NOT NULL DEFAULT '{}',
    page        TEXT NOT NULL DEFAULT '',
    utm         JSONB NOT NULL DEFAULT '{}',
    ip          TEXT,
    user_agent  TEXT,
    assignee_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    closed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_kind ON leads (kind, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_notes (
    id          BIGSERIAL PRIMARY KEY,
    lead_id     BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    author_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT '',
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes (lead_id, created_at);
