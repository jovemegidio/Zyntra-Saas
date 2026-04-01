#!/bin/bash
set -e
MYSQL_CRED="-u aluforce -pCHANGE_ME_DB_PASSWORD"
DEMO_DB="zyntra_demo"

echo "=== Inserindo dados demo no zyntra_demo ==="

mysql $MYSQL_CRED $DEMO_DB 2>/dev/null << 'SQLEOF'

-- CONFIGURACOES EMPRESA
INSERT INTO configuracoes_empresa (id, razao_social, nome_fantasia, cnpj, inscricao_estadual, telefone, email, endereco, cidade, uf, cep, cor_primaria, cor_secundaria) 
VALUES (1, 'Zyntra Tecnologia Demonstracao LTDA', 'Zyntra Demo', '00.000.000/0001-00', '000.000.000.000', '(11) 99999-0000', 'demo@zyntra.com.br', 'Av. Demonstracao, 1000', 'Sao Paulo', 'SP', '01000-000', '#6C5CE7', '#4834d4')
ON DUPLICATE KEY UPDATE razao_social=VALUES(razao_social);

-- DEPARTAMENTOS
INSERT IGNORE INTO departamentos (id, nome, descricao) VALUES 
(1, 'Comercial', 'Departamento de Vendas'),
(2, 'Financeiro', 'Departamento Financeiro'),
(3, 'Producao', 'Departamento de Producao / PCP'),
(4, 'RH', 'Recursos Humanos'),
(5, 'Compras', 'Departamento de Compras'),
(6, 'TI', 'Tecnologia da Informacao'),
(7, 'Logistica', 'Logistica e Expedicao'),
(8, 'Diretoria', 'Diretoria Geral');

-- USUARIOS (senha: Demo@2026!)
INSERT IGNORE INTO usuarios (id, nome, email, login, role, setor, status, ativo, senha_hash, is_admin, areas, skip_2fa) VALUES 
(1, 'Administrador Demo', 'admin@zyntra.com.br', 'admin', 'admin', 'TI', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 1, '["vendas","financeiro","pcp","rh","compras","nfe","logistica","dashboard"]', 1),
(2, 'Vendedor Demo', 'vendas@zyntra.com.br', 'vendas', 'comercial', 'Comercial', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["vendas","dashboard"]', 1),
(3, 'Financeiro Demo', 'financeiro@zyntra.com.br', 'financeiro', 'financeiro', 'Financeiro', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["financeiro","dashboard"]', 1),
(4, 'Producao Demo', 'pcp@zyntra.com.br', 'pcp', 'user', 'PCP', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["pcp","dashboard"]', 1),
(5, 'RH Demo', 'rh@zyntra.com.br', 'rh', 'user', 'RH', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["rh","dashboard"]', 1);

-- FUNCIONARIOS
INSERT IGNORE INTO funcionarios (id, nome, cargo, departamento, email, telefone, data_admissao, status, salario) VALUES
(1, 'Administrador Demo', 'Diretor de TI', 'TI', 'admin@zyntra.com.br', '(11) 99999-0001', '2025-01-02', 'ativo', 15000.00),
(2, 'Maria Silva', 'Gerente Comercial', 'Comercial', 'vendas@zyntra.com.br', '(11) 99999-0002', '2025-02-01', 'ativo', 8500.00),
(3, 'Carlos Souza', 'Analista Financeiro', 'Financeiro', 'financeiro@zyntra.com.br', '(11) 99999-0003', '2025-03-01', 'ativo', 6500.00),
(4, 'Roberto Lima', 'Coordenador PCP', 'Producao', 'pcp@zyntra.com.br', '(11) 99999-0004', '2025-01-15', 'ativo', 7200.00),
(5, 'Ana Costa', 'Analista RH', 'RH', 'rh@zyntra.com.br', '(11) 99999-0005', '2025-04-01', 'ativo', 5800.00),
(6, 'Pedro Santos', 'Vendedor Externo', 'Comercial', 'pedro@zyntra.com.br', '(11) 99999-0006', '2025-05-01', 'ativo', 4200.00),
(7, 'Juliana Oliveira', 'Assistente Financeiro', 'Financeiro', 'juliana@zyntra.com.br', '(11) 99999-0007', '2025-06-01', 'ativo', 3800.00),
(8, 'Fernando Alves', 'Operador de Producao', 'Producao', 'fernando@zyntra.com.br', '(11) 99999-0008', '2025-03-15', 'ativo', 3200.00),
(9, 'Camila Rocha', 'Compradora', 'Compras', 'camila@zyntra.com.br', '(11) 99999-0009', '2025-07-01', 'ativo', 4500.00),
(10, 'Lucas Mendes', 'Motorista', 'Logistica', 'lucas@zyntra.com.br', '(11) 99999-0010', '2025-08-01', 'ativo', 3000.00);

-- CLIENTES
INSERT IGNORE INTO clientes (id, razao_social, nome_fantasia, cnpj_cpf, inscricao_estadual, tipo_pessoa, telefone, email, endereco, numero, bairro, cidade, uf, cep, status) VALUES
(1, 'ABC Industria e Comercio LTDA', 'ABC Comercio', '11.111.111/0001-01', '111.111.111.111', 'PJ', '(11) 3333-1001', 'contato@abc.com.br', 'Rua das Industrias', '100', 'Distrito Industrial', 'Sao Paulo', 'SP', '01100-000', 'ativo'),
(2, 'Tech Solutions S.A.', 'Tech Solutions', '22.222.222/0001-02', '222.222.222.222', 'PJ', '(11) 3333-1002', 'vendas@techsolutions.com.br', 'Av. Paulista', '1500', 'Bela Vista', 'Sao Paulo', 'SP', '01310-100', 'ativo'),
(3, 'Construtora Nova Era LTDA', 'Nova Era', '33.333.333/0001-03', '333.333.333.333', 'PJ', '(21) 3333-1003', 'compras@novaera.com.br', 'Rua do Porto', '250', 'Centro', 'Rio de Janeiro', 'RJ', '20040-020', 'ativo'),
(4, 'Metalurgica Precision LTDA', 'Precision Metal', '44.444.444/0001-04', '444.444.444.444', 'PJ', '(11) 3333-1004', 'suprimentos@precision.com.br', 'Rod. Anhanguera', 'Km 42', 'Jundiai', 'Jundiai', 'SP', '13209-000', 'ativo'),
(5, 'Distribuidora Global EIRELI', 'Global Dist.', '55.555.555/0001-05', '555.555.555.555', 'PJ', '(19) 3333-1005', 'pedidos@global.com.br', 'Rua Barao de Itapetininga', '88', 'Centro', 'Campinas', 'SP', '13015-080', 'ativo'),
(6, 'Farmacia Saude Total LTDA', 'Saude Total', '66.666.666/0001-06', NULL, 'PJ', '(11) 4444-1001', 'compras@saudetotal.com.br', 'Rua Augusta', '500', 'Consolacao', 'Sao Paulo', 'SP', '01304-000', 'ativo'),
(7, 'Supermercado Bom Preco LTDA', 'Bom Preco', '77.777.777/0001-07', '777.777.777.777', 'PJ', '(11) 4444-1002', 'compras@bompreco.com.br', 'Av. do Estado', '3000', 'Mooca', 'Sao Paulo', 'SP', '03105-000', 'ativo'),
(8, 'Joao da Silva', 'Joao Silva', '111.222.333-44', NULL, 'PF', '(11) 98888-1001', 'joao.silva@email.com', 'Rua das Flores', '42', 'Vila Nova', 'Sao Paulo', 'SP', '02030-000', 'ativo'),
(9, 'Auto Pecas Central LTDA', 'Central Auto', '88.888.888/0001-08', '888.888.888.888', 'PJ', '(12) 3333-1006', 'compras@centralauto.com.br', 'Rua XV de Novembro', '600', 'Centro', 'Sao Jose dos Campos', 'SP', '12245-000', 'ativo'),
(10, 'Escola Futuro Brilhante ME', 'Futuro Brilhante', '99.999.999/0001-09', NULL, 'PJ', '(11) 5555-1001', 'adm@futurobrilhante.com.br', 'Rua Educacao', '150', 'Jardins', 'Sao Paulo', 'SP', '01401-000', 'ativo');

-- FORNECEDORES
INSERT IGNORE INTO fornecedores (id, razao_social, nome_fantasia, cnpj, telefone, email, endereco, cidade, uf, status) VALUES
(1, 'Acos Brasil LTDA', 'Acos Brasil', '10.100.100/0001-10', '(11) 2222-0001', 'vendas@acosbrasil.com.br', 'Rod. Presidente Dutra Km 15', 'Guarulhos', 'SP', 'ativo'),
(2, 'Polimeros do Sul S.A.', 'Polimeros Sul', '20.200.200/0001-20', '(51) 2222-0002', 'comercial@polimerossul.com.br', 'Av. Farrapos, 1000', 'Porto Alegre', 'RS', 'ativo'),
(3, 'Eletronicos Shenzhen Import', 'Shenzhen Import', '30.300.300/0001-30', '(11) 2222-0003', 'sales@shenzhenimport.com.br', 'Rua 25 de Marco, 500', 'Sao Paulo', 'SP', 'ativo'),
(4, 'Embalagens Master LTDA', 'Embalagens Master', '40.400.400/0001-40', '(19) 2222-0004', 'vendas@embmaster.com.br', 'Rod. Santos Dumont Km 8', 'Campinas', 'SP', 'ativo'),
(5, 'Quimicos Nacional EIRELI', 'Quimicos Nac.', '50.500.500/0001-50', '(11) 2222-0005', 'vendas@quimicosnac.com.br', 'Rua dos Quimicos, 200', 'Diadema', 'SP', 'ativo');

-- PRODUTOS
INSERT IGNORE INTO produtos (id, codigo, nome, descricao, unidade, preco_venda, preco_custo, estoque_minimo, estoque_atual, ncm, status) VALUES
(1, 'PROD-001', 'Cabo Eletrico 2.5mm Flexivel', 'Cabo flexivel 2.5mm 750V - Rolo 100m', 'RL', 189.90, 95.50, 50, 320, '85444900', 'ativo'),
(2, 'PROD-002', 'Cabo Optico 12 Fibras', 'Cabo optico monomodo 12FO - Metro', 'MT', 12.50, 6.80, 1000, 5400, '85444200', 'ativo'),
(3, 'PROD-003', 'Conector RJ45 Cat6', 'Conector RJ45 categoria 6 blindado', 'PC', 3.90, 1.20, 500, 2800, '85366990', 'ativo'),
(4, 'PROD-004', 'Switch 24 Portas Gigabit', 'Switch gerenciavel 24P 10/100/1000', 'UN', 1290.00, 680.00, 10, 45, '85176299', 'ativo'),
(5, 'PROD-005', 'Rack 44U Fechado', 'Rack padrao 19pol 44U 800x1000mm', 'UN', 2890.00, 1450.00, 5, 12, '73269090', 'ativo'),
(6, 'PROD-006', 'Patch Panel 24P Cat6', 'Patch Panel 24 portas Cat6 1U', 'UN', 189.00, 85.00, 20, 78, '85366990', 'ativo'),
(7, 'PROD-007', 'Patch Cord 1.5m Cat6', 'Patch Cord UTP Cat6 1.5 metros', 'UN', 12.90, 4.50, 200, 850, '85444200', 'ativo'),
(8, 'PROD-008', 'Nobreak 1500VA', 'Nobreak senoidal 1500VA/1050W bivolt', 'UN', 1590.00, 890.00, 8, 22, '85043100', 'ativo'),
(9, 'PROD-009', 'Camera IP Dome 4MP', 'Camera IP dome 4MP IR 30m PoE', 'UN', 490.00, 210.00, 15, 65, '85258019', 'ativo'),
(10, 'PROD-010', 'DVR 16 Canais', 'DVR Standalone 16ch 1080P HDMI', 'UN', 890.00, 420.00, 5, 18, '85219090', 'ativo');

-- VENDEDORES
INSERT IGNORE INTO vendedores (id, nome, email, telefone, comissao_percentual, meta_mensal, status) VALUES
(1, 'Maria Silva', 'vendas@zyntra.com.br', '(11) 99999-0002', 5.00, 80000.00, 'ativo'),
(2, 'Pedro Santos', 'pedro@zyntra.com.br', '(11) 99999-0006', 4.50, 60000.00, 'ativo');

-- PEDIDOS
INSERT IGNORE INTO pedidos (id, numero, cliente_id, vendedor_id, data_pedido, data_entrega, status, valor_total, observacoes) VALUES
(1, 'PED-2026-001', 1, 1, '2026-01-05', '2026-01-20', 'entregue', 15890.00, 'Projeto cabeamento estruturado'),
(2, 'PED-2026-002', 2, 1, '2026-01-12', '2026-01-30', 'entregue', 8750.00, 'Infraestrutura de rede'),
(3, 'PED-2026-003', 3, 2, '2026-01-20', '2026-02-05', 'entregue', 22500.00, 'CFTV completo obra'),
(4, 'PED-2026-004', 4, 1, '2026-02-01', '2026-02-15', 'entregue', 5640.00, 'Materiais eletricos'),
(5, 'PED-2026-005', 5, 2, '2026-02-10', '2026-02-25', 'faturado', 12300.00, 'Switch e rack'),
(6, 'PED-2026-006', 6, 1, '2026-02-18', '2026-03-05', 'em_producao', 3890.00, 'Cabeamento loja'),
(7, 'PED-2026-007', 7, 2, '2026-02-25', '2026-03-10', 'em_producao', 45600.00, 'Projeto completo supermercado'),
(8, 'PED-2026-008', 1, 1, '2026-03-01', '2026-03-15', 'aprovado', 9800.00, 'Expansao rede ABC'),
(9, 'PED-2026-009', 9, 2, '2026-03-03', '2026-03-20', 'pendente', 6720.00, 'CFTV auto pecas'),
(10, 'PED-2026-010', 10, 1, '2026-03-05', '2026-03-25', 'pendente', 18900.00, 'Infraestrutura completa escola');

-- CONTAS PAGAR
INSERT IGNORE INTO contas_pagar (id, descricao, fornecedor_id, valor, data_vencimento, data_pagamento, status, categoria) VALUES
(1, 'NF 1234 - Cabos eletricos', 1, 4500.00, '2026-02-15', '2026-02-14', 'pago', 'materia_prima'),
(2, 'NF 5678 - Polimeros', 2, 8200.00, '2026-02-28', '2026-02-27', 'pago', 'materia_prima'),
(3, 'NF 9012 - Componentes', 3, 12500.00, '2026-03-10', NULL, 'pendente', 'materia_prima'),
(4, 'NF 3456 - Embalagens', 4, 3200.00, '2026-03-15', NULL, 'pendente', 'insumos'),
(5, 'Aluguel galpao Mar/2026', NULL, 15000.00, '2026-03-05', '2026-03-04', 'pago', 'aluguel'),
(6, 'Energia eletrica Fev/2026', NULL, 8900.00, '2026-03-10', NULL, 'pendente', 'energia'),
(7, 'Folha pagamento Mar/2026', NULL, 45000.00, '2026-03-05', '2026-03-05', 'pago', 'folha');

-- CONTAS RECEBER
INSERT IGNORE INTO contas_receber (id, descricao, cliente_id, valor, data_vencimento, data_pagamento, status) VALUES
(1, 'PED-001 Parcela 1/2', 1, 7945.00, '2026-01-20', '2026-01-20', 'pago'),
(2, 'PED-001 Parcela 2/2', 1, 7945.00, '2026-02-20', '2026-02-19', 'pago'),
(3, 'PED-002', 2, 8750.00, '2026-01-30', '2026-01-30', 'pago'),
(4, 'PED-003 Parcela 1/3', 3, 7500.00, '2026-02-05', '2026-02-05', 'pago'),
(5, 'PED-003 Parcela 2/3', 3, 7500.00, '2026-03-05', NULL, 'pendente'),
(6, 'PED-003 Parcela 3/3', 3, 7500.00, '2026-04-05', NULL, 'pendente'),
(7, 'PED-004', 4, 5640.00, '2026-02-15', '2026-02-15', 'pago'),
(8, 'PED-005', 5, 12300.00, '2026-03-10', NULL, 'pendente'),
(9, 'PED-006', 6, 3890.00, '2026-03-15', NULL, 'pendente'),
(10, 'PED-007 Parcela 1/3', 7, 15200.00, '2026-03-10', NULL, 'pendente');

-- CATEGORIAS FINANCEIRAS
INSERT IGNORE INTO categorias_financeiras (id, nome, tipo, descricao) VALUES
(1, 'Vendas de Produtos', 'receita', 'Receita com venda de produtos'),
(2, 'Servicos de Instalacao', 'receita', 'Receita com servicos'),
(3, 'Materia Prima', 'despesa', 'Compra de materia prima'),
(4, 'Folha de Pagamento', 'despesa', 'Salarios e encargos'),
(5, 'Aluguel', 'despesa', 'Aluguel de imoveis'),
(6, 'Energia e Utilidades', 'despesa', 'Luz, agua, gas');

-- CONTAS BANCARIAS
INSERT IGNORE INTO contas_bancarias (id, banco, agencia, conta, tipo, saldo, descricao, status) VALUES
(1, 'Banco do Brasil', '1234-5', '56789-0', 'corrente', 125000.00, 'Conta principal', 'ativa'),
(2, 'Itau', '0987-6', '12345-6', 'corrente', 45000.00, 'Conta secundaria', 'ativa'),
(3, 'Caixa Economica', '3456-7', '98765-4', 'poupanca', 80000.00, 'Reserva', 'ativa');

-- ORDENS PRODUCAO
INSERT IGNORE INTO ordens_producao (id, numero, pedido_id, produto_id, quantidade, data_inicio, data_previsao, status, prioridade, observacoes) VALUES
(1, 'OP-2026-001', 6, 1, 30, '2026-02-20', '2026-03-03', 'em_andamento', 'alta', 'Cabos para loja'),
(2, 'OP-2026-002', 7, 1, 50, '2026-02-27', '2026-03-08', 'em_andamento', 'alta', 'Cabos projeto supermercado'),
(3, 'OP-2026-003', 7, 2, 2000, '2026-02-28', '2026-03-12', 'planejada', 'media', 'Cabos opticos'),
(4, 'OP-2026-004', 8, 4, 3, '2026-03-05', '2026-03-12', 'planejada', 'media', 'Switches'),
(5, 'OP-2026-005', 9, 9, 10, '2026-03-06', '2026-03-18', 'planejada', 'normal', 'Cameras');

-- WHATSAPP CONFIG (desabilitado)
INSERT IGNORE INTO whatsapp_config (id, chave, valor) VALUES
(1, 'WHATSAPP_ATIVO', 'false'),
(2, 'DESTINATARIOS_TESTE', '[]');

-- ROLES
INSERT IGNORE INTO roles (id, nome, descricao) VALUES
(1, 'admin', 'Administrador do sistema'),
(2, 'gerente', 'Gerente de departamento'),
(3, 'operador', 'Operador / Usuario padrao');

-- MODULOS
INSERT IGNORE INTO modulos (id, nome, descricao, icone, rota) VALUES
(1, 'Dashboard', 'Painel principal', 'dashboard', '/dashboard'),
(2, 'Vendas', 'Modulo de vendas', 'shopping_cart', '/vendas'),
(3, 'Financeiro', 'Modulo financeiro', 'account_balance', '/financeiro'),
(4, 'PCP', 'Producao', 'precision_manufacturing', '/pcp'),
(5, 'RH', 'Recursos humanos', 'people', '/rh'),
(6, 'Compras', 'Compras', 'shopping_bag', '/compras'),
(7, 'NF-e', 'Notas fiscais', 'receipt', '/nfe'),
(8, 'Estoque', 'Controle de estoque', 'inventory', '/estoque');

-- PERMISSOES
INSERT IGNORE INTO permissoes_modulos (id, usuario_id, modulo, pode_ver, pode_editar, pode_excluir, pode_exportar) VALUES
(1, 1, 'vendas', 1, 1, 1, 1),
(2, 1, 'financeiro', 1, 1, 1, 1),
(3, 1, 'pcp', 1, 1, 1, 1),
(4, 1, 'rh', 1, 1, 1, 1),
(5, 1, 'compras', 1, 1, 1, 1),
(6, 1, 'nfe', 1, 1, 1, 1),
(7, 1, 'estoque', 1, 1, 1, 1),
(8, 1, 'dashboard', 1, 1, 1, 1),
(9, 2, 'vendas', 1, 1, 0, 1),
(10, 2, 'dashboard', 1, 0, 0, 0),
(11, 3, 'financeiro', 1, 1, 0, 1),
(12, 3, 'dashboard', 1, 0, 0, 0),
(13, 4, 'pcp', 1, 1, 0, 1),
(14, 4, 'dashboard', 1, 0, 0, 0),
(15, 5, 'rh', 1, 1, 0, 1),
(16, 5, 'dashboard', 1, 0, 0, 0);

SQLEOF

echo ""
echo "=== Resumo ==="
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD zyntra_demo -e "
SELECT 'Usuarios' as item, COUNT(*) as total FROM usuarios
UNION ALL SELECT 'Clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'Produtos', COUNT(*) FROM produtos
UNION ALL SELECT 'Pedidos', COUNT(*) FROM pedidos
UNION ALL SELECT 'Fornecedores', COUNT(*) FROM fornecedores
UNION ALL SELECT 'Funcionarios', COUNT(*) FROM funcionarios
UNION ALL SELECT 'Contas Pagar', COUNT(*) FROM contas_pagar
UNION ALL SELECT 'Contas Receber', COUNT(*) FROM contas_receber;" 2>/dev/null

echo ""
echo "PRONTO!"
