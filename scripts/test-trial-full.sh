#!/bin/bash
echo "=== TESTE 1: Email duplicado (update) ==="
curl -s -X POST http://localhost:3000/api/zyntra/trial \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste Deploy ATUALIZADO","email":"teste@zyntra.com.br","phone":"11888887777","company":"Empresa Atualizada SA","segment":"comercio","employees":"51-200","plan":"Enterprise - R$599"}'

echo ""
echo ""
echo "=== TESTE 2: Novo cadastro ==="
curl -s -X POST http://localhost:3000/api/zyntra/trial \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Silva","email":"maria@empresa.com","phone":"11977776666","company":"Silva Ind LTDA","cnpj":"98765432000199","segment":"industria","employees":"201-500","plan":"Profissional - R$299"}'

echo ""
echo ""
echo "=== TESTE 3: Listar trials (protegido) ==="
curl -s "http://localhost:3000/api/zyntra/trials" \
  -H "X-API-Key: 2d6e45d6-cdd2-468b-b79a-fda468674113"

echo ""
echo ""
echo "=== TESTE 4: Estatísticas ==="
curl -s "http://localhost:3000/api/zyntra/trials/stats" \
  -H "X-API-Key: 2d6e45d6-cdd2-468b-b79a-fda468674113"
