-- FoodFox — symptom diary (app screen 14)
-- Apply after 003_phone_auth.sql. Numbered 010 so the site admin migrations
-- (004, 005, …) keep their own sequence; it depends on none of them.
--
-- Wellbeing, symptoms, the note and what the client ate are health data
-- (152-ФЗ, special category). They live only inside `payload`, encrypted by
-- the API with AES-256-GCM (apps/web/src/lib/health-crypto.ts, key in
-- FOX_HEALTH_DATA_KEY). The database, its dumps and backups see ciphertext.
-- Plain columns carry only what is needed to find a row: whose, which day,
-- and which week of the plan it fell on.

CREATE TABLE IF NOT EXISTS diary_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    entry_date   DATE NOT NULL,
    week_number  INT CHECK (week_number BETWEEN 1 AND 8),
    payload      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_diary_client_date
  ON diary_entries (client_id, entry_date DESC);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diary_entries_client_isolation ON diary_entries;
CREATE POLICY diary_entries_client_isolation ON diary_entries
  USING (client_id = app_current_client_id())
  WITH CHECK (client_id = app_current_client_id());

-- The assistant's soft daily nudge to fill the diary is its own message type,
-- so the app can put an «open the diary» button under it.
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('chat','daily_reminder','diary_reminder','plan_update','system'));
