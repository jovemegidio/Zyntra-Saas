#!/bin/bash
# Visual test using the SAME login approach as the working diag script
set +H

echo "=== ZYNTRA DEMO VISUAL TEST ==="

# Login (same approach as working diag script)
LOGIN=$(curl -s -X POST http://localhost:3003/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","password":"Demo@2026!"}' \
  -c /tmp/demo-visual-ck.txt)

TOKEN=$(echo "$LOGIN" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "Login FAILED: $LOGIN"
    exit 1
fi
echo "Login: OK"

echo ""
echo "========== 1. DASHBOARD =========="
curl -sk -o /tmp/zd.html https://aluforce.api.br/zyntra-demo/dashboard -b /tmp/demo-visual-ck.txt
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zd.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zd.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zd.html | sort -u
echo "Banner present: $(grep -c 'zyntra-demo-banner' /tmp/zd.html)"
echo "Remaining Aluforce (excl api.br):"
grep -in 'aluforce' /tmp/zd.html | grep -iv 'aluforce\.api\.br' | wc -l

echo ""
echo "========== 2. COMPRAS =========="
curl -sk -o /tmp/zc.html https://aluforce.api.br/zyntra-demo/Compras -b /tmp/demo-visual-ck.txt
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zc.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zc.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zc.html | head -1)"
echo "Remaining Aluforce (excl api.br):"
grep -in 'aluforce' /tmp/zc.html | grep -iv 'aluforce\.api\.br' | wc -l

echo ""
echo "========== 3. NFe (Faturamento) =========="
curl -sk -o /tmp/zn.html https://aluforce.api.br/zyntra-demo/NFe -b /tmp/demo-visual-ck.txt
echo "Size: $(wc -c < /tmp/zn.html)"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zn.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zn.html | grep -i 'zyntra\|logo' | sort -u
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zn.html | head -1)"

echo ""
echo "========== 4. VENDAS =========="
curl -sk -o /tmp/zv.html https://aluforce.api.br/zyntra-demo/Vendas -b /tmp/demo-visual-ck.txt
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zv.html)"
echo "Logo imgs:"
grep -oP 'src="[^"]*"' /tmp/zv.html | grep -i 'zyntra\|logo' | sort -u

echo ""
echo "========== 5. LOGIN PAGE =========="
curl -sk -o /tmp/zl.html https://aluforce.api.br/zyntra-demo/login.html
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zl.html)"
echo "Favicon: $(grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zl.html | head -1)"

echo ""
echo "========== 6. PRODUCTION (should say Aluforce) =========="
curl -sk -o /tmp/zp.html https://aluforce.api.br/login.html
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zp.html)"

echo ""
echo "========== 7. IMAGE FILES (HTTP codes) =========="
echo "zyntra-logo.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-logo.png)"
echo "zyntra-branco.png: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/zyntra-branco.png)"
echo "favicon-zyntra.jpg: $(curl -sk -o /dev/null -w '%{http_code}' https://aluforce.api.br/zyntra-demo/images/favicon-zyntra.jpg)"

echo ""
echo "=== ALL DONE ==="
