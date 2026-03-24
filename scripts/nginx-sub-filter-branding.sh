#!/bin/bash
set -e

NGINX_FILE="/etc/nginx/sites-enabled/aluforce"

echo "=== Substituindo bloco zyntra-demo com sub_filter ==="

# Backup
cp $NGINX_FILE ${NGINX_FILE}.bak.$(date +%s)

# Encontrar inicio e fim do bloco zyntra-demo
START=$(grep -n 'ZYNTRA DEMO' $NGINX_FILE | head -1 | cut -d: -f1)
END=$(awk "NR>=$START && /^    \}/" $NGINX_FILE | head -1)

# Encontrar a linha do location ^~ /zyntra-demo/
LOC_LINE=$(grep -n 'location.*zyntra-demo' $NGINX_FILE | head -1 | cut -d: -f1)

if [ -z "$LOC_LINE" ]; then
    echo "ERRO: Nao encontrou location zyntra-demo"
    exit 1
fi

echo "Bloco zyntra-demo encontrado na linha $LOC_LINE"

# Encontrar o fechamento } desse location block
# Contamos { e } a partir da linha do location
END_LINE=$(awk -v start="$LOC_LINE" '
BEGIN { depth=0; found=0 }
NR >= start {
    for (i=1; i<=length($0); i++) {
        c = substr($0, i, 1)
        if (c == "{") depth++
        if (c == "}") { depth--; if (depth == 0) { print NR; found=1; exit } }
    }
}
' $NGINX_FILE)

echo "Bloco zyntra-demo: linhas $LOC_LINE a $END_LINE"

# Verificar se encontrou o comentario acima do location
COMMENT_START=$((LOC_LINE - 3))
if sed -n "${COMMENT_START}p" $NGINX_FILE | grep -q 'ZYNTRA'; then
    LOC_LINE=$COMMENT_START
    echo "Incluindo comentario, inicio ajustado para $LOC_LINE"
fi

# Deletar o bloco antigo
sed -i "${LOC_LINE},${END_LINE}d" $NGINX_FILE

# Criar novo bloco com sub_filter
NEW_BLOCK='    # ============================================\
    # ZYNTRA DEMO - ERP Demonstracao (porta 3003)\
    # ============================================\
    location ^~ /zyntra-demo/ {\
        proxy_pass http://localhost:3003/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_set_header Accept-Encoding "";\
        proxy_read_timeout 300s;\
        proxy_connect_timeout 75s;\
\
        # === BRANDING: Aluforce -> Zyntra via Nginx sub_filter ===\
        sub_filter_once off;\
        sub_filter_types text/html text/css application/javascript;\
\
        # Titulos e nomes\
        sub_filter "ALUFORCE" "ZYNTRA";\
        sub_filter "Aluforce" "Zyntra";\
        sub_filter "aluforce" "zyntra";\
\
        # Fix: reverter dominio da API (que foi substituido acima)\
        sub_filter "zyntra.api.br" "aluforce.api.br";\
\
        # Logos\
        sub_filter "Logo Monocromatico - Branco - Aluforce copy.webp" "zyntra-branco.png";\
        sub_filter "Logo Monocromatico - Azul - Aluforce.png" "zyntra-branco.png";\
        sub_filter "Logo Monocromatico - Branco - Aluforce.png" "zyntra-branco.png";\
        sub_filter "Interativo-Aluforce.png" "zyntra-branco.png";\
\
        # Emails\
        sub_filter "@aluforce.ind.br" "@zyntra.com.br";\
\
        # Injetar CSS de branding e banner demo antes de </head>\
        sub_filter "</head>" "<style id=\\"zyntra-brand\\">:root{--primary:#6C5CE7!important;--primary-hover:#5A4BD1!important;--accent:#A29BFE!important}.login-card .logo-img,.login-logo img{filter:hue-rotate(260deg) saturate(1.3)!important}</style><style>.zyntra-demo-banner{position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#6C5CE7 0%,#4834d4 100%);color:#fff;text-align:center;padding:6px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:13px;font-weight:500;box-shadow:0 2px 8px rgba(108,92,231,.3);display:flex;align-items:center;justify-content:center;gap:12px}.zyntra-demo-banner a{color:#fff;background:rgba(255,255,255,.2);padding:3px 12px;border-radius:20px;text-decoration:none;font-weight:600}body{padding-top:36px!important}.sidebar,[class*=sidebar]{top:36px!important}header,.header,[class*=header]{top:36px!important}</style></head>";\
\
        # Injetar banner demo depois de <body>\
        sub_filter "<body>" "<body><div class=\\"zyntra-demo-banner\\">&#128640; <strong>Modo Demonstracao</strong> &mdash; Explore todas as funcionalidades do Zyntra SGE <a href=\\"/Zyntra-SGE/\\" target=\\"_blank\\">&larr; Assinar Plano</a></div>";\
        sub_filter "<body " "<body data-demo=\\"true\\" ";\
    }'

# Inserir o novo bloco
sed -i "${LOC_LINE}i\\${NEW_BLOCK}" $NGINX_FILE

echo ""
echo "=== Verificando ==="
grep -n 'zyntra-demo\|sub_filter' $NGINX_FILE | head -20

echo ""
echo "=== Testando Nginx ==="
nginx -t

echo ""
echo "=== Recarregando ==="
systemctl reload nginx

echo ""
echo "=== Teste final ==="
sleep 1
TITLE=$(curl -sk 'https://aluforce.api.br/zyntra-demo/login.html' | grep '<title>' | head -1)
echo "Title: $TITLE"

BANNER=$(curl -sk 'https://aluforce.api.br/zyntra-demo/login.html' | grep -c 'zyntra-demo-banner')
echo "Banner count: $BANNER"

ZYNTRA=$(curl -sk 'https://aluforce.api.br/zyntra-demo/login.html' | grep -ci 'zyntra' || echo 0)
echo "Zyntra mentions: $ZYNTRA"

echo ""
echo "DONE!"
