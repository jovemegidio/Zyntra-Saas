#!/bin/bash
# Full diagnostic of WhatsApp QR code system

echo "=== 1. WhatsApp Bot PM2 ==="
pm2 jlist 2>/dev/null | python3 -c "
import json, sys
procs = json.load(sys.stdin)
for p in procs:
    if 'whatsapp' in p.get('name','').lower():
        print(f'  Name: {p[\"name\"]}')
        print(f'  Status: {p[\"pm2_env\"][\"status\"]}')
        print(f'  PID: {p[\"pid\"]}')
        print(f'  Restarts: {p[\"pm2_env\"][\"restart_time\"]}')
        print(f'  Uptime: {p[\"pm2_env\"].get(\"pm_uptime\",\"?\")}')
" 2>/dev/null

echo ""
echo "=== 2. Port 3002 listening? ==="
ss -tlnp | grep 3002 || echo "  NOT listening on 3002!"

echo ""
echo "=== 3. WhatsApp API Status ==="
STATUS=$(curl -s http://localhost:3002/api/whatsapp/status 2>&1)
echo "$STATUS" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(f'  Status: {d.get(\"status\",\"?\")}')
    print(f'  Numero: {d.get(\"numero\",\"Nenhum\")}')
    qr = d.get('qrCode','')
    if qr and len(qr) > 50:
        print(f'  QR Code: PRESENTE ({len(qr)} chars, tipo: {qr[:30]}...)')
    else:
        print(f'  QR Code: AUSENTE ou vazio')
except Exception as e:
    print(f'  Erro parsing: {e}')
    print(f'  Raw: {sys.stdin.read()[:200]}')
" 2>/dev/null

echo ""
echo "=== 4. HTTPS aluforce.api.br/whatsapp ==="
curl -sk -o /dev/null -w "  HTTP Code: %{http_code}\n  Content-Type: %{content_type}\n  Size: %{size_download} bytes\n" https://aluforce.api.br/whatsapp
echo ""

echo ""
echo "=== 5. Direct page http://localhost:3002/whatsapp ==="
PAGE=$(curl -s http://localhost:3002/whatsapp)
echo "  Page length: ${#PAGE} chars"
echo "  First 200 chars: ${PAGE:0:200}"

echo ""
echo "=== 6. Socket.IO check ==="
curl -s "http://localhost:3002/socket.io/?EIO=4&transport=polling" | head -1
echo ""

echo ""
echo "=== 7. Nginx WhatsApp config ==="
grep -A5 'location.*whatsapp\|location.*wbot' /etc/nginx/sites-enabled/aluforce 2>/dev/null | head -30

echo ""
echo "=== 8. PM2 Error Logs (whatsapp-bot) ==="
cat /root/.pm2/logs/whatsapp-bot-error.log 2>/dev/null | tail -30

echo ""
echo "=== 9. PM2 Out Logs (whatsapp-bot) ==="
cat /root/.pm2/logs/whatsapp-bot-out.log 2>/dev/null | tail -20

echo ""
echo "=== 10. Chrome/Puppeteer check ==="
which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome 2>/dev/null || echo "  No chromium found!"
ls -la /usr/bin/chromium* 2>/dev/null || echo "  No chromium in /usr/bin"

echo ""
echo "DONE"
