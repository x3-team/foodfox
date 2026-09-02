# FoodFox

Приложение для нутрициологов и клиентов на базе теста **FOX Food Xplorer** (286 IgG антигенов).

## Figma (источник макетов)

**[Fox приложение](https://www.figma.com/design/DSXq09GRmYROMmX9SIrWlm/Fox-приложение)** — все актуальные экраны MVP.

| Экран | Route |
|-------|-------|
| Upload | `/upload` |
| Results | `/results` |
| Recipes | `/recipes` |
| Chat | `/chat` |

Подробнее: [docs/FIGMA.md](docs/FIGMA.md)

## Стек MVP v0.1

| Слой | Технология |
|------|------------|
| Web UI + API | Next.js 14 (`apps/web`) |
| **Android** | **Flutter** (`apps/mobile`) → APK |
| БД | PostgreSQL 16 (VPS / Render) |
| LLM | [getheli.ru](https://getheli.ru) (OpenAI-compatible) |
| Push | **In-app on-open** — напоминание при открытии чата |

## Быстрый старт

```bash
cd apps/web
npm install
npm run dev
# → http://localhost:3000
```

Env (production на Render):

```env
DATABASE_URL=postgresql://...
FOX_HELI_API_KEY=...
HELI_BASE_URL=https://getheli.ru/v1
HELI_CHAT_MODEL=gpt-4o-mini
```

Миграции:

```bash
psql $DATABASE_URL -f packages/database/schema.sql
```

## Структура

```
foodfox/
├── apps/web/              # Next.js MVP
├── apps/mobile/           # Flutter Android app
├── packages/database/     # PostgreSQL schema
├── packages/llm/          # Heli client (reference)
├── docs/
└── render.yaml
```

## Android APK

```bash
cd apps/mobile && flutter build apk --debug
```

Подробнее: [apps/mobile/README.md](apps/mobile/README.md). CI собирает APK в GitHub Actions (artifact `foodfox-android-debug-apk`).

## Документация

- [MVP v0.1 spec](docs/MVP-v0.1-web-chat.md)
- [Архитектура](docs/FoodFox_Architecture_Plan.html)
