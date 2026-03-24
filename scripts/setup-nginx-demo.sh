#!/bin/bash
# ============================================
# CONFIGURAR NGINX PARA ZYNTRA DEMO
# Adiciona proxy /zyntra-demo/ → localhost:3003
# ============================================
set -e

NGINX_CONF="/etc/nginx/sites-available/aluforce"
BACKUP="/etc/nginx/sites-available/aluforce.bak.$(date +%Y%m%d_%H%M%S)"

echo "📋 Fazendo backup do Nginx config..."
cp $NGINX_CONF $BACKUP
echo "✅ Backup: $BACKUP"

# Verificar se já existe configuração do demo
if grep -q "zyntra-demo" $NGINX_CONF; then
    echo "⚠️ Configuração zyntra-demo já existe no Nginx. Pulando."
    exit 0
fi

echo "📝 Adicionando proxy para Zyntra Demo..."

# Adicionar o bloco ANTES do location ^~ /Zyntra-SGE/
sed -i '/location \^~ \/Zyntra-SGE\//i \
    # ============================================\
    # ZYNTRA DEMO - Proxy para instância demo na porta 3003\
    # ============================================\
    location /zyntra-demo/ {\
        rewrite ^/zyntra-demo/(.*) /$1 break;\
        proxy_pass http://127.0.0.1:3003;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_read_timeout 120s;\
        proxy_connect_timeout 10s;\
        \
        # Cache headers para demo\
        add_header X-Zyntra-Mode "demo" always;\
    }\
' $NGINX_CONF

echo "✅ Bloco Nginx adicionado"

# Testar configuração
echo "🧪 Testando configuração Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida. Reloading Nginx..."
    systemctl reload nginx
    echo "✅ Nginx recarregado com sucesso!"
else
    echo "❌ Erro na configuração! Restaurando backup..."
    cp $BACKUP $NGINX_CONF
    systemctl reload nginx
    echo "⚠️ Backup restaurado"
    exit 1
fi

echo ""
echo "🌐 Zyntra Demo disponível em: https://aluforce.api.br/zyntra-demo/"
