#!/bin/bash
set +H
echo "=== Test 1: Login ==="
RESP=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}')
echo "Login response: $RESP"

TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
echo "Token length: ${#TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "FAILED: No token. Trying with escaped password..."
  RESP2=$(curl -s -X POST http://localhost:3003/api/auth/login \
    -H 'Content-Type: application/json' \
    --data-raw '{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}')
  echo "Login response 2: $RESP2"
  TOKEN=$(echo "$RESP2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
fi

if [ -z "$TOKEN" ]; then
  echo "FAILED: Still no token. Checking DB user..."
  mysql -u aluforce -pAluforce2026VpsDB zyntra_demo -e "SELECT id, nome, email, ativo FROM usuarios WHERE email='admin@zyntra.com.br';"
  echo "Checking all users..."
  mysql -u aluforce -pAluforce2026VpsDB zyntra_demo -e "SELECT id, nome, email, ativo FROM usuarios LIMIT 10;"
  exit 1
fi

echo ""
echo "=== Test 2: Dashboard with token ==="
HTTP=$(curl -s -o /tmp/dash-test.html -w "%{http_code}" \
  http://localhost:3003/dashboard \
  -b "token=$TOKEN")
SIZE=$(wc -c < /tmp/dash-test.html)
echo "HTTP: $HTTP | Size: $SIZE"
TITLE=$(grep -oP '<title>[^<]+</title>' /tmp/dash-test.html 2>/dev/null)
echo "Title: $TITLE"
if [ "$HTTP" = "200" ]; then
  echo "SUCCESS! Dashboard works!"
else
  echo "Body preview:"
  head -c 300 /tmp/dash-test.html
fi

echo ""
echo "=== Test 3: Via Nginx proxy ==="
HTTP2=$(curl -sk -o /tmp/dash-proxy2.html -w "%{http_code}" \
  https://aluforce.api.br/zyntra-demo/dashboard \
  -b "token=$TOKEN")
SIZE2=$(wc -c < /tmp/dash-proxy2.html)
echo "HTTP: $HTTP2 | Size: $SIZE2"
TITLE2=$(grep -oP '<title>[^<]+</title>' /tmp/dash-proxy2.html 2>/dev/null)
echo "Title: $TITLE2"

echo ""
echo "=== Test 4: PM2 errors since restart ==="
pm2 logs zyntra-demo --err --lines 3 --nostream 2>&1 | grep -v TAILING

echo ""
echo "DONE"
