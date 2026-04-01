#!/bin/bash
COOKIE=/tmp/n8n-debug.txt
curl -s -c "$COOKIE" -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@your-domain.com","password":"CHANGE_ME_N8N_PASSWORD"}' > /dev/null

echo "=== Trying to activate workflow 9HXw3XKjlo5aLRSS ==="
curl -s -b "$COOKIE" -X PATCH http://localhost:5678/rest/workflows/9HXw3XKjlo5aLRSS \
  -H "Content-Type: application/json" \
  -d '{"active":true}' | python3 -m json.tool 2>&1

rm -f "$COOKIE"
