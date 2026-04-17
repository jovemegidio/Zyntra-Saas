#!/bin/bash
# E2E login cookie test
cat > /tmp/lp.json << 'EOFPAYLOAD'
{"email":"ti@laboreletric.com.br","password":"Labor@2026"}
EOFPAYLOAD

echo "=== PAYLOAD ==="
cat /tmp/lp.json

echo ""
echo "=== LOGIN via nginx ==="
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
echo "=== COOKIES ==="
cat /tmp/cookies.txt

echo ""
echo "=== /api/me TEST ==="
curl -s -b /tmp/cookies.txt -D /tmp/me_headers.txt -o /tmp/me_body.json \
  https://aluforce.api.br/labor-eletric/api/me

echo ""
echo "=== /api/me HEADERS ==="
cat /tmp/me_headers.txt

echo ""
echo "=== /api/me BODY ==="
cat /tmp/me_body.json | python3 -m json.tool 2>/dev/null || cat /tmp/me_body.json

echo ""
echo "=== DASHBOARD TEST ==="
curl -s -b /tmp/cookies.txt -D /tmp/dash_headers.txt -o /tmp/dash_body.txt \
  https://aluforce.api.br/labor-eletric/dashboard

echo ""
echo "=== DASHBOARD HEADERS ==="
cat /tmp/dash_headers.txt

echo ""
echo "=== DASHBOARD BODY (first 3 lines) ==="
head -3 /tmp/dash_body.txt
