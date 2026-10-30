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
echo "    FOX_ADMIN_EMAIL:  ${FOX_ADMIN_EMAIL:-<not set>}"

# apps/web is rebuilt only when its code changed since the commit the server ran before this deploy (PREV_SHA from
# the workflow): its build wipes .next under the running process, so a site-only deploy must not touch it.
WEB_PATHS=(apps/web packages/database VERSION)
if [[ -n "${PREV_SHA:-}" ]] && git -C "$APP_ROOT" cat-file -e "${PREV_SHA}^{commit}" 2>/dev/null \
   && git -C "$APP_ROOT" diff --quiet "$PREV_SHA" HEAD -- "${WEB_PATHS[@]}" \
   && pm2 describe foodfox >/dev/null 2>&1 && [[ "${FORCE_WEB:-}" != "1" ]]; then
  echo "==> apps/web unchanged since ${PREV_SHA:0:7} — build and restart skipped"
else
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
fi

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
#
# No downtime: two slots, ports 3041 and 3042, each with its own build dir (.next-<port>) and pm2 process
# (foodfox-site-<port>). The new release is built and started in the idle slot while the live one keeps serving;
# nginx switches to it (graceful reload) only after it answers, then the old process stops. Admin sessions live in
# Postgres, so nobody is logged out. The very first run replaces the old single process «foodfox-site» on :3041.
# Uploads of the admin media library live outside the checkout, so git reset on deploy never touches them.
export FOX_MEDIA_DIR="${FOX_MEDIA_DIR:-/var/www/foodfox-data/media}"
mkdir -p "$FOX_MEDIA_DIR"
# Course videos and notes uploaded by hand; nginx serves the videos at /course-media/ (nginx-apply.sh).
export FOX_COURSE_MEDIA_DIR="${FOX_COURSE_MEDIA_DIR:-/var/www/foodfox-course-media}"
export SITE_ASSET_PREFIX=/_site
STATE_DIR="${STATE_DIR:-/var/www/foodfox-data}"
mkdir -p "$STATE_DIR"
LIVE_PORT="$(cat "$STATE_DIR/site-port" 2>/dev/null || echo 3041)"
if pm2 describe "foodfox-site-${LIVE_PORT}" >/dev/null 2>&1; then LIVE_NAME="foodfox-site-${LIVE_PORT}"; else LIVE_NAME="foodfox-site"; LIVE_PORT=3041; fi
if [[ "$LIVE_PORT" == "3041" ]]; then SITE_PORT=3042; else SITE_PORT=3041; fi
SITE_NAME="foodfox-site-${SITE_PORT}"
export SITE_DIST_DIR=".next-${SITE_PORT}"
echo "==> Marketing site (apps/site): live ${LIVE_NAME} :${LIVE_PORT}, new ${SITE_NAME} :${SITE_PORT}"
echo "    node $(node -v); memory:"
free -m | sed 's/^/      /' || true
pm2 delete "$SITE_NAME" >/dev/null 2>&1 || true
if ss -ltnH "sport = :${SITE_PORT}" 2>/dev/null | grep -q .; then
  echo "!! port ${SITE_PORT} is taken by another process — live site left as is" >&2
  exit 1
fi

if [[ -d "$FOX_COURSE_MEDIA_DIR" ]]; then
  # nginx (www-data) has to read the files it serves.
  find "$FOX_COURSE_MEDIA_DIR" -type d -exec chmod o+rx {} + ; find "$FOX_COURSE_MEDIA_DIR" -type f -exec chmod o+r {} +
  echo "    course media in $FOX_COURSE_MEDIA_DIR:"
  find "$FOX_COURSE_MEDIA_DIR" -type f -printf '      %10s  %P\n' | sort -k2 || true
else
  echo "!! no course media folder $FOX_COURSE_MEDIA_DIR — lessons show «Видео скоро»" >&2
fi

cd "$APP_ROOT/apps/site"
# Reinstall only when the lockfile changed: npm ci wipes node_modules under the live process.
LOCK_SUM="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [[ ! -d node_modules || "$(cat node_modules/.fox-lock 2>/dev/null)" != "$LOCK_SUM" ]]; then
  npm ci --include=dev
  echo "$LOCK_SUM" > node_modules/.fox-lock
else
  echo "    node_modules up to date"
fi
rm -rf "$SITE_DIST_DIR"
NODE_OPTIONS="${SITE_NODE_OPTIONS:-${NODE_OPTIONS:-}}" npm run build
pm2 start "$APP_ROOT/apps/site/node_modules/next/dist/bin/next" --name "$SITE_NAME" \
  --cwd "$APP_ROOT/apps/site" --update-env -- start -H 127.0.0.1 -p "$SITE_PORT"

echo "==> Site health (new slot :${SITE_PORT})"
site_ok=""
for _ in $(seq 1 20); do
  sleep 2
  if HOME_HTML="$(curl -sf "http://127.0.0.1:${SITE_PORT}/")"; then site_ok=1; break; fi
done
ASSET="$(grep -o '/_site/_next/static/[^"]*\.js' <<<"${HOME_HTML:-}" | head -1 || true)"
if [[ -z "$site_ok" || -z "$ASSET" ]] || ! curl -sf -o /dev/null "http://127.0.0.1:${SITE_PORT}${ASSET#/_site}"; then
  echo "!! new apps/site on :${SITE_PORT} is not healthy (asset '${ASSET}') — live site :${LIVE_PORT} left as is" >&2
  pm2 logs "$SITE_NAME" --lines 40 --nostream >&2 || true
  pm2 delete "$SITE_NAME" >/dev/null 2>&1 || true
  exit 1
fi
echo "    / 200, asset ${ASSET} 200"
# Warm the main pages so the first visitors after the switch do not wait for a render.
for path in / /course /course/lessons /course/media /specialists /labs /admin/login; do
  curl -s -o /dev/null -w "    warm %{http_code} ${path}\n" "http://127.0.0.1:${SITE_PORT}${path}" || true
done

# Site admin (/admin): leads from the site forms land in Postgres, so the site must see DATABASE_URL.
ADMIN_HEALTH="$(curl -s "http://127.0.0.1:${SITE_PORT}/admin/api/health" || true)"
echo "    /admin/api/health: ${ADMIN_HEALTH}"
case "$ADMIN_HEALTH" in
  *'"admins":0}'*)
    echo "!! admin: no administrator yet — set FOX_ADMIN_EMAIL and FOX_ADMIN_PASSWORD in apps/web/.env and redeploy" >&2 ;;
  *'"database":"postgres"'*) ;;
  *) echo "!! admin: the site has no database — form leads are NOT being stored" >&2 ;;
esac

# Live nginx site: no basic auth, noindex header, and the path routing between
# apps/web and apps/site; nginx -t gates the reload.
echo "==> Nginx → :${SITE_PORT}"
SITE_PORT="$SITE_PORT" WEB_PORT="$PORT" COURSE_MEDIA_DIR="$FOX_COURSE_MEDIA_DIR" bash "$APP_ROOT/deploy/vps/nginx-apply.sh"
echo "$SITE_PORT" > "$STATE_DIR/site-port"

# The old process finishes the requests it has (nginx reload keeps old workers until they are done), then stops.
if [[ "$LIVE_NAME" != "$SITE_NAME" ]] && pm2 describe "$LIVE_NAME" >/dev/null 2>&1; then
  sleep 10
  pm2 delete "$LIVE_NAME" || true
  echo "    stopped ${LIVE_NAME}"
fi
pm2 save
rm -rf "$APP_ROOT/apps/site/.next-${LIVE_PORT}"
if [[ "$LIVE_NAME" == "foodfox-site" ]]; then rm -rf "$APP_ROOT/apps/site/.next"; fi

echo "==> Live check through nginx"
for path in / /course/lessons /course/media; do
  curl -sk -o /dev/null -w "    %{http_code} ${path}\n" --resolve foodfox.yuri.guru:443:127.0.0.1 "https://foodfox.yuri.guru${path}" || true
done
first="$(curl -s "http://127.0.0.1:${SITE_PORT}/course/media" | grep -o '"/course-media/[^"]*"' | head -1 | tr -d '"')"
if [[ -n "$first" ]]; then
  curl -sk -o /dev/null -r 0-1023 -w "    video range: %{http_code} %{size_download} bytes %{content_type} ${first}\n" --resolve foodfox.yuri.guru:443:127.0.0.1 "https://foodfox.yuri.guru${first}" || true
fi
