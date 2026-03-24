#!/bin/bash
# ============================================
# CONFIGURAR NGINX PROXY PARA WHATSAPP
# + Adicionar WhatsApp ao ecosystem PM2
# ============================================

echo "========================================="
echo "  CONFIGURANDO WHATSAPP PROXY NGINX"
echo "========================================="

# 1. Adicionar location /whatsapp no Nginx do aluforce
echo "[1/3] Configurando Nginx..."

# Backup do Nginx config
cp /etc/nginx/sites-enabled/aluforce /etc/nginx/sites-enabled/aluforce.bak.$(date +%s)

# Verificar se já tem a configuração do WhatsApp
if grep -q "location /whatsapp" /etc/nginx/sites-enabled/aluforce; then
    echo "WhatsApp proxy já configurado no Nginx!"
else
    # Adicionar proxy do WhatsApp ANTES da location / (catch-all)
    sed -i '/# Rota raiz e arquivos estaticos/i \
    # ============================================\
    # WHATSAPP BOT - Proxy para porta 3002\
    # ============================================\
    location /whatsapp {\
        proxy_pass http://127.0.0.1:3002/whatsapp;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }\
\
    # WhatsApp API\
    location /api/whatsapp/ {\
        proxy_pass http://127.0.0.1:3002/api/whatsapp/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }\
\
    # WhatsApp Socket.IO (porta 3002)\
    location /whatsapp-socket/ {\
        proxy_pass http://127.0.0.1:3002/socket.io/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_connect_timeout 7d;\
        proxy_send_timeout 7d;\
        proxy_read_timeout 7d;\
        proxy_buffering off;\
        proxy_cache off;\
    }\
' /etc/nginx/sites-enabled/aluforce
    echo "Proxy WhatsApp adicionado ao Nginx!"
fi

# 2. Testar e recarregar Nginx
echo ""
echo "[2/3] Testando Nginx..."
nginx -t 2>&1

if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "Nginx recarregado com sucesso!"
else
    echo "ERRO na configuração Nginx! Restaurando backup..."
    cp /etc/nginx/sites-enabled/aluforce.bak.* /etc/nginx/sites-enabled/aluforce 2>/dev/null
    nginx -t 2>&1
    systemctl reload nginx
fi

# 3. Verificar
echo ""
echo "[3/3] Verificação..."
curl -s -o /dev/null -w "%{http_code}" https://aluforce.api.br/whatsapp
echo " <- Status code HTTPS /whatsapp"
curl -s -o /dev/null -w "%{http_code}" https://aluforce.api.br/api/whatsapp/status
echo " <- Status code HTTPS /api/whatsapp/status"

echo ""
echo "========================================="
echo "  PRONTO! Acesse: https://aluforce.api.br/whatsapp"
echo "========================================="
