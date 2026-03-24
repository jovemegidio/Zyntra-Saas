#!/bin/bash
echo '=== Testing POST /api/auth/login ==='
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@aluforce.com.br","password":"admin123"}')

echo "Response: $RESPONSE"

TOKEN=$(echo "$RESPONSE" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("token","NO_TOKEN"))' 2>/dev/null)

echo ""
echo "Token: ${TOKEN:0:50}..."

if [ "$TOKEN" != "NO_TOKEN" ] && [ -n "$TOKEN" ]; then
    echo ""
    echo "=== Testing GET /dashboard with cookie ==="
    DASH=$(curl -s -w '\nHTTP_CODE:%{http_code}' http://localhost:3000/dashboard \
      -H "Cookie: authToken=$TOKEN")
    echo "Dashboard response (first 300 chars):"
    echo "$DASH" | head -c 300
    echo ""
fi

echo ""
echo "=== Recent error logs ==="
pm2 logs aluforce-dashboard --err --lines 5 --nostream 2>&1
