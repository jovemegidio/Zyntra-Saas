#!/bin/bash
# Script final - insere dados que faltaram (pedidos, clientes, contas, etc)
MYSQL_CRED="-u aluforce -pCHANGE_ME_DB_PASSWORD"
DB="zyntra_demo"

echo "=== Inserindo dados restantes (v4) ==="

mysql $MYSQL_CRED $DB << 'SQLEOF'

-- ============ CLIENTES (coluna ativo, sem status) ============
INSERT IGNORE INTO clientes (id, razao_social, nome_fantasia, cnpj_cpf, inscricao_estadual, telefone, email, endereco, bairro, cidade, estado, cep, ativo) VALUES
(1, 'ABC Industria e Comercio LTDA', 'ABC Comercio', '11.111.111/0001-01', '111.111.111.111', '(11) 3333-1001', 'contato@abc.com.br', 'Rua das Industrias, 100', 'Distrito Industrial', 'Sao Paulo', 'SP', '01100-000', 1),
(2, 'Tech Solutions S.A.', 'Tech Solutions', '22.222.222/0001-02', '222.222.222.222', '(11) 3333-1002', 'vendas@techsolutions.com.br', 'Av. Paulista, 1500', 'Bela Vista', 'Sao Paulo', 'SP', '01310-100', 1),
(3, 'Construtora Nova Era LTDA', 'Nova Era', '33.333.333/0001-03', '333.333.333.333', '(21) 3333-1003', 'compras@novaera.com.br', 'Rua do Porto, 250', 'Centro', 'Rio de Janeiro', 'RJ', '20040-020', 1),
(4, 'Metalurgica Precision LTDA', 'Precision Metal', '44.444.444/0001-04', '444.444.444.444', '(11) 3333-1004', 'suprimentos@precision.com.br', 'Rod. Anhanguera Km 42', 'Jundiai', 'Jundiai', 'SP', '13209-000', 1),
(5, 'Distribuidora Global EIRELI', 'Global Dist.', '55.555.555/0001-05', '555.555.555.555', '(19) 3333-1005', 'pedidos@global.com.br', 'Rua Barao de Itapetininga, 88', 'Centro', 'Campinas', 'SP', '13015-080', 1),
(6, 'Farmacia Saude Total LTDA', 'Saude Total', '66.666.666/0001-06', NULL, '(11) 4444-1001', 'compras@saudetotal.com.br', 'Rua Augusta, 500', 'Consolacao', 'Sao Paulo', 'SP', '01304-000', 1),
(7, 'Supermercado Bom Preco LTDA', 'Bom Preco', '77.777.777/0001-07', '777.777.777.777', '(11) 4444-1002', 'compras@bompreco.com.br', 'Av. do Estado, 3000', 'Mooca', 'Sao Paulo', 'SP', '03105-000', 1),
(8, 'Joao da Silva', 'Joao Silva', '111.222.333-44', NULL, '(11) 98888-1001', 'joao.silva@email.com', 'Rua das Flores, 42', 'Vila Nova', 'Sao Paulo', 'SP', '02030-000', 1),
(9, 'Auto Pecas Central LTDA', 'Central Auto', '88.888.888/0001-08', '888.888.888.888', '(12) 3333-1006', 'compras@centralauto.com.br', 'Rua XV de Novembro, 600', 'Centro', 'Sao Jose dos Campos', 'SP', '12245-000', 1),
(10, 'Escola Futuro Brilhante ME', 'Futuro Brilhante', '99.999.999/0001-09', NULL, '(11) 5555-1001', 'adm@futurobrilhante.com.br', 'Rua Educacao, 150', 'Jardins', 'Sao Paulo', 'SP', '01401-000', 1);

-- ============ PEDIDOS (valor, nao valor_total; observacao, nao observacoes) ============
INSERT IGNORE INTO pedidos (id, cliente_id, cliente_nome, vendedor_id, status, valor, observacao, created_at) VALUES
(1, 1, 'ABC Comercio', 1, 'entregue', 15890.00, 'Projeto cabeamento estruturado', '2026-01-05 10:00:00'),
(2, 2, 'Tech Solutions', 1, 'entregue', 8750.00, 'Infraestrutura de rede', '2026-01-12 10:00:00'),
(3, 3, 'Nova Era', 2, 'entregue', 22500.00, 'CFTV completo obra', '2026-01-20 10:00:00'),
(4, 4, 'Precision Metal', 1, 'entregue', 5640.00, 'Materiais eletricos', '2026-02-01 10:00:00'),
(5, 5, 'Global Dist.', 2, 'faturado', 12300.00, 'Switch e rack', '2026-02-10 10:00:00'),
(6, 6, 'Saude Total', 1, 'em_producao', 3890.00, 'Cabeamento loja', '2026-02-18 10:00:00'),
(7, 7, 'Bom Preco', 2, 'em_producao', 45600.00, 'Projeto completo supermercado', '2026-02-25 10:00:00'),
(8, 1, 'ABC Comercio', 1, 'aprovado', 9800.00, 'Expansao rede ABC', '2026-03-01 10:00:00'),
(9, 9, 'Central Auto', 2, 'pendente', 6720.00, 'CFTV auto pecas', '2026-03-03 10:00:00'),
(10, 10, 'Futuro Brilhante', 1, 'pendente', 18900.00, 'Infraestrutura completa escola', '2026-03-05 10:00:00');

-- ============ CONTAS PAGAR (sem categoria simples, tem categoria_id/categoria_nome) ============
INSERT IGNORE INTO contas_pagar (id, descricao, fornecedor_id, fornecedor_nome, valor, data_vencimento, data_pagamento, status, categoria_nome) VALUES
(1, 'NF 1234 - Cabos eletricos', 1, 'Acos Brasil', 4500.00, '2026-02-15', '2026-02-14', 'pago', 'Materia Prima'),
(2, 'NF 5678 - Polimeros', 2, 'Polimeros Sul', 8200.00, '2026-02-28', '2026-02-27', 'pago', 'Materia Prima'),
(3, 'NF 9012 - Componentes', 3, 'Shenzhen Import', 12500.00, '2026-03-10', NULL, 'pendente', 'Materia Prima'),
(4, 'NF 3456 - Embalagens', 4, 'Embalagens Master', 3200.00, '2026-03-15', NULL, 'pendente', 'Insumos'),
(5, 'Aluguel galpao Mar/2026', NULL, NULL, 15000.00, '2026-03-05', '2026-03-04', 'pago', 'Aluguel'),
(6, 'Energia eletrica Fev/2026', NULL, NULL, 8900.00, '2026-03-10', NULL, 'pendente', 'Energia'),
(7, 'Folha pagamento Mar/2026', NULL, NULL, 45000.00, '2026-03-05', '2026-03-05', 'pago', 'Folha de Pagamento');

-- ============ CONTAS RECEBER (data_recebimento, nao data_pagamento) ============
INSERT IGNORE INTO contas_receber (id, descricao, cliente_id, cliente_nome, valor, data_vencimento, data_recebimento, status) VALUES
(1, 'PED-001 Parcela 1/2', 1, 'ABC Comercio', 7945.00, '2026-01-20', '2026-01-20', 'pago'),
(2, 'PED-001 Parcela 2/2', 1, 'ABC Comercio', 7945.00, '2026-02-20', '2026-02-19', 'pago'),
(3, 'PED-002', 2, 'Tech Solutions', 8750.00, '2026-01-30', '2026-01-30', 'pago'),
(4, 'PED-003 Parcela 1/3', 3, 'Nova Era', 7500.00, '2026-02-05', '2026-02-05', 'pago'),
(5, 'PED-003 Parcela 2/3', 3, 'Nova Era', 7500.00, '2026-03-05', NULL, 'pendente'),
(6, 'PED-003 Parcela 3/3', 3, 'Nova Era', 7500.00, '2026-04-05', NULL, 'pendente'),
(7, 'PED-004', 4, 'Precision Metal', 5640.00, '2026-02-15', '2026-02-15', 'pago'),
(8, 'PED-005', 5, 'Global Dist.', 12300.00, '2026-03-10', NULL, 'pendente'),
(9, 'PED-006', 6, 'Saude Total', 3890.00, '2026-03-15', NULL, 'pendente'),
(10, 'PED-007 Parcela 1/3', 7, 'Bom Preco', 15200.00, '2026-03-10', NULL, 'pendente');

-- ============ CATEGORIAS FINANCEIRAS (tipo = enum) ============
INSERT IGNORE INTO categorias_financeiras (id, nome, tipo, descricao, ativo) VALUES
(1, 'Vendas de Produtos', 'receita', 'Receita com venda de produtos', 1),
(2, 'Servicos de Instalacao', 'receita', 'Receita com servicos', 1),
(3, 'Materia Prima', 'despesa', 'Compra de materia prima', 1),
(4, 'Folha de Pagamento', 'despesa', 'Salarios e encargos', 1),
(5, 'Aluguel', 'despesa', 'Aluguel de imoveis', 1),
(6, 'Energia e Utilidades', 'despesa', 'Luz, agua, gas', 1);

-- ============ CONTAS BANCARIAS ============
INSERT IGNORE INTO contas_bancarias (id, banco, agencia, conta, tipo, saldo, saldo_atual, saldo_inicial, descricao, ativo) VALUES
(1, 'Banco do Brasil', '1234-5', '56789-0', 'corrente', 125000.00, 125000.00, 100000.00, 'Conta principal', 1),
(2, 'Itau', '0987-6', '12345-6', 'corrente', 45000.00, 45000.00, 30000.00, 'Conta secundaria', 1),
(3, 'Caixa Economica', '3456-7', '98765-4', 'poupanca', 80000.00, 80000.00, 50000.00, 'Reserva', 1);

-- ============ ORDENS PRODUCAO ============
INSERT IGNORE INTO ordens_producao (id, numero_pedido, produto_nome, quantidade, data_inicio, data_previsao_entrega, status, prioridade, observacoes) VALUES
(1, 'OP-2026-001', 'Cabo Eletrico 2.5mm Flexivel', 30, '2026-02-20', '2026-03-03', 'em_andamento', 'alta', 'Cabos para loja'),
(2, 'OP-2026-002', 'Cabo Eletrico 2.5mm Flexivel', 50, '2026-02-27', '2026-03-08', 'em_andamento', 'alta', 'Cabos projeto supermercado'),
(3, 'OP-2026-003', 'Cabo Optico 12 Fibras', 2000, '2026-02-28', '2026-03-12', 'planejada', 'media', 'Cabos opticos'),
(4, 'OP-2026-004', 'Switch 24 Portas Gigabit', 3, '2026-03-05', '2026-03-12', 'planejada', 'media', 'Switches'),
(5, 'OP-2026-005', 'Camera IP Dome 4MP', 10, '2026-03-06', '2026-03-18', 'planejada', 'normal', 'Cameras');

-- ============ WHATSAPP CONFIG ============
INSERT IGNORE INTO whatsapp_config (id, chave, valor, ativo) VALUES
(1, 'WHATSAPP_ATIVO', 'false', 0),
(2, 'DESTINATARIOS_TESTE', '[]', 0);

-- ============ ROLES ============
INSERT IGNORE INTO roles (id, nome, descricao, ativo) VALUES
(1, 'admin', 'Administrador do sistema', 1),
(2, 'gerente', 'Gerente de departamento', 1),
(3, 'operador', 'Operador / Usuario padrao', 1);

-- ============ MODULOS ============
INSERT IGNORE INTO modulos (id, nome, descricao, icone, url, ativo) VALUES
(1, 'Dashboard', 'Painel principal', 'dashboard', '/dashboard', 1),
(2, 'Vendas', 'Modulo de vendas', 'shopping_cart', '/vendas', 1),
(3, 'Financeiro', 'Modulo financeiro', 'account_balance', '/financeiro', 1),
(4, 'PCP', 'Producao', 'precision_manufacturing', '/pcp', 1),
(5, 'RH', 'Recursos humanos', 'people', '/rh', 1),
(6, 'Compras', 'Compras', 'shopping_bag', '/compras', 1),
(7, 'NF-e', 'Notas fiscais', 'receipt', '/nfe', 1),
(8, 'Estoque', 'Controle de estoque', 'inventory', '/estoque', 1);

-- ============ PERMISSOES MODULOS ============
INSERT IGNORE INTO permissoes_modulos (id, usuario_id, modulo, visualizar, criar, editar, excluir, aprovar) VALUES
(1, 1, 'vendas', 1, 1, 1, 1, 1),
(2, 1, 'financeiro', 1, 1, 1, 1, 1),
(3, 1, 'pcp', 1, 1, 1, 1, 1),
(4, 1, 'rh', 1, 1, 1, 1, 1),
(5, 1, 'compras', 1, 1, 1, 1, 1),
(6, 1, 'nfe', 1, 1, 1, 1, 1),
(7, 1, 'estoque', 1, 1, 1, 1, 1),
(8, 1, 'dashboard', 1, 1, 1, 1, 1),
(9, 2, 'vendas', 1, 1, 1, 0, 0),
(10, 2, 'dashboard', 1, 0, 0, 0, 0),
(11, 3, 'financeiro', 1, 1, 1, 0, 0),
(12, 3, 'dashboard', 1, 0, 0, 0, 0),
(13, 4, 'pcp', 1, 1, 1, 0, 0),
(14, 4, 'dashboard', 1, 0, 0, 0, 0),
(15, 5, 'rh', 1, 1, 1, 0, 0),
(16, 5, 'dashboard', 1, 0, 0, 0, 0);

SQLEOF

if [ $? -eq 0 ]; then
    echo "OK - Dados inseridos com sucesso!"
else
    echo "ERRO ao inserir dados"
fi

echo ""
echo "=== Resumo Final ==="
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD zyntra_demo -e "
SELECT 'Usuarios' as item, COUNT(*) as total FROM usuarios
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

echo ""
echo "PRONTO - Banco zyntra_demo completo!"
