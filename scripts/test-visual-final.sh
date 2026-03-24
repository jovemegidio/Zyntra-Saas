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

# Test via Nginx with proper cookie header
echo ""
echo "=== DASHBOARD (via nginx) ==="
curl -sk -o /tmp/zt-d.html "https://aluforce.api.br/zyntra-demo/dashboard" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-d.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zt-d.html)"
echo "Logo src:"
grep -oP 'src="[^"]*"' /tmp/zt-d.html | grep -i 'logo\|zyntra\|image' | sort -u
echo "Favicon:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zt-d.html | sort -u
echo "Banner: $(grep -c 'zyntra-demo-banner' /tmp/zt-d.html)"
echo "Remaining 'Aluforce' (excl api.br):"
grep -oin 'aluforce' /tmp/zt-d.html | wc -l
LEFT=$(grep -in 'aluforce' /tmp/zt-d.html | grep -iv 'aluforce\.api\.br')
echo "$LEFT" | head -5

echo ""
echo "=== COMPRAS (via nginx) ==="
curl -sk -o /tmp/zt-c.html "https://aluforce.api.br/zyntra-demo/Compras" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-c.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zt-c.html)"
echo "Logo src:"
grep -oP 'src="[^"]*"' /tmp/zt-c.html | grep -i 'logo\|zyntra\|image' | sort -u
echo "Favicon:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zt-c.html | sort -u
echo "Banner: $(grep -c 'zyntra-demo-banner' /tmp/zt-c.html)"

echo ""
echo "=== NFe/Faturamento (via nginx) ==="
curl -sk -o /tmp/zt-n.html "https://aluforce.api.br/zyntra-demo/NFe" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-n.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zt-n.html)"
echo "Logo src:"
grep -oP 'src="[^"]*"' /tmp/zt-n.html | grep -i 'logo\|zyntra\|image' | sort -u
echo "Favicon:"
grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zt-n.html | sort -u

echo ""
echo "=== VENDAS (via nginx) ==="
curl -sk -o /tmp/zt-v.html "https://aluforce.api.br/zyntra-demo/Vendas" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-v.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zt-v.html)"

echo ""
echo "=== CHAT-TEAMS (via nginx) ==="
curl -sk -o /tmp/zt-chat.html "https://aluforce.api.br/zyntra-demo/chat-teams/chat.html" \
  -H "Cookie: token=$TOKEN"
echo "Size: $(wc -c < /tmp/zt-chat.html) bytes"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/zt-chat.html)"
echo "Banner: $(grep -c 'zyntra-demo-banner' /tmp/zt-chat.html)"
echo "Zyntra in sidebar: $(grep -c 'Zyntra' /tmp/zt-chat.html)"

echo ""
echo "=== PRODUCTION (no change) ==="
curl -sk https://aluforce.api.br/login.html | grep -oP '<title>[^<]+</title>'
curl -sk https://aluforce.api.br/login.html | grep -oP 'href="[^"]*favicon[^"]*"' | head -1

echo ""
echo "=== ALL DONE ==="
