#!/bin/bash
cat > /tmp/onb_data.json << 'JSONEOF'
{"nome":"Teste LP","email":"teste-lp@example.com","senha":"Test12345!","empresa_nome":"Empresa Teste LP","setor":"comercio","plano":"starter"}
JSONEOF
curl -sk -X POST https://aluforce.api.br/api/onboarding -H 'Content-Type: application/json' -d @/tmp/onb_data.json
echo
