#!/bin/bash
echo "=== Test Login Direct ==="
curl -s -X POST 'http://localhost:3003/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  -w '\nHTTP: %{http_code}\n'

echo ""
echo "=== Test Login via Proxy ==="  
curl -sk -X POST 'https://aluforce.api.br/zyntra-demo/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  -w '\nHTTP: %{http_code}\n'

echo ""
echo "=== Test with credentials from insert ==="
curl -s -X POST 'http://localhost:3003/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}' \
  -w '\nHTTP: %{http_code}\n'

echo ""
echo "=== Check user exists ==="
mysql -u aluforce -pAluforce2026VpsDB zyntra_demo -e "SELECT id, nome, email, ativo FROM usuarios WHERE email LIKE '%zyntra%' LIMIT 5;" 2>/dev/null

echo ""
echo "=== Check auth route fields ==="
grep -n 'email\|senha\|password' /var/www/aluforce/src/routes/auth.js | head -15
