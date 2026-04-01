#!/bin/bash
# Verify all n8n workflows status

N8N_URL="http://localhost:5678"
COOKIE="/tmp/n8n-verify.txt"

# Login
curl -s -c "$COOKIE" -X POST "$N8N_URL/rest/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}' > /dev/null

# List workflows
echo "=== n8n Workflows Status ==="
curl -s -b "$COOKIE" "$N8N_URL/rest/workflows" | python3 -c "
import json, sys
data = json.load(sys.stdin)
workflows = data.get('data', [])
for i, w in enumerate(workflows, 1):
    status = 'ON ' if w.get('active') else 'OFF'
    icon = '✅' if w.get('active') else '❌'
    print(f'  {i:2d}. [{icon} {status}] {w.get(\"name\",\"?\")} (ID: {w.get(\"id\",\"?\")})')
print(f'')
print(f'  Total: {len(workflows)} workflows')
active = sum(1 for w in workflows if w.get('active'))
print(f'  Ativos: {active}/{len(workflows)}')
"

rm -f "$COOKIE"
echo ""
echo "DONE"
