#!/bin/bash
set +H
echo "=== ZYNTRA DEMO VISUAL TEST ==="

# Write login JSON to file (avoids all escaping issues)
python3 -c "
import json
with open('/tmp/zyntra-login.json','w') as f:
    json.dump({'email':'admin@zyntra.com.br','senha':'Demo@2026!'},f)
"

# Login
RESP=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @/tmp/zyntra-login.json)

TOKEN=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "Login FAILED: $RESP"
    exit 1
fi
echo "Login: OK"

echo ""
echo "========== 1. DASHBOARD =========="
curl -sk -o /tmp/zd.html https://aluforce.api.br/zyntra-demo/dashboard -b "token=$TOKEN"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zd.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zd.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zd.html | sort -u
echo "Banner: $(grep -c 'zyntra-demo-banner' /tmp/zd.html)"
echo "CSS: $(grep -c 'zyntra-brand' /tmp/zd.html)"
echo "Remaining Aluforce (excl api.br):"
grep -in 'aluforce' /tmp/zd.html | grep -iv 'aluforce\.api\.br' | wc -l

echo ""
echo "========== 2. COMPRAS =========="
curl -sk -o /tmp/zc.html https://aluforce.api.br/zyntra-demo/Compras -b "token=$TOKEN"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zc.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zc.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zc.html | head -1)"

echo ""
echo "========== 3. FATURAMENTO (NFe) =========="
curl -sk -o /tmp/zn.html https://aluforce.api.br/zyntra-demo/NFe -b "token=$TOKEN"
echo "Size: $(wc -c < /tmp/zn.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zn.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zn.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zn.html | head -1)"

echo ""
echo "========== 4. VENDAS =========="
curl -sk -o /tmp/zv.html https://aluforce.api.br/zyntra-demo/Vendas -b "token=$TOKEN"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zv.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zv.html | grep -i 'zyntra\|logo' | sort -u

echo ""
echo "========== 5. LOGIN PAGE =========="
curl -sk -o /tmp/zl.html https://aluforce.api.br/zyntra-demo/login.html
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zl.html)"
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zl.html | head -1)"

echo ""
echo "========== 6. PRODUCTION (unchanged) =========="
curl -sk -o /tmp/zp.html https://aluforce.api.br/login.html
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zp.html)"
echo "Logo: $(grep -oP 'src="[^"]*Logo[^"]*"' /tmp/zp.html | head -1)"

echo ""
echo "========== 7. IMAGE FILES =========="
echo "zyntra-logo.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-logo.png)"
echo "zyntra-branco.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-branco.png)"
echo "favicon-zyntra.jpg: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/favicon-zyntra.jpg)"

echo ""
echo "=== ALL DONE ==="
