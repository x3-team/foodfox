# FoodFox — handoff для проектирования (product + tech)

Документ для передачи другой модели / команде: смысл продукта, домен, архитектура, что уже сделано, что проектировать дальше.

**Репозиторий:** https://github.com/x3-team/foodfox  
**Ветка разработки:** `cursor/mvp-web-prototype-5e5b`  
**PR:** #1 (draft)  
**Версия в репо:** `0.3.0`  
**Демо:** https://foodfox.yuri.guru (nginx Basic Auth: `demo` / `FoodFox2026!`)  
**Демо-аккаунт приложения:** `demo@foodfox.local` / `DemoFox2026!`

---

## 1. Смысл приложения (product vision)

### Одной фразой

Клиент сдал **IgG-тест FOX Food Xplorer** (~286 пищевых антигенов) → FoodFox **разбирает PDF-отчёт**, показывает **персональные зоны реактивности**, строит **8-недельный план элиминации/стабилизации** и даёт **AI-бота-нутрициologa**, который отвечает **только по данным этого клиента** (зоны, неделя плана, разрешённые/запрещённые продукты) — не общими советами из интернета.

### Бизнес-модель (целевая v1.0)

| Участник | Ценность | Монетизация |
|----------|----------|-------------|
| **Клиент** (после теста FOX) | Бесплатное сопровождение: план, рецепты, чат, прогресс до ретеста | Тест FOX платный (лаборатория); app — бесплатно после теста |
| **Партнёр-нутриciolog** | Рекомендует тест FOX, видит рефералов и выплаты | Комиссия за приведённого клиента / заказ теста |
| **FoodFox (команда)** | CMS, клиенты, модерация парсинга, аналитика, партнёры | Операционная маржа + масштаб партнёрской сети |

### Медицинская и UX-рамка

- **IgG FOOD — не диагноз аллергии.** Это маркер чувствительности; красная зона в app = **временная элиминация** на период программы, не «запрет навсегда».
- **Зоны FOX (стандарт отчёта):**
  - 🟢 **Green:** &lt; 10 µg/ml — можно
  - 🟡 **Yellow:** 10–19.99 µg/ml — ротация / осторожность
  - 🔴 **Red:** ≥ 20 µg/ml — элиминация (особенно недели 1–4)
- **Успех продукта:** клиент **доходит до ретеста FOX**, видит динамику; партнёры получа **прозрачные выплаты**; команда — **управляемый контент и данные**.

### Три интерфейса (решение по платформам)

```
Клиент (Flutter Android → iOS)  ──┐
Админ-панель (Next.js Web)      ──┼──→ один API + PostgreSQL
Партнёрский кабинет (Next.js)   ──┘
```

- **Mobile только для клиента** (ежедневное использование).
- **Admin + Partner — web**, адаптивно, без отдельного native app для партнёров.
- **Роли в БД:** `client` | `nutritionist` (partner) | `admin` — в коде заложено, UI ролей частично.

---

## 2. Пользовательский путь (client journey)

1. **Регистрация / вход** (email + password; consent в production).
2. **Загрузка PDF FOX** (или демо-отчёт 285 антигенов без файла).
3. **Парсинг** → ~285–287 строк, нормализация имён к RU-каталогу, оценка качества (`parseQuality`).
4. **Экран «Итоги»:** donut по зонам, триггеры, поиск, переход в чат с вопросом по продукту.
5. **План 8 недель:** 4 фазы (элиминация → стабилизация → …), дни с allowed/forbidden/rotation, bot_message на день.
6. **Рецепты:** статьи с hero, ингредиентами, шагами с фото; фильтрация «подходит под вашу зелёную зону».
7. **Чат:** Heli (OpenAI-compatible) + system prompt с контекстом клиента; in-app «push» = daily_reminder в ленте чата + badge unread.
8. **Кабинет:** прогресс, неделя, скачать PDF оригинал (если сохранён).

---

## 3. Технический стек

| Слой | Технология | Примечание |
|------|------------|------------|
| Web UI + API | **Next.js 14** (App Router) | `apps/web` |
| Mobile | **Flutter** | `apps/mobile`, API = тот же backend |
| БД | **PostgreSQL 16** | Docker на VPS `:5433`, схема `packages/database/schema.sql` |
| LLM | **Heli** (getheli.ru), модель ~`gpt-4o-mini` | `FOX_HELI_API_KEY`, `HELI_BASE_URL` |
| PDF текст | `pdf-parse` | Парсер свой: `fox-parser.ts` |
| PDF файлы | Локально VPS (`REPORT_STORAGE_DIR`) | Задел под S3 |
| Деплой | **VPS** (не Render/Supabase для prod) | PM2, nginx, Let's Encrypt |
| CI | GitHub Actions | APK Android; workflow deploy-web-vps (нужны secrets) |

**Сознательно не используем в MVP:** Supabase, прямой OpenAI, Telegram-бот, email/push на устройство (только in-app).

---

## 4. Архитектура данных (ядро)

```
users (email, password_hash, role)
  └── clients (user_id, display_name, tenant_id?, privacy_consent_at, referral_code?)

reports (client_id, storage_key, parse_confidence, metadata)
  └── test_results (food_item_id, value_ug_ml, zone, is_floor_value)

nutrition_plans (client_id, report_id, 8 weeks)
  └── plan_days (date, week_number, allowed, forbidden, rotation, bot_message)

chat_threads (client_id, plan_id)
  └── chat_messages (role, message_type, content, read_at)

analytics_events (client_id, event_type, payload jsonb)
llm_requests (client_id, model, tokens, latency_ms, thread_id)
refresh_tokens (user_id, token_hash, expires_at)
```

**Изоляция:** `client_id` на всех персональных данных; API берёт `clientId` **только из сессии/токена**, не из URL. Postgres **RLS** на reports, plans, chat, analytics (migration `002_auth_telemetry_rls.sql`). Транзакции с `SET app.client_id`.

**Справочник FOX:** `fox-catalog-ru.json` (~285 имён), aliases EN/RU, golden fixture PDF e710.

---

## 5. Что уже реализовано (функциональность)

### Клиент (Web + Android)

- Login / Register / Logout / Me
- Upload FOX PDF, demo seed, processing overlay
- Results, Plan (overview + week), Recipes (modal-статьи), Chat, Account
- Bottom nav, zone tabs, week selector, pagination lists
- Android APK через CI (`FOX_API_BASE=https://foodfox.yuri.guru`)

### Парсер FOX

- Regex + state machine: двухколоночные строки, table block, Bos d 4/5/8 molecular, CCD + lactoferrin, comma-split names, Radicchio multiline
- Фильтр narrative/meta/category index pages
- `fox-parse-quality`: confidence, warnings, coverage vs header «287 антигенов»
- Golden tests: `npm run parser:test`, `npm run parser:fixtures`
- На эталонном PDF e710: **285/285** catalog match, confidence high

### Рецепты

- 5 полноценных статей в `recipes-catalog.ts` + UI `RecipeArticle.tsx`
- Mobile: `recipe_detail_screen.dart` с SliverAppBar
- Match engine: `recipe-match.ts` vs зоны клиента

### Plan Engine

- `buildEightWeekPlan`, фазы недель, rotation yellow, bot messages
- Plan API: overview vs full week (оптимизация payload)

### Чат / LLM

- `buildSystemPrompt` с зонами, неделей, продуктами из вопроса
- Защита от cross-user в промпте; audit `llm_requests` без текста промпта
- Offline fallback если нет Heli key

### Auth & security (недавний блок)

- Access token (HMAC signed) + refresh token rotation
- Cookie (web) + `X-Fox-Token` (mobile, т.к. nginx Basic на Authorization)
- Production: обязательны `DATABASE_URL`, `SESSION_SECRET`; health 503 без БД
- Register: `consent: true` в production

### Telemetry (начало)

- Events: `user_registered`, `user_logged_in`, `report_uploaded`, `chat_sent`
- Таблицы готовы для admin dashboards

### Инфра / docs

- `deploy/vps/update.sh`, docker-compose Postgres, nginx subdomain
- Roadmap A4: `docs/FoodFox-v1-Roadmap-A4.md`
- Demo script: `docs/DEMO-SCRIPT.md`

### Отклонено / откат

- **Голосовой ввод в чат** — пробовали, пользователь попросил убрать (revert).

### LLM strategy (решение без кода)

- Оставить **Heli / gpt-4o-mini**; свой GPU/local LLM на текущем масштабе не окупается; сначала rule-based shortcuts где возможно.

---

## 6. Известные ограничения и риски

| Тема | Статус |
|------|--------|
| Production DB | Демо-сайт может показывать `database: memory` если на VPS не прописан `DATABASE_URL` — **критично исправить на postgres** |
| Деплой агентом | SSH secrets указывают не на тот хост; нужен `212.67.13.64` + ключ в authorized_keys или GitHub Actions secrets |
| RLS | Включён не на все code paths — часть запросов ещё без `clientScope` |
| Email verify / forgot password | Нет |
| Partner / Admin UI | Нет, только роль в схеме |
| Push на устройство | Нет, только in-app chat reminders |
| PDF storage | Локальный диск VPS (ephemeral при неправильном деплое) |
| 287 vs 285 антигенов | В шапке PDF 287, в RU-каталоге 285 — служебные строки (CCD/контроль), не баг парсера на e710 |

---

## 7. Roadmap v1.0 (6 этапов — для проектирования)

1. **После теста без трения** — QR/код, онбординг, APK, парсинг, admin CRUD рецептов  
2. **План и доверие** — 4 фазы, ротация 🟡, молочный профиль, admin правка плана  
3. **Ежедневное сопровождение** — меню дня, список покупок, push, дневник, KB  
4. **Партнёрская программа** — referral, начисления, web-кабинет партнёра  
5. **Ретест** — сравнение отчётов, реинтродукция 🔴  
6. **Масштаб** — API лаборатории, S3, iOS, Store, admin analytics  

---

## 8. Что просить у модели-проектировщика

Рекомендуемые артеfactы:

1. **Information Architecture** — три роли, навигация, карта экранов (client app + admin + partner).
2. **User flows** — onboarding после FOX, upload fail, week 5 question, retest loop, partner referral attach.
3. **Data & privacy** — 152-ФЗ, consent, export/delete account, retention analytics, минимизация данных в LLM context.
4. **Auth model** — sessions, refresh, partner impersonation (если нужно), admin break-glass.
5. **Event taxonomy** — полный список `analytics_events` для big data / retention / partner funnel.
6. **Admin CMS** — recipes, KB, FOX catalog, parse review queue, client timeline.
7. **Partner cabinet** — referral codes, ledger, payouts, materials.
8. **Plan engine v2** — spec фаз, yellow rotation rules, dairy profile, manual overrides.
9. **Integration** — FOX lab API (future), webhook от лаборатории вместо PDF.
10. **Non-functional** — multi-tenant `tenant_id`, audit log, rate limits, AI safety (prompt injection test suite).

---

## 9. Ключевые файлы в репозитории

```
apps/web/src/lib/fox-parser.ts          # парсер PDF
apps/web/src/lib/fox-parse-quality.ts   # confidence / normalization
apps/web/src/lib/plan-engine.ts         # 8-week plan
apps/web/src/lib/heli.ts                # LLM prompt + chat
apps/web/src/lib/db.ts                  # persistence, auth users
apps/web/src/lib/analytics.ts           # telemetry
packages/database/schema.sql
packages/database/migrations/002_auth_telemetry_rls.sql
packages/database/fixtures/fox-report-e710.pdf
apps/mobile/lib/services/foodfox_api.dart
docs/FoodFox-v1-Roadmap-A4.md
docs/DEPLOY-VPS.md
```

---

## 10. API surface (кратко)

| Method | Path | Назначение |
|--------|------|------------|
| POST | `/api/auth/register`, `/login`, `/logout`, `/refresh` | Auth + tokens |
| GET | `/api/auth/me` | User + client profile |
| POST | `/api/reports/upload` | PDF → parse → plan |
| GET | `/api/results`, `/api/plan`, `/api/recipes` | Core data |
| GET/POST/PATCH | `/api/chat`, `/messages`, `/unread` | Chat + LLM |
| GET | `/api/reports/pdf` | Original PDF |
| GET | `/api/health` | postgres / degraded |
| POST | `/api/demo/load-sample` | Demo seed |

---

## 11. Контекст переписки (хронология решений)

- Полные **рецепты-статьи** с картинками, не карточки на 2 строки.
- **Roadmap A4** без оценок в человеко-днях; три интерфейса (client app + admin web + partner web).
- **Admin + partner program** — web, не mobile для партнёров.
- Улучшение **парсера FOX** + golden fixture e710.
- **Auth, RLS, telemetry** — foundation для multi-user и big data.
- **Деплой** — скрипт `update.sh`, GitHub deploy workflow; ручной VPS пока secrets не настроены.

---

*Документ сгенерирован для handoff. Актуализируйте версию и health prod перед релизом.*
