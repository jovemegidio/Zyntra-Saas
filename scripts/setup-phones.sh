#!/bin/bash
# Configure phone numbers for WhatsApp alerts

MYSQL="mysql -u aluforce -p'Aluforce2026VpsDB' aluforce_vendas"

echo "=== 1. Configurando DESTINATARIOS_TESTE ==="
$MYSQL -e "UPDATE whatsapp_config SET valor = '[\"5511995896003\",\"5511932569921\"]' WHERE chave = 'DESTINATARIOS_TESTE';"
echo "OK"

echo ""
echo "=== 2. Configurando DESTINATARIOS_DIRETORIA ==="
$MYSQL -e "UPDATE whatsapp_config SET valor = '[\"5511995896003\",\"5511932569921\"]' WHERE chave = 'DESTINATARIOS_DIRETORIA';"
echo "OK"

echo ""
echo "=== 3. Atualizando telefone do Clemerson (id=29) ==="
$MYSQL -e "UPDATE funcionarios SET telefone = '5511995896003' WHERE id = 29;"
echo "OK"

echo ""
echo "=== 4. Verificando configs ==="
$MYSQL -e "SELECT chave, valor FROM whatsapp_config WHERE chave IN ('DESTINATARIOS_TESTE', 'DESTINATARIOS_DIRETORIA', 'MODO_TESTE');"

echo ""
echo "=== 5. Verificando Clemerson ==="
$MYSQL -e "SELECT id, nome_completo, telefone, email FROM funcionarios WHERE id = 29;"

echo ""
echo "=== 6. Status WhatsApp Bot ==="
curl -s http://localhost:3002/api/whatsapp/status
echo ""

echo ""
echo "=== 7. Testando envio de teste ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/teste \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Teste de configuracao - ALUFORCE Alertas"}'
echo ""

echo ""
echo "DONE"
