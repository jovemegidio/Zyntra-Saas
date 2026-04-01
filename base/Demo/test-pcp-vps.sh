#!/bin/bash
# Test PCP module - pages and API endpoints

# Generate fresh JWT
TOKEN=$(cd /var/www/aluforce && node -e "
const jwt=require('jsonwebtoken');
const s=require('dotenv').config().parsed.JWT_SECRET;
const t=jwt.sign({id:1,nome:'Guilherme Bastos',email:'guilherme@aluforce.com',role:'admin',areas_acesso:'compras,vendas,rh,faturamento,pcp'},s,{expiresIn:'1h'});
console.log(t);
")

echo "=== PCP HTML PAGES (with auth cookie) ==="
for p in index.html ordens-producao.html apontamentos.html relatorios-apontamentos.html gerar_ordem_excel.html; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --cookie "token=$TOKEN" http://localhost:3000/PCP/$p)
    echo "/PCP/$p -> $code"
done

echo ""
echo "=== PCP HTML PAGES (without auth - should still work via static) ==="
for p in index.html ordens-producao.html apontamentos.html; do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/PCP/$p)
    echo "/PCP/$p (no auth) -> $code"
done

echo ""
echo "=== PCP API ENDPOINTS (with auth) ==="
for ep in dashboard alertas me ordens produtos materiais ordens-compra faturamentos health ordens-kanban/proximo-numero etapas users-list; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pcp/$ep)
    echo "/api/pcp/$ep -> $code"
done

echo ""
echo "=== PCP API - Search/Autocomplete ==="
for ep in "produtos/search?q=a" "produtos/estoque-baixo" "api/empresas?limit=5" "api/transportadoras?limit=5" "api/produtos/buscar?q=a"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pcp/$ep)
    echo "/api/pcp/$ep -> $code"
done

echo ""
echo "=== PCP API (no auth - expect 401) ==="
for ep in dashboard ordens produtos me; do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/pcp/$ep)
    echo "/api/pcp/$ep (no auth) -> $code"
done

echo ""
echo "=== PCP MRP API ==="
for ep in mrp/status mrp/planos; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pcp/$ep)
    echo "/api/pcp/$ep -> $code"
done

echo ""
echo "=== PCP Static Assets ==="
for f in css/pcp.css js/pcp-common.js js/pcp-dashboard.js pcp.js; do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/PCP/$f)
    echo "/PCP/$f -> $code"
done

echo ""
echo "=== Check for 500 errors (get response body) ==="
for ep in dashboard alertas ordens produtos materiais faturamentos ordens-kanban; do
    resp=$(curl -s -w '\nHTTP_CODE:%{http_code}' -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pcp/$ep)
    code=$(echo "$resp" | grep 'HTTP_CODE:' | cut -d: -f2)
    if [ "$code" = "500" ]; then
        body=$(echo "$resp" | grep -v 'HTTP_CODE:')
        echo "500 ERROR on /api/pcp/$ep: $body"
    fi
done
echo "500 check done."
