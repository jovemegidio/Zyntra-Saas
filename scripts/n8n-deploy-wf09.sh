#!/bin/bash
# Deploy workflow 09 + restart PM2

echo "========================================="
echo "  DEPLOY WORKFLOW 09 + RESTART PM2"
echo "========================================="

# 1. Login no n8n e pegar cookie
echo ""
echo "[1/6] Fazendo login no n8n..."
LOGIN=$(curl -s -c /tmp/n8n-cookie.txt -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}')

echo "Login: $(echo $LOGIN | grep -o '"firstName":"[^"]*"')"

# 2. Importar workflow 09
echo ""
echo "[2/6] Importando workflow 09..."
WF_JSON=$(cat /var/www/aluforce/n8n/workflows/09-alertas-whatsapp-multimodulo.json)

IMPORT=$(curl -s -b /tmp/n8n-cookie.txt -X POST http://localhost:5678/rest/workflows \
  -H "Content-Type: application/json" \
  -d "$WF_JSON")

WF_ID=$(echo $IMPORT | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$WF_ID" ]; then
  echo "ERRO ao importar. Tentando via CLI..."
  docker exec aluforce-n8n n8n import:workflow --input=/home/node/workflows/09-alertas-whatsapp-multimodulo.json 2>&1
  
  # Pegar ID via API
  ALL_WFS=$(curl -s -b /tmp/n8n-cookie.txt http://localhost:5678/rest/workflows)
  WF_ID=$(echo $ALL_WFS | grep -o '"id":"[^"]*","name":"09[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$WF_ID" ]; then
    echo "Tentando pegar ID de outra forma..."
    WF_ID=$(echo $ALL_WFS | python3 -c "
import sys, json
data = json.load(sys.stdin)
wfs = data.get('data', data) if isinstance(data, dict) else data
for wf in wfs:
    if '09' in wf.get('name',''):
        print(wf['id'])
        break
" 2>/dev/null)
  fi
  echo "Workflow ID via CLI: $WF_ID"
else
  echo "Workflow importado com ID: $WF_ID"
fi

# 3. Publicar workflow 09
echo ""
echo "[3/6] Publicando workflow 09..."
if [ ! -z "$WF_ID" ]; then
  docker exec aluforce-n8n n8n publish:workflow --id="$WF_ID" 2>&1
  echo "Workflow $WF_ID publicado!"
else
  echo "AVISO: ID não encontrado, publicando todos..."
  # Listar todos e publicar o mais recente
  docker exec aluforce-n8n n8n list:workflow 2>&1
fi

# 4. Restart n8n container
echo ""
echo "[4/6] Reiniciando container n8n..."
docker restart aluforce-n8n
sleep 5

# 5. Verificar workflows ativos
echo ""
echo "[5/6] Verificando workflows..."
LOGIN2=$(curl -s -c /tmp/n8n-cookie2.txt -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}')

sleep 2
ALL=$(curl -s -b /tmp/n8n-cookie2.txt http://localhost:5678/rest/workflows)
echo "$ALL" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    wfs = data.get('data', data) if isinstance(data, dict) else data
    print(f'Total: {len(wfs)} workflows')
    for wf in sorted(wfs, key=lambda x: x.get('name','')):
        status = 'ON' if wf.get('active') else 'OFF'
        print(f'  [{status}] {wf[\"name\"]} (ID: {wf[\"id\"]})')
except Exception as e:
    print(f'Erro ao parsear: {e}')
" 2>&1

# 6. Restart PM2
echo ""
echo "[6/6] Reiniciando PM2..."
cd /var/www/aluforce
pm2 restart aluforce-dashboard --update-env 2>&1
sleep 2
pm2 list 2>&1

# Verificar WhatsApp service
echo ""
echo "========================================="
echo "  STATUS WHATSAPP SERVICE"
echo "========================================="
pm2 list 2>&1 | grep -i whatsapp || echo "WhatsApp service NAO esta rodando no PM2"

# Tentar verificar porta 3002
echo ""
echo "Porta 3002 (WhatsApp):"
ss -tlnp | grep 3002 || netstat -tlnp | grep 3002 || echo "Porta 3002 não está ouvindo"

echo ""
echo "========================================="
echo "  DEPLOY COMPLETO!"
echo "========================================="

# Cleanup
rm -f /tmp/n8n-cookie.txt /tmp/n8n-cookie2.txt
