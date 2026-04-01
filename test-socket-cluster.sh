#!/bin/bash
# Test Socket.IO session persistence across cluster workers
echo "=== Socket.IO Cluster Session Test ==="

# Get initial session
RESP=$(curl -s 'http://localhost:3000/socket.io/?EIO=4&transport=polling' 2>/dev/null)
SID=$(echo "$RESP" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()[1:]); print(d['sid'])" 2>/dev/null)

if [ -z "$SID" ]; then
  echo "Failed to get SID. Raw response: $RESP"
  exit 1
fi

echo "Session ID: $SID"

# Make follow-up requests to test cross-worker session persistence
for i in 1 2 3 4 5 6 7 8; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000/socket.io/?EIO=4&transport=polling&sid=$SID" 2>/dev/null)
  echo "Request $i: HTTP $CODE"
  sleep 0.2
done

echo ""
echo "=== Redis Adapter Check ==="
# Check if there's a Redis adapter success or failure message in recent logs
grep -a 'multi-node\|Redis Adapter\|fallback.*single' /var/www/aluforce/logs/out.log /var/www/aluforce/logs/combined.log 2>/dev/null | tail -5
echo ""
echo "=== Redis direct test ==="
redis-cli ping
echo ""
echo "=== .env REDIS_URL ==="
grep REDIS /var/www/aluforce/.env
