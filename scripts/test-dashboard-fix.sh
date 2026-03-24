#!/bin/bash
echo "=== Testing Dashboard Fix ==="

# Step 1: Login
RESP=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}')

TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
echo "Token: ${TOKEN:0:20}..."

# Step 2: Direct /dashboard with cookie
echo ""
echo "=== Direct /dashboard (port 3003) ==="
HTTP_CODE=$(curl -s -o /tmp/dash-body.html -w "%{http_code}" \
  http://localhost:3003/dashboard \
  -H "Cookie: token=$TOKEN")
SIZE=$(wc -c < /tmp/dash-body.html)
echo "HTTP: $HTTP_CODE | Size: $SIZE bytes"
grep -oP '<title>[^<]+</title>' /tmp/dash-body.html 2>/dev/null || echo "(no title tag found)"
head -c 200 /tmp/dash-body.html
echo ""

# Step 3: Via Nginx proxy
echo ""
echo "=== Via Nginx /zyntra-demo/dashboard ==="
HTTP_CODE2=$(curl -sk -o /tmp/dash-proxy.html -w "%{http_code}" \
  https://aluforce.api.br/zyntra-demo/dashboard \
  -H "Cookie: token=$TOKEN")
SIZE2=$(wc -c < /tmp/dash-proxy.html)
echo "HTTP: $HTTP_CODE2 | Size: $SIZE2 bytes"
grep -oP '<title>[^<]+</title>' /tmp/dash-proxy.html 2>/dev/null || echo "(no title tag found)"

# Step 4: Check for errors
echo ""
echo "=== PM2 Error Logs (last 5) ==="
pm2 logs zyntra-demo --err --lines 5 --nostream 2>&1

# Step 5: Check production not affected
echo ""
echo "=== Production /dashboard (port 3000) ==="
RESP_PROD=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aluforce.ind.br","senha":"123456"}')
TOKEN_PROD=$(echo "$RESP_PROD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
if [ -n "$TOKEN_PROD" ]; then
  HTTP_PROD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard -H "Cookie: token=$TOKEN_PROD")
  echo "Production dashboard: HTTP $HTTP_PROD"
else
  echo "Production login failed (expected if different password)"
fi

echo ""
echo "=== DONE ==="
