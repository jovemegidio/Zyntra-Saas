#!/bin/bash
echo "=== Corrigindo bloco Nginx zyntra-demo ==="

NGINX_CONF="/etc/nginx/sites-available/aluforce"

# Substituir o bloco existente por um que usa proxy_pass com URI
# Remover o bloco antigo e inserir o correto
sed -i '/# === ZYNTRA DEMO/,/^    }/c\
    # === ZYNTRA DEMO (ERP demonstracao) ===\
    location /zyntra-demo/ {\
        proxy_pass http://localhost:3003/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_set_header X-Base-Path /zyntra-demo;\
        proxy_read_timeout 300s;\
        proxy_connect_timeout 75s;\
        proxy_buffering off;\
    }' $NGINX_CONF

echo "=== Verificando ==="
grep -A15 'ZYNTRA DEMO' $NGINX_CONF

echo ""
echo "=== Test config ==="
nginx -t 2>&1

echo ""
echo "=== Reload ==="
systemctl reload nginx

echo ""
echo "=== Teste curl ==="
curl -sL -D- -o /dev/null https://aluforce.api.br/zyntra-demo/ 2>/dev/null | head -5
echo ""
echo "PRONTO"
