#!/bin/bash
echo "=== Test redirectTo via proxy ==="
RESULT=$(curl -sk -X POST 'https://aluforce.api.br/zyntra-demo/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}')

REDIRECT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectTo','NONE'))" 2>/dev/null)
echo "redirectTo: $REDIRECT"

SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success','NONE'))" 2>/dev/null)
echo "success: $SUCCESS"

echo ""
echo "=== Full test summary ==="
echo "1. Root: $(curl -sk -o /dev/null -w '%{http_code}' 'https://aluforce.api.br/zyntra-demo/')"
echo "2. Login page: $(curl -sk -o /dev/null -w '%{http_code}' 'https://aluforce.api.br/zyntra-demo/login.html')"
echo "3. Title: $(curl -sk 'https://aluforce.api.br/zyntra-demo/login.html' | grep '<title>' | head -1 | sed 's/.*<title>//' | sed 's/<\/title>.*//')"
echo "4. Banner: $(curl -sk 'https://aluforce.api.br/zyntra-demo/login.html' | grep -c 'zyntra-demo-banner') occurrences"
echo "5. CSS brand: $(curl -sk 'https://aluforce.api.br/zyntra-demo/login.html' | grep -c 'zyntra-brand') occurrences"
echo "6. API login: $(curl -sk -X POST 'https://aluforce.api.br/zyntra-demo/api/login' -H 'Content-Type: application/json' -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' -o /dev/null -w '%{http_code}')"
echo "7. redirectTo: $REDIRECT"
echo "8. Redirect header: $(curl -sk -D- 'https://aluforce.api.br/zyntra-demo/' 2>&1 | grep -i 'location:' | head -1)"
echo "9. PM2 status: $(pm2 status zyntra-demo 2>/dev/null | grep zyntra | grep -o 'online\|errored\|stopped')"
echo "10. Production NOT affected: $(curl -sk 'https://aluforce.api.br/login.html' | grep '<title>' | head -1 | sed 's/.*<title>//' | sed 's/<\/title>.*//')"
