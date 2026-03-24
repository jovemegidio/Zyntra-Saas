#!/bin/bash
set -e

echo "=== 1. Direct /dashboard (no auth) ==="
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3003/dashboard

echo ""
echo "=== 2. Login and get cookie ==="
LOGIN=$(curl -s -X POST http://localhost:3003/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  -c /tmp/demo-ck.txt)

TOKEN=$(echo "$LOGIN" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('token','NONE'))")
SUCCESS=$(echo "$LOGIN" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('success','NONE'))")
echo "Login success: $SUCCESS"
echo "Token: ${TOKEN:0:30}..."

echo ""
echo "=== 3. /dashboard WITH cookie ==="
curl -s -b /tmp/demo-ck.txt http://localhost:3003/dashboard -D- -o /tmp/dash-body.txt 2>&1 | head -5
echo "Body size: $(wc -c < /tmp/dash-body.txt) bytes"
echo "Body preview: $(head -c 200 /tmp/dash-body.txt)"

echo ""
echo "=== 4. /dashboard WITH Authorization header ==="
RESP=$(curl -s http://localhost:3003/dashboard -H "Authorization: Bearer $TOKEN" -D- -o /tmp/dash-body2.txt 2>&1 | head -5)
echo "$RESP"
echo "Body size: $(wc -c < /tmp/dash-body2.txt) bytes"
echo "Body preview: $(head -c 200 /tmp/dash-body2.txt)"

echo ""
echo "=== 5. /index.html WITH cookie ==="
curl -s -b /tmp/demo-ck.txt http://localhost:3003/index.html -o /dev/null -w 'HTTP %{http_code}\n'

echo ""
echo "=== 6. Via proxy with cookie ==="
curl -sk -X POST https://aluforce.api.br/zyntra-demo/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  -c /tmp/demo-proxy-ck.txt -o /dev/null
curl -sk -b /tmp/demo-proxy-ck.txt https://aluforce.api.br/zyntra-demo/dashboard -D- -o /tmp/dash-proxy.txt 2>&1 | head -8
echo "Body size: $(wc -c < /tmp/dash-proxy.txt) bytes"
echo "Body snippet: $(head -c 300 /tmp/dash-proxy.txt)"

echo ""
echo "=== 7. PM2 error logs ==="
pm2 logs zyntra-demo --nostream --lines 20 --err 2>/dev/null | tail -20

echo ""
echo "=== 8. PM2 out logs ==="
pm2 logs zyntra-demo --nostream --lines 10 --out 2>/dev/null | tail -10

echo ""
echo "DONE"
