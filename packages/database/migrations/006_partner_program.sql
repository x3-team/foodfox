-- Partner program by the customer's processes БПИТ12.8 (joining) and БПИТ10.1.1 (monthly reward).
-- Builds on the partner tables of 005_site_admin.sql. Safe to run more than once: apps/site applies it on start
-- (lib/admin/db.ts) and apps/web before the partner cabinet touches these tables (lib/partner-program/db.ts).

-- The accountant role (reads partners' personal data, marks acts and payments) comes with the staff roles of
-- 011_app_admin.sql. This file must not touch admin_users_role_check: it runs on every start, and a narrower
-- CHECK here would fail on staff with the newer roles.

-- Legal side of a partner (БПИТ12.8): tax form, accepted contract, and the steps the accountant and the client
-- service specialist take after the application (1С:ДО approval, ФНС registration of a natural person, 1С:ERP).
ALTER TABLE partners ADD COLUMN IF NOT EXISTS legal_form TEXT CHECK (legal_form IN ('ip', 'sz', 'fl'));
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contract_version TEXT NOT NULL DEFAULT '';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contract_accepted_at TIMESTAMPTZ;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS pd_consent_at TIMESTAMPTZ;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contract_agreed_at TIMESTAMPTZ;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS fns_registered_at TIMESTAMPTZ;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS erp_registered_at TIMESTAMPTZ;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Passport number, ИНН, postal address and bank details, sealed with AES-256-GCM (FOX_PD_KEY on the server).
-- Only the masked hints are readable without the key.
CREATE TABLE IF NOT EXISTS partner_pd (
    partner_id  UUID PRIMARY KEY REFERENCES partners(id) ON DELETE CASCADE,
    sealed      TEXT NOT NULL,
    hints       JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scans and photos. The file on disk (FOX_PD_DIR) is sealed the same way; `path` is relative to that directory.
CREATE TABLE IF NOT EXISTS partner_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id  UUID REFERENCES partners(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('passport_main', 'passport_reg', 'snils', 'inn', 'analysis', 'act_scan')),
    mime        TEXT NOT NULL,
    size        INT NOT NULL,
    path        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_documents_partner ON partner_documents (partner_id, kind);

-- The joining questionnaire before a partner card exists, keyed by the phone the person confirmed by SMS.
CREATE TABLE IF NOT EXISTS partner_onboarding (
    phone        TEXT PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'doctor', 'not_citizen', 'declined', 'submitted')),
    is_doctor    BOOLEAN,
    citizen_rf   BOOLEAN,
    legal_form   TEXT CHECK (legal_form IN ('ip', 'sz', 'fl')),
    contract_version     TEXT,
    contract_accepted_at TIMESTAMPTZ,
    lead_id      BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    partner_id   UUID REFERENCES partners(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly report to the partner (БПИТ10.1.1): confirmed analyses of a calendar month, the partner's answer, the act
-- and its scan and paper original, the payment.
CREATE TABLE IF NOT EXISTS partner_statements (
    id                   BIGSERIAL PRIMARY KEY,
    partner_id           UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    period               DATE NOT NULL,
    reports              INT NOT NULL DEFAULT 0,
    amount               INT NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'disputed', 'confirmed', 'paid')),
    dispute_note         TEXT NOT NULL DEFAULT '',
    confirmed_at         TIMESTAMPTZ,
    scan_doc_id          UUID REFERENCES partner_documents(id) ON DELETE SET NULL,
    scan_received_at     TIMESTAMPTZ,
    original_sent_at     TIMESTAMPTZ,
    original_track       TEXT NOT NULL DEFAULT '',
    original_received_at TIMESTAMPTZ,
    paid_at              TIMESTAMPTZ,
    payout_id            BIGINT REFERENCES partner_payouts(id) ON DELETE SET NULL,
    act_returned_at      TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS partner_statements_period_unique ON partner_statements (partner_id, period);

-- Analyses a partner sends: photo of the result and the analysis id code; a staff member (later Raptor) confirms.
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS photo_doc_id UUID REFERENCES partner_documents(id) ON DELETE SET NULL;
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS verify_note TEXT NOT NULL DEFAULT '';
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS statement_id BIGINT REFERENCES partner_statements(id) ON DELETE SET NULL;
UPDATE partner_reports SET verified_at = created_at WHERE status = 'credited' AND verified_at IS NULL;

-- What should reach the outside systems (Bitrix24, 1С, e-mail, Telegram, Raptor). Each adapter takes its rows once
-- its credentials are set; until then the rows show staff what to do by hand.
CREATE TABLE IF NOT EXISTS partner_events (
    id          BIGSERIAL PRIMARY KEY,
    partner_id  UUID REFERENCES partners(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
    error       TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    done_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_partner_events_pending ON partner_events (status, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_events_partner ON partner_events (partner_id, created_at DESC);

-- Closes every finished calendar month (Moscow time): confirmed analyses not yet in a statement go into one statement
-- per partner and month, which the partner then confirms or disputes. Both apps call it; the advisory lock keeps two
-- callers from closing the same month twice. Returns how many statements were created.
CREATE OR REPLACE FUNCTION partner_close_months(p_partner UUID DEFAULT NULL) RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
  month_start DATE := date_trunc('month', now() AT TIME ZONE 'Europe/Moscow')::date;
  created INT := 0;
  rec RECORD;
  sid BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(7400602);
  FOR rec IN
    SELECT r.partner_id,
           date_trunc('month', coalesce(r.verified_at, r.created_at) AT TIME ZONE 'Europe/Moscow')::date AS period
      FROM partner_reports r JOIN partners p ON p.id = r.partner_id
     WHERE r.status = 'credited' AND r.statement_id IS NULL
       AND coalesce(r.verified_at, r.created_at) AT TIME ZONE 'Europe/Moscow' < month_start
       AND (p_partner IS NULL OR r.partner_id = p_partner)
     GROUP BY 1, 2
  LOOP
    SELECT id INTO sid FROM partner_statements WHERE partner_id = rec.partner_id AND period = rec.period;
    IF sid IS NULL THEN
      INSERT INTO partner_statements (partner_id, period) VALUES (rec.partner_id, rec.period) RETURNING id INTO sid;
      created := created + 1;
    END IF;
    -- A month already confirmed or paid stays closed; a late confirmation goes to the month it was confirmed in.
    IF (SELECT status FROM partner_statements WHERE id = sid) IN ('sent', 'disputed') THEN
      UPDATE partner_reports SET statement_id = sid
       WHERE partner_id = rec.partner_id AND status = 'credited' AND statement_id IS NULL
         AND date_trunc('month', coalesce(verified_at, created_at) AT TIME ZONE 'Europe/Moscow')::date = rec.period;
      UPDATE partner_statements s
         SET reports = x.n, amount = x.total, updated_at = now()
        FROM (SELECT count(*)::int AS n, coalesce(sum(fee), 0)::int AS total FROM partner_reports WHERE statement_id = sid) x
       WHERE s.id = sid;
    END IF;
  END LOOP;
  RETURN created;
END $$;
