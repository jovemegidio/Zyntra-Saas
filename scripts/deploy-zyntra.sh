#!/bin/bash
# ===========================================
# DEPLOY ZYNTRA-SGE - Fix Nginx + Cleanup
# ===========================================

echo "🚀 Iniciando deploy Zyntra-SGE..."

# 1. Remover pasta Aluforce errada (cópia do sistema inteiro dentro de Zyntra)
echo ""
echo "=== 1. Limpando pasta Aluforce errada ==="
if [ -d "/var/www/aluforce/Zyntra-SGE/Aluforce" ]; then
    ALUFORCE_SIZE=$(du -sh /var/www/aluforce/Zyntra-SGE/Aluforce/ 2>/dev/null | cut -f1)
    echo "Removendo /var/www/aluforce/Zyntra-SGE/Aluforce/ ($ALUFORCE_SIZE)..."
    rm -rf /var/www/aluforce/Zyntra-SGE/Aluforce/
    echo "✅ Pasta removida"
else
    echo "✅ Pasta já não existe"
fi

# 2. Criar pastas que faltam
echo ""
echo "=== 2. Criando pastas faltantes ==="
mkdir -p /var/www/aluforce/Zyntra-SGE/assets
mkdir -p /var/www/aluforce/Zyntra-SGE/Icones
mkdir -p "/var/www/aluforce/Zyntra-SGE/Fotos Usuarios"
echo "✅ Pastas criadas"

# 3. Adicionar bloco Zyntra no Nginx
echo ""
echo "=== 3. Configurando Nginx para Zyntra-SGE ==="

NGINX_CONF="/etc/nginx/sites-enabled/aluforce"

# Verificar se já existe
if grep -q "Zyntra-SGE" "$NGINX_CONF"; then
    echo "⚠️ Bloco Zyntra-SGE já existe no Nginx"
else
    # Inserir ANTES do 'location / {' final (catch-all)
    # Usando sed para inserir antes da última ocorrência de "# Rota raiz"
    sed -i '/# Rota raiz e arquivos estaticos/i \
    # ============================================\
    # ZYNTRA-SGE - Site estático\
    # ============================================\
    location /Zyntra-SGE/ {\
        alias /var/www/aluforce/Zyntra-SGE/;\
        index index.html;\
        try_files $uri $uri/ /Zyntra-SGE/index.html;\
        \
        # Cache para assets estáticos\
        location ~* \\.(css|js)$ {\
            expires 7d;\
            add_header Cache-Control "public, must-revalidate";\
        }\
        location ~* \\.(png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {\
            expires 30d;\
            add_header Cache-Control "public, immutable";\
        }\
    }\
' "$NGINX_CONF"
    echo "✅ Bloco Nginx adicionado"
fi

# 4. Testar configuração Nginx
echo ""
echo "=== 4. Testando Nginx ==="
nginx -t 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Configuração OK"
    nginx -s reload
    echo "✅ Nginx recarregado"
else
    echo "❌ ERRO na configuração Nginx!"
    echo "Revertendo..."
    # Remover o bloco adicionado em caso de erro
    sed -i '/# ZYNTRA-SGE - Site estático/,/^    }/d' "$NGINX_CONF"
    nginx -t 2>&1
fi

# 5. Verificar resultado
echo ""
echo "=== 5. Verificação ==="
sleep 1
echo "Arquivos Zyntra:"
find /var/www/aluforce/Zyntra-SGE/ -maxdepth 1 -type f | wc -l
echo "Pastas Zyntra:"
find /var/www/aluforce/Zyntra-SGE/ -maxdepth 1 -type d | tail -n +2

echo ""
echo "Teste HTTP:"
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' https://aluforce.api.br/Zyntra-SGE/)
PAGE_SIZE=$(curl -s -o /dev/null -w '%{size_download}' https://aluforce.api.br/Zyntra-SGE/)
echo "HTTP: $HTTP_CODE | Size: $PAGE_SIZE bytes"

echo ""
echo "🏁 Deploy Zyntra-SGE concluído!"
