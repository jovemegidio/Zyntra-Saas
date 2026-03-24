#!/bin/bash
echo "=== API STATUS ==="
RESP=$(curl -s http://localhost:3002/api/whatsapp/status)
STATUS=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
QRLEN=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('qrCode','')))" 2>/dev/null)
echo "Status: $STATUS"
echo "QR Code tamanho: $QRLEN chars"
if [ "$QRLEN" -gt 100 ]; then
    echo "✅ QR Code PRESENTE e válido"
else
    echo "❌ QR Code ausente ou muito pequeno"
fi

echo ""
echo "=== HTTPS PAGE ==="
HTTP_CODE=$(curl -sk https://aluforce.api.br/whatsapp -o /dev/null -w '%{http_code}')
PAGE_SIZE=$(curl -sk https://aluforce.api.br/whatsapp -o /dev/null -w '%{size_download}')
echo "HTTP Code: $HTTP_CODE"
echo "Page Size: $PAGE_SIZE bytes"

echo ""
echo "=== SOCKET.IO FIX CHECK ==="
curl -sk https://aluforce.api.br/whatsapp 2>/dev/null | grep -o 'cdn.socket.io' | head -1 && echo "✅ CDN Socket.IO encontrado" || echo "❌ CDN Socket.IO NÃO encontrado"
curl -sk https://aluforce.api.br/whatsapp 2>/dev/null | grep -o 'wbot-socket' | head -1 && echo "✅ wbot-socket path encontrado" || echo "❌ wbot-socket path NÃO encontrado"

echo ""
echo "=== SOCKET.IO TRANSPORT TEST ==="
SOCK_RESP=$(curl -sk "https://aluforce.api.br/wbot-socket/?EIO=4&transport=polling" -o /dev/null -w '%{http_code}')
echo "Socket.IO via /wbot-socket/: HTTP $SOCK_RESP"

echo ""
echo "=== PM2 ERROR LOGS (últimas 5 linhas do NOVO restart) ==="
pm2 logs whatsapp-bot --err --lines 5 --nostream 2>&1
