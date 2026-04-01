#!/bin/bash
# Importar workflow 09 no n8n via API
sleep 5

# Login
curl -s -c /tmp/n8n-ck.txt -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}' > /dev/null 2>&1

# Importar
RESULT=$(curl -s -b /tmp/n8n-ck.txt -X POST http://localhost:5678/rest/workflows \
  -H "Content-Type: application/json" \
  -d @/var/www/aluforce/n8n/workflows/09-alertas-whatsapp-multimodulo.json)

WF_ID=$(echo "$RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
inner = d.get('data', d)
print(inner.get('id','ERRO'))
" 2>/dev/null)

echo "WF_ID=$WF_ID"

if [ "$WF_ID" != "ERRO" ] && [ ! -z "$WF_ID" ]; then
  echo "Importado! Publicando..."
  docker exec aluforce-n8n n8n publish:workflow --id="$WF_ID" 2>&1
  echo "Reiniciando n8n..."
  docker restart aluforce-n8n
  sleep 8
  
  # Verificar
  curl -s -c /tmp/n8n-ck2.txt -X POST http://localhost:5678/rest/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}' > /dev/null 2>&1
  
  curl -s -b /tmp/n8n-ck2.txt http://localhost:5678/rest/workflows | python3 -c "
import sys,json
d=json.load(sys.stdin)
wfs = d.get('data', d) if isinstance(d, dict) else d
for wf in sorted(wfs, key=lambda x: x.get('name','')):
    s='ON' if wf.get('active') else 'OFF'
    print(f'  [{s}] {wf[\"name\"]} (ID: {wf[\"id\"]})')
print(f'Total: {len(wfs)} workflows')
" 2>&1
else
  echo "ERRO na importacao. Response:"
  echo "$RESULT" | head -5
fi

rm -f /tmp/n8n-ck.txt /tmp/n8n-ck2.txt
