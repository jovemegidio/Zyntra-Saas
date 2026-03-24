#!/bin/bash
# ============================================
# DEPLOY COMPLETO - WhatsApp Alerts System
# Alertas: Financeiro, Logística, Aniversários
# ============================================

echo "========================================="
echo "  DEPLOY SISTEMA DE ALERTAS WHATSAPP"
echo "========================================="

MYSQL="mysql -u aluforce -pAluforce2026VpsDB -h 31.97.64.102 aluforce_vendas -N"

# ============================================
# 1. Criar tabela de configuração WhatsApp
# ============================================
echo ""
echo "[1/5] Criando tabela de configuração..."

$MYSQL << 'SQL'
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao VARCHAR(255),
    ativo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserir configurações padrão (ignorar se já existem)
INSERT IGNORE INTO whatsapp_config (chave, valor, descricao) VALUES
('DESTINATARIOS_TESTE', '[]', 'Telefones para teste (Clemerson e Fernando)'),
('DESTINATARIOS_FINANCEIRO', '[]', 'Telefones do setor financeiro'),
('DESTINATARIOS_DIRETORIA', '[]', 'Telefones da diretoria'),
('DESTINATARIOS_LOGISTICA', '[]', 'Telefones de logística'),
('DESTINATARIOS_PCP', '[]', 'Telefones do PCP'),
('DESTINATARIOS_RH', '[]', 'Telefones do RH'),
('DESTINATARIOS_COMERCIAL', '[]', 'Telefones comercial'),
('ALERTA_CONTAS_PAGAR_DIAS', '7', 'Dias de antecedência para alerta de contas a pagar'),
('ALERTA_CONTAS_RECEBER_DIAS', '7', 'Dias de antecedência para alerta de contas a receber'),
('ALERTA_ESTOQUE_ATIVO', '1', 'Alertas de estoque crítico ativos'),
('ALERTA_ANIVERSARIO_ATIVO', '1', 'Alertas de aniversário ativos'),
('ALERTA_FINANCEIRO_ATIVO', '1', 'Alertas financeiros ativos'),
('ALERTA_LOGISTICA_ATIVO', '1', 'Alertas de logística ativos'),
('HORARIO_ALERTA_MANHA', '08:00', 'Horário do alerta da manhã'),
('HORARIO_ALERTA_TARDE', '14:00', 'Horário do alerta da tarde'),
('MODO_TESTE', '1', 'Se 1, envia apenas para DESTINATARIOS_TESTE');
SQL

echo "Tabela whatsapp_config criada!"

# ============================================
# 2. Criar tabela de log de alertas enviados
# ============================================
echo ""
echo "[2/5] Criando tabela de log..."

$MYSQL << 'SQL'
CREATE TABLE IF NOT EXISTS whatsapp_alertas_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL COMMENT 'aniversario, conta_pagar, conta_receber, estoque, logistica',
    destinatario VARCHAR(30) NOT NULL,
    mensagem TEXT,
    status VARCHAR(20) DEFAULT 'enviado' COMMENT 'enviado, erro, pendente',
    erro TEXT,
    referencia_id INT COMMENT 'ID da conta/pedido/funcionario',
    referencia_tipo VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tipo (tipo),
    INDEX idx_data (created_at),
    INDEX idx_ref (referencia_tipo, referencia_id)
);
SQL

echo "Tabela whatsapp_alertas_log criada!"

# ============================================
# 3. Atualizar campo telefone dos funcionários
# ============================================
echo ""
echo "[3/5] Verificando telefones..."

# Verificar telefones do Clemerson e Fernando
echo "Clemerson (id=29):"
$MYSQL -e "SELECT id, nome_completo, telefone FROM funcionarios WHERE id = 29;" 2>/dev/null
echo "Fernando (id=37):"
$MYSQL -e "SELECT id, nome_completo, telefone FROM funcionarios WHERE id = 37;" 2>/dev/null

echo ""
echo "NOTA: Telefones de Clemerson e Fernando precisam ser configurados!"
echo "Use: UPDATE funcionarios SET telefone = '11999999999' WHERE id = 29; -- Clemerson"
echo "Use: UPDATE funcionarios SET telefone = '11999999999' WHERE id = 37; -- Fernando"

# ============================================
# 4. Criar views úteis para os alertas
# ============================================
echo ""
echo "[4/5] Criando views de alerta..."

$MYSQL << 'SQL'

-- View: Contas a Pagar vencendo nos próximos N dias
CREATE OR REPLACE VIEW vw_contas_pagar_alertar AS
SELECT 
    cp.id,
    cp.descricao,
    cp.fornecedor_nome,
    cp.valor,
    cp.data_vencimento,
    DATEDIFF(cp.data_vencimento, CURDATE()) as dias_ate_vencimento,
    cp.status,
    cp.categoria_nome,
    CASE 
        WHEN cp.data_vencimento < CURDATE() THEN 'VENCIDA'
        WHEN DATEDIFF(cp.data_vencimento, CURDATE()) <= 1 THEN 'URGENTE'
        WHEN DATEDIFF(cp.data_vencimento, CURDATE()) <= 3 THEN 'ATENCAO'
        ELSE 'NORMAL'
    END as nivel_alerta
FROM contas_pagar cp
WHERE cp.status NOT IN ('pago', 'cancelado', 'Pago', 'Cancelado')
AND cp.data_vencimento BETWEEN DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY cp.data_vencimento ASC;

-- View: Contas a Receber vencendo
CREATE OR REPLACE VIEW vw_contas_receber_alertar AS
SELECT 
    cr.id,
    cr.descricao,
    cr.cliente_nome,
    cr.valor,
    cr.data_vencimento,
    DATEDIFF(cr.data_vencimento, CURDATE()) as dias_ate_vencimento,
    cr.status,
    CASE 
        WHEN cr.data_vencimento < CURDATE() THEN 'VENCIDA'
        WHEN DATEDIFF(cr.data_vencimento, CURDATE()) <= 1 THEN 'URGENTE'
        WHEN DATEDIFF(cr.data_vencimento, CURDATE()) <= 3 THEN 'ATENCAO'
        ELSE 'NORMAL'
    END as nivel_alerta
FROM contas_receber cr
WHERE cr.status NOT IN ('recebido', 'cancelado', 'Recebido', 'Cancelado')
AND cr.data_vencimento BETWEEN DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY cr.data_vencimento ASC;

-- View: Aniversariantes do dia
CREATE OR REPLACE VIEW vw_aniversariantes_hoje AS
SELECT 
    id,
    nome_completo,
    email,
    telefone,
    data_nascimento,
    cargo,
    departamento,
    TIMESTAMPDIFF(YEAR, data_nascimento, CURDATE()) as idade
FROM funcionarios
WHERE (status = 'Ativo' OR status = 'ativo' OR ativo = 1)
AND data_nascimento IS NOT NULL
AND MONTH(data_nascimento) = MONTH(CURDATE())
AND DAY(data_nascimento) = DAY(CURDATE());

-- View: Estoque crítico
CREATE OR REPLACE VIEW vw_estoque_critico AS
SELECT 
    e.id,
    e.produto,
    e.descricao,
    e.quantidade,
    e.estoque_minimo,
    e.unidade,
    (e.quantidade - e.estoque_minimo) as diferenca
FROM estoque e
WHERE e.quantidade <= e.estoque_minimo
AND e.estoque_minimo > 0
ORDER BY (e.quantidade / e.estoque_minimo) ASC;

-- View: Pedidos atrasados
CREATE OR REPLACE VIEW vw_pedidos_atrasados AS
SELECT 
    p.id,
    p.numero_pedido,
    p.cliente_nome,
    p.valor_total,
    p.data_entrega,
    DATEDIFF(CURDATE(), p.data_entrega) as dias_atraso,
    p.status
FROM pedidos p
WHERE p.status NOT IN ('entregue', 'cancelado', 'Entregue', 'Cancelado', 'faturado', 'Faturado')
AND p.data_entrega < CURDATE()
AND p.data_entrega IS NOT NULL
ORDER BY dias_atraso DESC;

SQL

echo "Views criadas!"

# ============================================
# 5. Testar views
# ============================================
echo ""
echo "[5/5] Testando views..."

echo ""
echo "--- Contas a Pagar (próximos 7 dias + vencidas) ---"
$MYSQL -e "SELECT COUNT(*) as total, nivel_alerta FROM vw_contas_pagar_alertar GROUP BY nivel_alerta;" 2>/dev/null || echo "Nenhuma conta a pagar para alertar"

echo ""
echo "--- Contas a Receber (próximos 7 dias + vencidas) ---"
$MYSQL -e "SELECT COUNT(*) as total, nivel_alerta FROM vw_contas_receber_alertar GROUP BY nivel_alerta;" 2>/dev/null || echo "Nenhuma conta a receber para alertar"

echo ""
echo "--- Aniversariantes de HOJE ---"
$MYSQL -e "SELECT nome_completo, idade, cargo FROM vw_aniversariantes_hoje;" 2>/dev/null || echo "Nenhum aniversariante hoje"

echo ""
echo "--- Estoque Crítico ---"
$MYSQL -e "SELECT COUNT(*) as total FROM vw_estoque_critico;" 2>/dev/null || echo "View estoque com erro (verificar campos)"

echo ""
echo "--- Pedidos Atrasados ---"
$MYSQL -e "SELECT COUNT(*) as total FROM vw_pedidos_atrasados;" 2>/dev/null || echo "View pedidos com erro (verificar campos)"

echo ""
echo "========================================="
echo "  BANCO DE DADOS CONFIGURADO!"
echo "========================================="
