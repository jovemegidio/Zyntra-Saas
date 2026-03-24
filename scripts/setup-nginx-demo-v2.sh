#!/bin/bash
echo "=== Configurando Nginx para /zyntra-demo/ ==="

NGINX_CONF="/etc/nginx/sites-available/aluforce"

# Backup
cp $NGINX_CONF ${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)

# Verificar se ja tem zyntra-demo configurado
if grep -q "zyntra-demo" $NGINX_CONF; then
    echo "zyntra-demo ja configurado no Nginx!"
else
    echo "Adicionando bloco zyntra-demo..."
    
    # Inserir antes do bloco Zyntra-SGE existente
    sed -i '/location \/Zyntra-SGE\//i \
    # === ZYNTRA DEMO (ERP demonstracao) ===\
    location /zyntra-demo/ {\
        rewrite ^/zyntra-demo/(.*) /$1 break;\
        proxy_pass http://localhost:3003;\
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
    }\
' $NGINX_CONF

    echo "Bloco adicionado!"
fi

echo ""
echo "=== Testando config Nginx ==="
nginx -t 2>&1

echo ""
echo "=== Recarregando Nginx ==="
systemctl reload nginx 2>&1

echo ""
echo "=== Verificando bloco zyntra-demo ==="
grep -A 5 "zyntra-demo" $NGINX_CONF | head -20

echo ""
echo "=== Teste final via curl ==="
curl -s -o /dev/null -w "HTTP %{http_code}" https://aluforce.api.br/zyntra-demo/ 2>/dev/null
echo ""
echo "NGINX CONFIGURADO!"
