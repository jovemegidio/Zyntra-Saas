#!/bin/bash
WF_DIR="/var/www/aluforce/n8n/workflows"
N8N_DIR="/home/node/.n8n/workflows"

WORKFLOWS=(
  19-entregas-atrasadas-alerta.json
  20-faturamento-sem-nfe-alerta.json
  21-transacoes-recorrentes-auto.json
  22-boletos-vencidos-cobranca.json
  23-resumo-expedicao-diario.json
  24-ponto-inconsistencias-alerta.json
  25-ferias-vencendo-alerta.json
  26-requisicoes-compra-paradas.json
  27-ops-sem-material-alerta.json
  28-xml-contabilidade-export.json
  29-fluxo-caixa-projecao-semanal.json
  31-reativacao-clientes-campanha.json
  32-retornos-bancarios-processamento.json
  33-performance-transportadoras-mensal.json
  34-cleanup-usuarios-inativos.json
  35-resumo-diario-producao.json
  36-audit-anomalias-seguranca.json
)

echo "=== Importing ${#WORKFLOWS[@]} workflows ==="
for wf in "${WORKFLOWS[@]}"; do
  echo "Importing: $wf"
  docker exec aluforce-n8n n8n import:workflow --input="$N8N_DIR/$wf" 2>&1
done

echo ""
echo "=== Activating workflows ==="
# Get IDs from JSON files
for wf in "${WORKFLOWS[@]}"; do
  WF_ID=$(python3 -c "import json; print(json.load(open('$WF_DIR/$wf'))['id'])" 2>/dev/null)
  if [ -n "$WF_ID" ]; then
    echo "Activating $wf (id=$WF_ID)..."
    docker exec aluforce-n8n n8n update:workflow --id="$WF_ID" --active=true 2>&1
  else
    echo "SKIP: Could not get ID for $wf"
  fi
done

echo ""
echo "=== Restarting n8n container ==="
docker restart aluforce-n8n
echo "Done!"
