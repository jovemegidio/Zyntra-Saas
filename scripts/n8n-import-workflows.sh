#!/bin/bash
# n8n Workflow Importer - runs on VPS host
# Uses curl to interact with n8n API on localhost:5678

N8N_URL="http://localhost:5678"
LOGIN_EMAIL="admin@your-domain.com"
LOGIN_PASS="CHANGE_ME_N8N_PASSWORD"
WORKFLOWS_DIR="/var/www/aluforce/n8n/workflows"
COOKIE_FILE="/tmp/n8n-cookies.txt"

echo "=== n8n Workflow Importer ==="
echo ""

# 1. Login
echo "1. Logging in..."
LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" -X POST "$N8N_URL/rest/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrLdapLoginId\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASS\"}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESP" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESP" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "   FAILED! HTTP $HTTP_CODE"
  echo "   $LOGIN_BODY"
  exit 1
fi
echo "   OK - Logged in"
echo ""

# 2. List workflow files
FILES=$(ls -1 "$WORKFLOWS_DIR"/*.json 2>/dev/null | sort)
COUNT=$(echo "$FILES" | wc -l)
echo "2. Found $COUNT workflow files"
echo ""

# 3. Import each workflow
SUCCESS=0
FAILED=0

for FILE in $FILES; do
  FILENAME=$(basename "$FILE")
  printf "   %s ... " "$FILENAME"
  
  # Read the workflow JSON and extract needed fields
  # Build a clean import payload with jq
  PAYLOAD=$(cat "$FILE" | python3 -c "
import json, sys
wf = json.load(sys.stdin)
out = {
    'name': wf.get('name', ''),
    'nodes': wf.get('nodes', []),
    'connections': wf.get('connections', {}),
    'settings': wf.get('settings', {'executionOrder': 'v1'}),
    'active': False
}
print(json.dumps(out))
" 2>/dev/null)
  
  if [ -z "$PAYLOAD" ]; then
    echo "ERROR parsing JSON"
    FAILED=$((FAILED + 1))
    continue
  fi
  
  IMPORT_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$N8N_URL/rest/workflows" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    -w "\n%{http_code}")
  
  RESP_CODE=$(echo "$IMPORT_RESP" | tail -1)
  RESP_BODY=$(echo "$IMPORT_RESP" | sed '$d')
  
  if [ "$RESP_CODE" = "200" ] || [ "$RESP_CODE" = "201" ]; then
    WF_ID=$(echo "$RESP_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('id','?'))" 2>/dev/null)
    WF_NAME=$(echo "$RESP_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('name','?'))" 2>/dev/null)
    echo "OK ID:$WF_ID - $WF_NAME"
    SUCCESS=$((SUCCESS + 1))
  else
    ERR_MSG=$(echo "$RESP_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('message','unknown'))" 2>/dev/null || echo "$RESP_BODY")
    echo "WARN HTTP $RESP_CODE: $ERR_MSG"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=== Results ==="
echo "   Imported: $SUCCESS"
echo "   Failed:   $FAILED"
echo "   Total:    $COUNT"

# 4. List all workflows in n8n
echo ""
echo "=== Current Workflows ==="
LIST_RESP=$(curl -s -b "$COOKIE_FILE" "$N8N_URL/rest/workflows")
echo "$LIST_RESP" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    workflows = data.get('data', [])
    for i, w in enumerate(workflows, 1):
        status = 'ON ' if w.get('active') else 'OFF'
        print(f'   {i}. [{status}] {w.get(\"name\",\"?\")} (ID: {w.get(\"id\",\"?\")})')
except:
    print('   Could not parse response')
" 2>/dev/null

# Cleanup
rm -f "$COOKIE_FILE"
echo ""
echo "=== Done! ==="
