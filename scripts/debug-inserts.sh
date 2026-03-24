#!/bin/bash
MYSQL_CRED="-u aluforce -pAluforce2026VpsDB"
DB="zyntra_demo"

echo "=== TESTE INSERT CLIENTES ==="
mysql $MYSQL_CRED $DB -e "INSERT INTO clientes (razao_social, nome_fantasia, cnpj_cpf, telefone, email, endereco, bairro, cidade, estado, cep, ativo) VALUES ('TESTE LTDA', 'TESTE', '99.999.999/9999-99', '(11) 0000-0000', 'teste@teste.com', 'Rua Teste 1', 'Centro', 'SP', 'SP', '00000-000', 1);" 2>&1
echo "Clientes: $(mysql $MYSQL_CRED $DB -N -e 'SELECT COUNT(*) FROM clientes;' 2>/dev/null)"

echo ""
echo "=== TESTE INSERT PEDIDOS ==="
mysql $MYSQL_CRED $DB -e "INSERT INTO pedidos (cliente_id, valor, status) VALUES (1, 100.00, 'pendente');" 2>&1
echo "Pedidos: $(mysql $MYSQL_CRED $DB -N -e 'SELECT COUNT(*) FROM pedidos;' 2>/dev/null)"

echo ""
echo "=== DESCRIBE clientes (primeiros 5) ==="
mysql $MYSQL_CRED $DB -e "SHOW CREATE TABLE clientes\G" 2>/dev/null | head -30

echo ""
echo "=== DESCRIBE pedidos (auto_increment?) ==="
mysql $MYSQL_CRED $DB -N -e "SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_schema='$DB' AND table_name='pedidos';" 2>/dev/null

echo ""
echo "=== CHAVE PRIMARIA pedidos ==="
mysql $MYSQL_CRED $DB -N -e "SHOW INDEX FROM pedidos WHERE Key_name='PRIMARY';" 2>/dev/null
