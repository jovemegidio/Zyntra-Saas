#!/bin/bash
# Fix Nginx config - remove orphaned lines and properly add Zyntra block
echo "=== Fixing Nginx config ==="

NGINX_CONF="/etc/nginx/sites-enabled/aluforce"

# Backup first
cp "$NGINX_CONF" "$NGINX_CONF.bak.$(date +%s)"

python3 << 'PYEOF'
import re

with open("/etc/nginx/sites-enabled/aluforce", "r") as f:
    content = f.read()

# Remove the orphaned block from the broken sed (the stray location + extra })
# Pattern: After wbot-socket closing }, there's an orphaned location block
content = content.replace(
    """        proxy_cache off;
    }
        location ~* \\.(png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }""",
    """        proxy_cache off;
    }"""
)

# Also remove any leftover from the first sed attempt (the ============ lines without proper block)
# Check if the Zyntra block already exists and is properly formed
if "location ^~ /Zyntra-SGE/" in content:
    print("Zyntra block already exists, checking placement...")
    # Verify it's inside the server block
else:
    print("Adding Zyntra block...")
    # Insert before "# Rota raiz e arquivos estaticos"
    zyntra_block = """
    # ============================================
    # ZYNTRA-SGE - Landing Page estatica
    # ============================================
    location ^~ /Zyntra-SGE/ {
        root /var/www/aluforce;
        index index.html;
        try_files $uri $uri/ /Zyntra-SGE/index.html;

        # Headers de seguranca
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options SAMEORIGIN;
    }

"""
    content = content.replace(
        "    # Rota raiz e arquivos estaticos",
        zyntra_block + "    # Rota raiz e arquivos estaticos"
    )

with open("/etc/nginx/sites-enabled/aluforce", "w") as f:
    f.write(content)

print("Done writing config")
PYEOF

echo ""
echo "=== Config around Zyntra block ==="
grep -n -B2 -A12 'ZYNTRA\|Zyntra' /etc/nginx/sites-enabled/aluforce

echo ""
echo "=== Testing Nginx ==="
nginx -t 2>&1
if [ $? -eq 0 ]; then
    nginx -s reload
    echo "✅ Nginx reloaded!"
    sleep 1
    echo ""
    echo "=== HTTP Tests ==="
    curl -s -o /dev/null -w "Index:  HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/
    curl -s -o /dev/null -w "Login:  HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/login.html
    curl -s -o /dev/null -w "CSS:    HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/css/styles.css
    curl -s -o /dev/null -w "JS:     HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/js/main.js
    curl -s -o /dev/null -w "Page:   HTTP %{http_code} | %{size_download} bytes\n" https://aluforce.api.br/Zyntra-SGE/pages/planos-e-precos.html
else
    echo "❌ Nginx test FAILED!"
    echo "Restoring backup..."
    LATEST_BAK=$(ls -t /etc/nginx/sites-enabled/aluforce.bak.* | head -1)
    cp "$LATEST_BAK" "$NGINX_CONF"
    nginx -t 2>&1
    nginx -s reload
    echo "Restored from backup"
fi
