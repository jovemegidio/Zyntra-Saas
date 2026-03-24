#!/bin/bash
# Script corrigido com as colunas REAIS do banco
MYSQL_CRED="-u aluforce -pAluforce2026VpsDB"
DB="zyntra_demo"

echo "=== Inserindo dados demo (v3) ==="

mysql $MYSQL_CRED $DB << 'SQLEOF'

-- ============ CONFIGURACOES EMPRESA ============
-- Colunas: id, razao_social, nome_fantasia, cnpj, inscricao_estadual, telefone, email, endereco, cidade, estado, cep, logo_path, favicon_path
INSERT INTO configuracoes_empresa (id, razao_social, nome_fantasia, cnpj, inscricao_estadual, telefone, email, endereco, cidade, estado, cep, logo_path) 
VALUES (1, 'Zyntra Tecnologia Demonstracao LTDA', 'Zyntra Demo', '00.000.000/0001-00', '000.000.000.000', '(11) 99999-0000', 'demo@zyntra.com.br', 'Av. Demonstracao, 1000', 'Sao Paulo', 'SP', '01000-000', '/images/zyntra-branco.png')
ON DUPLICATE KEY UPDATE razao_social=VALUES(razao_social), nome_fantasia=VALUES(nome_fantasia);

-- ============ DEPARTAMENTOS ============
-- Colunas: id, nome, descricao, sigla, cor, icone, ativo
INSERT IGNORE INTO departamentos (id, nome, descricao, sigla, ativo) VALUES 
(1, 'Comercial', 'Departamento de Vendas', 'COM', 1),
(2, 'Financeiro', 'Departamento Financeiro', 'FIN', 1),
(3, 'Producao', 'Departamento de Producao / PCP', 'PCP', 1),
(4, 'RH', 'Recursos Humanos', 'RH', 1),
(5, 'Compras', 'Departamento de Compras', 'CMP', 1),
(6, 'TI', 'Tecnologia da Informacao', 'TI', 1),
(7, 'Logistica', 'Logistica e Expedicao', 'LOG', 1),
(8, 'Diretoria', 'Diretoria Geral', 'DIR', 1);

-- ============ USUARIOS ============
-- Colunas relevantes: id, nome, email, login, role, setor, status, ativo, senha_hash, is_admin, areas
INSERT IGNORE INTO usuarios (id, nome, email, login, role, setor, status, ativo, senha_hash, is_admin, areas) VALUES 
(1, 'Administrador Demo', 'admin@zyntra.com.br', 'admin', 'admin', 'TI', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 1, '["vendas","financeiro","pcp","rh","compras","nfe","logistica","dashboard"]'),
(2, 'Vendedor Demo', 'vendas@zyntra.com.br', 'vendas', 'comercial', 'Comercial', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["vendas","dashboard"]'),
(3, 'Financeiro Demo', 'financeiro@zyntra.com.br', 'financeiro', 'financeiro', 'Financeiro', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["financeiro","dashboard"]'),
(4, 'Producao Demo', 'pcp@zyntra.com.br', 'pcp', 'user', 'PCP', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["pcp","dashboard"]'),
(5, 'RH Demo', 'rh@zyntra.com.br', 'rh', 'user', 'RH', 'ativo', 1, '$2a$12$lVjehu6eV0AH12.G.1553exeUSICX/yHYnhpLdOMhfhosdOtPNOKu', 0, '["rh","dashboard"]');

-- ============ FUNCIONARIOS ============
-- Colunas relevantes: id, nome_completo, cargo, departamento, email, telefone, data_admissao, status, salario
INSERT IGNORE INTO funcionarios (id, nome_completo, cargo, departamento, email, telefone, data_admissao, status, salario) VALUES
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

-- ============ CLIENTES ============
-- Colunas: id, razao_social, nome_fantasia, cnpj_cpf, inscricao_estadual, telefone, email, endereco, bairro, cidade, estado, cep, status
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

-- ============ FORNECEDORES ============
-- Colunas: id, razao_social, nome_fantasia, cnpj, telefone, email, endereco, cidade, estado, ativo
INSERT IGNORE INTO fornecedores (id, razao_social, nome_fantasia, cnpj, telefone, email, endereco, cidade, estado, ativo) VALUES
(1, 'Acos Brasil LTDA', 'Acos Brasil', '10.100.100/0001-10', '(11) 2222-0001', 'vendas@acosbrasil.com.br', 'Rod. Presidente Dutra Km 15', 'Guarulhos', 'SP', 1),
(2, 'Polimeros do Sul S.A.', 'Polimeros Sul', '20.200.200/0001-20', '(51) 2222-0002', 'comercial@polimerossul.com.br', 'Av. Farrapos, 1000', 'Porto Alegre', 'RS', 1),
(3, 'Eletronicos Shenzhen Import', 'Shenzhen Import', '30.300.300/0001-30', '(11) 2222-0003', 'sales@shenzhenimport.com.br', 'Rua 25 de Marco, 500', 'Sao Paulo', 'SP', 1),
(4, 'Embalagens Master LTDA', 'Embalagens Master', '40.400.400/0001-40', '(19) 2222-0004', 'vendas@embmaster.com.br', 'Rod. Santos Dumont Km 8', 'Campinas', 'SP', 1),
(5, 'Quimicos Nacional EIRELI', 'Quimicos Nac.', '50.500.500/0001-50', '(11) 2222-0005', 'vendas@quimicosnac.com.br', 'Rua dos Quimicos, 200', 'Diadema', 'SP', 1);

-- ============ PRODUTOS ============
-- Colunas: id, codigo, nome, descricao, unidade, preco_venda, preco_custo, estoque_minimo, estoque_atual, ncm, status, ativo
INSERT IGNORE INTO produtos (id, codigo, nome, descricao, preco_venda, preco_custo, estoque_minimo, estoque_atual, ncm, status, ativo) VALUES
(1, 'PROD-001', 'Cabo Eletrico 2.5mm Flexivel', 'Cabo flexivel 2.5mm 750V - Rolo 100m', 189.90, 95.50, 50, 320, '85444900', 'ativo', 1),
(2, 'PROD-002', 'Cabo Optico 12 Fibras', 'Cabo optico monomodo 12FO - Metro', 12.50, 6.80, 1000, 5400, '85444200', 'ativo', 1),
(3, 'PROD-003', 'Conector RJ45 Cat6', 'Conector RJ45 categoria 6 blindado', 3.90, 1.20, 500, 2800, '85366990', 'ativo', 1),
(4, 'PROD-004', 'Switch 24 Portas Gigabit', 'Switch gerenciavel 24P 10/100/1000', 1290.00, 680.00, 10, 45, '85176299', 'ativo', 1),
(5, 'PROD-005', 'Rack 44U Fechado', 'Rack padrao 19pol 44U 800x1000mm', 2890.00, 1450.00, 5, 12, '73269090', 'ativo', 1),
(6, 'PROD-006', 'Patch Panel 24P Cat6', 'Patch Panel 24 portas Cat6 1U', 189.00, 85.00, 20, 78, '85366990', 'ativo', 1),
(7, 'PROD-007', 'Patch Cord 1.5m Cat6', 'Patch Cord UTP Cat6 1.5 metros', 12.90, 4.50, 200, 850, '85444200', 'ativo', 1),
(8, 'PROD-008', 'Nobreak 1500VA', 'Nobreak senoidal 1500VA/1050W bivolt', 1590.00, 890.00, 8, 22, '85043100', 'ativo', 1),
(9, 'PROD-009', 'Camera IP Dome 4MP', 'Camera IP dome 4MP IR 30m PoE', 490.00, 210.00, 15, 65, '85258019', 'ativo', 1),
(10, 'PROD-010', 'DVR 16 Canais', 'DVR Standalone 16ch 1080P HDMI', 890.00, 420.00, 5, 18, '85219090', 'ativo', 1);

-- ============ VENDEDORES ============
-- Colunas: id, nome, email, telefone, comissao, usuario_id
INSERT IGNORE INTO vendedores (id, nome, email, telefone, comissao) VALUES
(1, 'Maria Silva', 'vendas@zyntra.com.br', '(11) 99999-0002', 5.00),
(2, 'Pedro Santos', 'pedro@zyntra.com.br', '(11) 99999-0006', 4.50);

-- ============ PEDIDOS ============
-- Colunas relevantes: id, numero_pedido, cliente_id, vendedor_id, status, valor_total, observacao, created_at
INSERT IGNORE INTO pedidos (id, numero_pedido, cliente_id, vendedor_id, status, valor_total, observacao, created_at) VALUES
(1, 'PED-2026-001', 1, 1, 'entregue', 15890.00, 'Projeto cabeamento estruturado', '2026-01-05 10:00:00'),
(2, 'PED-2026-002', 2, 1, 'entregue', 8750.00, 'Infraestrutura de rede', '2026-01-12 10:00:00'),
(3, 'PED-2026-003', 3, 2, 'entregue', 22500.00, 'CFTV completo obra', '2026-01-20 10:00:00'),
(4, 'PED-2026-004', 4, 1, 'entregue', 5640.00, 'Materiais eletricos', '2026-02-01 10:00:00'),
(5, 'PED-2026-005', 5, 2, 'faturado', 12300.00, 'Switch e rack', '2026-02-10 10:00:00'),
(6, 'PED-2026-006', 6, 1, 'em_producao', 3890.00, 'Cabeamento loja', '2026-02-18 10:00:00'),
(7, 'PED-2026-007', 7, 2, 'em_producao', 45600.00, 'Projeto completo supermercado', '2026-02-25 10:00:00'),
(8, 'PED-2026-008', 1, 1, 'aprovado', 9800.00, 'Expansao rede ABC', '2026-03-01 10:00:00'),
(9, 'PED-2026-009', 9, 2, 'pendente', 6720.00, 'CFTV auto pecas', '2026-03-03 10:00:00'),
(10, 'PED-2026-010', 10, 1, 'pendente', 18900.00, 'Infraestrutura completa escola', '2026-03-05 10:00:00');

-- ============ CONTAS PAGAR ============
-- Colunas: id, descricao, fornecedor_id, valor, data_vencimento, data_pagamento, status, departamento
INSERT IGNORE INTO contas_pagar (id, descricao, fornecedor_id, valor, data_vencimento, data_pagamento, status) VALUES
(1, 'NF 1234 - Cabos eletricos', 1, 4500.00, '2026-02-15', '2026-02-14', 'pago'),
(2, 'NF 5678 - Polimeros', 2, 8200.00, '2026-02-28', '2026-02-27', 'pago'),
(3, 'NF 9012 - Componentes', 3, 12500.00, '2026-03-10', NULL, 'pendente'),
(4, 'NF 3456 - Embalagens', 4, 3200.00, '2026-03-15', NULL, 'pendente'),
(5, 'Aluguel galpao Mar/2026', NULL, 15000.00, '2026-03-05', '2026-03-04', 'pago'),
(6, 'Energia eletrica Fev/2026', NULL, 8900.00, '2026-03-10', NULL, 'pendente'),
(7, 'Folha pagamento Mar/2026', NULL, 45000.00, '2026-03-05', '2026-03-05', 'pago');

-- ============ CONTAS RECEBER ============
-- Colunas: id, descricao, cliente_id, valor, data_vencimento, data_recebimento, status
INSERT IGNORE INTO contas_receber (id, descricao, cliente_id, valor, data_vencimento, data_recebimento, status) VALUES
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

-- ============ CATEGORIAS FINANCEIRAS ============
-- Colunas: id, nome, tipo, descricao, ativo
INSERT IGNORE INTO categorias_financeiras (id, nome, tipo, descricao, ativo) VALUES
(1, 'Vendas de Produtos', 'receita', 'Receita com venda de produtos', 1),
(2, 'Servicos de Instalacao', 'receita', 'Receita com servicos', 1),
(3, 'Materia Prima', 'despesa', 'Compra de materia prima', 1),
(4, 'Folha de Pagamento', 'despesa', 'Salarios e encargos', 1),
(5, 'Aluguel', 'despesa', 'Aluguel de imoveis', 1),
(6, 'Energia e Utilidades', 'despesa', 'Luz, agua, gas', 1);

-- ============ CONTAS BANCARIAS ============
-- Colunas: id, banco, agencia, conta, tipo, saldo, saldo_atual, descricao, ativo
INSERT IGNORE INTO contas_bancarias (id, banco, agencia, conta, tipo, saldo, saldo_atual, descricao, ativo) VALUES
(1, 'Banco do Brasil', '1234-5', '56789-0', 'corrente', 125000.00, 125000.00, 'Conta principal', 1),
(2, 'Itau', '0987-6', '12345-6', 'corrente', 45000.00, 45000.00, 'Conta secundaria', 1),
(3, 'Caixa Economica', '3456-7', '98765-4', 'poupanca', 80000.00, 80000.00, 'Reserva', 1);

-- ============ ORDENS PRODUCAO ============
-- Colunas: id, numero_pedido, produto_nome, quantidade, data_inicio, data_previsao_entrega, status, prioridade, observacoes
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
-- Colunas: id, nome, descricao, icone, url, ativo
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
-- Colunas: id, usuario_id, modulo, visualizar, criar, editar, excluir, aprovar
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

echo ""
echo "=== Resumo ==="
mysql -u aluforce -pAluforce2026VpsDB zyntra_demo -e "
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
UNION ALL SELECT 'Contas Bancarias', COUNT(*) FROM contas_bancarias;" 2>/dev/null

echo ""
echo "CONCLUIDO!"
