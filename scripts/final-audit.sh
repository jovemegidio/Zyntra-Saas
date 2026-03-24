#!/bin/bash
set +H

# Login and get token
TOKEN=$(python3 << 'PYEOF'
import urllib.request, json
data = json.dumps({'email':'admin@zyntra.com.br','password':'Demo@2026!'}).encode()
req = urllib.request.Request('http://localhost:3003/api/login', data=data, headers={'Content-Type':'application/json'})
resp = json.loads(urllib.request.urlopen(req).read())
print(resp.get('token',''))
PYEOF
)

echo "=== Remaining 'Aluforce' text in ALL module pages ==="

for PAGE in dashboard Vendas Compras NFe Financeiro RH PCP; do
    curl -sk -L -o /tmp/zt-check-$PAGE.html "https://aluforce.api.br/zyntra-demo/$PAGE" \
      -H "Cookie: token=$TOKEN"
    COUNT=$(grep -oin 'aluforce' /tmp/zt-check-$PAGE.html | wc -l)
    COUNT_EXCL=$(grep -in 'aluforce' /tmp/zt-check-$PAGE.html | grep -iv 'aluforce\.api\.br\|aluforce\.com\.br' | wc -l)
    SIZE=$(wc -c < /tmp/zt-check-$PAGE.html)
    echo "$PAGE: size=$SIZE, total_aluforce=$COUNT, excl_urls=$COUNT_EXCL"
    if [ "$COUNT_EXCL" -gt 0 ]; then
        echo "  Remaining refs:"
        grep -in 'aluforce' /tmp/zt-check-$PAGE.html | grep -iv 'aluforce\.api\.br\|aluforce\.com\.br' | head -5
    fi
done

echo ""
echo "=== Check banner presence in all modules ==="
for PAGE in dashboard Vendas Compras NFe Financeiro RH PCP; do
    BANNER=$(grep -c 'zyntra-demo-banner' /tmp/zt-check-$PAGE.html)
    FAVICON=$(grep -c 'favicon-zyntra' /tmp/zt-check-$PAGE.html)
    echo "$PAGE: banner=$BANNER, favicon=$FAVICON"
done

echo ""
echo "=== Check favicon in modules ==="
for PAGE in dashboard Vendas Compras NFe Financeiro RH PCP; do
    FAV=$(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zt-check-$PAGE.html | head -1)
    echo "$PAGE: $FAV"
done

echo ""
echo "=== Production check ==="
curl -sk https://aluforce.api.br/login.html | grep -oP '<title>[^<]+</title>'
curl -sk https://aluforce.api.br/login.html | grep -c 'Zyntra'
echo "(should be 0 Zyntra references in production)"
