#!/bin/bash
set +H
echo "=== ZYNTRA DEMO VISUAL TEST ==="

# Login
TOKEN=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "FAILED: No token"
    exit 1
fi
echo "Login: OK"

# ===============================
# TEST 1: Dashboard via proxy
# ===============================
echo ""
echo "=== 1. DASHBOARD ==="
curl -sk -o /tmp/ztest-dash.html \
  https://aluforce.api.br/zyntra-demo/dashboard \
  -b "token=$TOKEN"

echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-dash.html)"
echo ""
echo "Logo refs:"
grep -oP 'src="[^"]*"' /tmp/ztest-dash.html | grep -i 'logo\|zyntra\|image' | head -10
echo ""
echo "Favicon ref:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-dash.html | head -3
echo ""
echo "Banner present: $(grep -c 'zyntra-demo-banner' /tmp/ztest-dash.html)"
echo ""
echo "CSS brand present: $(grep -c 'zyntra-brand' /tmp/ztest-dash.html)"
echo ""
echo "Remaining 'Aluforce' (excluding aluforce.api.br):"
grep -oi 'aluforce' /tmp/ztest-dash.html | wc -l
grep -in 'aluforce' /tmp/ztest-dash.html | grep -iv 'aluforce\.api\.br' | head -5

# ===============================
# TEST 2: Compras module via proxy
# ===============================
echo ""
echo "=== 2. COMPRAS MODULE ==="
curl -sk -o /tmp/ztest-compras.html \
  https://aluforce.api.br/zyntra-demo/Compras \
  -b "token=$TOKEN"

echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-compras.html)"
echo ""
echo "Logo refs:"
grep -oP 'src="[^"]*"' /tmp/ztest-compras.html | grep -i 'logo\|zyntra\|image' | head -10
echo ""
echo "Favicon ref:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-compras.html | head -3

# ===============================
# TEST 3: Faturamento via proxy  
# ===============================
echo ""
echo "=== 3. FATURAMENTO MODULE ==="
curl -sk -o /tmp/ztest-fat.html \
  https://aluforce.api.br/zyntra-demo/NFe \
  -b "token=$TOKEN"

echo "Size: $(wc -c < /tmp/ztest-fat.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-fat.html)"
echo ""
echo "Logo refs:"
grep -oP 'src="[^"]*"' /tmp/ztest-fat.html | grep -i 'logo\|zyntra\|image' | head -10
echo ""
echo "Favicon ref:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-fat.html | head -3

# ===============================
# TEST 4: Login page
# ===============================
echo ""
echo "=== 4. LOGIN PAGE ==="
curl -sk -o /tmp/ztest-login.html \
  https://aluforce.api.br/zyntra-demo/login.html

echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-login.html)"
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-login.html | head -1)"

# ===============================
# TEST 5: Production NOT affected
# ===============================
echo ""
echo "=== 5. PRODUCTION (should be Aluforce) ==="
curl -sk -o /tmp/ztest-prod.html https://aluforce.api.br/login.html
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/ztest-prod.html)"
echo "Logo: $(grep -oP 'src="[^"]*Logo[^"]*"' /tmp/ztest-prod.html | head -2)"
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/ztest-prod.html | head -1)"

# ===============================
# TEST 6: Image files accessible
# ===============================
echo ""
echo "=== 6. IMAGE FILES ==="
echo "zyntra-logo.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-logo.png)"
echo "zyntra-branco.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-branco.png)"
echo "favicon-zyntra.jpg: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/favicon-zyntra.jpg)"

echo ""
echo "=== ALL TESTS DONE ==="
