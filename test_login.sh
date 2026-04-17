#!/bin/bash
curl -s -w '\nHTTP_CODE:%{http_code}' \
  -H 'Content-Type: application/json' \
  -H 'X-Forwarded-Proto: https' \
  -H 'Host: aluforce.api.br' \
  -X POST http://localhost:4001/api/login \
  -d '{"email":"ti@laboreletric.com.br","password":"Aluforce@2026"}'
