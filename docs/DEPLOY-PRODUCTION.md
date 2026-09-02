# FoodFox — production demo (Render + Supabase + Heli)

## Что уже готово

| Компонент | Статус |
|-----------|--------|
| Web | https://foodfox-web.onrender.com |
| Supabase Postgres | проект `foodfox` — схема + **285 антигенов FOX** |
| Парсер PDF | ~285/287 на эталонном отчёте |
| Код | без demo-fallback — только реальный PDF |

## Два секрета для полного демо клиенту

Добавьте в [Render → foodfox-web → Environment](https://dashboard.render.com/web/srv-dabl8qqjobas7386f8jg):

### 1. `DATABASE_URL` (обязательно)

Supabase: [Dashboard → foodfox → Settings → Database](https://supabase.com/dashboard/project/vhcefkdihoctkkcajrxf/settings/database)

- **Connection string → URI** (Transaction pooler, port **6543**)
- Формат: `postgresql://postgres.vhcefkdihoctkkcajrxf:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
- Пароль: Database Settings → Reset database password (если не сохранён)

После сохранения `/api/health` вернёт `"database": "postgres"`.

### 2. `HELI_API_KEY` (обязательно для AI-чата)

- Ключ: [getheli.ru](https://getheli.ru) → «Получить ключ»
- `HELI_BASE_URL` уже задан: `https://getheli.ru/v1`
- `HELI_CHAT_MODEL`: `gpt-4o-mini` (можно сменить)

Без ключа чат ответит, что AI не настроен.

## Сценарий показа клиенту

1. Открыть https://foodfox-web.onrender.com/upload (подождать cold start ~30 с)
2. Загрузить **реальный FOX PDF** → парсер разберёт ~285 антигенов
3. `/results` — зоны 🟢🟡🔴 по данным отчёта
4. `/recipes` — рецепты под неделю плана
5. `/chat` — вопросы по **вашим** красным/зелёным продуктам (Heli LLM)

## Локальная проверка

```bash
cd apps/web
export DATABASE_URL="postgresql://..."
export HELI_API_KEY="sk-..."
export HELI_BASE_URL="https://getheli.ru/v1"
npm run dev
```
