#!/bin/bash
# Test all WhatsApp alert endpoints

echo "=== 1. Config (GET) ==="
curl -s http://localhost:3000/api/whatsapp-alertas/config | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'OK: {len(d.get(\"configs\",[]))} configs')
for c in d.get('configs',[]):
    print(f'  {c[\"chave\"]}: {c[\"valor\"]}')
" 2>/dev/null

echo ""
echo "=== 2. Contas a Pagar (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/contas-pagar
echo ""

echo ""
echo "=== 3. Contas a Receber (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/contas-receber
echo ""

echo ""
echo "=== 4. Aniversariantes (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/aniversariantes
echo ""

echo ""
echo "=== 5. Estoque (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/estoque
echo ""

echo ""
echo "=== 6. Pedidos Atrasados (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/pedidos-atrasados
echo ""

echo ""
echo "=== 7. NFe Pendentes (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/nfe-pendentes
echo ""

echo ""
echo "=== 8. Resumo Diario (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/resumo-diario
echo ""

echo ""
echo "=== 9. Teste (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/teste \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Teste de conexao do sistema de alertas ALUFORCE"}'
echo ""

echo ""
echo "=== 10. Log (GET) ==="
curl -s http://localhost:3000/api/whatsapp-alertas/log?limit=5
echo ""

echo ""
echo "=== TODOS OS TESTES CONCLUIDOS ==="
