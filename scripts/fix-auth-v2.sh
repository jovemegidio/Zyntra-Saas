#!/bin/bash
set -e
cd /var/www/aluforce

echo "=== Patching auth.js ==="

# Use perl instead of sed (more reliable with complex replacements)
perl -i -pe "s|const redirectTo = baseUrl \+ '/dashboard';|const basePath = req.get('X-Base-Path') \|\| ''; const redirectTo = baseUrl + basePath + '/dashboard';|g" src/routes/auth.js

echo "Verify:"
grep -n 'X-Base-Path\|basePath' src/routes/auth.js | head -5

echo ""
echo "Syntax check:"
node -c src/routes/auth.js && echo "SYNTAX OK" || echo "SYNTAX ERROR"

echo ""
echo "=== Restart zyntra-demo ==="
pm2 restart zyntra-demo --update-env
sleep 8

STATUS=$(pm2 status zyntra-demo 2>/dev/null | grep zyntra | grep -o 'online\|errored\|stopped')
echo "Status: $STATUS"

if [ "$STATUS" = "online" ]; then
    echo ""
    echo "=== Test Login ==="
    sleep 2
    
    # Via proxy
    RESULT=$(curl -sk -X POST 'https://aluforce.api.br/zyntra-demo/api/login' \
      -H 'Content-Type: application/json' \
      -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}')
    
    REDIRECT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectTo','NONE'))" 2>/dev/null || echo 'PARSE_ERROR')
    echo "redirectTo via proxy: $REDIRECT"
    
    SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success','NONE'))" 2>/dev/null || echo 'PARSE_ERROR')
    echo "success: $SUCCESS"
fi

echo ""
echo "DONE!"
