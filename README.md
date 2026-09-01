# FoodFox

Приложение для нутрициологов и клиентов на базе теста **FOX Food Xplorer** (286 IgG антигенов).

Клиент загружает PDF-отчёт → видит зоны продуктов → получает 8-недельный план → общается с ботом и получает напоминания **внутри приложения**.

## Стек MVP v0.1

| Слой | Технология |
|------|------------|
| Web UI + API | Next.js 14 on Render |
| БД | **PostgreSQL 16** (своя, Render Postgres) |
| Файлы | S3-compatible (Cloudflare R2) |
| LLM | **[getheli.ru](https://getheli.ru)** — доступ ко всем моделям через OpenAI-compatible API |
| Push | **In-app only** — сообщения бота в чате + badge unread |

**Не используем в MVP:** Supabase, OpenAI напрямую, Web Push, Telegram, email.

## Документация

- [MVP v0.1 — Web + Chat Bot](docs/MVP-v0.1-web-chat.md)
- [Полная архитектура и оценки](docs/FoodFox_Architecture_Plan.html)

## Структура репозитория

```
foodfox/
├── apps/web/                 # Next.js (TODO: scaffold)
├── packages/
│   ├── database/
│   │   └── schema.sql        # PostgreSQL schema
│   └── llm/
│       └── heli.ts           # Heli LLM client
├── docs/
└── render.yaml               # Render Blueprint
```

## Быстрый старт (после scaffold)

```bash
# Env
DATABASE_URL=postgresql://...
HELI_API_KEY=...
HELI_BASE_URL=https://...getheli.ru/v1
HELI_CHAT_MODEL=gpt-4o-mini

# Миграции
psql $DATABASE_URL -f packages/database/schema.sql
```
