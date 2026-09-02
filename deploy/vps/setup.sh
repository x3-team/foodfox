#!/usr/bin/env bash
# FoodFox VPS setup — run ON the server (same VPS as githaly.ru / yuri.ai.ru)
# Prerequisites: Node 20+, git, docker, docker compose, pm2, nginx, certbot
#
#   export DOMAIN=demo.example.com
#   export HELI_API_KEY=sk-...
#   bash deploy/vps/setup.sh

set -euo pipefail

REPO="${REPO:-https://github.com/x3-team/foodfox.git}"
BRANCH="${BRANCH:-cursor/mvp-web-prototype-5e5b}"
APP_ROOT="${APP_ROOT:-/var/www/foodfox}"
PORT="${PORT:-3010}"

echo "==> FoodFox VPS setup"
echo "    APP_ROOT=$APP_ROOT  PORT=$PORT  BRANCH=$BRANCH"

if ! command -v node >/dev/null; then
  echo "Node.js 20+ required. Install: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi

if [[ ! -d "$APP_ROOT/.git" ]]; then
  sudo mkdir -p "$APP_ROOT"
  sudo chown "$(whoami):$(whoami)" "$APP_ROOT"
  git clone --branch "$BRANCH" "$REPO" "$APP_ROOT"
else
  cd "$APP_ROOT"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

cd "$APP_ROOT"

echo "==> Postgres (Docker, port 5433)"
docker compose -f deploy/vps/docker-compose.yml up -d

ENV_FILE="$APP_ROOT/apps/web/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cp deploy/vps/.env.example "$ENV_FILE"
  echo "Created $ENV_FILE — edit POSTGRES password / HELI_API_KEY if needed"
fi

# Inject HELI key if passed
if [[ -n "${HELI_API_KEY:-}" ]]; then
  grep -q '^HELI_API_KEY=' "$ENV_FILE" && sed -i "s|^HELI_API_KEY=.*|HELI_API_KEY=$HELI_API_KEY|" "$ENV_FILE" || echo "HELI_API_KEY=$HELI_API_KEY" >> "$ENV_FILE"
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> Build Next.js"
cd "$APP_ROOT/apps/web"
npm ci --include=dev
npm run build

echo "==> PM2"
if pm2 describe foodfox >/dev/null 2>&1; then
  pm2 restart foodfox --update-env
else
  pm2 start npm --name foodfox -- start
fi
pm2 save

if [[ -n "${DOMAIN:-}" ]]; then
  echo "==> Nginx ($DOMAIN)"
  NGINX_CONF="/etc/nginx/sites-available/foodfox"
  sudo sed "s/FOODFOX_DOMAIN/$DOMAIN/g" "$APP_ROOT/deploy/vps/nginx-foodfox.conf" | sudo tee "$NGINX_CONF" >/dev/null
  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/foodfox
  sudo nginx -t && sudo systemctl reload nginx
  if command -v certbot >/dev/null; then
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "${CERTBOT_EMAIL:-admin@$DOMAIN}" || true
  fi
  echo "Done: https://$DOMAIN/upload"
else
  echo "DOMAIN not set — skip nginx. App on http://127.0.0.1:$PORT"
  echo "Health: curl http://127.0.0.1:$PORT/api/health"
fi
