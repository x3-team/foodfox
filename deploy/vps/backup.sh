#!/usr/bin/env bash
# Daily backup of FoodFox. Run ON the VPS (cron from update.sh, or by hand):
#
#   bash /var/www/foodfox/deploy/vps/backup.sh
#
# What it copies, into $FOX_BACKUP_DIR/<YYYY-MM-DD_HHMMSS>/:
#   db.dump      pg_dump -Fc of the whole database, from the running container (no lock on writes, no restart)
#   media/       admin media library (FOX_MEDIA_DIR)
#   partner-pd/  partner passport/SNILS/INN scans, already encrypted with FOX_PD_KEY (FOX_PD_DIR)
#   reports/     PDF reports of app clients (REPORT_STORAGE_DIR)
#   manifest.json  time, sizes, status, error — the admin page «Резервные копии» reads it
#
# File folders are copied with rsync --link-dest to the previous run: a file that did not change is a hard
# link, so 14 days of a 1 GB video library take about 1 GB, not 14. Runs older than FOX_BACKUP_DAYS (14)
# are removed; the last 3 good runs are always kept.
# Optional off-site copy: FOX_BACKUP_RCLONE_REMOTE=<remote:path> (rclone must be configured on the server).
# Restore: docs/backups.md.

set -uo pipefail

APP_ROOT="${APP_ROOT:-/var/www/foodfox}"
if [[ -f "$APP_ROOT/apps/web/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_ROOT/apps/web/.env"
  set +a
fi

BACKUP_DIR="${FOX_BACKUP_DIR:-/var/www/foodfox-data/backups}"
KEEP_DAYS="${FOX_BACKUP_DAYS:-14}"
PG_CONTAINER="${FOX_PG_CONTAINER:-foodfox-postgres}"
PG_USER="${FOX_PG_USER:-foodfox}"
PG_DB="${FOX_PG_DB:-foodfox}"
SOURCES=(
  "media|${FOX_MEDIA_DIR:-/var/www/foodfox-data/media}"
  "partner-pd|${FOX_PD_DIR:-$APP_ROOT/data/partner-pd}"
  "reports|${REPORT_STORAGE_DIR:-$APP_ROOT/data/reports}"
)

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

# One run at a time: a slow upload must not overlap the next night.
exec 9>"$BACKUP_DIR/.lock"
if ! flock -n 9; then
  echo "another backup is running" >&2
  exit 1
fi

STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
NAME="$(date +%Y-%m-%d_%H%M%S)"
RUN="$BACKUP_DIR/$NAME"
# Hard links go to the last good run: a failed one may lack files.
PREV="$(grep -l '"status":"ok"' "$BACKUP_DIR"/20*/manifest.json 2>/dev/null | xargs -r -n1 dirname | xargs -r -n1 basename | sort | tail -1)"
mkdir "$RUN" || { echo "$RUN already exists" >&2; exit 1; }
ERRORS=()
FILES_JSON=""

log() { echo "[$(date '+%F %T')] $*"; }
fail() { ERRORS+=("$1"); log "!! $1"; }
bytes() { du -sb "$1" 2>/dev/null | cut -f1; }
json() { local s="${1//\\/\\\\}"; s="${s//\"/\\\"}"; printf '"%s"' "${s//$'\n'/ }"; }

log "backup $NAME → $RUN"
FREE_BEFORE="$(df -B1 --output=avail "$BACKUP_DIR" | tail -1 | tr -d ' ')"

# 1. Database. Written to a temp name first, so a cut-off dump never looks like a good one.
log "pg_dump $PG_DB"
if docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" -Fc -Z 6 >"$RUN/db.dump.part" 2>"$RUN/db.err"; then
  mv "$RUN/db.dump.part" "$RUN/db.dump"
  rm -f "$RUN/db.err"
  # A dump that pg_restore cannot list is not a backup.
  if ! docker exec -i "$PG_CONTAINER" pg_restore --list >/dev/null 2>&1 <"$RUN/db.dump"; then
    fail "дамп базы не читается pg_restore"
  fi
else
  fail "дамп базы: $(head -c 300 "$RUN/db.err" 2>/dev/null | sed 's/^pg_dump: //')"
  rm -f "$RUN/db.dump.part"
fi
DB_BYTES="$(bytes "$RUN/db.dump" || echo 0)"

# 2. File folders.
for entry in "${SOURCES[@]}"; do
  key="${entry%%|*}"
  src="${entry#*|}"
  if [[ ! -d "$src" ]]; then
    log "skip $key: $src does not exist"
    FILES_JSON+="${FILES_JSON:+,}{\"name\":\"$key\",\"bytes\":0,\"files\":0,\"missing\":true}"
    continue
  fi
  log "copy $key from $src"
  if command -v rsync >/dev/null 2>&1; then
    link=()
    [[ -n "$PREV" && -d "$BACKUP_DIR/$PREV/$key" ]] && link=(--link-dest="$BACKUP_DIR/$PREV/$key")
    rsync -a --delete --exclude='.uploads/' "${link[@]}" "$src/" "$RUN/$key/" 2>"$RUN/$key.err" \
      && rm -f "$RUN/$key.err" || fail "$key: $(head -c 300 "$RUN/$key.err")"
  else
    mkdir -p "$RUN/$key"
    tar -C "$src" --exclude='./.uploads' -cf - . 2>"$RUN/$key.err" | tar -C "$RUN/$key" -xf - \
      && rm -f "$RUN/$key.err" || fail "$key: $(head -c 300 "$RUN/$key.err")"
  fi
  count="$(find "$RUN/$key" -type f | wc -l | tr -d ' ')"
  FILES_JSON+="${FILES_JSON:+,}{\"name\":\"$key\",\"bytes\":$(bytes "$RUN/$key" || echo 0),\"files\":$count}"
done

# Disk the run really took (hard links to the previous run are not counted again).
if [[ -n "$PREV" && -d "$BACKUP_DIR/$PREV" ]]; then
  NEW_BYTES="$(du -sb "$BACKUP_DIR/$PREV" "$RUN" 2>/dev/null | tail -1 | cut -f1)"
else
  NEW_BYTES="$(bytes "$RUN")"
fi

# 3. Optional off-site copy.
REMOTE_STATUS="off"
if [[ -n "${FOX_BACKUP_RCLONE_REMOTE:-}" ]]; then
  if command -v rclone >/dev/null 2>&1; then
    log "rclone → $FOX_BACKUP_RCLONE_REMOTE"
    if rclone copy "$RUN" "$FOX_BACKUP_RCLONE_REMOTE/$NAME" --exclude manifest.json 2>"$RUN/rclone.err"; then
      REMOTE_STATUS="ok"; rm -f "$RUN/rclone.err"
    else
      REMOTE_STATUS="error"; fail "выгрузка rclone: $(head -c 300 "$RUN/rclone.err")"
    fi
  else
    REMOTE_STATUS="error"; fail "FOX_BACKUP_RCLONE_REMOTE задан, но rclone не установлен"
  fi
fi

STATUS="ok"
ERROR_TEXT=""
if ((${#ERRORS[@]})); then
  STATUS="error"
  ERROR_TEXT="$(printf '%s; ' "${ERRORS[@]}")"
  ERROR_TEXT="${ERROR_TEXT%; }"
fi

cat >"$RUN/manifest.json.part" <<EOF
{"name":"$NAME","status":"$STATUS","startedAt":"$STARTED","finishedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)",
 "db":{"bytes":${DB_BYTES:-0}},"files":[${FILES_JSON}],"newBytes":${NEW_BYTES:-0},
 "freeBytes":$(df -B1 --output=avail "$BACKUP_DIR" | tail -1 | tr -d ' '),"freeBefore":${FREE_BEFORE:-0},
 "remote":"$REMOTE_STATUS","error":$(json "$ERROR_TEXT")}
EOF
mv "$RUN/manifest.json.part" "$RUN/manifest.json"
chmod 644 "$RUN/manifest.json"

# 4. Rotation: by the date in the folder name, never touching the last 3 good runs.
GOOD="$(grep -l '"status":"ok"' "$BACKUP_DIR"/20*/manifest.json 2>/dev/null | xargs -r -n1 dirname | xargs -r -n1 basename | sort | tail -3)"
CUTOFF="$(date -d "-$KEEP_DAYS days" +%Y-%m-%d)"
for dir in "$BACKUP_DIR"/20*/; do
  name="$(basename "$dir")"
  [[ "${name:0:10}" < "$CUTOFF" ]] || continue
  grep -qx "$name" <<<"$GOOD" && continue
  log "remove old $name"
  rm -rf -- "$dir"
done

log "done: $STATUS ${ERROR_TEXT}"
[[ "$STATUS" == "ok" ]]
