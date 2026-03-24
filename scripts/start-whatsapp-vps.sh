#!/bin/bash
# Verificar deps e iniciar WhatsApp service
cd /var/www/aluforce

echo "=== VERIFICANDO DEPENDENCIAS ==="
node -e 'try{require("whatsapp-web.js");console.log("whatsapp-web.js OK")}catch(e){console.log("FALTA whatsapp-web.js")}' 2>&1
node -e 'try{require("puppeteer");console.log("puppeteer OK")}catch(e){try{require("puppeteer-core");console.log("puppeteer-core OK")}catch(e2){console.log("FALTA puppeteer")}}' 2>&1
node -e 'try{require("qrcode-terminal");console.log("qrcode-terminal OK")}catch(e){console.log("FALTA qrcode-terminal")}' 2>&1

echo ""
echo "=== INSTALANDO DEPS FALTANTES (se necessario) ==="
npm list whatsapp-web.js 2>/dev/null | grep whatsapp-web.js || npm install whatsapp-web.js --save 2>&1
npm list qrcode-terminal 2>/dev/null | grep qrcode-terminal || npm install qrcode-terminal --save 2>&1

echo ""
echo "=== VERIFICANDO CHROMIUM ==="
which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome 2>/dev/null || echo "NENHUM BROWSER"
export PUPPETEER_EXECUTABLE_PATH=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome 2>/dev/null)
echo "PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH"

echo ""
echo "=== INICIANDO WHATSAPP SERVICE VIA PM2 ==="
# Parar se já existir
pm2 delete whatsapp-bot 2>/dev/null || true

# Iniciar com variáveis de ambiente
PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH pm2 start whatsapp-service.js \
  --name whatsapp-bot \
  --max-memory-restart 200M \
  --env production \
  -- 2>&1

sleep 5

echo ""
echo "=== STATUS PM2 ==="
pm2 list 2>&1

echo ""
echo "=== LOGS WHATSAPP ==="
pm2 logs whatsapp-bot --lines 15 --nostream 2>&1

echo ""
echo "=== PORTA 3002 ==="
ss -tlnp | grep 3002 || netstat -tlnp 2>/dev/null | grep 3002 || echo "Porta 3002 não ouvindo"

echo ""
echo "=== SALVAR PM2 ==="
pm2 save 2>&1
