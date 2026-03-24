#!/bin/bash
# Adiciona /api/whatsapp-alertas e /api/n8n às rotas isentas de CSRF

FILE="/var/www/aluforce/security-middleware.js"
cp "$FILE" "$FILE.bak.csrf"

python3 << 'PYEOF'
with open("/var/www/aluforce/security-middleware.js", "r") as f:
    content = f.read()

old = "const exemptPaths = ['/api/login', '/api/logout', '/api/refresh-token', '/api/health', '/api/webhook', '/api/auth', '/api/discord', '/api/verify-2fa', '/api/resend-2fa'];"
new = "const exemptPaths = ['/api/login', '/api/logout', '/api/refresh-token', '/api/health', '/api/webhook', '/api/auth', '/api/discord', '/api/verify-2fa', '/api/resend-2fa', '/api/n8n', '/api/whatsapp-alertas'];"

if old in content:
    content = content.replace(old, new)
    with open("/var/www/aluforce/security-middleware.js", "w") as f:
        f.write(content)
    print("OK: exemptPaths atualizado com /api/n8n e /api/whatsapp-alertas")
else:
    print("WARN: Pattern nao encontrado. Verificando se ja foi atualizado...")
    if "/api/whatsapp-alertas" in content:
        print("JA ATUALIZADO: /api/whatsapp-alertas ja existe no exemptPaths")
    else:
        print("ERRO: Precisa atualizar manualmente")
PYEOF

echo ""
echo "=== Verificando resultado ==="
grep -n "exemptPaths" /var/www/aluforce/security-middleware.js

echo ""
echo "=== Reiniciando PM2 ==="
cd /var/www/aluforce && pm2 restart aluforce-dashboard --update-env
sleep 3

echo ""
echo "=== Testando endpoint (POST /api/whatsapp-alertas/contas-pagar) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/contas-pagar

echo ""
echo ""
echo "=== Testando /config (GET) ==="
curl -s http://localhost:3000/api/whatsapp-alertas/config | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK:', len(d.get('configs',[])), 'configs')" 2>/dev/null || echo "FALHOU"

echo ""
echo "=== Testando /teste (POST) ==="
curl -s -X POST http://localhost:3000/api/whatsapp-alertas/teste -H "Content-Type: application/json" -d '{"mensagem":"Teste de conexao do sistema de alertas ALUFORCE"}'

echo ""
echo "DONE"
