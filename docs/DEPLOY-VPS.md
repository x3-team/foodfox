# FoodFox — деплой на VPS (без Supabase / без платных сервисов)

Стек **только на вашем VPS**:
- **Next.js** — PM2, порт `3010`
- **Postgres 16** — Docker на `127.0.0.1:5433` (бесплатно, данные на диске VPS)
- **Nginx + Let's Encrypt** — ваш тестовый домен
- **Heli** — только API-ключ (getheli.ru), без подписки на инфраструктуру

Render и Supabase **не нужны**.

## Быстрый старт (на VPS)

```bash
export DOMAIN=demo.your-domain.ru
export HELI_API_KEY=sk-...
git clone -b cursor/mvp-web-prototype-5e5b https://github.com/x3-team/foodfox.git /var/www/foodfox
cd /var/www/foodfox
bash deploy/vps/setup.sh
```

Проверка: `curl https://$DOMAIN/api/health` → `"database": "postgres"`

## SSH-доступ для Cloud Agent

Ключ агента (добавить в `~/.ssh/authorized_keys` на VPS):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGb40yeKa1EJNG0R2c82jGMJaJdB/2XQskJEZDya/b7H cursor-cloud-agent
```

Сейчас ключ в секретах Cursor **не принимается сервером** — нужно добавить строку выше или обновить `SSH_PRIVATE_KEY` в секретах агента.

## Что прислать, когда будете готовы

1. **Тестовый домен** (A-запись на IP VPS)
2. **`HELI_API_KEY`**
3. Подтверждение, что SSH-ключ добавлен (или пароль / другой ключ)

## Порты

| Сервис | Порт |
|--------|------|
| FoodFox (PM2) | 3010 |
| Postgres (Docker) | 5433 → 5432 |

Не конфликтует с другими сайтами на том же VPS (githaly.ru, yuri.ai.ru).

## Обновление

```bash
cd /var/www/foodfox && git pull && cd apps/web && npm ci --include=dev && npm run build && pm2 restart foodfox
```
