-- ================================================================
-- Migration: Adicionar empresa_id em ctes e mdfes
-- Corrige isolamento multiempresa no módulo de Logística
-- Data: 2026-04-25
-- ================================================================

-- Adicionar empresa_id em ctes (se não existir)
ALTER TABLE ctes
    ADD COLUMN IF NOT EXISTS empresa_id INT NOT NULL DEFAULT 1
        AFTER id;

ALTER TABLE ctes
    ADD INDEX IF NOT EXISTS idx_ctes_empresa_id (empresa_id);

-- Adicionar empresa_id em mdfes (se não existir)
ALTER TABLE mdfes
    ADD COLUMN IF NOT EXISTS empresa_id INT NOT NULL DEFAULT 1
        AFTER id;

ALTER TABLE mdfes
    ADD INDEX IF NOT EXISTS idx_mdfes_empresa_id (empresa_id);

-- Atualizar registros existentes para empresa padrão (id=1) se não definida
UPDATE ctes  SET empresa_id = 1 WHERE empresa_id IS NULL OR empresa_id = 0;
UPDATE mdfes SET empresa_id = 1 WHERE empresa_id IS NULL OR empresa_id = 0;
