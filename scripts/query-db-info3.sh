#!/bin/bash
MYSQL="mysql -u aluforce -pCHANGE_ME_DB_PASSWORD -h YOUR_VPS_IP aluforce_vendas"

echo "=== CLEMERSON E FERNANDO - TELEFONES ==="
$MYSQL -e "SELECT id, nome_completo, email, telefone, data_nascimento, cargo, departamento, status FROM funcionarios WHERE id IN (29, 37);" 2>/dev/null

echo ""
echo "=== TODOS FUNCIONARIOS ATIVOS COM TELEFONE ==="
$MYSQL -e "SELECT id, nome_completo, telefone, data_nascimento, cargo FROM funcionarios WHERE (status = 'Ativo' OR ativo = 1) ORDER BY nome_completo;" 2>/dev/null

echo ""
echo "=== CONTAS PAGAR (estrutura) ==="
$MYSQL -e "DESCRIBE contas_pagar;" 2>/dev/null

echo ""
echo "=== CONTAS RECEBER (estrutura) ==="
$MYSQL -e "DESCRIBE contas_receber;" 2>/dev/null

echo ""
echo "=== CONTAS PAGAR VENCENDO ==="
$MYSQL -e "SELECT id, descricao, fornecedor, valor, data_vencimento, status FROM contas_pagar WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status != 'pago' LIMIT 10;" 2>/dev/null

echo ""
echo "=== CONTAS RECEBER VENCENDO ==="
$MYSQL -e "SELECT id, descricao, cliente, valor, data_vencimento, status FROM contas_receber WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status != 'recebido' LIMIT 10;" 2>/dev/null
