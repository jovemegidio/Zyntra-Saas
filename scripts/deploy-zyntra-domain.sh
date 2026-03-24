#!/bin/bash
# ============================================
# DEPLOY ZYNTRA com Domínio Próprio
# ============================================
# Uso: bash deploy-zyntra-domain.sh zyntra.com.br
# ============================================

DOMINIO=${1:-""}

if [ -z "$DOMINIO" ]; then
    echo "❌ Uso: bash $0 <dominio>"
    echo "   Exemplo: bash $0 zyntra.com.br"
    echo "   Exemplo: bash $0 sge.zyntra.com.br"
    exit 1
fi

echo "🚀 Deploy Zyntra-SGE com domínio: $DOMINIO"
echo "============================================"

# 1. Criar diretório dedicado (separado do Aluforce)
echo ""
echo "=== 1. Criando diretório /var/www/zyntra-sge ==="
mkdir -p /var/www/zyntra-sge

# Copiar arquivos do local atual
if [ -d "/var/www/aluforce/Zyntra-SGE" ]; then
    echo "Copiando de /var/www/aluforce/Zyntra-SGE..."
    cp -r /var/www/aluforce/Zyntra-SGE/* /var/www/zyntra-sge/
    echo "✅ Arquivos copiados"
else
    echo "⚠️ /var/www/aluforce/Zyntra-SGE não existe, faça upload dos arquivos"
fi

TOTAL=$(find /var/www/zyntra-sge/ -type f | wc -l)
echo "Total de arquivos: $TOTAL"

# 2. Remover <base href="/Zyntra-SGE/"> dos HTMLs (não precisa mais com domínio próprio)
echo ""
echo "=== 2. Removendo base href dos HTMLs ==="
find /var/www/zyntra-sge/ -name "*.html" -exec sed -i 's|<base href="/Zyntra-SGE/">|<!-- base href removido - domínio próprio -->|g' {} \;
FIXED=$(grep -rl "base href removido" /var/www/zyntra-sge/ 2>/dev/null | wc -l)
echo "✅ $FIXED arquivos corrigidos"

# 3. Configurar Nginx
echo ""
echo "=== 3. Configurando Nginx ==="

cat > /etc/nginx/sites-available/zyntra << NGINXEOF
# Zyntra-SGE Virtual Host - $DOMINIO
# Gerado em: $(date)

server {
    listen 80;
    server_name $DOMINIO;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMINIO;

    charset utf-8;
    charset_types text/css application/javascript application/json text/xml text/plain;

    root /var/www/zyntra-sge;
    index index.html;

    # SSL - certbot vai configurar automaticamente
    ssl_certificate /etc/letsencrypt/live/aluforce.api.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aluforce.api.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Serve static files
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache CSS/JS
    location ~* \.(css|js)$ {
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
    }

    # Cache imagens
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # HTML sem cache
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Bloquear dotfiles
    location ~ /\. {
        deny all;
    }

    access_log /var/log/nginx/zyntra_access.log;
    error_log /var/log/nginx/zyntra_error.log;
}
NGINXEOF

echo "✅ Config criada em /etc/nginx/sites-available/zyntra"

# 4. Ativar o site
echo ""
echo "=== 4. Ativando site ==="
ln -sf /etc/nginx/sites-available/zyntra /etc/nginx/sites-enabled/zyntra
echo "✅ Symlink criado"

# 5. Testar Nginx
echo ""
echo "=== 5. Testando Nginx ==="
nginx -t 2>&1
if [ $? -eq 0 ]; then
    nginx -s reload
    echo "✅ Nginx recarregado"
else
    echo "❌ Erro no Nginx! Removendo config..."
    rm /etc/nginx/sites-enabled/zyntra
    nginx -s reload
    exit 1
fi

# 6. Remover bloco Zyntra do config Aluforce (opcional)
echo ""
echo "=== 6. Limpando config Aluforce ==="
# O bloco ^~ /Zyntra-SGE/ pode ser mantido para redirecionamento
python3 << 'PYEOF'
with open("/etc/nginx/sites-enabled/aluforce", "r") as f:
    content = f.read()

# Substituir o bloco Zyntra por um redirect
import re
old_block = re.search(r'(\s*# =+\n\s*# ZYNTRA-SGE.*?location \^~ /Zyntra-SGE/.*?\n\s*\})', content, re.DOTALL)
if old_block:
    redirect_block = """
    # ZYNTRA-SGE - Redirect para domínio próprio
    location ^~ /Zyntra-SGE/ {
        return 301 https://DOMAIN_PLACEHOLDER$request_uri;
    }
""".replace("DOMAIN_PLACEHOLDER", "DOMINIO_VAR")
    content = content[:old_block.start()] + redirect_block + content[old_block.end():]
    with open("/etc/nginx/sites-enabled/aluforce", "w") as f:
        f.write(content)
    print("✅ Bloco Zyntra substituído por redirect")
else:
    print("ℹ️ Bloco Zyntra não encontrado no config Aluforce")
PYEOF

# 7. SSL com Let's Encrypt
echo ""
echo "=== 7. Certificado SSL ==="
echo "⚠️ Para SSL próprio, execute manualmente:"
echo "   certbot --nginx -d $DOMINIO"
echo ""
echo "   ANTES disso, verifique que o DNS aponta para 31.97.64.102:"
echo "   dig +short $DOMINIO"
echo ""

# 8. Resumo
echo "============================================"
echo "✅ DEPLOY CONCLUÍDO!"
echo "============================================"
echo ""
echo "📋 Checklist:"
echo "  1. ✅ Arquivos em /var/www/zyntra-sge/ ($TOTAL arquivos)"
echo "  2. ✅ Nginx configurado para $DOMINIO"
echo "  3. ✅ Base href removido dos HTMLs"
echo "  4. ⏳ DNS: Aponte $DOMINIO → 31.97.64.102"
echo "  5. ⏳ SSL: certbot --nginx -d $DOMINIO"
echo ""
echo "🌐 Após DNS + SSL:"
echo "   https://$DOMINIO → Zyntra SGE"
echo "   https://aluforce.api.br → Aluforce (sem mudanças)"
echo ""
