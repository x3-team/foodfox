-- Legal documents with versions and the consent register (152-ФЗ): who accepted which version of which document,
-- when, where from, and when the consent was withdrawn. Applied by the site admin on start (lib/admin/db.ts).

CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- privacy: политика обработки ПД; pd_consent: согласие на обработку ПД; offer: оферта; marketing: согласие на рассылки
  kind TEXT NOT NULL CHECK (kind IN ('privacy', 'pd_consent', 'offer', 'marketing')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  -- A page of the site (/privacy) or a PDF from the media library.
  url TEXT,
  note TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_current ON legal_documents (kind) WHERE is_current;

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- client: users.id of the app; lead: leads.id (a number); partner: partners.id. Text, because the ids differ in type.
  subject_type TEXT NOT NULL CHECK (subject_type IN ('client', 'lead', 'partner')),
  subject_id TEXT,
  -- Phone or e-mail as given, so a request by letter can be found without joining three tables.
  contact TEXT,
  -- The kinds above, plus partner_contract (the partner agreement, versioned in «Страницы → Договор и акт партнёра»).
  kind TEXT NOT NULL,
  version TEXT NOT NULL,
  document_id UUID REFERENCES legal_documents(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('app', 'site', 'partner', 'admin', 'import')),
  ip TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  withdraw_source TEXT,
  withdraw_reason TEXT,
  withdrawn_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  -- 152-ФЗ ст. 21 ч. 5: stop processing and destroy the data within 30 days of the withdrawal.
  stop_by DATE
);
CREATE INDEX IF NOT EXISTS consents_subject ON consents (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS consents_accepted ON consents (accepted_at DESC);
CREATE INDEX IF NOT EXISTS consents_open_withdrawals ON consents (stop_by) WHERE withdrawn_at IS NOT NULL;

-- The documents in force today: the /privacy page holds both the policy and the consent text.
INSERT INTO legal_documents (kind, version, title, url, effective_from, is_current)
SELECT v.kind, '1.0', v.title, '/privacy', CURRENT_DATE, true
  FROM (VALUES ('privacy', 'Политика обработки персональных данных'),
               ('pd_consent', 'Согласие на обработку персональных данных')) AS v(kind, title)
 WHERE NOT EXISTS (SELECT 1 FROM legal_documents d WHERE d.kind = v.kind);

-- Consents given before versions were tracked: app clients and partners carry only a date.
INSERT INTO consents (subject_type, subject_id, contact, kind, version, source, accepted_at)
SELECT 'client', u.id::text, coalesce(u.phone, u.email), 'pd_consent', 'до учёта версий', 'import', c.privacy_consent_at
  FROM clients c JOIN users u ON u.id = c.user_id
 WHERE c.privacy_consent_at IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM consents x WHERE x.subject_type = 'client' AND x.subject_id = u.id::text);

INSERT INTO consents (subject_type, subject_id, contact, kind, version, source, accepted_at)
SELECT 'partner', p.id::text, p.phone, 'pd_consent', 'до учёта версий', 'import', p.pd_consent_at
  FROM partners p
 WHERE p.pd_consent_at IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM consents x WHERE x.subject_type = 'partner' AND x.subject_id = p.id::text);
