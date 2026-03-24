#!/bin/bash
echo "========================================="
echo "  ZYNTRA 500 - NGINX PATH DIAGNOSTIC"
echo "========================================="

echo ""
echo "=== 1. Test through Nginx (https://aluforce.api.br/zyntra-demo/dashboard) ==="
TOKEN=$(curl -s -X POST http://localhost:3003/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("token","NO_TOKEN"))')

echo "Token: ${TOKEN:0:30}..."
echo ""
echo "--- Via Nginx /zyntra-demo/dashboard ---"
curl -sk -D- "https://aluforce.api.br/zyntra-demo/dashboard" -b "authToken=$TOKEN" 2>&1 | head -30
echo ""

echo "--- Via Nginx /zyntra-demo/ (root) ---"
curl -sk -D- "https://aluforce.api.br/zyntra-demo/" -b "authToken=$TOKEN" 2>&1 | head -30
echo ""

echo "--- Via Nginx /zyntra-demo/api/login ---"
curl -sk -D- -X POST "https://aluforce.api.br/zyntra-demo/api/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' 2>&1 | head -20
echo ""

echo "=== 2. Nginx config for zyntra-demo ==="
grep -A30 'zyntra-demo\|zyntra_demo\|3003' /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* /etc/nginx/nginx.conf 2>/dev/null | head -60
echo ""

echo "=== 3. Dashboard route in server.js ==="
grep -n 'dashboard\|\/dashboard\|app\.get.*dashboard' /var/www/aluforce/server.js | head -20
echo ""

echo "=== 4. Lines around dashboard route (search for transformHtml or sendFile) ==="
grep -n 'transformHtml\|sendFile\|res\.send\|renderPage\|serveHtml\|readFile.*html' /var/www/aluforce/server.js | head -30
echo ""

echo "=== 5. Lines around BASE_PATH or base path config ==="
grep -n 'BASE_PATH\|basePath\|base.*path\|prefix\|BRAND\|zyntra' /var/www/aluforce/server.js | head -30
echo ""

echo "=== 6. Check if there's a separate Zyntra server ==="
ls -la /var/www/aluforce/Zyntra-SGE/ 2>/dev/null | head -20
ls -la /var/www/aluforce/Zyntra/ 2>/dev/null | head -20
echo ""

echo "=== 7. Check ecosystem.demo.config.js full ==="
cat /var/www/aluforce/ecosystem.demo.config.js 2>/dev/null
echo ""

echo "========================================="
echo "  DONE"
echo "========================================="
