#!/bin/bash
set -e

NGINX_FILE="/etc/nginx/sites-enabled/aluforce"

echo "=== Verificando arquivo atual ==="
echo "Linhas: $(wc -l < $NGINX_FILE)"

# Verificar se zyntra-demo ja existe
if grep -q 'zyntra-demo' $NGINX_FILE; then
    echo "AVISO: zyntra-demo ja existe no arquivo!"
    grep -n 'zyntra-demo' $NGINX_FILE
    exit 0
fi

# Encontrar a linha do "Rota raiz e arquivos estaticos" (location / catch-all)
LINE_NUM=$(grep -n 'Rota raiz e arquivos estaticos' $NGINX_FILE | head -1 | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
    echo "ERRO: Nao encontrou 'Rota raiz e arquivos estaticos'"
    echo "Tentando encontrar 'location / {' ..."
    LINE_NUM=$(grep -n '^\s*location / {' $NGINX_FILE | tail -1 | cut -d: -f1)
    if [ -z "$LINE_NUM" ]; then
        echo "ERRO: Nao encontrou location / catch-all"
        exit 1
    fi
fi

echo "Inserindo bloco zyntra-demo antes da linha $LINE_NUM"

# Criar bloco a inserir (antes do location / catch-all)
BLOCK='    # ============================================\
    # ZYNTRA DEMO - ERP Demonstracao (porta 3003)\
    # ============================================\
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
    }\
'

# Inserir antes da linha encontrada
sed -i "${LINE_NUM}i\\${BLOCK}" $NGINX_FILE

echo ""
echo "=== Verificando insercao ==="
grep -n 'zyntra-demo' $NGINX_FILE
echo ""
echo "Linhas apos: $(wc -l < $NGINX_FILE)"

echo ""
echo "=== Testando Nginx ==="
nginx -t

echo ""
echo "=== Recarregando Nginx ==="
systemctl reload nginx

echo ""
echo "=== Testando proxy ==="
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/)
echo "Direto localhost:3003 -> HTTP $HTTP_CODE"

PROXY_CODE=$(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/)
echo "Via proxy /zyntra-demo/ -> HTTP $PROXY_CODE"

echo ""
echo "DONE!"
