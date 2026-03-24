#!/bin/bash
API_KEY="2d6e45d6-cdd2-468b-b79a-fda468674113"
BASE="http://localhost:3000/api/n8n"

ENDPOINTS=(
  "logistica/entregas-atrasadas"
  "logistica/resumo-expedicao"
  "logistica/performance-transportadoras"
  "faturamento/sem-nfe"
  "financeiro/boletos-vencidos"
  "financeiro/fluxo-caixa-projecao"
  "financeiro/retornos-bancarios-pendentes"
  "rh/ponto-inconsistencias"
  "rh/ferias-vencendo"
  "compras/requisicoes-paradas"
  "pcp/ordens-sem-material"
  "pcp/resumo-diario-producao"
  "vendas/clientes-reativacao"
  "admin/usuarios-inativos"
  "admin/audit-anomalias"
)

OK=0
FAIL=0
for ep in "${ENDPOINTS[@]}"; do
  RESULT=$(curl -s -H "X-N8N-API-Key: $API_KEY" "$BASE/$ep")
  SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',''))" 2>/dev/null)
  if [ "$SUCCESS" = "True" ]; then
    echo "OK: $ep"
    OK=$((OK+1))
  else
    echo "FAIL: $ep -> $RESULT"
    FAIL=$((FAIL+1))
  fi
done
echo ""
echo "=== $OK OK / $FAIL FAIL (total ${#ENDPOINTS[@]}) ==="
