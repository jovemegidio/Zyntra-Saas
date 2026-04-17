#!/bin/bash
# Test login via nginx
echo "=== Test 1: Login via nginx ==="
curl -s -w '\nHTTP:%{http_code}' \
  -H 'Content-Type: application/json' \
  'https://aluforce.api.br/labor-eletric/api/login' \
  -d '{"email":"ti@laboreletric.com.br","password":"Aluforce@2026"}'

echo ""
echo ""

# Test login via direct port with headers like nginx sends
echo "=== Test 2: Login via direct port with nginx-like headers ==="
curl -s -w '\nHTTP:%{http_code}' \
  -H 'Content-Type: application/json' \
  -H 'X-Forwarded-Proto: https' \
  -H 'Host: aluforce.api.br' \
  'http://localhost:4001/api/login' \
  -d '{"email":"ti@laboreletric.com.br","password":"Aluforce@2026"}'

echo ""
echo ""

# Test main aluforce login (should also be able to auth this user via labor path)
echo "=== Test 3: Login main with labor email ==="
curl -s -w '\nHTTP:%{http_code}' \
  -H 'Content-Type: application/json' \
  'https://aluforce.api.br/api/login' \
  -d '{"email":"ti@laboreletric.com.br","password":"Aluforce@2026"}'
