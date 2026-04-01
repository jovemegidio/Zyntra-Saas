#!/bin/bash
# Configure phone numbers for WhatsApp alerts
# Using -h YOUR_VPS_IP because user is configured for remote access

MYSQL="mysql -u aluforce -p'CHANGE_ME_DB_PASSWORD' -h YOUR_VPS_IP aluforce_vendas"

echo "=== 1. Configurando DESTINATARIOS_TESTE ==="
$MYSQL -e "UPDATE whatsapp_config SET valor = '[\"5511995896003\",\"5511932569921\"]' WHERE chave = 'DESTINATARIOS_TESTE';"
echo "Resultado: $?"

echo ""
echo "=== 2. Configurando DESTINATARIOS_DIRETORIA ==="
$MYSQL -e "UPDATE whatsapp_config SET valor = '[\"5511995896003\",\"5511932569921\"]' WHERE chave = 'DESTINATARIOS_DIRETORIA';"
echo "Resultado: $?"

echo ""
echo "=== 3. Atualizando telefone do Clemerson (id=29) ==="
$MYSQL -e "UPDATE funcionarios SET telefone = '5511995896003' WHERE id = 29;"
echo "Resultado: $?"

echo ""
echo "=== 4. Verificando configs ==="
$MYSQL -e "SELECT chave, valor FROM whatsapp_config WHERE chave IN ('DESTINATARIOS_TESTE', 'DESTINATARIOS_DIRETORIA', 'MODO_TESTE');"

echo ""
echo "=== 5. Verificando Clemerson ==="
$MYSQL -e "SELECT id, nome_completo, telefone, email FROM funcionarios WHERE id = 29;"

echo ""
echo "=== 6. Status WhatsApp Bot ==="
curl -s http://localhost:3002/api/whatsapp/status | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Status: {d.get(\"status\",\"?\")}')
print(f'Numero: {d.get(\"numero\",\"Nenhum\")}')
has_qr = 'qrCode' in d and d['qrCode'] is not None
print(f'QR Code: {\"Disponivel\" if has_qr else \"Nao\"} ({len(d.get(\"qrCode\",\"\"))} chars)')
" 2>/dev/null || echo "FALHOU"

echo ""
echo "=== 7. Testando envio via endpoint ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/teste \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Teste de configuracao - ALUFORCE Alertas"}'
echo ""

echo ""
echo "DONE"
