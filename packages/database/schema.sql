-- FoodFox MVP v0.1 — initial schema
-- PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users & clients ───────────────────────────────────────────────

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role        TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'nutritionist', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID,  -- задел: клиника / нутрициолог
    display_name TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_tenant_id ON clients(tenant_id) WHERE tenant_id IS NOT NULL;

-- ─── Food catalog ──────────────────────────────────────────────────

CREATE TABLE food_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT UNIQUE NOT NULL,
    name_ru     TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE food_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES food_categories(id),
    fox_name    TEXT NOT NULL,
    aliases     JSONB NOT NULL DEFAULT '[]',
    is_molecular BOOLEAN NOT NULL DEFAULT false,
    metadata    JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_food_items_fox_name ON food_items(fox_name);

-- ─── Reports & results ─────────────────────────────────────────────

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    storage_key     TEXT,  -- S3 path: reports/{client_id}/{id}.pdf
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','parsing','ready','failed','review')),
    metadata        JSONB NOT NULL DEFAULT '{}',  -- patient_id, qr_code, analyzed_at
    parse_confidence NUMERIC(4,3),
    raw_extraction  JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_client_id ON reports(client_id);

CREATE TABLE test_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    food_item_id    UUID NOT NULL REFERENCES food_items(id),
    value_ug_ml     NUMERIC(10,2),
    is_floor_value  BOOLEAN NOT NULL DEFAULT false,
    zone            TEXT NOT NULL CHECK (zone IN ('green','yellow','red')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (report_id, food_item_id)
);

CREATE INDEX idx_test_results_report_zone ON test_results(report_id, zone);

-- ─── Recipes ─────────────────────────────────────────────────────────

CREATE TABLE recipes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    steps       JSONB NOT NULL DEFAULT '[]',
    photo_url   TEXT,
    tags        JSONB NOT NULL DEFAULT '[]',
    published   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recipe_ingredients (
    recipe_id     UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_item_id  UUID NOT NULL REFERENCES food_items(id),
    amount        TEXT,
    PRIMARY KEY (recipe_id, food_item_id)
);

-- ─── 8-week plan ─────────────────────────────────────────────────────

CREATE TABLE nutrition_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    report_id   UUID NOT NULL REFERENCES reports(id),
    weeks_total INT NOT NULL DEFAULT 8,
    started_at  DATE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_days (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id      UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    week_number  INT NOT NULL CHECK (week_number BETWEEN 1 AND 8),
    allowed      JSONB NOT NULL DEFAULT '[]',   -- food_item ids or names
    forbidden    JSONB NOT NULL DEFAULT '[]',
    rotation     JSONB NOT NULL DEFAULT '[]',   -- yellow zone rotation
    bot_message  TEXT,  -- шаблон для daily reminder
    UNIQUE (plan_id, date)
);

CREATE INDEX idx_plan_days_plan_date ON plan_days(plan_id, date);

-- ─── Chat (in-app push) ──────────────────────────────────────────────

CREATE TABLE chat_threads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    plan_id     UUID REFERENCES nutrition_plans(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_chat_threads_client ON chat_threads(client_id);

CREATE TABLE chat_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id    UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role         TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    message_type TEXT NOT NULL DEFAULT 'chat'
                 CHECK (message_type IN ('chat','daily_reminder','plan_update','system')),
    content      TEXT NOT NULL,
    read_at      TIMESTAMPTZ,  -- NULL = unread (in-app badge)
    metadata     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_thread_created ON chat_messages(thread_id, created_at DESC);
CREATE INDEX idx_chat_messages_unread ON chat_messages(thread_id) WHERE read_at IS NULL;

-- ─── Analytics & LLM audit (big data) ────────────────────────────────

CREATE TABLE analytics_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
    event_type  TEXT NOT NULL,  -- report_uploaded, recipe_opened, chat_sent, ...
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_type_time ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_client ON analytics_events(client_id, created_at DESC);

CREATE TABLE llm_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
    model       TEXT NOT NULL,
    tokens_in   INT,
    tokens_out  INT,
    latency_ms  INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
