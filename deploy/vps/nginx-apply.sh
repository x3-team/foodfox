#!/usr/bin/env bash
# Keep the live nginx site for foodfox.yuri.guru in line with the repo policy:
# no basic auth, X-Robots-Tag noindex on every response. Run ON the VPS as root
# (deploy/vps/update.sh calls it on every deploy).
#
# The live file is edited in place rather than replaced with the repo template,
# because certbot added the TLS server blocks to it on the server. A copy is
# kept, `nginx -t` gates the reload, and a failed test restores the old file.

set -euo pipefail

DOMAIN="${DOMAIN:-foodfox.yuri.guru}"
BACKUP_DIR="${NGINX_BACKUP_DIR:-/var/backups/nginx-foodfox}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "!! nginx: not root ($(id -un)) — skipping, update the site by hand" >&2
  exit 1
fi

# Find the enabled file(s) that declare the domain; follow sites-enabled links.
mapfile -t FILES < <(
  grep -lE "server_name[^;]*\b${DOMAIN//./\\.}\b" /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null \
    | xargs -r -n1 readlink -f | sort -u
)
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "!! nginx: no enabled site declares $DOMAIN" >&2
  nginx -T 2>/dev/null | grep -nE "configuration file|server_name" >&2 || true
  exit 1
fi

for FILE in "${FILES[@]}"; do
  echo "    nginx site: $FILE"
  grep -nE "server_name|listen|auth_basic|X-Robots-Tag|location" "$FILE" | sed 's/^/      /'
  others="$(grep -E '^\s*server_name' "$FILE" | grep -vE "\b${DOMAIN//./\\.}\b" || true)"
  if [[ -n "$others" ]]; then
    echo "!! nginx: $FILE also serves other hosts — not editing it automatically:" >&2
    echo "$others" >&2
    exit 1
  fi
done

changed=()
for FILE in "${FILES[@]}"; do
  tmp="$(mktemp)"
  python3 - "$FILE" "$tmp" <<'PY'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src).read()
# Basic auth off for the whole site.
text = re.sub(r"(?m)^[ \t]*auth_basic(_user_file)?\s[^;]*;[ \t]*\n", "", text)
# noindex header right after each server_name, unless that server has it.
out, pos = [], 0
for m in re.finditer(r"(?m)^([ \t]*)server_name\s[^;]*;[ \t]*\n", text):
    out.append(text[pos:m.end()])
    pos = m.end()
    nxt = text.find("server {", pos)
    block = text[pos: nxt if nxt != -1 else len(text)]
    if "X-Robots-Tag" not in block:
        out.append(f'{m.group(1)}add_header X-Robots-Tag "noindex, nofollow" always;\n')
out.append(text[pos:])
open(dst, "w").write("".join(out))
PY
  if cmp -s "$FILE" "$tmp"; then
    rm -f "$tmp"
  else
    mkdir -p "$BACKUP_DIR"
    backup="$BACKUP_DIR/$(basename "$FILE").$(date +%Y%m%d-%H%M%S)"
    cp -p "$FILE" "$backup"
    cat "$tmp" > "$FILE"
    rm -f "$tmp"
    echo "    nginx: updated $FILE (backup $backup)"
    diff -u "$backup" "$FILE" | sed 's/^/      /' || true
    changed+=("$FILE=$backup")
  fi
done

if [[ ${#changed[@]} -eq 0 ]]; then
  echo "    nginx: already up to date"
  exit 0
fi

if nginx -t; then
  systemctl reload nginx
  echo "    nginx: reloaded"
else
  echo "!! nginx -t failed — restoring the previous config" >&2
  for pair in "${changed[@]}"; do
    cp -p "${pair#*=}" "${pair%%=*}"
  done
  nginx -t && systemctl reload nginx || true
  exit 1
fi
