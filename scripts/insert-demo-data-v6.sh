#!/bin/bash
MYSQL_CRED="-u aluforce -pCHANGE_ME_DB_PASSWORD"
DB="zyntra_demo"

echo "=== Verificando tabela empresas ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.columns WHERE table_schema='$DB' AND table_name='empresas' ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== Inserindo empresa demo ==="
mysql $MYSQL_CRED $DB -e "
INSERT IGNORE INTO empresas (id, razao_social, nome_fantasia, cnpj, inscricao_estadual, telefone, email, endereco, cidade, estado, cep)
VALUES (1, 'Zyntra Tecnologia Demonstracao LTDA', 'Zyntra Demo', '00.000.000/0001-00', '000.000.000.000', '(11) 99999-0000', 'demo@zyntra.com.br', 'Av. Demonstracao 1000', 'Sao Paulo', 'SP', '01000-000');
" 2>&1

echo ""
echo "Empresas: $(mysql $MYSQL_CRED $DB -N -e 'SELECT COUNT(*) FROM empresas;' 2>/dev/null)"

echo ""
echo "=== Agora inserindo clientes com empresa_id=1 ==="
mysql $MYSQL_CRED $DB -e "
INSERT IGNORE INTO clientes (id, nome, razao_social, nome_fantasia, cnpj_cpf, inscricao_estadual, telefone, email, endereco, bairro, cidade, estado, cep, ativo, empresa_id) VALUES
(1, 'ABC Comercio', 'ABC Industria e Comercio LTDA', 'ABC Comercio', '11.111.111/0001-01', '111.111.111.111', '(11) 3333-1001', 'contato@abc.com.br', 'Rua das Industrias 100', 'Distrito Industrial', 'Sao Paulo', 'SP', '01100-000', 1, 1),
(2, 'Tech Solutions', 'Tech Solutions S.A.', 'Tech Solutions', '22.222.222/0001-02', '222.222.222.222', '(11) 3333-1002', 'vendas@techsolutions.com.br', 'Av. Paulista 1500', 'Bela Vista', 'Sao Paulo', 'SP', '01310-100', 1, 1),
(3, 'Nova Era', 'Construtora Nova Era LTDA', 'Nova Era', '33.333.333/0001-03', '333.333.333.333', '(21) 3333-1003', 'compras@novaera.com.br', 'Rua do Porto 250', 'Centro', 'Rio de Janeiro', 'RJ', '20040-020', 1, 1),
(4, 'Precision Metal', 'Metalurgica Precision LTDA', 'Precision Metal', '44.444.444/0001-04', '444.444.444.444', '(11) 3333-1004', 'suprimentos@precision.com.br', 'Rod. Anhanguera Km 42', 'Jundiai', 'Jundiai', 'SP', '13209-000', 1, 1),
(5, 'Global Dist.', 'Distribuidora Global EIRELI', 'Global Dist.', '55.555.555/0001-05', '555.555.555.555', '(19) 3333-1005', 'pedidos@global.com.br', 'Rua Barao de Itapetininga 88', 'Centro', 'Campinas', 'SP', '13015-080', 1, 1),
(6, 'Saude Total', 'Farmacia Saude Total LTDA', 'Saude Total', '66.666.666/0001-06', NULL, '(11) 4444-1001', 'compras@saudetotal.com.br', 'Rua Augusta 500', 'Consolacao', 'Sao Paulo', 'SP', '01304-000', 1, 1),
(7, 'Bom Preco', 'Supermercado Bom Preco LTDA', 'Bom Preco', '77.777.777/0001-07', '777.777.777.777', '(11) 4444-1002', 'compras@bompreco.com.br', 'Av. do Estado 3000', 'Mooca', 'Sao Paulo', 'SP', '03105-000', 1, 1),
(8, 'Joao Silva', 'Joao da Silva', 'Joao Silva', '111.222.333-44', NULL, '(11) 98888-1001', 'joao.silva@email.com', 'Rua das Flores 42', 'Vila Nova', 'Sao Paulo', 'SP', '02030-000', 1, 1),
(9, 'Central Auto', 'Auto Pecas Central LTDA', 'Central Auto', '88.888.888/0001-08', '888.888.888.888', '(12) 3333-1006', 'compras@centralauto.com.br', 'Rua XV de Novembro 600', 'Centro', 'Sao Jose dos Campos', 'SP', '12245-000', 1, 1),
(10, 'Futuro Brilhante', 'Escola Futuro Brilhante ME', 'Futuro Brilhante', '99.999.999/0001-09', NULL, '(11) 5555-1001', 'adm@futurobrilhante.com.br', 'Rua Educacao 150', 'Jardins', 'Sao Paulo', 'SP', '01401-000', 1, 1);
" 2>&1

echo ""
echo "Clientes: $(mysql $MYSQL_CRED $DB -N -e 'SELECT COUNT(*) FROM clientes;' 2>/dev/null)"

echo ""
echo "=== Inserindo pedidos ==="
mysql $MYSQL_CRED $DB -e "
INSERT IGNORE INTO pedidos (id, empresa_id, cliente_id, cliente_nome, vendedor_id, status, valor, observacao, created_at) VALUES
(1, 1, 1, 'ABC Comercio', 1, 'entregue', 15890.00, 'Projeto cabeamento estruturado', '2026-01-05 10:00:00'),
(2, 1, 2, 'Tech Solutions', 1, 'entregue', 8750.00, 'Infraestrutura de rede', '2026-01-12 10:00:00'),
(3, 1, 3, 'Nova Era', 2, 'entregue', 22500.00, 'CFTV completo obra', '2026-01-20 10:00:00'),
(4, 1, 4, 'Precision Metal', 1, 'entregue', 5640.00, 'Materiais eletricos', '2026-02-01 10:00:00'),
(5, 1, 5, 'Global Dist.', 2, 'faturado', 12300.00, 'Switch e rack', '2026-02-10 10:00:00'),
(6, 1, 6, 'Saude Total', 1, 'em_producao', 3890.00, 'Cabeamento loja', '2026-02-18 10:00:00'),
(7, 1, 7, 'Bom Preco', 2, 'em_producao', 45600.00, 'Projeto completo supermercado', '2026-02-25 10:00:00'),
(8, 1, 1, 'ABC Comercio', 1, 'aprovado', 9800.00, 'Expansao rede ABC', '2026-03-01 10:00:00'),
(9, 1, 9, 'Central Auto', 2, 'pendente', 6720.00, 'CFTV auto pecas', '2026-03-03 10:00:00'),
(10, 1, 10, 'Futuro Brilhante', 1, 'pendente', 18900.00, 'Infraestrutura completa escola', '2026-03-05 10:00:00');
" 2>&1

echo ""
echo "Pedidos: $(mysql $MYSQL_CRED $DB -N -e 'SELECT COUNT(*) FROM pedidos;' 2>/dev/null)"

echo ""
echo "=== Inserindo ordens producao restantes ==="
mysql $MYSQL_CRED $DB -e "
INSERT IGNORE INTO ordens_producao (id, numero_pedido, produto_nome, quantidade, data_inicio, data_previsao_entrega, status, prioridade, observacoes) VALUES
(2, 'OP-2026-002', 'Cabo Eletrico 2.5mm Flexivel', 50, '2026-02-27', '2026-03-08', 'em_andamento', 'alta', 'Cabos projeto supermercado'),
(3, 'OP-2026-003', 'Cabo Optico 12 Fibras', 2000, '2026-02-28', '2026-03-12', 'planejada', 'media', 'Cabos opticos'),
(4, 'OP-2026-004', 'Switch 24 Portas Gigabit', 3, '2026-03-05', '2026-03-12', 'planejada', 'media', 'Switches'),
(5, 'OP-2026-005', 'Camera IP Dome 4MP', 10, '2026-03-06', '2026-03-18', 'planejada', 'normal', 'Cameras');
" 2>&1

echo ""
echo "=== Inserindo modulos restantes ==="
mysql $MYSQL_CRED $DB -e "
INSERT IGNORE INTO modulos (id, nome, descricao, icone, url, ativo) VALUES
(2, 'Vendas', 'Modulo de vendas', 'shopping_cart', '/vendas', 1),
(3, 'Financeiro', 'Modulo financeiro', 'account_balance', '/financeiro', 1),
(4, 'PCP', 'Producao', 'precision_manufacturing', '/pcp', 1),
(5, 'RH', 'Recursos humanos', 'people', '/rh', 1),
(6, 'Compras', 'Compras', 'shopping_bag', '/compras', 1),
(7, 'NF-e', 'Notas fiscais', 'receipt', '/nfe', 1),
(8, 'Estoque', 'Controle de estoque', 'inventory', '/estoque', 1);
" 2>&1

echo ""
echo "=== Inserindo roles restantes ==="
mysql $MYSQL_CRED $DB -e "
INSERT IGNORE INTO roles (id, nome, descricao, ativo) VALUES
(2, 'gerente', 'Gerente de departamento', 1),
(3, 'operador', 'Operador / Usuario padrao', 1);
" 2>&1

echo ""
echo "========= RESUMO FINAL ========="
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD zyntra_demo -e "
SELECT 'Tabelas' as item, COUNT(*) as total FROM information_schema.tables WHERE table_schema='zyntra_demo' AND table_type='BASE TABLE'
UNION ALL SELECT 'Empresas', COUNT(*) FROM empresas
UNION ALL SELECT 'Usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'Clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'Produtos', COUNT(*) FROM produtos
UNION ALL SELECT 'Pedidos', COUNT(*) FROM pedidos
UNION ALL SELECT 'Fornecedores', COUNT(*) FROM fornecedores
UNION ALL SELECT 'Funcionarios', COUNT(*) FROM funcionarios
UNION ALL SELECT 'Contas Pagar', COUNT(*) FROM contas_pagar
UNION ALL SELECT 'Contas Receber', COUNT(*) FROM contas_receber
UNION ALL SELECT 'Vendedores', COUNT(*) FROM vendedores
UNION ALL SELECT 'Ordens Producao', COUNT(*) FROM ordens_producao
UNION ALL SELECT 'Cat.Financeiras', COUNT(*) FROM categorias_financeiras
UNION ALL SELECT 'Contas Bancarias', COUNT(*) FROM contas_bancarias
UNION ALL SELECT 'Modulos', COUNT(*) FROM modulos
UNION ALL SELECT 'Roles', COUNT(*) FROM roles
UNION ALL SELECT 'Permissoes', COUNT(*) FROM permissoes_modulos;" 2>/dev/null
