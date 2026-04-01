#!/bin/bash
# Debug: activate ONE workflow and capture container logs simultaneously

echo "=== Debug activation ==="

# Login
COOKIE=/tmp/n8n-dbg.txt
curl -s -c "$COOKIE" --noproxy '*' -X POST http://127.0.0.1:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}' > /dev/null

# Clear logs
docker logs --since 1s aluforce-n8n > /dev/null 2>&1

# Check n8n version
echo "n8n version:"
docker exec aluforce-n8n n8n --version 2>&1
echo ""

# Try activate ONE workflow
echo "--- PATCH response body ---"
RESP=$(curl -s -b "$COOKIE" --noproxy '*' -X PATCH "http://127.0.0.1:5678/rest/workflows/9HXw3XKjlo5aLRSS" \
  -H "Content-Type: application/json" \
  -d '{"active":true}')

echo "$RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
data = d.get('data', d)
print(f'active: {data.get(\"active\")}')
print(f'triggerCount: {data.get(\"triggerCount\")}')
print(f'versionId: {data.get(\"versionId\")}')
# Check if there's an error field
if 'message' in d:
    print(f'message: {d[\"message\"]}')
if 'error' in d:
    print(f'error: {d[\"error\"]}')
" 2>/dev/null

# Wait a moment for logs
sleep 2

echo ""
echo "--- Container logs after activation attempt ---"
docker logs --since 10s aluforce-n8n 2>&1 | tail -30

echo ""
echo "--- Try n8n CLI to list workflows ---"
docker exec aluforce-n8n n8n list:workflow 2>&1

rm -f "$COOKIE"
echo ""
echo "Done!"
