#!/bin/bash
# Add Igreja proxy to nginx - insert before "location / {" catch-all
CONF="/etc/nginx/sites-enabled/aluforce"

# Check if already exists
if grep -q "3016" "$CONF" 2>/dev/null; then
    echo "Igreja proxy already in nginx"
    exit 0
fi

# Move backup files out of sites-enabled
mv /etc/nginx/sites-enabled/aluforce.bak.* /tmp/ 2>/dev/null

# Find the line "    # Rota raiz e arquivos estaticos"
LINE=$(grep -n "Rota raiz e arquivos estaticos" "$CONF" | head -1 | cut -d: -f1)

if [ -z "$LINE" ]; then
    # Fallback: find "location / {" that's not location /api or /socket.io etc
    LINE=$(grep -n "^    location / {" "$CONF" | tail -1 | cut -d: -f1)
fi

if [ -z "$LINE" ]; then
    echo "ERROR: Could not find insertion point"
    exit 1
fi

echo "Inserting at line $LINE"

# Create the block to insert
cat > /tmp/igreja-block.txt << 'BLOCK'
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

BLOCK

# Insert the block before the target line
sed -i "$((LINE))r /tmp/igreja-block.txt" "$CONF"
# Actually we need to insert BEFORE, not after. Use a different approach:
# Revert and use head/tail
cp "$CONF" /tmp/aluforce-nginx-backup
head -n $((LINE-1)) /tmp/aluforce-nginx-backup > "$CONF"
cat /tmp/igreja-block.txt >> "$CONF"
tail -n +$LINE /tmp/aluforce-nginx-backup >> "$CONF"

# Test
nginx -t 2>&1
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "SUCCESS: Igreja proxy added and nginx reloaded"
else
    echo "ERROR: nginx test failed, restoring..."
    cp /tmp/aluforce-nginx-backup "$CONF"
    nginx -t 2>&1
    systemctl reload nginx
fi
