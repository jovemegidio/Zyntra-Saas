#!/bin/bash
# Add Igreja proxy block to nginx config
# Insert before the last closing brace of the server block

NGINX_CONF="/etc/nginx/sites-enabled/aluforce"

# Check if already exists
if grep -q "zyntra-igrejas" "$NGINX_CONF" 2>/dev/null; then
    echo "Igreja proxy already configured in nginx"
    exit 0
fi

# Find the line with the last closing brace and insert before it
# We'll add after the last location block, before the final }
IGREJA_BLOCK='
    # ============================================
    # ZYNTRA IGREJAS - Plataforma Igreja (porta 3016)
    # ============================================
    location ^~ /igreja/ {
        proxy_pass http://127.0.0.1:3016/igreja/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
'

# Backup nginx config
cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"

# Use sed to insert before the LAST closing brace
# Find the line number of the last }
LAST_BRACE=$(grep -n "^}" "$NGINX_CONF" | tail -1 | cut -d: -f1)

if [ -z "$LAST_BRACE" ]; then
    echo "ERROR: Could not find closing brace in nginx config"
    exit 1
fi

# Insert the block before the last }
sed -i "${LAST_BRACE}i\\
\\
    # ============================================\\
    # ZYNTRA IGREJAS - Plataforma Igreja (porta 3016)\\
    # ============================================\\
    location ^~ /igreja/ {\\
        proxy_pass http://127.0.0.1:3016/igreja/;\\
        proxy_http_version 1.1;\\
        proxy_set_header Upgrade \$http_upgrade;\\
        proxy_set_header Connection \"upgrade\";\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
        proxy_set_header X-Forwarded-Proto \$scheme;\\
        proxy_read_timeout 300s;\\
        proxy_connect_timeout 75s;\\
    }" "$NGINX_CONF"

echo "Igreja proxy block added to nginx"

# Test nginx config
nginx -t 2>&1
if [ $? -eq 0 ]; then
    echo "Nginx config OK, reloading..."
    systemctl reload nginx
    echo "Nginx reloaded successfully"
else
    echo "ERROR: Nginx config test failed, restoring backup..."
    cp "${NGINX_CONF}.bak."* "$NGINX_CONF" 2>/dev/null
    systemctl reload nginx
    echo "Backup restored"
fi
