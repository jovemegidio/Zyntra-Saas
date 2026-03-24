#!/bin/bash
echo "========================================="
echo "  ROOT CAUSE: html is not defined"
echo "========================================="

echo ""
echo "=== 1. Full error log with stack traces ==="
pm2 logs zyntra-demo --err --lines 500 --nostream 2>&1 | grep -B2 -A20 'html is not defined' | tail -60

echo ""
echo "=== 2. Full zyntra-branding.js middleware ==="
cat /var/www/aluforce/middleware/zyntra-branding.js

echo ""
echo "=== 3. Global error handler in server.js ==="
grep -n 'ERRO NO SERVIDOR\|app\.use.*err.*req.*res\|500\|error.*handler' /var/www/aluforce/server.js | head -20

echo ""
echo "=== 4. Show error handler code ==="
LINE=$(grep -n 'ERRO NO SERVIDOR' /var/www/aluforce/server.js | head -1 | cut -d: -f1)
if [ -n "$LINE" ]; then
  START=$((LINE - 5))
  END=$((LINE + 15))
  sed -n "${START},${END}p" /var/www/aluforce/server.js
fi

echo ""
echo "=== 5. Reproduce the 500 error now ==="
# Clear logs first
pm2 flush zyntra-demo 2>/dev/null
sleep 1

# Login and try dashboard
TOKEN=$(curl -s -X POST http://localhost:3003/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("token","NO_TOKEN"))')

echo "Requesting /dashboard..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/dashboard -b "authToken=$TOKEN")
echo "HTTP Status: $HTTP_CODE"

echo ""
echo "=== 6. Check if error appeared again ==="
sleep 2
pm2 logs zyntra-demo --err --lines 10 --nostream 2>&1

echo ""
echo "=== 7. Try without token (should redirect) ==="
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/dashboard)
echo "Without token: HTTP $HTTP_CODE"

echo ""
echo "=== 8. Try with invalid/expired token ==="
HTTP_CODE=$(curl -s -D- http://localhost:3003/dashboard -b "authToken=invalid_token_here" 2>&1 | head -1)
echo "Invalid token: $HTTP_CODE"

echo ""
echo "========================================="
echo "  DONE"
echo "========================================="
