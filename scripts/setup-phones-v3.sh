#!/bin/bash
# Configure phone numbers via API (bypasses MySQL auth issues)

API="http://localhost:3000/api/whatsapp-alertas/config"

echo "=== 1. Configurando DESTINATARIOS_TESTE ==="
curl -s -X PUT "$API" \
  -H "Content-Type: application/json" \
  -d '{"chave":"DESTINATARIOS_TESTE","valor":"[\"5511995896003\",\"5511932569921\"]"}'
echo ""

echo ""
echo "=== 2. Configurando DESTINATARIOS_DIRETORIA ==="
curl -s -X PUT "$API" \
  -H "Content-Type: application/json" \
  -d '{"chave":"DESTINATARIOS_DIRETORIA","valor":"[\"5511995896003\",\"5511932569921\"]"}'
echo ""

echo ""
echo "=== 3. Verificando configurações ==="
curl -s http://localhost:3000/api/whatsapp-alertas/config | python3 -c "
import sys, json
d = json.load(sys.stdin)
for c in d.get('configs',[]):
    if c['chave'] in ('DESTINATARIOS_TESTE','DESTINATARIOS_DIRETORIA','MODO_TESTE'):
        print(f'  {c[\"chave\"]}: {c[\"valor\"]}')
" 2>/dev/null

echo ""
echo "=== 4. Status WhatsApp Bot ==="
curl -s http://localhost:3002/api/whatsapp/status | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'  Status: {d.get(\"status\",\"?\")}')
print(f'  Numero: {d.get(\"numero\",\"Nenhum conectado\")}')
has_qr = 'qrCode' in d and d['qrCode'] is not None and len(d.get('qrCode','')) > 10
print(f'  QR Code: {\"DISPONIVEL para escanear\" if has_qr else \"Nao disponivel\"}')
" 2>/dev/null

echo ""
echo "=== 5. Testando envio via endpoint ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/teste \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Teste de configuracao - ALUFORCE Alertas"}'
echo ""

echo ""
echo "=== 6. Nginx - Verificando acesso externo ao QR Code ==="
curl -s -o /dev/null -w "HTTPS aluforce.api.br/whatsapp -> HTTP %{http_code}" https://aluforce.api.br/whatsapp
echo ""

echo ""
echo "DONE"
