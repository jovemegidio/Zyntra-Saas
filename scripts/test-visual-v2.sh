#!/bin/bash
echo "=== ZYNTRA DEMO VISUAL TEST ==="

# Login using Python (avoids bash ! escaping)
TOKEN=$(python3 -c "
import urllib.request, json
data = json.dumps({'email':'admin@zyntra.com.br','senha':'Demo@2026!'}).encode()
req = urllib.request.Request('http://localhost:3003/api/auth/login', data=data, headers={'Content-Type':'application/json'})
resp = json.loads(urllib.request.urlopen(req).read())
print(resp.get('token',''))
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "FAILED: No token"
    exit 1
fi
echo "Login: OK (token length: ${#TOKEN})"

echo ""
echo "=== 1. DASHBOARD ==="
curl -sk -o /tmp/ztest-dash.html \
  https://aluforce.api.br/zyntra-demo/dashboard \
  -b "token=$TOKEN"

echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-dash.html)"
echo "Logo refs:"
grep -oP 'src="[^"]*"' /tmp/ztest-dash.html | grep -i 'logo\|zyntra\|image' | head -10
echo "Favicon ref:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-dash.html | head -3
echo "Banner: $(grep -c 'zyntra-demo-banner' /tmp/ztest-dash.html)"
echo "CSS brand: $(grep -c 'zyntra-brand' /tmp/ztest-dash.html)"
echo "Remaining Aluforce (excl api.br):"
grep -in 'aluforce' /tmp/ztest-dash.html | grep -iv 'aluforce\.api\.br' | head -5

echo ""
echo "=== 2. COMPRAS ==="
curl -sk -o /tmp/ztest-compras.html \
  https://aluforce.api.br/zyntra-demo/Compras \
  -b "token=$TOKEN"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-compras.html)"
echo "Logo refs:"
grep -oP 'src="[^"]*"' /tmp/ztest-compras.html | grep -i 'logo\|zyntra\|image' | head -10
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-compras.html | head -1)"

echo ""
echo "=== 3. NFE (Faturamento) ==="
curl -sk -o /tmp/ztest-nfe.html \
  https://aluforce.api.br/zyntra-demo/NFe \
  -b "token=$TOKEN"
echo "Size: $(wc -c < /tmp/ztest-nfe.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-nfe.html)"
echo "Logo refs:"
grep -oP 'src="[^"]*"' /tmp/ztest-nfe.html | grep -i 'logo\|zyntra\|image' | head -10
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-nfe.html | head -1)"

echo ""
echo "=== 4. LOGIN PAGE ==="
curl -sk -o /tmp/ztest-login.html https://aluforce.api.br/zyntra-demo/login.html
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-login.html)"
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-login.html | head -1)"

echo ""
echo "=== 5. PRODUCTION (should be Aluforce) ==="
curl -sk -o /tmp/ztest-prod.html https://aluforce.api.br/login.html
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-prod.html)"
echo "Logo: $(grep -oP 'src="[^"]*Logo[^"]*"' /tmp/ztest-prod.html | head -2)"

echo ""
echo "=== 6. IMAGE FILES ==="
echo "zyntra-logo.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-logo.png)"
echo "zyntra-branco.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-branco.png)"
echo "favicon-zyntra.jpg: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/favicon-zyntra.jpg)"

echo ""
echo "=== DONE ==="
