# FoodFox — деплой на VPS (без Supabase / без платных сервисов)

Стек **только на вашем VPS**:
- **Next.js** — PM2, порт `3030`
- **Postgres 16** — Docker на `127.0.0.1:5433` (бесплатно, данные на диске VPS)
- **Nginx + Let's Encrypt** — ваш тестовый домен или подпуть на существующем домене
- **Heli** — только API-ключ (getheli.ru), без подписки на инфraструктуру

Render и Supabase **не нужны**.

## Демо на foodfox.yuri.guru (закрыто паролем)

Рекомендуемый вариант — отдельный поддомен на том же VPS:

1. **DNS:** A-запись `foodfox.yuri.guru` → IP VPS (`212.67.13.64`)
2. На сервере:

```bash
cd /var/www/foodfox
git pull
export FOODFOX_AUTH_USER=demo
export FOODFOX_AUTH_PASS='ваш-секретный-пароль'
sudo bash deploy/vps/setup-foodfox-subdomain.sh
```

- URL: **https://foodfox.yuri.guru/upload**
- Доступ: nginx **Basic Auth**
- Приложение на `127.0.0.1:3030`, снаружи только через поддомен

Сменить пароль:

```bash
sudo htpasswd /etc/nginx/.htpasswd-foodfox demo
sudo systemctl reload nginx
```

### Альтернатива: подпуть yuri.guru/demofox

```bash
sudo bash deploy/vps/setup-demofox-subpath.sh
```

Требует `NEXT_PUBLIC_BASE_PATH=/demofox` в `.env`.

## Быстрый старт (отдельный домен)

```bash
export DOMAIN=demo.your-domain.ru
export FOX_HELI_API_KEY=sk-...
git clone -b cursor/mvp-web-prototype-5e5b https://github.com/x3-team/foodfox.git /var/www/foodfox
cd /var/www/foodfox
# Для корня домена уберите NEXT_PUBLIC_BASE_PATH из apps/web/.env
bash deploy/vps/setup.sh
```

Проверка: `curl https://$DOMAIN/api/health` → `"database": "postgres"`

## SSH-доступ для Cloud Agent

Ключ агента (добавить в `~/.ssh/authorized_keys` на VPS):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGb40yeKa1EJNG0R2c82jGMJaJdB/2XQskJEZDya/b7H cursor-cloud-agent
```

## Что прислать, когда будете готовы

1. **`FOX_HELI_API_KEY`** — для AI-чата
2. Логин/пароль для демо (или сгенерирует setup-скрипт)

## Порты

| Сервис | Порт |
|--------|------|
| FoodFox (PM2) | 3030 |
| Postgres (Docker) | 5433 → 5432 |

Не конфликтует с другими сайтами на том же VPS (githaly.ru, yuri.ai.ru, yuri.guru).

## Обновление

```bash
cd /var/www/foodfox && git pull && cd apps/web && npm ci --include=dev && npm run build && pm2 restart foodfox
```
