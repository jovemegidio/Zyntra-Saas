#!/bin/bash
# Import workflow 08 + publish all + restart

N8N_URL="http://localhost:5678"
COOKIE="/tmp/n8n-import08.txt"
WF_FILE="/var/www/aluforce/n8n/workflows/08-notificacao-relatorios-email.json"

echo "=== Importing Workflow 08 ==="

# Login
curl -s -c "$COOKIE" --noproxy '*' -X POST "$N8N_URL/rest/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@aluforce.api.br","password":"Aluforce2026n8n"}' > /dev/null

echo "Logged in."

# Build import payload
PAYLOAD=$(python3 -c "
import json
with open('$WF_FILE') as f:
    wf = json.load(f)
out = {
    'name': wf.get('name', ''),
    'nodes': wf.get('nodes', []),
    'connections': wf.get('connections', {}),
    'settings': wf.get('settings', {'executionOrder': 'v1'}),
    'active': False
}
print(json.dumps(out))
")

# Import
RESP=$(curl -s -b "$COOKIE" --noproxy '*' -X POST "$N8N_URL/rest/workflows" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\n%{http_code}")

CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
WF_ID=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('id','?'))" 2>/dev/null)
WF_NAME=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('name','?'))" 2>/dev/null)

if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
  echo "Imported: $WF_NAME (ID: $WF_ID)"
else
  echo "FAILED HTTP $CODE"
  echo "$BODY" | head -5
  rm -f "$COOKIE"
  exit 1
fi

rm -f "$COOKIE"

# Publish via CLI
echo ""
echo "Publishing workflow $WF_ID..."
docker exec aluforce-n8n n8n publish:workflow --id="$WF_ID" 2>&1

# Restart to apply
echo ""
echo "Restarting n8n..."
docker restart aluforce-n8n
sleep 15

echo ""
echo "=== Final Status ==="
docker ps --filter name=aluforce-n8n --format "{{.Status}}"

# Check via API
COOKIE2="/tmp/n8n-check08.txt"
curl -s -c "$COOKIE2" --noproxy '*' -X POST "$N8N_URL/rest/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@aluforce.api.br","password":"Aluforce2026n8n"}' > /dev/null

curl -s -b "$COOKIE2" --noproxy '*' "$N8N_URL/rest/workflows" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for i, w in enumerate(data.get('data', []), 1):
    s = 'ON ' if w.get('active') else 'OFF'
    print(f'  {i}. [{s}] {w.get(\"name\")} (ID: {w.get(\"id\")})')
" 2>/dev/null

rm -f "$COOKIE2"
echo ""
echo "Done!"
