#!/bin/bash
# Test PUT /api/rh/funcionarios/56 with empty ENUM fields
# This should NOT produce "Data truncated" error after fix

echo "=== Step 1: Login ==="
LOGIN_RESPONSE=$(curl -s -k -X POST https://localhost/api/login \
  -H "Content-Type: application/json" \
  -H "x-csrf-bypass: internal-test" \
  -d '{"email":"ti@aluforce.ind.br","senha":"admin123"}')
echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
echo "Token length: ${#TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "FAIL: Could not get token"
  exit 1
fi

echo ""
echo "=== Step 2: PUT with empty ENUM fields ==="
PUT_RESPONSE=$(curl -s -k -X PUT "https://localhost/api/rh/funcionarios/56" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-csrf-bypass: internal-test" \
  -d '{"tipo_chave_pix":"","sexo":"","nome_completo":"Lúcio Brito da Silva Junior"}')
echo "PUT response: $PUT_RESPONSE"

echo ""
echo "=== Step 3: Check errors ==="
pm2 logs aluforce-dashboard --err --lines 5 --nostream 2>&1 | grep -i "truncat" && echo "FAIL: Still has truncation error" || echo "OK: No truncation errors"
