-- UC-FIN-01: Criar Conta a Pagar
-- Migration: Adicionar idempotency_key e tabela de auditoria financeira
-- Data: 2026-04-10

-- 1. Coluna de idempotência na tabela contas_pagar (previne lançamentos duplicados)
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_pagar_idempotency ON contas_pagar(idempotency_key);

-- 2. Garantir coluna forma_pagamento existe
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50) NULL;

-- 3. Garantir colunas de parcelamento existem
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS parcelado TINYINT(1) DEFAULT 0;
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS numero_parcela INT NULL;
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS total_parcelas INT NULL;

-- 4. Tabela de auditoria financeira enterprise
CREATE TABLE IF NOT EXISTS financeiro_auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    usuario_nome VARCHAR(150),
    acao VARCHAR(50) NOT NULL COMMENT 'criar, editar, excluir, pagar, estornar',
    modulo VARCHAR(50) NOT NULL COMMENT 'contas_pagar, contas_receber, fluxo_caixa, banco',
    entidade VARCHAR(50) NOT NULL,
    entidade_id BIGINT,
    descricao TEXT,
    dados_json JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fin_audit_usuario (usuario_id),
    INDEX idx_fin_audit_acao (acao),
    INDEX idx_fin_audit_entidade (entidade, entidade_id),
    INDEX idx_fin_audit_data (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
