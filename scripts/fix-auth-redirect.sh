#!/bin/bash
set -e
cd /var/www/aluforce

echo "=== Patching auth.js redirectTo to support X-Base-Path ==="

# Substituir as duas ocorrencias de:
#   const redirectTo = baseUrl + '/dashboard';
# por:
#   const basePath = req.get('X-Base-Path') || '';
#   const redirectTo = baseUrl + basePath + '/dashboard';

sed -i "s|const redirectTo = baseUrl + '/dashboard';|const basePath = req.get('X-Base-Path') || ''; const redirectTo = baseUrl + basePath + '/dashboard';|g" src/routes/auth.js

echo "Verificando alteracoes:"
grep -n 'redirectTo.*baseUrl\|X-Base-Path' src/routes/auth.js

echo ""
echo "=== Patching Express root redirect ==="
# Tambem a rota root (/) que faz res.redirect('/login.html')
# precisa considerar o base path
# Na verdade, isso e gerenciado pelo proxy_redirect do Nginx, entao nao precisa

echo ""
echo "=== Restart zyntra-demo ==="
pm2 restart zyntra-demo --update-env
sleep 8
pm2 status zyntra-demo | grep zyntra

echo ""
echo "=== Test redirectTo ==="
# Login direto na porta 3003 (sem header)
REDIRECT1=$(curl -s -X POST 'http://localhost:3003/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectTo','NONE'))" 2>/dev/null || echo 'PARSE_ERROR')
echo "Sem base-path: $REDIRECT1"

# Login com header X-Base-Path
REDIRECT2=$(curl -s -X POST 'http://localhost:3003/api/login' \
  -H 'Content-Type: application/json' \
  -H 'X-Base-Path: /zyntra-demo' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectTo','NONE'))" 2>/dev/null || echo 'PARSE_ERROR')
echo "Com base-path: $REDIRECT2"

# Login via proxy Nginx
REDIRECT3=$(curl -sk -X POST 'https://aluforce.api.br/zyntra-demo/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectTo','NONE'))" 2>/dev/null || echo 'PARSE_ERROR')
echo "Via proxy: $REDIRECT3"

echo ""
echo "DONE!"
