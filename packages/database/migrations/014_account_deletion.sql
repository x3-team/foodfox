-- Deleting a client account on request (App Store 5.1.1(v), Google Play account deletion, 152-ФЗ ст. 21).
-- One function does it for both callers: the app (apps/web DELETE /api/account) and the admin (client card).
-- The user row goes, and with it, by ON DELETE CASCADE: clients, reports, test_results, nutrition plans and
-- plan days, chat threads and messages, refresh tokens. analytics_events and llm_requests keep their counts with
-- client_id set to NULL. Report PDFs on disk are removed by the caller (the returned client ids name the folders).
-- What stays: a tombstone without contacts, the consent register with the contact masked (proof of the consent
-- and of its withdrawal), and the admin audit log.

CREATE TABLE IF NOT EXISTS deleted_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  -- «+7 ··· 00 91»: enough to answer «was my account deleted?», not enough to identify anyone.
  contact_mask TEXT,
  reports INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('app', 'admin')),
  reason TEXT,
  actor_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deleted_accounts_time ON deleted_accounts (deleted_at DESC);

CREATE OR REPLACE FUNCTION fox_mask_contact(value TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN value IS NULL OR value = '' THEN NULL
    WHEN value LIKE '%@%' THEN left(value, 1) || '···@' || split_part(value, '@', 2)
    ELSE '+' || left(regexp_replace(value, '\D', '', 'g'), 1) || ' ··· ' || right(regexp_replace(value, '\D', '', 'g'), 4)
  END
$$;

-- Returns the client ids of the deleted account (report folders to remove); no rows when there was no such user.
CREATE OR REPLACE FUNCTION fox_delete_client_account(p_user UUID, p_source TEXT, p_reason TEXT, p_actor UUID)
RETURNS TABLE (client_id UUID) LANGUAGE plpgsql AS $$
DECLARE
  v_contact TEXT;
  v_reports INT;
  v_clients UUID[];
BEGIN
  SELECT coalesce(u.phone, u.email) INTO v_contact FROM users u WHERE u.id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  SELECT array_agg(c.id) INTO v_clients FROM clients c WHERE c.user_id = p_user;
  SELECT count(*)::int INTO v_reports FROM reports r WHERE r.client_id = ANY(coalesce(v_clients, '{}'));

  -- Moderation history holds values of the analyses and has no foreign key to reports.
  IF to_regclass('report_reviews') IS NOT NULL THEN
    DELETE FROM report_reviews WHERE report_id IN (SELECT r.id FROM reports r WHERE r.client_id = ANY(coalesce(v_clients, '{}')));
  END IF;
  IF to_regclass('admin_medical_grants') IS NOT NULL THEN
    DELETE FROM admin_medical_grants WHERE admin_medical_grants.client_id = ANY(coalesce(v_clients, '{}'));
  END IF;
  IF v_contact IS NOT NULL THEN
    DELETE FROM otp_codes WHERE phone = v_contact;
  END IF;
  IF to_regclass('consents') IS NOT NULL THEN
    UPDATE consents
       SET contact = fox_mask_contact(contact), ip = NULL, user_agent = NULL,
           withdrawn_at = coalesce(withdrawn_at, now()),
           withdraw_source = coalesce(withdraw_source, p_source),
           withdraw_reason = coalesce(withdraw_reason, 'Аккаунт удалён'),
           stop_by = NULL
     WHERE subject_type = 'client' AND subject_id = p_user::text;
  END IF;

  DELETE FROM users WHERE id = p_user;

  INSERT INTO deleted_accounts (user_id, contact_mask, reports, source, reason, actor_id)
  VALUES (p_user, fox_mask_contact(v_contact), v_reports, p_source, p_reason, p_actor);

  RETURN QUERY SELECT unnest(coalesce(v_clients, '{}'::uuid[]));
END
$$;
