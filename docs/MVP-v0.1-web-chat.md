# FoodFox MVP v0.1 — Web + Chat Bot

Цель: клиент за 5 минут загружает FOX PDF → видит зоны → зелёные продукты → рецепты → 8-недельный план → общается с ботом → получает напоминания.

## Стек (минимальный)

| Слой | Технология | Где |
|------|------------|-----|
| Web UI | Next.js 14 | Render Web Service |
| API | Next.js Route Handlers (или FastAPI отдельно) | тот же сервис |
| БД | Supabase Postgres | supabase.com |
| Файлы PDF | Supabase Storage | supabase.com |
| LLM чат | OpenAI gpt-4o-mini | API |
| Push (v0.1) | Render Cron → API → Web Push / Email | Render |
| Push (v0.2) | Telegram Bot | optional |

## Экраны v0.1 (4 штуки)

1. **Загрузка отчёта** — drag & drop PDF
2. **Мои результаты** — фильтр 🟢🟡🔴, поиск
3. **Зелёные + рецепты** — список + карточка рецепта
4. **Чат с ботом** — план на 8 недель, вопросы, напоминания

## Бот: модель «под капотом»

**Не полагаться на память LLM.** Источник правды — PostgreSQL.

```
Клиент пишет в чат
    → API загружает из БД:
        - профиль клиента
        - test_results (286 позиций)
        - nutrition_plan (фаза, неделя 1–8)
        - plan_day (что сегодня можно / нельзя)
        - последние 20 сообщений чата
    → формирует system prompt + context
    → вызов LLM (gpt-4o-mini)
    → ответ сохраняется в chat_messages
```

### Таблицы для контекста и big data

- `clients` — id, created_at, metadata
- `reports` — pdf_url, status, parsed_at
- `test_results` — food_item_id, value, zone
- `nutrition_plans` — 8 weeks JSON, started_at
- `plan_days` — date, allowed[], forbidden[], message
- `chat_messages` — client_id, role, content, created_at
- `push_log` — client_id, type, sent_at, opened_at
- `recipes` + `recipe_ingredients`

Каждое действие пишется в БД → со временем аналитика (big data).

### Модель LLM

| Задача | Модель | Почему |
|--------|--------|--------|
| Чат, напоминания, FAQ | **gpt-4o-mini** | дёшево, быстро, достаточно для MVP |
| Сложная интерпретация | gpt-4o (fallback) | если вопрос про Bos d 4/5/8 |
| Альтернатива РФ | YandexGPT / GigaChat | если OpenAI недоступен |

System prompt включает: disclaimer FOX, текущая неделя плана, списки продуктов, tone of voice из KB.

## 8-недельный план + пуши

**Генерация:** после парсинга → Rule Engine создаёт `plan_days` на 56 дней:
- Нед 1–6: элиминация 🔴, ротация 🟡
- Нед 7–8: подготовка к реинтродукции

**Push (v0.1):** Render Cron Job 1×/день 08:00 MSK:
```
POST /api/cron/daily-push
  → для каждого active client:
      → взять plan_day на сегодня
      → сгенерировать текст (шаблон или LLM)
      → Web Push / email / запись в чат как system message
```

Пользователь открывает приложение → видит сообщение бота в чате.

## Deploy на Render

```yaml
services:
  - name: foodfox-web
    type: web
    runtime: node
    buildCommand: cd apps/web && npm install && npm run build
    startCommand: cd apps/web && npm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false

  - name: foodfox-daily-push
    type: cron
    schedule: "0 5 * * *"  # 08:00 MSK
    buildCommand: echo ok
    startCommand: curl -X POST $APP_URL/api/cron/daily-push
```

PDF хранить в Supabase Storage, не на диске Render (ephemeral).

## Порядок разработки (маленькие шаги)

| Шаг | Что | Результат для клиента |
|-----|-----|----------------------|
| 1 | Next.js + Supabase + deploy Render | Пустой URL открывается |
| 2 | Upload PDF → Storage | Файл загружается |
| 3 | Parser POC → test_results | Видит 286 продуктов с цветами |
| 4 | Зелёные + 10 seed рецептов | Кликает рецепты |
| 5 | Plan Engine 8 недель | Видит календарь/план |
| 6 | Чат с ботом | Задаёт вопросы про рацион |
| 7 | Cron daily push | Утром сообщение в чате |

Оценка solo + Cursor: **3–4 недели** до демо клиенту.
