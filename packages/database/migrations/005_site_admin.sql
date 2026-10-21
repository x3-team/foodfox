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

-- Editable site content (apps/site lib/cms/registry.ts): one row per field that differs from the default.
CREATE TABLE IF NOT EXISTS site_content (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_by_name TEXT NOT NULL DEFAULT ''
);

-- Every saved value, for the history and rollback in the editor.
CREATE TABLE IF NOT EXISTS content_revisions (
    id          BIGSERIAL PRIMARY KEY,
    key         TEXT NOT NULL,
    value       JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    author_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_content_revisions_key ON content_revisions (key, created_at DESC);

-- SEO per path: empty fields fall back to the title/description in the page code.
CREATE TABLE IF NOT EXISTS seo_pages (
    path        TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    og_image    TEXT NOT NULL DEFAULT '',
    canonical   TEXT NOT NULL DEFAULT '',
    noindex     BOOLEAN NOT NULL DEFAULT false,
    in_sitemap  BOOLEAN NOT NULL DEFAULT true,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media library: files live on disk (FOX_MEDIA_DIR), WebP variants per width in `variants`.
CREATE TABLE IF NOT EXISTS media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name TEXT NOT NULL,
    mime          TEXT NOT NULL,
    size          BIGINT NOT NULL,
    width         INT,
    height        INT,
    alt           TEXT NOT NULL DEFAULT '',
    url           TEXT NOT NULL,
    variants      JSONB NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    UUID REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_media_created ON media (created_at DESC);

-- Partners (specialists who bring clients). The partner cabinet of apps/web reads these by the phone the partner
-- signs in with; the partner role is granted at login when the phone belongs to an approved partner.
CREATE TABLE IF NOT EXISTS partners (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone          TEXT NOT NULL,
    full_name      TEXT NOT NULL,
    email          TEXT NOT NULL DEFAULT '',
    specialty      TEXT NOT NULL DEFAULT '',
    city           TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'approved', 'certified', 'blocked', 'rejected')),
    promo_code     TEXT,
    certificate_no TEXT NOT NULL DEFAULT '',
    payout_method  TEXT NOT NULL DEFAULT '',
    fee            INT,
    notes          TEXT NOT NULL DEFAULT '',
    lead_id        BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS partners_phone_unique ON partners (phone);
CREATE UNIQUE INDEX IF NOT EXISTS partners_code_unique ON partners (upper(promo_code)) WHERE promo_code IS NOT NULL;

-- Client reports attributed to a partner, and the fee for each.
CREATE TABLE IF NOT EXISTS partner_reports (
    id            BIGSERIAL PRIMARY KEY,
    partner_id    UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    report_number TEXT NOT NULL,
    client_name   TEXT NOT NULL DEFAULT '',
    lab           TEXT NOT NULL DEFAULT '',
    test_date     DATE,
    status        TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('credited', 'review', 'missing')),
    fee           INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS partner_reports_number_unique ON partner_reports (upper(report_number));
CREATE INDEX IF NOT EXISTS idx_partner_reports_partner ON partner_reports (partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS partner_payouts (
    id         BIGSERIAL PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    period     TEXT NOT NULL,
    amount     INT NOT NULL CHECK (amount > 0),
    reports    INT NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON partner_payouts (partner_id, created_at DESC);
