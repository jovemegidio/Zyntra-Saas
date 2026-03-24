#!/bin/bash
set -e

NGINX_FILE="/etc/nginx/sites-enabled/aluforce"

echo "=== Adding path rewrite sub_filters ==="

# Find the last sub_filter line in zyntra-demo block
LAST_SUB=$(grep -n 'sub_filter.*</body>' $NGINX_FILE | head -1 | cut -d: -f1)
echo "Last sub_filter: line $LAST_SUB"

# Check if path rewrites already exist
if grep -q "zyntra-demo/login.html" $NGINX_FILE; then
    echo "Path rewrites already exist, skipping"
else
    # Add path rewrites after the last sub_filter
    sed -i "${LAST_SUB}a\\
\\
        # Reescrever paths absolutos no JS para funcionar com base path\\
        sub_filter \"'/login.html'\" \"'/zyntra-demo/login.html'\";" $NGINX_FILE

    echo "Path rewrite sub_filter added"
fi

echo ""
echo "=== Testing Nginx ==="
nginx -t

if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "Nginx reloaded OK"
else
    echo "NGINX TEST FAILED - reverting"
fi

echo ""
echo "DONE!"
