#!/usr/bin/env bash
# Keep the live nginx site for foodfox.yuri.guru in line with the repo policy:
# no basic auth, X-Robots-Tag noindex on every response, and (with SITE_PORT
# set) path routing: apps/web for the cabinet, client app and /api, apps/site
# for the marketing site on / and everything else. Run ON the VPS as root
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
text = "".join(out)

# Path routing between apps/web and apps/site, only when the deploy says the
# site is up (SITE_PORT set). Replaces the single `location /` that proxies to
# apps/web, or the managed block from an earlier run.
import os
site, web = os.environ.get("SITE_PORT", ""), os.environ.get("WEB_PORT") or "3030"
BEGIN = "# BEGIN foodfox routing (managed by deploy/vps/nginx-apply.sh)"
END = "# END foodfox routing"
if site:
    def loc(match, port, uri="", ind="    "):
        body = [
            f"proxy_pass http://127.0.0.1:{port}{uri};",
            "proxy_http_version 1.1;",
            "proxy_set_header Upgrade $http_upgrade;",
            'proxy_set_header Connection "upgrade";',
            "proxy_set_header Host $host;",
            "proxy_set_header X-Real-IP $remote_addr;",
            "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            "proxy_set_header X-Forwarded-Proto $scheme;",
            "proxy_cache_bypass $http_upgrade;",
            "proxy_connect_timeout 60s;",
            "proxy_send_timeout 120s;",
            "proxy_read_timeout 120s;",
            "client_max_body_size 20M;",
        ]
        inner = "".join(f"{ind}    {line}\n" for line in body)
        return f"{ind}location {match} {{\n{inner}{ind}}}\n"

    WEB_PAGES = "partner|login|account|chat|plan|recipes|results|upload"
    WEB_FILES = r"robots\.txt|favicon\.ico|icon\.png|fox-logo\.png|onboarding-hero\.jpg"
    block = (
        f"    {BEGIN}\n"
        f"    # apps/web :{web} — partner cabinet, client web app, API of the mobile app.\n"
        f"    # apps/site :{site} — marketing site: / and every other path, its 404.\n"
        + loc("/api/", web)
        + loc("= /api/lead", site)
        + loc("^~ /_next/", web)
        + loc("^~ /_site/", site, "/")
        + loc(f"~ ^/({WEB_PAGES})(/|$)", web)
        + loc(f"~ ^/({WEB_FILES})$", web)
        + loc("/", site)
        + f"    {END}\n"
    )
    managed = re.compile(r"(?ms)^[ \t]*" + re.escape(BEGIN) + r".*?" + re.escape(END) + r"[ \t]*\n")
    if managed.search(text):
        text = managed.sub(lambda _m: block, text)
    else:
        # Find `location / { ... }` blocks (brace-balanced) that proxy to apps/web.
        res, pos, found = [], 0, 0
        for m in re.finditer(r"(?m)^[ \t]*location[ \t]+/[ \t]*\{", text):
            if m.start() < pos:
                continue
            depth, i = 0, m.end() - 1
            while i < len(text):
                if text[i] == "{": depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0: break
                i += 1
            end = text.find("\n", i) + 1 or len(text)
            body = text[m.start():end]
            if f"127.0.0.1:{web}" not in body:
                continue
            res.append(text[pos:m.start()])
            res.append(block)
            pos, found = end, found + 1
        res.append(text[pos:])
        if found != 1:
            sys.exit(f"!! expected one `location /` proxying to :{web}, found {found}")
        text = "".join(res)

open(dst, "w").write(text)
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
