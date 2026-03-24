#!/bin/bash
echo "========================================="
echo "  ZYNTRA DEMO 500 ERROR DIAGNOSTIC"
echo "========================================="

echo ""
echo "=== STEP 1: Login to get token ==="
TOKEN=$(curl -s -X POST http://localhost:3003/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("token","NO_TOKEN"))')
echo "Token: ${TOKEN:0:30}..."

echo ""
echo "=== STEP 2: Request /dashboard with token ==="
curl -s -D- http://localhost:3003/dashboard -b "authToken=$TOKEN" 2>&1 | head -50

echo ""
echo "=== STEP 3: PM2 error logs (last 50 lines) ==="
pm2 logs zyntra-demo --err --lines 50 --nostream 2>&1 | tail -50

echo ""
echo "=== STEP 4: PM2 out logs (last 30 lines) ==="
pm2 logs zyntra-demo --out --lines 30 --nostream 2>&1 | tail -30

echo ""
echo "=== STEP 5: grep dashboard/index routes in server.js ==="
grep -n 'dashboard\|index\.html\|transformHtml\|renderPage\|sendFile.*html' /var/www/aluforce/Zyntra-SGE/server.js 2>/dev/null | head -40
if [ $? -ne 0 ]; then
  echo "(Not found in Zyntra-SGE/server.js, checking main server.js)"
  grep -n 'dashboard\|index\.html\|transformHtml\|renderPage\|sendFile.*html' /var/www/aluforce/server.js 2>/dev/null | head -40
fi

echo ""
echo "=== STEP 6: Find which server.js zyntra-demo uses ==="
pm2 describe zyntra-demo 2>&1 | grep -E 'script|cwd|exec_path|node_args|pm_exec_path|status|restart'

echo ""
echo "=== STEP 7: Check zyntra-demo process details ==="
pm2 jlist 2>&1 | python3 -c "
import json,sys
try:
    procs = json.load(sys.stdin)
    for p in procs:
        if 'zyntra' in p.get('name','').lower():
            print(f\"Name: {p['name']}\")
            print(f\"Script: {p.get('pm2_env',{}).get('pm_exec_path','?')}\")
            print(f\"CWD: {p.get('pm2_env',{}).get('pm_cwd','?')}\")
            print(f\"Status: {p.get('pm2_env',{}).get('status','?')}\")
            print(f\"Restarts: {p.get('pm2_env',{}).get('restart_time','?')}\")
except Exception as e:
    print(f'Error: {e}')
" 2>&1

echo ""
echo "=== STEP 8: Check if ecosystem config has zyntra ==="
grep -A5 'zyntra' /var/www/aluforce/ecosystem.config.js 2>/dev/null || echo "Not found in ecosystem.config.js"
grep -A5 'zyntra' /var/www/aluforce/ecosystem.production.config.js 2>/dev/null || echo "Not found in ecosystem.production.config.js"
grep -A5 'zyntra' /var/www/aluforce/ecosystem.demo.config.js 2>/dev/null || echo "Not found in ecosystem.demo.config.js"

echo ""
echo "========================================="
echo "  DIAGNOSTIC COMPLETE"
echo "========================================="
