#!/bin/bash
MYSQL="mysql -u aluforce -pCHANGE_ME_DB_PASSWORD -h YOUR_VPS_IP aluforce_vendas"

echo "=== ESTRUTURA FUNCIONARIOS ==="
$MYSQL -e "DESCRIBE funcionarios;" 2>/dev/null

echo ""
echo "=== CLEMERSON E FERNANDO ==="
$MYSQL -e "SELECT * FROM funcionarios WHERE nome_completo LIKE '%clemerson%' OR nome_completo LIKE '%fernando%' OR nome_completo LIKE '%Clemerson%' OR nome_completo LIKE '%Fernando%';" 2>/dev/null

echo ""
echo "=== TODOS FUNCIONARIOS (resumo) ==="
$MYSQL -e "SELECT id, nome_completo, email, celular, telefone_pessoal, data_nascimento, setor, cargo FROM funcionarios LIMIT 30;" 2>/dev/null

echo ""
echo "=== TABELAS FINANCEIRO + LOGISTICA ==="
$MYSQL -e "SHOW TABLES;" 2>/dev/null | grep -iE 'conta|financ|pagar|receber|logist|entreg|expedi|frete|nfe|nota|estoque|pedido|aniversa'
