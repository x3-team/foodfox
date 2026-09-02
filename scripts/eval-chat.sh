#!/usr/bin/env bash
# Evaluate FoodFox chat bot on production (requires demo account with report).
set -euo pipefail

BASE="${FOX_BASE:-https://foodfox.yuri.guru}"
AUTH="${FOX_BASIC:-demo:FoodFox2026!}"
EMAIL="${DEMO_EMAIL:-demo@foodfox.local}"
PASS="${DEMO_PASS:-DemoFox2026!}"
COOKIE_JAR="${TMPDIR:-/tmp}/foodfox-eval-cookies.txt"

QUESTIONS=(
  "Можно ли гречку на ужин?"
  "Можно ли коровье молоко?"
  "Что можно есть на 6 неделе плана?"
  "Чем заменить творог на завтрак?"
  "Объясни простыми словами, зачем нужна ротация жёлтой зоны"
)

echo "==> Login $EMAIL"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -u "$AUTH" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | head -c 120
echo -e "\n"

for i in "${!QUESTIONS[@]}"; do
  q="${QUESTIONS[$i]}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Q$((i + 1)): $q"
  echo "---"
  curl -s -b "$COOKIE_JAR" -u "$AUTH" -X POST "$BASE/api/chat" \
    -H 'Content-Type: application/json' \
    -d "$(python3 -c "import json,sys; print(json.dumps({'message': sys.argv[1]}))" "$q")" \
    | python3 -c "
import json,sys
d=json.load(sys.stdin)
msgs=d.get('messages',[])
if not msgs:
  print('ERROR:', d)
else:
  print(msgs[-1]['content'][:500])
"
  echo
  sleep 1
done

echo "==> Done. Review: answers should differ and mention client-specific products."
