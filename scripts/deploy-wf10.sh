#!/bin/bash
# Deploy Workflow 10 - WhatsApp Alertas Automáticos V2
# Upload, import, and activate

N8N_URL="http://localhost:5678"
LOGIN_EMAIL="admin@aluforce.api.br"
LOGIN_PASS="Aluforce2026n8n"
WORKFLOW_FILE="/var/www/aluforce/n8n/workflows/10-whatsapp-alertas-automaticos-v2.json"
COOKIE_FILE="/tmp/n8n-cookies-wf10.txt"

echo "=========================================="
echo "  Deploy Workflow 10 - WhatsApp Alertas"
echo "=========================================="
echo ""

# 1. Login to n8n
echo "1. Logging in to n8n..."
LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" -X POST "$N8N_URL/rest/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrLdapLoginId\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASS\"}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESP" | tail -1)
if [ "$HTTP_CODE" != "200" ]; then
  echo "   FAILED! HTTP $HTTP_CODE"
  echo "   $(echo "$LOGIN_RESP" | sed '$d')"
  exit 1
fi
echo "   OK - Logged in"

# 2. Check if workflow already exists (by name)
echo ""
echo "2. Checking for existing workflow..."
LIST_RESP=$(curl -s -b "$COOKIE_FILE" "$N8N_URL/rest/workflows")
EXISTING_ID=$(echo "$LIST_RESP" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for w in data.get('data', []):
        if '10-whatsapp' in w.get('name','').lower() or 'wf10' in w.get('id','').lower():
            print(w['id'])
            break
except:
    pass
" 2>/dev/null)

if [ -n "$EXISTING_ID" ]; then
  echo "   Found existing workflow ID: $EXISTING_ID"
  echo "   Updating..."
  
  # Read workflow JSON and update
  PAYLOAD=$(python3 -c "
import json
with open('$WORKFLOW_FILE') as f:
    wf = json.load(f)
out = {
    'name': wf.get('name', ''),
    'nodes': wf.get('nodes', []),
    'connections': wf.get('connections', {}),
    'settings': wf.get('settings', {}),
    'active': True
}
print(json.dumps(out))
")
  
  UPDATE_RESP=$(curl -s -b "$COOKIE_FILE" -X PATCH "$N8N_URL/rest/workflows/$EXISTING_ID" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    -w "\n%{http_code}")
  
  RESP_CODE=$(echo "$UPDATE_RESP" | tail -1)
  if [ "$RESP_CODE" = "200" ]; then
    echo "   OK - Updated and activated"
    WF_ID="$EXISTING_ID"
  else
    echo "   WARN - Update returned HTTP $RESP_CODE"
  fi
else
  echo "   No existing workflow found, importing new..."
  
  # 3. Import new workflow
  PAYLOAD=$(python3 -c "
import json
with open('$WORKFLOW_FILE') as f:
    wf = json.load(f)
out = {
    'name': wf.get('name', ''),
    'nodes': wf.get('nodes', []),
    'connections': wf.get('connections', {}),
    'settings': wf.get('settings', {}),
    'active': False
}
print(json.dumps(out))
")
  
  IMPORT_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$N8N_URL/rest/workflows" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    -w "\n%{http_code}")
  
  RESP_CODE=$(echo "$IMPORT_RESP" | tail -1)
  RESP_BODY=$(echo "$IMPORT_RESP" | sed '$d')
  
  if [ "$RESP_CODE" = "200" ] || [ "$RESP_CODE" = "201" ]; then
    WF_ID=$(echo "$RESP_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
    echo "   OK - Imported with ID: $WF_ID"
  else
    echo "   FAILED! HTTP $RESP_CODE"
    echo "   $RESP_BODY"
    exit 1
  fi
  
  # 4. Activate the workflow
  echo ""
  echo "3. Activating workflow..."
  ACT_RESP=$(curl -s -b "$COOKIE_FILE" -X PATCH "$N8N_URL/rest/workflows/$WF_ID" \
    -H "Content-Type: application/json" \
    -d '{"active":true}' \
    -w "\n%{http_code}")
  
  ACT_CODE=$(echo "$ACT_RESP" | tail -1)
  if [ "$ACT_CODE" = "200" ]; then
    echo "   OK - Activated!"
  else
    echo "   WARN - Activation returned HTTP $ACT_CODE"
    # Try via docker exec
    echo "   Trying via docker CLI..."
    docker exec aluforce-n8n n8n publish:workflow --id="$WF_ID" 2>/dev/null && echo "   OK via CLI" || echo "   CLI also failed"
  fi
fi

# 5. List all workflows
echo ""
echo "4. All workflows:"
curl -s -b "$COOKIE_FILE" "$N8N_URL/rest/workflows" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    workflows = data.get('data', [])
    for i, w in enumerate(workflows, 1):
        status = '✅ ON ' if w.get('active') else '❌ OFF'
        print(f'   {i:2d}. [{status}] {w.get(\"name\",\"?\")} (ID: {w.get(\"id\",\"?\")})')
    print(f'')
    print(f'   Total: {len(workflows)} workflows')
except Exception as e:
    print(f'   Error: {e}')
" 2>/dev/null

# Cleanup
rm -f "$COOKIE_FILE"
echo ""
echo "=========================================="
echo "  Deploy Workflow 10 - CONCLUÍDO!"
echo "=========================================="
