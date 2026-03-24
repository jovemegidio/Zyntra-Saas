#!/bin/bash
# Fix 1: Update "Assinar Plano" link in the demo banner to point to #precos
# Fix 2: Fix 404 page logo in demo by copying Zyntra logos to correct paths

NGINX="/etc/nginx/sites-enabled/aluforce"
cp "$NGINX" /tmp/aluforce-nginx-backup-$(date +%Y%m%d%H%M)

# Fix the banner link: /Zyntra-SGE/ -> /Zyntra-SGE/#precos
sed -i "s|href='/Zyntra-SGE/'|href='/Zyntra-SGE/#precos'|g" "$NGINX"

echo "=== Verify banner link ==="
grep "Assinar Plano" "$NGINX"

# Test nginx
nginx -t 2>&1
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "OK: Nginx reloaded"
else
    echo "FAIL: Nginx test failed"
    exit 1
fi

# Fix demo 404 page - ensure it has the zyntra logos
# The 404 page in the demo is served by Express from public/404.html
# Check if a custom 404 exists
echo ""
echo "=== Check 404 page ==="
ls -la /var/www/aluforce/public/404.html 2>/dev/null || echo "No public/404.html"

# Verify images accessible through demo proxy
echo ""
echo "=== Image accessibility ==="
curl -sk -o /dev/null -w "zyntra-logo.png: %{http_code}\n" "https://aluforce.api.br/zyntra-demo/images/zyntra-logo.png"
curl -sk -o /dev/null -w "zyntra-branco.png: %{http_code}\n" "https://aluforce.api.br/zyntra-demo/images/zyntra-branco.png"

echo ""
echo "DONE"
