#!/bin/bash
# Fix Zyntra Nginx location block
echo "=== Fixing Zyntra Nginx config ==="

NGINX_CONF="/etc/nginx/sites-enabled/aluforce"

# Remover bloco antigo
sed -i '/# ============================================/{
    N
    /# ZYNTRA-SGE - Site estático/{
        # Encontrou o bloco, agora deletar até o fechamento
        :loop
        N
        /^    }\n/!b loop
        d
    }
}' "$NGINX_CONF"

# Abordagem mais simples: remover linhas do bloco Zyntra
python3 -c "
import re
with open('$NGINX_CONF', 'r') as f:
    content = f.read()

# Remove o bloco Zyntra existente (tudo entre os marcadores)
pattern = r'\n\s*# =+\n\s*# ZYNTRA-SGE.*?location /Zyntra-SGE/.*?\n\s*\}\n'
content = re.sub(pattern, '\n', content, flags=re.DOTALL)

# Agora insere o bloco novo ANTES de '# Rota raiz'
new_block = '''
    # ============================================
    # ZYNTRA-SGE - Landing Page estática
    # ============================================
    location ^~ /Zyntra-SGE/ {
        root /var/www/aluforce;
        index index.html;
        try_files \$uri \$uri/ /Zyntra-SGE/index.html;

        # Headers de segurança
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options SAMEORIGIN;
    }

'''
content = content.replace('    # Rota raiz e arquivos estaticos', new_block + '    # Rota raiz e arquivos estaticos')

with open('$NGINX_CONF', 'w') as f:
    f.write(content)
print('✅ Nginx config atualizado')
"

echo ""
echo "=== Verificando config ==="
grep -n -A 12 'ZYNTRA' "$NGINX_CONF"

echo ""
echo "=== Testando Nginx ==="
nginx -t 2>&1
if [ $? -eq 0 ]; then
    nginx -s reload
    echo "✅ Nginx recarregado"
    sleep 1
    
    echo ""
    echo "=== Teste HTTP ==="
    curl -s -o /dev/null -w "Index: HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/
    curl -s -o /dev/null -w "Login: HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/login.html
    curl -s -o /dev/null -w "CSS:   HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/css/styles.css
    curl -s -o /dev/null -w "JS:    HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/js/main.js
else
    echo "❌ ERRO Nginx! Revertendo..."
fi
