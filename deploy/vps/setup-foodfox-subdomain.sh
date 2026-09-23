#!/usr/bin/env bash
# FoodFox at https://foodfox.yuri.guru — subdomain + basic auth
#
# Prerequisites:
#   DNS A record: foodfox.yuri.guru → VPS IP
#
# Run ON the VPS as root:
#   export FOODFOX_AUTH_USER=demo
#   export FOODFOX_AUTH_PASS='your-secret-password'
#   bash /var/www/foodfox/deploy/vps/setup-foodfox-subdomain.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/foodfox}"
PORT="${PORT:-3030}"
DOMAIN="${DOMAIN:-foodfox.yuri.guru}"
NGINX_SITE="/etc/nginx/sites-available/$DOMAIN"
HTPASSWD="/etc/nginx/.htpasswd-foodfox"
AUTH_USER="${FOODFOX_AUTH_USER:-demo}"
AUTH_PASS="${FOODFOX_AUTH_PASS:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@yuri.guru}"

if [[ -z "$AUTH_PASS" ]]; then
  AUTH_PASS="$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 14)"
  echo "Generated FOODFOX_AUTH_PASS=$AUTH_PASS"
fi

echo "==> htpasswd ($HTPASSWD)"
if ! command -v htpasswd >/dev/null; then
  apt-get update -qq && apt-get install -y apache2-utils
fi
htpasswd -bc "$HTPASSWD" "$AUTH_USER" "$AUTH_PASS"
chmod 640 "$HTPASSWD"
chown root:www-data "$HTPASSWD" 2>/dev/null || chown root:root "$HTPASSWD"

echo "==> Nginx site ($DOMAIN)"
sed "s/foodfox.yuri.guru/$DOMAIN/g" "$APP_ROOT/deploy/vps/nginx-foodfox-subdomain.conf" > "$NGINX_SITE"
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$DOMAIN"

echo "==> Clean any /demofox rules from yuri.guru (if present)"
YURI_SITE="/etc/nginx/sites-enabled/yuri.guru"
if [[ -f "$YURI_SITE" ]]; then
  python3 - <<'PY'
import re
from pathlib import Path

path = Path("/etc/nginx/sites-enabled/yuri.guru")
text = path.read_text()

for pattern in (
    r"\n# Nginx snippet for FoodFox demo at https://yuri\.guru/demofox.*?(?=\n\s*location / \{)",
    r"\n# FoodFox /demofox.*?(?=\n\s*location / \{)",
    r"\n\s*# FoodFox redirect /demofox -> subdomain\n.*?(?=\n\s*# Основная конфигурация)",
    r"\n# Redirect legacy /demofox URLs.*?(?=\n\s*# Основная конфигурация)",
    r"\n\s*location = /demofox \{[^}]+\}\n",
    r"\n\s*location /demofox/ \{.*?\n\}\n",
    r"\n\s*location ~ \^/demofox/\?\(\.\*\)\$ \{[^}]+\}\n",
):
    text = re.sub(pattern, "\n", text, flags=re.S)

path.write_text(text)
print("yuri.guru: removed /demofox rules")
PY
fi

nginx -t
systemctl reload nginx

echo "==> App env (no basePath — root of subdomain)"
ENV_FILE="$APP_ROOT/apps/web/.env"
touch "$ENV_FILE"
if grep -q '^NEXT_PUBLIC_BASE_PATH=' "$ENV_FILE"; then
  sed -i '/^NEXT_PUBLIC_BASE_PATH=/d' "$ENV_FILE"
fi

echo "==> Rebuild & restart"
cd "$APP_ROOT/apps/web"
set -a
# shellcheck disable=SC1091
source .env
set +a
unset NEXT_PUBLIC_BASE_PATH
export NEXT_PUBLIC_BASE_PATH=
npm ci --include=dev
rm -rf .next
npm run build
pm2 delete foodfox 2>/dev/null || true
pm2 start npm --name foodfox -- start
pm2 save

echo "==> SSL (certbot)"
if command -v certbot >/dev/null; then
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect 2>&1; then
    echo "SSL certificate installed"
  else
    echo "WARN: certbot failed — add DNS A record for $DOMAIN and re-run:"
    echo "  certbot --nginx -d $DOMAIN"
  fi
  nginx -t && systemctl reload nginx
fi

echo ""
echo "Done: https://$DOMAIN/upload"
echo "Login: $AUTH_USER / $AUTH_PASS"
echo "Health: curl -s -u $AUTH_USER:$AUTH_PASS https://$DOMAIN/api/health"
