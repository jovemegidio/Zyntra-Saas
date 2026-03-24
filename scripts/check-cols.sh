#!/bin/bash
MYSQL="mysql -u aluforce -pAluforce2026VpsDB -h 31.97.64.102 aluforce_vendas -N"

echo "=== COLUNAS ESTOQUE ==="
$MYSQL -e "DESCRIBE estoque;" 2>/dev/null | head -20

echo ""
echo "=== COLUNAS PEDIDOS ==="
$MYSQL -e "DESCRIBE pedidos;" 2>/dev/null | head -30

echo ""
echo "=== COLUNAS ALERTAS_ESTOQUE ==="
$MYSQL -e "DESCRIBE alertas_estoque;" 2>/dev/null | head -15

echo ""
echo "=== SAMPLE ESTOQUE ==="
$MYSQL -e "SELECT * FROM estoque LIMIT 2;" 2>/dev/null

echo ""
echo "=== SAMPLE PEDIDOS ==="
$MYSQL -e "SELECT * FROM pedidos LIMIT 2\G" 2>/dev/null | head -50

echo ""
echo "=== COLUNAS NFE ==="
$MYSQL -e "DESCRIBE nfe;" 2>/dev/null | head -20

echo ""
echo "=== COLUNAS NOTAS_FISCAIS ==="
$MYSQL -e "DESCRIBE notas_fiscais;" 2>/dev/null | head -20
