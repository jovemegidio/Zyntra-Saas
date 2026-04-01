#!/bin/bash
# Activate all n8n workflows via API

N8N_URL="http://localhost:5678"
COOKIE="/tmp/n8n-act-cookies.txt"

echo "=== Activating ALL n8n Workflows ==="
echo ""

# Login
curl -s -c "$COOKIE" -X POST "$N8N_URL/rest/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}' > /dev/null

echo "Logged in."
echo ""

# Get all workflows
WORKFLOWS=$(curl -s -b "$COOKIE" "$N8N_URL/rest/workflows")
IDS=$(echo "$WORKFLOWS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for w in data.get('data', []):
    print(w['id'])
" 2>/dev/null)

for WID in $IDS; do
  RESP=$(curl -s -b "$COOKIE" -X PATCH "$N8N_URL/rest/workflows/$WID" \
    -H "Content-Type: application/json" \
    -d '{"active":true}' \
    -w "\n%{http_code}")
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  NAME=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('name','?'))" 2>/dev/null)
  ACTIVE=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('active','?'))" 2>/dev/null)
  if [ "$CODE" = "200" ]; then
    echo "  OK  $NAME (ID: $WID) -> active=$ACTIVE"
  else
    echo "  FAIL $WID -> HTTP $CODE"
  fi
done

echo ""
echo "=== Summary ==="
LIST=$(curl -s -b "$COOKIE" "$N8N_URL/rest/workflows")
echo "$LIST" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for i, w in enumerate(data.get('data', []), 1):
    s = 'ON ' if w.get('active') else 'OFF'
    print(f'  {i}. [{s}] {w.get(\"name\")} (ID: {w.get(\"id\")})')
" 2>/dev/null

rm -f "$COOKIE"
echo ""
echo "=== Done! ==="
