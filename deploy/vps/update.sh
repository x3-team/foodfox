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

cd "$APP_ROOT/apps/web"

# Load .env before the build, not just before the restart: anything the build
# reads from the environment has to see the same values the server will.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "!! apps/web/.env is missing — the build will fall back to defaults" >&2
fi

# Printed on every deploy so a misconfigured server is obvious from the log.
# Secrets are reported as set/MISSING only; the demo login is deliberately
# shown in full because the app puts it on screen and the team needs to know
# which test account the deployed server actually accepts.
echo "==> Config"
flag() { [[ -n "${1:-}" ]] && echo "set" || echo "MISSING"; }
echo "    DATABASE_URL:     $(flag "${DATABASE_URL:-}")"
echo "    SESSION_SECRET:   $(flag "${SESSION_SECRET:-}")"
echo "    FOX_HELI_API_KEY: $(flag "${FOX_HELI_API_KEY:-}")"
echo "    HELI_BASE_URL:    ${HELI_BASE_URL:-<code default>}"
echo "    HELI_CHAT_MODEL:  ${HELI_CHAT_MODEL:-<code default>}"
echo "    FOX_DEMO_PHONES:  ${FOX_DEMO_PHONES:-<code default>}"
echo "    FOX_DEMO_OTP:     ${FOX_DEMO_OTP:-<code default>}"

echo "==> Build Next.js"
npm ci --include=dev
# A stale .next can keep serving prerendered route bodies from an older build.
rm -rf .next
npm run build

echo "==> PM2 restart"
if pm2 describe foodfox >/dev/null 2>&1; then
  pm2 restart foodfox --update-env
else
  pm2 start npm --name foodfox --update-env -- start
fi
pm2 save

echo "==> Health"
sleep 4
HEALTH="$(curl -sf "http://127.0.0.1:${PORT}/api/health" || true)"
echo "$HEALTH"
case "$HEALTH" in
  *'"database":"postgres"'*)
    echo "Done. Public URL: https://foodfox.yuri.guru/upload"
    ;;
  *)
    echo "!! health did not report postgres — check apps/web/.env DATABASE_URL" >&2
    exit 1
    ;;
esac
