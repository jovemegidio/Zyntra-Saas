#!/bin/bash
# E2E login cookie test
cat > /tmp/lp.json << 'EOFPAYLOAD'
{"email":"ti@laboreletric.com.br","password":"Test@2026"}
EOFPAYLOAD

echo "=== PAYLOAD ==="
cat /tmp/lp.json

echo ""
echo "=== 1. LOGIN via nginx ==="
curl -s -c /tmp/cookies.txt -D /tmp/login_headers.txt -o /tmp/login_body.json \
  -X POST https://aluforce.api.br/labor-eletric/api/login \
  -H 'Content-Type: application/json' \
  -d @/tmp/lp.json

echo ""
echo "=== RESPONSE HEADERS ==="
cat /tmp/login_headers.txt

echo ""
echo "=== RESPONSE BODY ==="
cat /tmp/login_body.json | python3 -m json.tool 2>/dev/null || cat /tmp/login_body.json

echo ""
echo "=== COOKIES FILE ==="
cat /tmp/cookies.txt

echo ""
echo "=== 2. /api/me TEST (with cookies) ==="
curl -s -b /tmp/cookies.txt -D /tmp/me_headers.txt -o /tmp/me_body.json \
  https://aluforce.api.br/labor-eletric/api/me

echo "=== /api/me RESPONSE CODE ==="
head -1 /tmp/me_headers.txt

echo "=== /api/me BODY ==="
cat /tmp/me_body.json | python3 -m json.tool 2>/dev/null || cat /tmp/me_body.json

echo ""
echo "=== 3. DASHBOARD TEST (with cookies) ==="
curl -s -b /tmp/cookies.txt -D /tmp/dash_headers.txt -o /dev/null -w "HTTP_CODE: %{http_code}\nREDIRECT_URL: %{redirect_url}\n" \
  https://aluforce.api.br/labor-eletric/dashboard

echo "=== DASHBOARD RESPONSE HEADERS (relevant) ==="
grep -i 'location\|set-cookie.*auth' /tmp/dash_headers.txt 2>/dev/null || echo "(no redirect/auth-cookie)"
