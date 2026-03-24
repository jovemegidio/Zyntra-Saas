#!/bin/bash
echo "=== Iniciando PM2 zyntra-demo ==="
cd /var/www/aluforce

# Verificar se ecosystem.demo.config.js existe
if [ ! -f ecosystem.demo.config.js ]; then
    echo "ERRO: ecosystem.demo.config.js nao encontrado!"
    exit 1
fi

echo "Arquivo encontrado. Iniciando..."
pm2 start ecosystem.demo.config.js
sleep 3

echo ""
echo "=== PM2 Status ==="
pm2 list

echo ""
echo "=== Verificando porta 3003 ==="
sleep 2
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3003/ 2>/dev/null || echo "Aguardando servidor..."
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3003/ 2>/dev/null || echo "Ainda aguardando..."

echo ""
echo "=== Logs recentes ==="
pm2 logs zyntra-demo --lines 15 --nostream 2>/dev/null
