-- Client requests to a live specialist («Подключить специалиста» in the app): a ticket with a conversation, handled
-- by client service in the admin (/admin/support). Deleted with the account (user_id cascades).

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT 'other' CHECK (topic IN ('report', 'plan', 'tech', 'other')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'waiting', 'closed')),
  subject TEXT NOT NULL DEFAULT '',
  assignee_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The last message from the client: the queue is sorted by how long a client has been waiting.
  client_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_reply_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS support_tickets_queue ON support_tickets (status, client_at);
CREATE INDEX IF NOT EXISTS support_tickets_user ON support_tickets (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('client', 'staff')),
  staff_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  staff_name TEXT,
  body TEXT NOT NULL,
  -- Staff replies the client has not opened yet (badge in the app); client messages the staff have not opened.
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_ticket ON support_messages (ticket_id, created_at);
