#!/bin/bash
set +H

# Login
LOGIN=$(curl -s -X POST http://localhost:3003/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}')

TOKEN=$(echo "$LOGIN" | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "Login FAILED: $LOGIN"
    exit 1
fi
echo "Login: OK"

# Dashboard via proxy
echo ""
echo "=== DASHBOARD ==="
curl -sk -o /tmp/zd.html "https://aluforce.api.br/zyntra-demo/dashboard" -b "token=$TOKEN"
DSIZE=$(wc -c < /tmp/zd.html)
echo "Size: $DSIZE bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zd.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zd.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zd.html | sort -u
echo "Banner: $(grep -c 'zyntra-demo-banner' /tmp/zd.html)"

# Compras
echo ""
echo "=== COMPRAS ==="
curl -sk -o /tmp/zc.html "https://aluforce.api.br/zyntra-demo/Compras" -b "token=$TOKEN"
echo "Size: $(wc -c < /tmp/zc.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zc.html)"
echo "Logos:"
grep -oP 'src="[^"]*"' /tmp/zc.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zc.html | head -1)"

# NFe
echo ""
echo "=== FATURAMENTO ==="
curl -sk -o /tmp/zn.html "https://aluforce.api.br/zyntra-demo/NFe" -b "token=$TOKEN"
echo "Size: $(wc -c < /tmp/zn.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zn.html)"
echo "Logos:"
grep -oP 'src="[^"]*"' /tmp/zn.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zn.html | head -1)"

# Image files
echo ""
echo "=== IMAGES ==="
echo "zyntra-logo.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-logo.png)"
echo "zyntra-branco.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-branco.png)"
echo "favicon-zyntra.jpg: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/favicon-zyntra.jpg)"

# Production
echo ""
echo "=== PRODUCTION ==="
curl -sk https://aluforce.api.br/login.html | grep -oP '<title>[^<]+</title>'
echo "DONE"
