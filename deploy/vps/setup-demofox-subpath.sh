#!/usr/bin/env bash
# FoodFox demo at https://yuri.guru/demofox — nginx subpath + basic auth
#
# Run ON the VPS as root:
#   export DEMOFOX_AUTH_USER=demo
#   export DEMOFOX_AUTH_PASS='your-secret-password'
#   bash /var/www/foodfox/deploy/vps/setup-demofox-subpath.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/foodfox}"
PORT="${PORT:-3030}"
SUBPATH="${SUBPATH:-/demofox}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/yuri.guru}"
SNIPPET_MARKER="# FoodFox /demofox"
HTPASSWD="/etc/nginx/.htpasswd-demofox"
AUTH_USER="${DEMOFOX_AUTH_USER:-demo}"
AUTH_PASS="${DEMOFOX_AUTH_PASS:-}"

if [[ -z "$AUTH_PASS" ]]; then
  AUTH_PASS="$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 14)"
  echo "Generated DEMOFOX_AUTH_PASS=$AUTH_PASS"
fi

echo "==> Ensure htpasswd ($HTPASSWD)"
if ! command -v htpasswd >/dev/null; then
  apt-get update -qq && apt-get install -y apache2-utils
fi
htpasswd -bc "$HTPASSWD" "$AUTH_USER" "$AUTH_PASS"
chmod 640 "$HTPASSWD"
chown root:www-data "$HTPASSWD" 2>/dev/null || chown root:root "$HTPASSWD"

echo "==> Patch nginx ($NGINX_SITE)"
if [[ ! -f "$NGINX_SITE" ]]; then
  echo "Nginx site not found: $NGINX_SITE"
  exit 1
fi

if grep -q "$SNIPPET_MARKER" "$NGINX_SITE"; then
  echo "Snippet already present — skip patch"
else
  SNIPPET_FILE="$APP_ROOT/deploy/vps/nginx-demofox-subpath.conf"
  TMP="$(mktemp)"
  awk -v marker="$SNIPPET_MARKER" -v snippet="$SNIPPET_FILE" '
    BEGIN { while ((getline line < snippet) > 0) block = block line "\n" }
    /location \/ \{/ && !done {
      print marker
      printf "%s", block
      done = 1
    }
    { print }
  ' "$NGINX_SITE" > "$TMP"
  cp "$TMP" "$NGINX_SITE"
  rm "$TMP"
  echo "Inserted /demofox location before catch-all"
fi

nginx -t
systemctl reload nginx

echo "==> Update app env (basePath=$SUBPATH)"
ENV_FILE="$APP_ROOT/apps/web/.env"
touch "$ENV_FILE"
grep -q '^NEXT_PUBLIC_BASE_PATH=' "$ENV_FILE" \
  && sed -i "s|^NEXT_PUBLIC_BASE_PATH=.*|NEXT_PUBLIC_BASE_PATH=$SUBPATH|" "$ENV_FILE" \
  || echo "NEXT_PUBLIC_BASE_PATH=$SUBPATH" >> "$ENV_FILE"

echo "==> Rebuild & restart"
cd "$APP_ROOT/apps/web"
set -a
# shellcheck disable=SC1091
source .env
set +a
npm ci --include=dev
npm run build
pm2 restart foodfox --update-env
pm2 save

echo ""
echo "Done: https://yuri.guru${SUBPATH}/upload"
echo "Login: $AUTH_USER / $AUTH_PASS"
echo "Health (local): curl -s http://127.0.0.1:$PORT${SUBPATH}/api/health"
