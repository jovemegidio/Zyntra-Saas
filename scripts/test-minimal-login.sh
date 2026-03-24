#!/bin/bash
# Minimal login test
set +H

# Write JSON manually
cat > /tmp/login-test.json << 'JSONEOF'
{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}
JSONEOF

echo "JSON content:"
cat /tmp/login-test.json
echo ""

echo "=== Login Test ==="
curl -s -X POST http://localhost:3003/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @/tmp/login-test.json

echo ""
echo ""
echo "=== Check body-parser in server.js ==="
grep -n 'express.json\|bodyParser\|body-parser\|urlencoded' /var/www/aluforce/server.js | head -10

echo ""
echo "=== Check if sed broke anything around line 1020-1040 ==="
sed -n '1020,1040p' /var/www/aluforce/server.js
