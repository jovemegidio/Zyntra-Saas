#!/bin/bash
# Splice new zyntra-demo block into Nginx config
set -e

CONF="/etc/nginx/sites-enabled/aluforce"
NEW_BLOCK="/tmp/zyntra-demo-nginx-block.conf"

# Backup
cp "$CONF" "$CONF.bak-logo-fix"
echo "Backup created: $CONF.bak-logo-fix"

# Find the zyntra-demo location block boundaries
COMMENT_LINE=$(grep -n 'ZYNTRA DEMO - ERP Demonstracao' "$CONF" | head -1 | cut -d: -f1)
if [ -z "$COMMENT_LINE" ]; then
    echo "ERROR: Cannot find ZYNTRA DEMO comment line"
    exit 1
fi

# The block starts 1 line before the first comment
BLOCK_START=$((COMMENT_LINE - 1))

# Find the location line
LOC_LINE=$(awk "NR>=$COMMENT_LINE && /location \^~ \/zyntra-demo\//{print NR; exit}" "$CONF")
echo "Comment at $COMMENT_LINE, location at $LOC_LINE"

# Find matching closing brace
BLOCK_END=$(python3 -c "
lines = open('$CONF').readlines()
depth = 0
started = False
for i in range(int('$LOC_LINE')-1, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            depth += 1
            started = True
        elif ch == '}':
            depth -= 1
            if started and depth == 0:
                print(i+1)
                exit()
")

echo "Block: lines $BLOCK_START to $BLOCK_END"

# Build new config
head -n $((BLOCK_START - 1)) "$CONF" > /tmp/nginx-new.conf
cat "$NEW_BLOCK" >> /tmp/nginx-new.conf
tail -n +$((BLOCK_END + 1)) "$CONF" >> /tmp/nginx-new.conf

# Replace config
cp /tmp/nginx-new.conf "$CONF"

# Test
echo ""
echo "=== Testing Nginx config ==="
if nginx -t 2>&1; then
    echo ""
    echo "=== Reloading Nginx ==="
    nginx -s reload
    echo "OK - Nginx reloaded!"
else
    echo ""
    echo "FAILED! Restoring backup..."
    cp "$CONF.bak-logo-fix" "$CONF"
    exit 1
fi

echo ""
echo "=== Quick test ==="
# Test login and get token
TOKEN=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zyntra.com.br","senha":"Demo@2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -n "$TOKEN" ]; then
    echo "Login: OK"
    
    # Test dashboard via proxy
    HTTP=$(curl -sk -o /tmp/zyntra-dash-test.html -w "%{http_code}" \
      https://aluforce.api.br/zyntra-demo/dashboard \
      -b "token=$TOKEN")
    echo "Dashboard via proxy: HTTP $HTTP"
    
    # Check logo path in HTML
    echo "Logo references in response:"
    grep -oP 'src="[^"]*zyntra[^"]*"' /tmp/zyntra-dash-test.html | head -5
    
    # Check favicon
    echo "Favicon reference:"
    grep -oP 'href="[^"]*favicon[^"]*"' /tmp/zyntra-dash-test.html | head -3
    
    # Check title
    grep -oP '<title>[^<]+</title>' /tmp/zyntra-dash-test.html | head -1
    
    # Check banner
    grep -c 'zyntra-demo-banner' /tmp/zyntra-dash-test.html | xargs -I{} echo "Banner divs: {}"
    
    # Check that "Aluforce" does NOT appear (except in API domain)
    echo "Remaining 'Aluforce' occurrences (should only be in aluforce.api.br):"
    grep -oi 'aluforce' /tmp/zyntra-dash-test.html | wc -l | xargs -I{} echo "  Total: {}"
    grep -n 'Aluforce' /tmp/zyntra-dash-test.html | grep -v 'aluforce.api.br' | head -5
else
    echo "Login FAILED - check demo server"
fi

echo ""
echo "DONE"
