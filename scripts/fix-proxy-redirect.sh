#!/bin/bash
set -e

NGINX_FILE="/etc/nginx/sites-enabled/aluforce"

echo "=== Adicionando proxy_redirect para corrigir redirects ==="

# Dentro do bloco zyntra-demo, adicionar proxy_redirect para corrigir 302 redirects
# O Express faz redirect("/login.html") que vira Location: /login.html
# Precisamos que vire Location: /zyntra-demo/login.html

# Adicionar proxy_redirect depois de proxy_pass
sed -i '/location \^~ \/zyntra-demo\// {
    n; # proxy_pass line
    a\        # Reescrever Location headers de redirect\
        proxy_redirect / /zyntra-demo/;\
        proxy_redirect http://localhost:3003/ /zyntra-demo/;
}' $NGINX_FILE

echo "=== Verificando ==="
grep -A3 'proxy_pass.*3003' $NGINX_FILE | head -10

echo ""
echo "=== Testando Nginx ==="
nginx -t

echo ""
echo "=== Recarregando ==="
systemctl reload nginx

echo ""
echo "=== Testando redirect ==="
sleep 1
echo "Root redirect:"
curl -sk -D- 'https://aluforce.api.br/zyntra-demo/' 2>&1 | grep -i 'location:' | head -1

echo "Login page status:"
curl -sk -o /dev/null -w '%{http_code}\n' 'https://aluforce.api.br/zyntra-demo/login.html'

echo ""
echo "DONE!"
