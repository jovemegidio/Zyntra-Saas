#!/bin/bash
echo "=== Inserindo bloco zyntra-demo no Nginx ==="

NGINX_CONF="/etc/nginx/sites-available/aluforce"

# Verificar linha do "location / {"
LINE=$(grep -n 'location / {' $NGINX_CONF | head -1 | cut -d: -f1)
echo "Bloco 'location / {' encontrado na linha $LINE"

if [ -z "$LINE" ]; then
    echo "ERRO: nao encontrei 'location / {'"
    exit 1
fi

# Inserir o bloco zyntra-demo ANTES da linha do "location / {"
sed -i "${LINE}i\\
\\
    # === ZYNTRA DEMO (ERP demonstracao) ===\\
    location /zyntra-demo/ {\\
        rewrite ^/zyntra-demo/(.*) /\$1 break;\\
        proxy_pass http://localhost:3003;\\
        proxy_http_version 1.1;\\
        proxy_set_header Upgrade \$http_upgrade;\\
        proxy_set_header Connection \"upgrade\";\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
        proxy_set_header X-Forwarded-Proto \$scheme;\\
        proxy_set_header X-Base-Path /zyntra-demo;\\
        proxy_read_timeout 300s;\\
        proxy_connect_timeout 75s;\\
        proxy_buffering off;\\
    }" $NGINX_CONF

echo ""
echo "=== Verificando insercao ==="
grep -n 'zyntra-demo' $NGINX_CONF

echo ""
echo "=== Teste nginx -t ==="
nginx -t 2>&1

echo ""
echo "=== Reload nginx ==="
systemctl reload nginx 2>&1

echo ""
echo "=== Teste curl ==="
curl -sL -o /dev/null -w "HTTP %{http_code}\n" http://localhost/zyntra-demo/ 2>/dev/null
curl -sL -o /dev/null -w "HTTP %{http_code} (login.html)\n" http://localhost/zyntra-demo/login.html 2>/dev/null
echo "PRONTO"
