#!/bin/bash
# Test multi-empresas API
echo "=== Testing Multi-Empresas API ==="

# Login
RESP=$(curl -sk https://localhost/api/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"ti@aluforce.ind.br","password":"Aluforce@2026"}' 2>/dev/null)

TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "ERRO: Login falhou"
  echo "Resposta: $RESP"
  exit 1
fi

echo "1. Login OK (token obtido)"

# Check if empresas in login response  
HAS_EMPRESAS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('sim' if 'empresas' in d else 'nao')" 2>/dev/null)
echo "2. Login retorna empresas: $HAS_EMPRESAS"

EMPRESAS_COUNT=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('empresas',[])))" 2>/dev/null)
echo "   Quantidade: $EMPRESAS_COUNT"

# Test setores
echo ""
echo "3. GET /api/empresas/setores:"
curl -sk https://localhost/api/empresas/setores \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -20

# Test planos
echo ""
echo "4. GET /api/empresas/planos:"
curl -sk https://localhost/api/empresas/planos \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -20

# Test list empresas
echo ""
echo "5. GET /api/empresas:"
curl -sk https://localhost/api/empresas \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30

echo ""
echo "=== TESTE CONCLUÍDO ==="
