#!/bin/bash
echo "=== PRODUTOS columns ==="
mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e "DESCRIBE produtos;" 2>/dev/null
echo ""
echo "=== PEDIDO_ITENS columns ==="
mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e "DESCRIBE pedido_itens;" 2>/dev/null
echo ""
echo "=== ESTOQUE columns ==="
mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e "DESCRIBE estoque;" 2>/dev/null
