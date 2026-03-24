#!/bin/bash
echo "=== Teste direto porta 3003 ==="
echo "GET /"
curl -s -D- http://localhost:3003/ 2>/dev/null | head -5
echo ""
echo "GET /login.html"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3003/login.html
echo ""
echo "GET /Login-Page-main/index.html"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3003/Login-Page-main/index.html
echo ""

echo "=== Teste via Nginx proxy ==="
echo "GET /zyntra-demo/"
curl -s -D- https://aluforce.api.br/zyntra-demo/ 2>/dev/null | head -10
echo ""
echo "GET /zyntra-demo/login.html"
curl -s -D- https://aluforce.api.br/zyntra-demo/login.html 2>/dev/null | head -10
echo ""

echo "=== Verificar bloco nginx completo ==="
sed -n '90,110p' /etc/nginx/sites-available/aluforce
