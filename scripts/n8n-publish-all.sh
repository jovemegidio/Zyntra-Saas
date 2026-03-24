#!/bin/bash
# Publish (activate) all n8n workflows via CLI and restart

echo "=== Publishing ALL n8n workflows ==="
echo ""

WORKFLOW_IDS="9HXw3XKjlo5aLRSS yRcIV48Xq8HIFnQz cIOCNM31kbuXiwEg 5ZU1TZj97rut7aNB EtFc2aPQHI2RRmQf utxGgBLBcXS67WSe hDpscPpRqCG7RrAa"

for WID in $WORKFLOW_IDS; do
  echo "Publishing $WID..."
  docker exec aluforce-n8n n8n publish:workflow --id="$WID" 2>&1
  echo ""
done

echo "=== Restarting n8n container ==="
docker restart aluforce-n8n
echo "Waiting 15s for startup..."
sleep 15

echo ""
echo "=== Container status ==="
docker ps --filter name=aluforce-n8n --format "{{.Status}}"

echo ""
echo "=== Checking workflows ==="
docker exec aluforce-n8n n8n list:workflow 2>&1

# Also check via API
echo ""
echo "=== Via API ==="
COOKIE=/tmp/n8n-check.txt
curl -s -c "$COOKIE" --noproxy '*' -X POST http://127.0.0.1:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@aluforce.api.br","password":"Aluforce2026n8n"}' > /dev/null

curl -s -b "$COOKIE" --noproxy '*' http://127.0.0.1:5678/rest/workflows | python3 -c "
import json, sys
data = json.load(sys.stdin)
for i, w in enumerate(data.get('data', []), 1):
    s = 'ON ' if w.get('active') else 'OFF'
    print(f'  {i}. [{s}] {w.get(\"name\")} (ID: {w.get(\"id\")})')
" 2>/dev/null

rm -f "$COOKIE"
echo ""
echo "=== Done! ==="
