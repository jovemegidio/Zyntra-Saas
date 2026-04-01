#!/bin/bash
echo "=== TESTE via HTTPS (como o browser faria) ==="
curl -s -X POST https://aluforce.api.br/api/zyntra/trial \
  -H "Content-Type: application/json" \
  -H "Origin: https://aluforce.api.br" \
  -d '{"name":"Teste Final HTTPS","email":"final@teste.com","phone":"11966665555","company":"Final Test Co","segment":"servicos","employees":"1-10","plan":"Starter - R$149"}'
echo ""
echo ""
echo "=== VERIFICAR NO BANCO ==="
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD aluforce_vendas -e "SELECT id, nome, email, plano, status, created_at FROM zyntra_trials ORDER BY id DESC LIMIT 5;"
