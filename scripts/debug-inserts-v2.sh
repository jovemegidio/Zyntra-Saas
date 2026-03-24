#!/bin/bash
MYSQL_CRED="-u aluforce -pAluforce2026VpsDB"
DB="zyntra_demo"

echo "=== TESTE INSERT 1 CLIENTE ==="
mysql $MYSQL_CRED $DB -e "
INSERT INTO clientes (id, nome, razao_social, nome_fantasia, cnpj_cpf, telefone, email, endereco, bairro, cidade, estado, cep, ativo, empresa_id)
VALUES (1, 'ABC Comercio', 'ABC Industria LTDA', 'ABC Comercio', '11.111.111/0001-01', '(11) 3333-1001', 'contato@abc.com.br', 'Rua das Industrias 100', 'Dist. Ind.', 'Sao Paulo', 'SP', '01100-000', 1, 1);
" 2>&1

echo ""
echo "=== TESTE INSERT 1 PEDIDO ==="
mysql $MYSQL_CRED $DB -e "
INSERT INTO pedidos (id, empresa_id, cliente_id, cliente_nome, vendedor_id, status, valor, observacao)
VALUES (1, 1, 1, 'ABC Comercio', 1, 'entregue', 15890.00, 'Teste');
" 2>&1

echo ""
echo "=== VERIFICAR STRICT MODE ==="
mysql $MYSQL_CRED $DB -N -e "SELECT @@sql_mode;" 2>/dev/null

echo ""
echo "=== NOT NULL sem DEFAULT nas tabelas ==="
mysql $MYSQL_CRED -N -e "
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM information_schema.columns 
WHERE table_schema='$DB' AND table_name='clientes' 
AND IS_NULLABLE='NO' AND COLUMN_DEFAULT IS NULL AND EXTRA NOT LIKE '%auto_increment%'
ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== NOT NULL sem DEFAULT em pedidos ==="
mysql $MYSQL_CRED -N -e "
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM information_schema.columns 
WHERE table_schema='$DB' AND table_name='pedidos' 
AND IS_NULLABLE='NO' AND COLUMN_DEFAULT IS NULL AND EXTRA NOT LIKE '%auto_increment%'
ORDER BY ordinal_position;" 2>/dev/null
