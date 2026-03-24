#!/bin/bash
# Buscar dados de funcionários e estrutura do banco

MYSQL="mysql -u aluforce -p'Aluforce@2026#Mysql' aluforce_vendas"

echo "=== ESTRUTURA FUNCIONARIOS ==="
$MYSQL -e "DESCRIBE funcionarios;" 2>&1

echo ""
echo "=== CLEMERSON E FERNANDO ==="
$MYSQL -e "SELECT * FROM funcionarios WHERE nome_completo LIKE '%clemerson%' OR nome_completo LIKE '%fernando%' OR nome_completo LIKE '%Clemerson%' OR nome_completo LIKE '%Fernando%';" 2>&1

echo ""
echo "=== TODOS FUNCIONARIOS (nome, celular, email, aniversario) ==="
$MYSQL -e "SELECT id, nome_completo, email, celular, telefone_pessoal, telefone, data_nascimento, data_aniversario, setor, cargo, status FROM funcionarios LIMIT 30;" 2>&1

echo ""
echo "=== TABELAS FINANCEIRO ==="
$MYSQL -e "SHOW TABLES LIKE '%conta%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%financ%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%pagar%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%receber%';" 2>&1

echo ""
echo "=== TABELAS LOGISTICA ==="
$MYSQL -e "SHOW TABLES LIKE '%logist%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%entreg%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%expedi%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%frete%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%nfe%';" 2>&1
$MYSQL -e "SHOW TABLES LIKE '%nota%';" 2>&1
