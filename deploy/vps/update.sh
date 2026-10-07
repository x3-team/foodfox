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
echo "    FOX_PARTNER_DEMO_PHONE: ${FOX_PARTNER_DEMO_PHONE:-<code default 79251111111>}"
echo "    FOX_PARTNER_DEMO_OTP:   ${FOX_PARTNER_DEMO_OTP:-<FOX_DEMO_OTP or 1111>}"
echo "    FOX_DEMO_MODE:    ${FOX_DEMO_MODE:-off}"

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
    echo "    apps/web OK"
    ;;
  *)
    echo "!! health did not report postgres — check apps/web/.env DATABASE_URL" >&2
    exit 1
    ;;
esac

# Marketing site (apps/site) on the same domain: own Next.js process, built
# after apps/web so the two builds never run at once. Its assets live under
# /_site/_next/* because apps/web owns /_next/*; nginx strips the prefix.
SITE_PORT="${SITE_PORT:-3041}"
export SITE_ASSET_PREFIX=/_site
echo "==> Marketing site (apps/site → 127.0.0.1:${SITE_PORT})"
echo "    node $(node -v); memory:"
free -m | sed 's/^/      /' || true
if ! pm2 describe foodfox-site >/dev/null 2>&1 \
   && ss -ltnH "sport = :${SITE_PORT}" 2>/dev/null | grep -q .; then
  echo "!! port ${SITE_PORT} is taken by another process — set SITE_PORT" >&2
  exit 1
fi
cd "$APP_ROOT/apps/site"
npm ci --include=dev
rm -rf .next
NODE_OPTIONS="${SITE_NODE_OPTIONS:-${NODE_OPTIONS:-}}" npm run build
if pm2 describe foodfox-site >/dev/null 2>&1; then
  pm2 restart foodfox-site --update-env
else
  pm2 start "$APP_ROOT/apps/site/node_modules/next/dist/bin/next" --name foodfox-site \
    --cwd "$APP_ROOT/apps/site" --update-env -- start -H 127.0.0.1 -p "$SITE_PORT"
fi
pm2 save

echo "==> Site health"
site_ok=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  if HOME_HTML="$(curl -sf "http://127.0.0.1:${SITE_PORT}/")"; then site_ok=1; break; fi
done
if [[ -z "$site_ok" ]]; then
  echo "!! apps/site does not answer on :${SITE_PORT} — nginx routing left as is" >&2
  pm2 logs foodfox-site --lines 40 --nostream >&2 || true
  exit 1
fi
ASSET="$(grep -o '/_site/_next/static/[^"]*\.js' <<<"$HOME_HTML" | head -1 || true)"
if [[ -z "$ASSET" ]] || ! curl -sf -o /dev/null "http://127.0.0.1:${SITE_PORT}${ASSET#/_site}"; then
  echo "!! apps/site HTML has no /_site asset or it does not load: '${ASSET}'" >&2
  exit 1
fi
echo "    / 200, asset ${ASSET} 200"

# Live nginx site: no basic auth, noindex header, and the path routing between
# apps/web and apps/site; nginx -t gates the reload.
echo "==> Nginx"
SITE_PORT="$SITE_PORT" WEB_PORT="$PORT" bash "$APP_ROOT/deploy/vps/nginx-apply.sh"
