#!/bin/bash
echo "========================================="
echo "  DEEP DIVE: server.js code analysis"
echo "========================================="

echo ""
echo "=== 1. Dashboard route (lines 1050-1080) ==="
sed -n '1050,1080p' /var/www/aluforce/server.js

echo ""
echo "=== 2. HTML interceptor (lines 955-1040) ==="
sed -n '955,1040p' /var/www/aluforce/server.js

echo ""
echo "=== 3. transformHtml usage in middleware ==="
cat /var/www/aluforce/middleware/zyntra-branding.js 2>/dev/null | head -120

echo ""
echo "=== 4. Check PM2 error logs for 500/dashboard errors ==="
pm2 logs zyntra-demo --err --lines 200 --nostream 2>&1 | grep -iE '500|dashboard|ERRO.*SERVER|internal.*error|transform|Cannot read|undefined|TypeError' | tail -30

echo ""
echo "=== 5. Check recent PM2 out logs for dashboard ==="
pm2 logs zyntra-demo --out --lines 200 --nostream 2>&1 | grep -iE 'dashboard|GET /dashboard|500|error' | tail -20

echo ""
echo "=== 6. authenticatePage middleware ==="
grep -n 'authenticatePage\|function.*authenticatePage\|const authenticatePage' /var/www/aluforce/server.js | head -10

echo ""
echo "=== 7. Show authenticatePage code ==="
# Find line number, then show context
LINE=$(grep -n 'authenticatePage' /var/www/aluforce/server.js | head -1 | cut -d: -f1)
if [ -n "$LINE" ]; then
  START=$((LINE - 2))
  END=$((LINE + 50))
  echo "Around line $LINE:"
  sed -n "${START},${END}p" /var/www/aluforce/server.js
fi

echo ""
echo "=== 8. Check if index.html exists ==="
ls -la /var/www/aluforce/public/index.html 2>&1
head -5 /var/www/aluforce/public/index.html 2>&1

echo ""
echo "=== 9. Full error log (last errors, unfiltered) ==="
pm2 logs zyntra-demo --err --lines 30 --nostream 2>&1

echo ""
echo "========================================="
echo "  DONE"
echo "========================================="
