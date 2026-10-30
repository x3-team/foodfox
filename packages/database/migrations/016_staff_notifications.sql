-- Notifications to staff by e-mail and Telegram. Triggers are created only when missing: this file runs on every
-- start of the site, and re-creating a trigger would lock the busy tables each time.
-- Triggers put events into staff_notifications, so whichever app
-- writes the row (site or apps/web), the event is caught. apps/site sends them once a minute (lib/admin/notify.ts)
-- to the staff whose role opens the matching area and who subscribed in their profile.

CREATE TABLE IF NOT EXISTS staff_notifications (
  id BIGSERIAL PRIMARY KEY,
  -- lead, partner_application, report_unrecognized, act_scan, ticket
  kind TEXT NOT NULL,
  ref_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  -- {"sent": 2, "failed": 0, "skipped": "нет получателей"}
  result JSONB
);
CREATE INDEX IF NOT EXISTS staff_notifications_pending ON staff_notifications (created_at) WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS staff_notification_log (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT REFERENCES staff_notifications(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram')),
  ok BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_notification_log_time ON staff_notification_log (created_at DESC);

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS notify_telegram BOOLEAN NOT NULL DEFAULT true;
-- NULL: every event the role can see.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS notify_kinds TEXT[];
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
-- One-time code for t.me/<bot>?start=<code>; the sender binds the chat that sends it.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS telegram_link_code TEXT;

CREATE OR REPLACE FUNCTION fox_notify(p_kind TEXT, p_ref TEXT, p_payload JSONB) RETURNS void LANGUAGE sql AS $$
  INSERT INTO staff_notifications (kind, ref_id, payload) VALUES (p_kind, p_ref, coalesce(p_payload, '{}'))
$$;

-- New lead from a site form.
CREATE OR REPLACE FUNCTION fox_notify_lead() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM fox_notify('lead', NEW.id::text, jsonb_build_object('kind', NEW.kind, 'name', NEW.name, 'city', NEW.city));
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fox_notify_lead') THEN
    CREATE TRIGGER fox_notify_lead AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION fox_notify_lead();
  END IF;
END $$;

-- A partner application reached the staff (status «applied»).
CREATE OR REPLACE FUNCTION fox_notify_partner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'applied' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'applied') THEN
    PERFORM fox_notify('partner_application', NEW.id::text, jsonb_build_object('name', NEW.full_name, 'city', NEW.city));
  END IF;
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fox_notify_partner') THEN
    CREATE TRIGGER fox_notify_partner AFTER INSERT OR UPDATE OF status ON partners FOR EACH ROW EXECUTE FUNCTION fox_notify_partner();
  END IF;
END $$;

-- A partner uploaded the scan of a signed act.
CREATE OR REPLACE FUNCTION fox_notify_act_scan() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.scan_received_at IS NOT NULL AND OLD.scan_received_at IS NULL THEN
    PERFORM fox_notify('act_scan', NEW.id::text, jsonb_build_object('partner_id', NEW.partner_id, 'period', NEW.period, 'amount', NEW.amount));
  END IF;
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fox_notify_act_scan') THEN
    CREATE TRIGGER fox_notify_act_scan AFTER UPDATE OF scan_received_at ON partner_statements FOR EACH ROW EXECUTE FUNCTION fox_notify_act_scan();
  END IF;
END $$;

-- The client wrote to a live specialist (a new request or a new message in one).
DO $$
BEGIN
  IF to_regclass('support_messages') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION fox_notify_ticket() RETURNS trigger LANGUAGE plpgsql AS $f$
    BEGIN
      IF NEW.author = 'client' THEN
        PERFORM fox_notify('ticket', NEW.ticket_id::text, jsonb_build_object('preview', left(NEW.body, 200)));
      END IF;
      RETURN NEW;
    END $f$;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fox_notify_ticket') THEN
      CREATE TRIGGER fox_notify_ticket AFTER INSERT ON support_messages FOR EACH ROW EXECUTE FUNCTION fox_notify_ticket();
    END IF;
  END IF;
END $$;

-- The parser could not read a report: it lands in the moderation queue. apps/web creates `reports`, so the trigger is
-- attached only where the table exists (the site admin runs this on every start, so it attaches once it appears).
DO $$
BEGIN
  IF to_regclass('reports') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION fox_notify_report() RETURNS trigger LANGUAGE plpgsql AS $f$
    BEGIN
      IF NEW.status IN ('failed', 'review') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
        PERFORM fox_notify('report_unrecognized', NEW.id::text, jsonb_build_object('status', NEW.status));
      END IF;
      RETURN NEW;
    END $f$;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fox_notify_report') THEN
      CREATE TRIGGER fox_notify_report AFTER INSERT OR UPDATE OF status ON reports FOR EACH ROW EXECUTE FUNCTION fox_notify_report();
    END IF;
  END IF;
END $$;
