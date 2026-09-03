#!/usr/bin/env bash
# Pull latest code, rebuild Next.js, restart PM2. Run ON the VPS.
# Postgres (Docker) is only restarted if the compose file changed.
#
#   cd /var/www/foodfox && bash deploy/vps/update.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/foodfox}"
BRANCH="${BRANCH:-cursor/mvp-web-prototype-5e5b}"
PORT="${PORT:-3030}"

cd "$APP_ROOT"

echo "==> git pull ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Postgres (Docker)"
docker compose -f deploy/vps/docker-compose.yml up -d

echo "==> Build Next.js"
cd "$APP_ROOT/apps/web"
npm ci --include=dev
npm run build

echo "==> PM2 restart"
set -a
# shellcheck disable=SC1091
source .env
set +a
if pm2 describe foodfox >/dev/null 2>&1; then
  pm2 restart foodfox --update-env
else
  pm2 start npm --name foodfox --update-env -- start
fi
pm2 save

echo "==> Health"
curl -sf "http://127.0.0.1:${PORT}/api/health" | head -c 200 || true
echo ""
echo "Done. Public URL: https://foodfox.yuri.guru/upload"
