#!/bin/bash
set -e

NGINX_FILE="/etc/nginx/sites-enabled/aluforce"

echo "=== Adicionando script de base-path rewrite no HTML ==="

# O sub_filter ja injeta CSS/banner antes de </head>
# Vamos ADICIONAR um sub_filter que injeta um script de base-path antes de </body>
# Este script intercepta window.location.href assignments para adicionar /zyntra-demo/ prefix

# Verificar se ja tem o basePath script
if grep -q 'zyntra-base-path' $NGINX_FILE; then
    echo "basePath script ja existe, removendo para recriar..."
    # Nao precisa remover, vamos pular
fi

# Adicionar sub_filter para injetar script antes de </body>
# O script faz:
# 1. Define window.__ZYNTRA_BASE = '/zyntra-demo'
# 2. Monkey-patches window.location.href setter para adicionar prefix
# 3. Monkey-patches fetch/XHR para prefixar /api/ calls se necessario

# Inserir depois da ultima sub_filter existente no bloco
LAST_SUB=$(grep -n 'sub_filter.*<body ' $NGINX_FILE | tail -1 | cut -d: -f1)
echo "Ultima sub_filter na linha $LAST_SUB"

# Inserir apos a ultima sub_filter
sed -i "${LAST_SUB}a\\
\\
        # Injetar script de base-path para corrigir navegacao interna\\
        sub_filter \"</body>\" \"<script id=\\\\\"zyntra-base-path\\\\\">(function(){var B='/zyntra-demo';if(location.pathname.indexOf(B)!==0)return;var origAssign=Object.getOwnPropertyDescriptor(window.location.__proto__,'href');if(!window.__zyntraPatched){window.__zyntraPatched=true;var _open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){if(typeof u==='string'&&u.charAt(0)==='/'&&u.indexOf(B)!==0){u=B+u}return _open.apply(this,arguments)};var _fetch=window.fetch;window.fetch=function(u,o){if(typeof u==='string'&&u.charAt(0)==='/'&&u.indexOf(B)!==0){u=B+u}return _fetch.call(this,u,o)};document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href){var p=new URL(a.href);if(p.origin===location.origin&&p.pathname.charAt(0)==='/'&&p.pathname.indexOf(B)!==0){a.href=B+p.pathname+p.search+p.hash}}},true);var _pushState=history.pushState;history.pushState=function(){if(arguments[2]&&typeof arguments[2]==='string'&&arguments[2].charAt(0)==='/'&&arguments[2].indexOf(B)!==0){arguments[2]=B+arguments[2]}return _pushState.apply(this,arguments)};var _replaceState=history.replaceState;history.replaceState=function(){if(arguments[2]&&typeof arguments[2]==='string'&&arguments[2].charAt(0)==='/'&&arguments[2].indexOf(B)!==0){arguments[2]=B+arguments[2]}return _replaceState.apply(this,arguments)}}})()</script></body>\";" $NGINX_FILE

echo ""
echo "=== Verificando ==="
grep -c 'sub_filter' $NGINX_FILE
echo "sub_filters no config"

echo ""
echo "=== Testando Nginx ==="
nginx -t

if [ $? -eq 0 ]; then
    echo "=== Recarregando ==="
    systemctl reload nginx
    
    echo ""
    echo "=== Teste ==="
    sleep 1
    HAS_SCRIPT=$(curl -sk 'https://aluforce.api.br/zyntra-demo/login.html' | grep -c 'zyntra-base-path')
    echo "Base path script injetado: $HAS_SCRIPT"
    
    REDIRECT=$(curl -sk -D- 'https://aluforce.api.br/zyntra-demo/' 2>&1 | grep -i 'location:')
    echo "Root redirect: $REDIRECT"
else
    echo "NGINX TEST FAILED!"
fi

echo ""
echo "DONE!"
