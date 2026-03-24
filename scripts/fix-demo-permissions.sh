#!/bin/bash
# Add 'administrador' user to permissions-server.js on VPS
# This is needed for the Zyntra demo user "Administrador Demo" (first name = "administrador")

PERM_FILE="/var/www/aluforce/src/permissions-server.js"

# Check if 'administrador' already exists
if grep -q "'administrador'" "$PERM_FILE"; then
    echo "SKIP: 'administrador' already exists in permissions-server.js"
else
    # Add after the 'aluforce' entry (safe anchor point)
    sed -i "/'aluforce'.*profile: 'admin_total'/a\\    'administrador': { areas: ['vendas', 'rh', 'pcp', 'financeiro', 'nfe', 'compras', 'ti'], rhType: 'areaadm', isAdmin: true, profile: 'admin_total' }," "$PERM_FILE"
    
    if grep -q "'administrador'" "$PERM_FILE"; then
        echo "OK: Added 'administrador' to permissions-server.js"
    else
        echo "FAIL: Could not add 'administrador'"
    fi
fi

# Also add 'admin' as a key (for user named just "Admin")
if grep -q "'admin'" "$PERM_FILE" | grep -q "areas"; then
    echo "SKIP: 'admin' already exists"
else
    if ! grep -q "'admin':.*profile" "$PERM_FILE"; then
        sed -i "/'administrador'.*profile: 'admin_total'/a\\    'admin': { areas: ['vendas', 'rh', 'pcp', 'financeiro', 'nfe', 'compras', 'ti'], rhType: 'areaadm', isAdmin: true, profile: 'admin_total' }," "$PERM_FILE"
        echo "OK: Added 'admin' to permissions-server.js"
    fi
fi

# Restart zyntra-demo PM2 process
echo ""
echo "Restarting zyntra-demo..."
cd /var/www/aluforce
pm2 restart zyntra-demo --update-env
sleep 3
pm2 status | grep zyntra

# Test Vendas access
echo ""
echo "=== Testing Vendas access ==="
TOKEN=$(python3 << 'PYEOF'
import urllib.request, json
data = json.dumps({'email':'admin@zyntra.com.br','password':'Demo@2026!'}).encode()
req = urllib.request.Request('http://localhost:3003/api/login', data=data, headers={'Content-Type':'application/json'})
resp = json.loads(urllib.request.urlopen(req).read())
print(resp.get('token',''))
PYEOF
)

curl -sk -L -o /tmp/zt-vendas-test.html "https://aluforce.api.br/zyntra-demo/Vendas" \
  -H "Cookie: token=$TOKEN"
SIZE=$(wc -c < /tmp/zt-vendas-test.html)
TITLE=$(grep -oP '<title>[^<]+</title>' /tmp/zt-vendas-test.html)
echo "Vendas: Size=$SIZE, Title=$TITLE"

if [ "$SIZE" -gt 1000 ]; then
    echo "SUCCESS: Vendas module accessible!"
else
    echo "FAIL: Vendas still blocked (size=$SIZE)"
    cat /tmp/zt-vendas-test.html
fi
