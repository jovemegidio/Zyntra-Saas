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

echo "Token: ${TOKEN:0:20}..."

# KEY: Use -L to follow redirects (301 /Compras -> /Compras/)
echo ""
echo "=== COMPRAS (with -L follow redirect) ==="
curl -sk -L -o /tmp/zt-c2.html "https://aluforce.api.br/zyntra-demo/Compras" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-c2.html)"
grep -oP '<title>[^<]+</title>' /tmp/zt-c2.html
echo "Logos:"
grep -oP 'src="[^"]*"' /tmp/zt-c2.html | grep -i 'logo\|zyntra\|image' | sort -u
echo "Favicon:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zt-c2.html | sort -u
echo "Banner: $(grep -c 'zyntra-demo-banner' /tmp/zt-c2.html)"
echo "Remaining Aluforce (excl api.br):"
grep -in 'aluforce' /tmp/zt-c2.html | grep -iv 'aluforce\.api\.br' | head -5
echo "Count: $(grep -in 'aluforce' /tmp/zt-c2.html | grep -iv 'aluforce\.api\.br' | wc -l)"

echo ""
echo "=== FATURAMENTO (with -L) ==="
curl -sk -L -o /tmp/zt-f2.html "https://aluforce.api.br/zyntra-demo/NFe" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-f2.html)"
grep -oP '<title>[^<]+</title>' /tmp/zt-f2.html
echo "Logos:"
grep -oP 'src="[^"]*"' /tmp/zt-f2.html | grep -i 'logo\|zyntra\|image' | sort -u
echo "Remaining Aluforce:"
grep -in 'aluforce' /tmp/zt-f2.html | grep -iv 'aluforce\.api\.br' | head -5
echo "Count: $(grep -in 'aluforce' /tmp/zt-f2.html | grep -iv 'aluforce\.api\.br' | wc -l)"

echo ""
echo "=== VENDAS (with -L) ==="
curl -sk -L -o /tmp/zt-v2.html "https://aluforce.api.br/zyntra-demo/Vendas" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-v2.html)"
grep -oP '<title>[^<]+</title>' /tmp/zt-v2.html
echo "Logos:"
grep -oP 'src="[^"]*"' /tmp/zt-v2.html | grep -i 'logo\|zyntra\|image' | sort -u

echo ""
echo "=== FINANCEIRO (with -L) ==="
curl -sk -L -o /tmp/zt-fin2.html "https://aluforce.api.br/zyntra-demo/Financeiro" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-fin2.html)"
grep -oP '<title>[^<]+</title>' /tmp/zt-fin2.html
echo "Logos:"
grep -oP 'src="[^"]*"' /tmp/zt-fin2.html | grep -i 'logo\|zyntra\|image' | sort -u

echo ""
echo "=== RH (with -L) ==="
curl -sk -L -o /tmp/zt-rh2.html "https://aluforce.api.br/zyntra-demo/RH" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-rh2.html)"
grep -oP '<title>[^<]+</title>' /tmp/zt-rh2.html

echo ""
echo "=== PCP (with -L) ==="
curl -sk -L -o /tmp/zt-pcp2.html "https://aluforce.api.br/zyntra-demo/PCP" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-pcp2.html)"
grep -oP '<title>[^<]+</title>' /tmp/zt-pcp2.html

echo ""
echo "=== CHECK HEADER STRUCTURE (dashboard) ==="
echo "Header tag classes:"
grep -oP '<header[^>]+class="[^"]*"' /tmp/zt-d.html | sort -u
echo ""
echo "Sidebar classes:"
grep -oP '<aside[^>]+class="[^"]*"' /tmp/zt-d.html | sort -u
echo ""
echo "Header-logo div:"
grep -oP '<div class="header-logo">[^<]*<img[^>]*>' /tmp/zt-d.html | head -2
echo ""
echo "Banner div (first):"
grep -oP 'zyntra-demo-banner[^"]*"[^>]*>[^<]*</div>' /tmp/zt-d.html | head -1
echo ""
echo "CSS injected (check for top offset):"
grep -o 'top:36px' /tmp/zt-d.html | head -3

echo ""
echo "=== CHECK IF ZYNTRA-LOGO.PNG LOADS CORRECT SIZE ==="
curl -sk -o /dev/null -w "zyntra-logo.png: HTTP %{http_code}, %{size_download} bytes\n" "https://aluforce.api.br/zyntra-demo/images/zyntra-logo.png"
curl -sk -o /dev/null -w "Logo Azul Zyntra.png: HTTP %{http_code}, %{size_download} bytes\n" "https://aluforce.api.br/zyntra-demo/images/Logo%20Monocromatico%20-%20Azul%20-%20Zyntra.png"
curl -sk -o /dev/null -w "Logo Branco Zyntra.png: HTTP %{http_code}, %{size_download} bytes\n" "https://aluforce.api.br/zyntra-demo/images/Logo%20Monocromatico%20-%20Branco%20-%20Zyntra.png"
curl -sk -o /dev/null -w "Logo Branco Zyntra copy.webp: HTTP %{http_code}, %{size_download} bytes\n" "https://aluforce.api.br/zyntra-demo/images/Logo%20Monocromatico%20-%20Branco%20-%20Zyntra%20copy.webp"
curl -sk -o /dev/null -w "favicon-zyntra.jpg: HTTP %{http_code}, %{size_download} bytes\n" "https://aluforce.api.br/zyntra-demo/images/favicon-zyntra.jpg"
curl -sk -o /dev/null -w "zyntra-branco.png: HTTP %{http_code}, %{size_download} bytes\n" "https://aluforce.api.br/zyntra-demo/images/zyntra-branco.png"

echo ""
echo "=== DONE ==="
