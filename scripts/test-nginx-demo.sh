#!/bin/bash
echo "=== Testando localhost:3003 diretamente ==="
curl -s -o /dev/null -w "Status: %{http_code}, Redirect: %{redirect_url}\n" http://localhost:3003/
echo ""

echo "=== Testando localhost:3003 /login ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3003/login

echo ""
echo "=== Conteudo do bloco Nginx zyntra-demo ==="
grep -B2 -A20 "zyntra-demo" /etc/nginx/sites-available/aluforce

echo ""
echo "=== Teste via proxy ==="
curl -sL -o /dev/null -w "Status: %{http_code}\n" https://aluforce.api.br/zyntra-demo/
curl -sL -o /dev/null -w "Status login: %{http_code}\n" https://aluforce.api.br/zyntra-demo/login
