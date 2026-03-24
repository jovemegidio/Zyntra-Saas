#!/bin/bash
# Inserir bloco WhatsApp proxy no Nginx

NGINX_CONF="/etc/nginx/sites-enabled/aluforce"

# Verificar se já existe
if grep -q "WHATSAPP BOT" "$NGINX_CONF"; then
    echo "WhatsApp proxy já existe!"
    exit 0
fi

# Criar arquivo temporário com o bloco a inserir
cat > /tmp/whatsapp-nginx-block.txt << 'BLOCK'

    # ============================================
    # WHATSAPP BOT - Proxy para porta 3002
    # ============================================
    location /whatsapp {
        proxy_pass http://127.0.0.1:3002/whatsapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WhatsApp API endpoints
    location /api/whatsapp/ {
        proxy_pass http://127.0.0.1:3002/api/whatsapp/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WhatsApp Socket.IO (para QR Code realtime)
    location ^~ /wbot-socket/ {
        proxy_pass http://127.0.0.1:3002/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
        proxy_cache off;
    }

BLOCK

# Inserir ANTES da linha "# Rota raiz e arquivos estaticos"
# Usar python3 para inserção segura
python3 << 'PYTHON'
import re

with open('/etc/nginx/sites-enabled/aluforce', 'r') as f:
    content = f.read()

with open('/tmp/whatsapp-nginx-block.txt', 'r') as f:
    block = f.read()

# Inserir antes de "# Rota raiz"
marker = "    # Rota raiz e arquivos estaticos"
if marker in content:
    content = content.replace(marker, block + marker)
    print("Bloco inserido antes de 'Rota raiz'")
else:
    # Fallback: inserir antes da última location /
    marker2 = "    location / {"
    idx = content.rfind(marker2)
    if idx > 0:
        content = content[:idx] + block + content[idx:]
        print("Bloco inserido antes de 'location /'")
    else:
        print("ERRO: marcador não encontrado!")
        exit(1)

with open('/etc/nginx/sites-enabled/aluforce', 'w') as f:
    f.write(content)

print("Arquivo salvo com sucesso!")
PYTHON

echo ""
echo "Testando Nginx..."
nginx -t 2>&1

if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "Nginx recarregado!"
    echo ""
    sleep 1
    echo "Testando HTTPS..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://aluforce.api.br/whatsapp)
    echo "GET /whatsapp -> $HTTP_CODE"
    
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://aluforce.api.br/api/whatsapp/status)
    echo "GET /api/whatsapp/status -> $API_CODE"
else
    echo "ERRO Nginx! Mostrando config:"
    grep -n "whatsapp" /etc/nginx/sites-enabled/aluforce
fi
