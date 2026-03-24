#!/bin/bash
# Activate n8n workflows using internal container access (no nginx/trust proxy)

echo "=== Activating n8n workflows ==="
echo ""

# Login from host directly to localhost:5678 (no X-Forwarded-For)
COOKIE=/tmp/n8n-direct.txt
LOGIN=$(curl -s -c "$COOKIE" --noproxy '*' -X POST http://127.0.0.1:5678/rest/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"emailOrLdapLoginId":"admin@aluforce.api.br","password":"Aluforce2026n8n"}' \
  -w "\n%{http_code}")

CODE=$(echo "$LOGIN" | tail -1)
echo "Login: HTTP $CODE"

if [ "$CODE" != "200" ]; then
  echo "Login failed!"
  echo "$LOGIN"
  exit 1
fi

# Get list of workflows
echo ""
echo "Getting workflows..."
WF_LIST=$(curl -s -b "$COOKIE" --noproxy '*' http://127.0.0.1:5678/rest/workflows)

# For each workflow, get full data, set active=true, PUT back
IDS=$(echo "$WF_LIST" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for w in data.get('data', []):
    print(w['id'])
" 2>/dev/null)

for WID in $IDS; do
  # Get full workflow
  FULL=$(curl -s -b "$COOKIE" --noproxy '*' "http://127.0.0.1:5678/rest/workflows/$WID")
  
  # Modify active to true and PUT back
  UPDATED=$(echo "$FULL" | python3 -c "
import json, sys
resp = json.load(sys.stdin)
wf = resp.get('data', resp)
wf['active'] = True
print(json.dumps(wf))
" 2>/dev/null)
  
  NAME=$(echo "$FULL" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('name','?'))" 2>/dev/null)
  
  # Try PATCH with full workflow body
  RESP=$(curl -s -b "$COOKIE" --noproxy '*' -X PATCH "http://127.0.0.1:5678/rest/workflows/$WID" \
    -H "Content-Type: application/json" \
    -d "$UPDATED" \
    -w "\n%{http_code}")
  
  RCODE=$(echo "$RESP" | tail -1)
  RBODY=$(echo "$RESP" | sed '$d')
  ACTIVE=$(echo "$RBODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('active','?'))" 2>/dev/null)
  
  if [ "$ACTIVE" = "True" ]; then
    echo "  ✅ $NAME (ID: $WID) -> ACTIVE"
  else
    # Try to see if there's an error message
    MSG=$(echo "$RBODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('message', 'no error msg'))" 2>/dev/null)
    echo "  ⚠️  $NAME (ID: $WID) -> active=$ACTIVE (HTTP $RCODE) $MSG"
  fi
done

echo ""
echo "=== Final Status ==="
FINAL=$(curl -s -b "$COOKIE" --noproxy '*' http://127.0.0.1:5678/rest/workflows)
echo "$FINAL" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for i, w in enumerate(data.get('data', []), 1):
    s = '🟢 ON ' if w.get('active') else '🔴 OFF'
    print(f'  {i}. {s} {w.get(\"name\")} (ID: {w.get(\"id\")})')
" 2>/dev/null

rm -f "$COOKIE"
echo ""
echo "Done!"
