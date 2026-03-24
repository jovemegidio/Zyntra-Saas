#!/bin/bash
set +H

# Test 1: Login on DEMO (port 3003)
cat > /tmp/login-demo.json << 'EOF'
{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}
EOF

echo "=== Demo Login (3003) ==="
curl -sv -X POST http://localhost:3003/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @/tmp/login-demo.json 2>&1 | grep -E "^[<>]|^{|^\*"

echo ""
echo "=== Production Login (3000) ==="
cat > /tmp/login-prod.json << 'EOF'
{"email":"admin@aluforce.ind.br","senha":"123456"}
EOF
curl -sv -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @/tmp/login-prod.json 2>&1 | grep -E "^[<>]|^{|^\*"

echo ""
echo "=== Check if server.js has syntax error ==="
node -c /var/www/aluforce/server.js 2>&1

echo ""
echo "=== Check route mounting ==="
grep -n 'api/auth\|authRoutes\|routes/auth' /var/www/aluforce/server.js | head -10

echo ""
echo "=== Check middleware order (json before routes?) ==="
grep -n 'express.json\|app.use.*api\|app.use.*auth\|app.use.*routes' /var/www/aluforce/server.js | head -20

echo ""
echo "=== PM2 error logs since restart ==="
pm2 logs zyntra-demo --err --lines 10 --nostream 2>&1 | grep -v TAILING

echo ""
echo "=== PM2 out logs (startup) ==="
pm2 logs zyntra-demo --out --lines 10 --nostream 2>&1 | grep -v TAILING
