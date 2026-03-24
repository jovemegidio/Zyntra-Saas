#!/bin/bash
# Debug why sub_filter doesn't match logos

echo "=== Exact logo text in HTML ==="
grep -o 'Logo Monocromatico[^"]*' /var/www/aluforce/public/index.html | head -5

echo ""
echo "=== Exact logo text in Nginx config ==="
grep -o 'Logo Monocromatico[^"]*' /etc/nginx/sites-enabled/aluforce | head -10

echo ""
echo "=== Character-by-character comparison ==="
HTML_LOGO=$(grep -o 'Logo Monocromatico[^"]*' /var/www/aluforce/public/index.html | head -1)
CONF_LOGO=$(grep -o 'Logo Monocromatico[^"]*' /etc/nginx/sites-enabled/aluforce | head -1)
echo "HTML: [$HTML_LOGO]"
echo "CONF: [$CONF_LOGO]"
echo "Match: $([ "$HTML_LOGO" = "$CONF_LOGO" ] && echo YES || echo NO)"
echo "HTML bytes: $(echo -n "$HTML_LOGO" | wc -c)"
echo "CONF bytes: $(echo -n "$CONF_LOGO" | wc -c)"

echo ""
echo "=== Direct test: does sub_filter work? ==="
# Create a simple test
echo 'Logo Monocromatico - Azul - Aluforce.png TEST' > /tmp/subfilter-test.txt
echo "Test input: $(cat /tmp/subfilter-test.txt)"

echo ""
echo "=== Try matching with shorter pattern ==="
# Check if the response from the server has the logo text at all
TOKEN=$(python3 << 'PYEOF'
import urllib.request, json
data = json.dumps({'email':'admin@zyntra.com.br','password':'Demo@2026!'}).encode()
req = urllib.request.Request('http://localhost:3003/api/login', data=data, headers={'Content-Type':'application/json'})
resp = json.loads(urllib.request.urlopen(req).read())
print(resp.get('token',''))
PYEOF
)

echo "Token: ${TOKEN:0:20}..."

# Get raw response from server (NOT through nginx)
curl -s http://localhost:3003/dashboard -b "token=$TOKEN" > /tmp/raw-dash.html
echo ""
echo "=== Logo in RAW server response (no nginx) ==="
grep -o 'Logo Monocromatico[^"]*' /tmp/raw-dash.html | head -5

echo ""
echo "=== Logo in PROXIED response (through nginx) ==="
curl -sk https://aluforce.api.br/zyntra-demo/dashboard -b "token=$TOKEN" > /tmp/proxy-dash.html
grep -o 'Logo Monocromatico[^"]*\|zyntra-logo[^"]*\|zyntra-branco[^"]*' /tmp/proxy-dash.html | head -10

echo ""
echo "=== Nginx error log ==="
tail -5 /var/log/nginx/aluforce_error.log

echo "DONE"
