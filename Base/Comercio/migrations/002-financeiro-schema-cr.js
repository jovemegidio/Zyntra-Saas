/**
 * MIGRATION: Atualização Schema Contas a Receber
 * ================================================
 * Novos campos:
 *  - pago_no_dia           (DATE)      — Data em que o pagamento foi efetivado
 *  - aceita_troca_factory  (BOOLEAN)   — Se aceita troca factory
 *  - comprovante_url       (VARCHAR)   — URL/path do comprovante de pagamento
 *  - origem_integracao     (VARCHAR)   — Fonte da integração (faturamento, compras, manual)
 *
 * Atualização de STATUS (enum estrito):
 *  Cancelada | Liquidada | Vencida | A Vencer
 *
 * Execução:
 *  node migrations/002-financeiro-schema-cr.js
 */

const pool = require('../database/pool');

async function migrate() {
    const connection = await pool.getConnection();

    try {
        console.log('[MIGRATION] Iniciando atualização schema Contas a Receber...');

        // ── 1. Adicionar novas colunas em contas_receber ──
        const novasColunas = [
            { col: 'pago_no_dia', def: 'DATE DEFAULT NULL COMMENT "Data efetiva do pagamento"' },
            { col: 'aceita_troca_factory', def: 'TINYINT(1) DEFAULT 0 COMMENT "Aceita troca factory (boolean)"' },
            { col: 'comprovante_url', def: 'VARCHAR(500) DEFAULT NULL COMMENT "URL/path do comprovante anexado"' },
            { col: 'origem_integracao', def: "VARCHAR(50) DEFAULT 'manual' COMMENT 'Origem: faturamento, compras, importacao, manual'" },
            // Colunas para parser ETL (2.4)
            { col: 'dia_recomprado', def: 'DATE DEFAULT NULL COMMENT "Data em que foi recomprado"' },
            { col: 'data_para_cartorio', def: 'DATE DEFAULT NULL COMMENT "Data prevista para cartório"' },
            { col: 'data_protestado', def: 'DATE DEFAULT NULL COMMENT "Data em que foi protestado"' },
        ];

        for (const { col, def } of novasColunas) {
            try {
                await connection.query(`ALTER TABLE contas_receber ADD COLUMN ${col} ${def}`);
                console.log(`  ✅ Coluna ${col} adicionada`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ⏭️  Coluna ${col} já existe`);
                } else {
                    throw err;
                }
            }
        }

        // ── 2. Adicionar origem_integracao em contas_pagar ──
        try {
            await connection.query(
                `ALTER TABLE contas_pagar ADD COLUMN origem_integracao VARCHAR(50) DEFAULT 'manual'
                 COMMENT 'Origem: faturamento, compras, importacao, manual'`
            );
            console.log('  ✅ contas_pagar.origem_integracao adicionada');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('  ⏭️  contas_pagar.origem_integracao já existe');
            } else {
                throw err;
            }
        }

        // ── 3. Criar tabela de domínio de status (se não utilizar enum inline) ──
        await connection.query(`
            CREATE TABLE IF NOT EXISTS financeiro_status_dominio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipo ENUM('cr', 'cp') NOT NULL COMMENT 'Tipo: cr=Contas a Receber, cp=Contas a Pagar',
                codigo VARCHAR(30) NOT NULL COMMENT 'Código do status (snake_case)',
                label VARCHAR(50) NOT NULL COMMENT 'Label para exibição',
                cor VARCHAR(20) DEFAULT NULL COMMENT 'Cor hex para UI',
                ativo TINYINT(1) DEFAULT 1,
                ordem INT DEFAULT 0,
                UNIQUE KEY uk_tipo_codigo (tipo, codigo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Inserir status padrão para CR (estritamente: Cancelada, Liquidada, Vencida, A Vencer)
        const statusCR = [
            { codigo: 'cancelada', label: 'Cancelada', cor: '#6c757d', ordem: 1 },
            { codigo: 'liquidada', label: 'Liquidada', cor: '#28a745', ordem: 2 },
            { codigo: 'vencida', label: 'Vencida', cor: '#dc3545', ordem: 3 },
            { codigo: 'a_vencer', label: 'A Vencer', cor: '#ffc107', ordem: 4 },
        ];

        for (const s of statusCR) {
            await connection.query(
                `INSERT INTO financeiro_status_dominio (tipo, codigo, label, cor, ordem)
                 VALUES ('cr', ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE label = VALUES(label), cor = VALUES(cor), ordem = VALUES(ordem)`,
                [s.codigo, s.label, s.cor, s.ordem]
            );
        }

        // Status padrão para CP
        const statusCP = [
            { codigo: 'cancelada', label: 'Cancelada', cor: '#6c757d', ordem: 1 },
            { codigo: 'liquidada', label: 'Liquidada', cor: '#28a745', ordem: 2 },
            { codigo: 'vencida', label: 'Vencida', cor: '#dc3545', ordem: 3 },
            { codigo: 'a_vencer', label: 'A Vencer', cor: '#ffc107', ordem: 4 },
        ];

        for (const s of statusCP) {
            await connection.query(
                `INSERT INTO financeiro_status_dominio (tipo, codigo, label, cor, ordem)
                 VALUES ('cp', ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE label = VALUES(label), cor = VALUES(cor), ordem = VALUES(ordem)`,
                [s.codigo, s.label, s.cor, s.ordem]
            );
        }

        console.log('  ✅ Tabela financeiro_status_dominio criada/atualizada com status estritos');

        // ── 4a. Criar tabela de log de integrações ──
        await connection.query(`
            CREATE TABLE IF NOT EXISTS financeiro_integracoes_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                origem VARCHAR(50) NOT NULL COMMENT 'faturamento, logistica, compras, manual',
                tipo_evento VARCHAR(50) NOT NULL COMMENT 'status_nfe, valor_nfe, compra_nf, compra_cancelada',
                referencia_id INT DEFAULT NULL COMMENT 'ID da entidade de origem (nfe_id, compra_id)',
                status_anterior VARCHAR(30) DEFAULT NULL,
                status_novo VARCHAR(30) DEFAULT NULL,
                dados_json JSON DEFAULT NULL COMMENT 'Payload completo do evento',
                usuario_id INT DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_origem (origem),
                INDEX idx_referencia (referencia_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Tabela financeiro_integracoes_log criada');

        // ── 4b. Adicionar compra_id em contas_pagar para rastreio de integração ──
        try {
            await connection.query(
                `ALTER TABLE contas_pagar ADD COLUMN compra_id INT DEFAULT NULL 
                 COMMENT 'ID da compra de origem (integração logística)'`
            );
            console.log('  ✅ contas_pagar.compra_id adicionada');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('  ⏭️  contas_pagar.compra_id já existe');
            } else {
                throw err;
            }
        }

        // ── 5. Migrar status legados para o novo padrão ──
        console.log('[MIGRATION] Migrando status legados...');

        // CR: mapear status antigos -> novos
        const migracaoStatusCR = [
            { antigos: "'PENDENTE', 'pendente', 'parcial', 'PARCIAL', 'aberto'", novo: 'a_vencer' },
            { antigos: "'PAGO', 'pago', 'recebido', 'recebida', 'RECEBIDO', 'RECEBIDA'", novo: 'liquidada' },
            { antigos: "'CANCELADO', 'cancelado', 'CANCELADA'", novo: 'cancelada' },
            { antigos: "'VENCIDO', 'vencido', 'vencida', 'VENCIDA'", novo: 'vencida' },
        ];

        for (const m of migracaoStatusCR) {
            const [result] = await connection.query(
                `UPDATE contas_receber SET status = ? WHERE status IN (${m.antigos})`,
                [m.novo]
            );
            if (result.affectedRows > 0) {
                console.log(`  📝 CR: ${result.affectedRows} registros migrados para '${m.novo}'`);
            }
        }

        // CP: mapear status antigos -> novos
        const migracaoStatusCP = [
            { antigos: "'PENDENTE', 'pendente', 'parcial', 'PARCIAL', 'aberto'", novo: 'a_vencer' },
            { antigos: "'PAGO', 'pago'", novo: 'liquidada' },
            { antigos: "'CANCELADO', 'cancelado', 'CANCELADA'", novo: 'cancelada' },
            { antigos: "'VENCIDO', 'vencido', 'vencida', 'VENCIDA'", novo: 'vencida' },
        ];

        for (const m of migracaoStatusCP) {
            const [result] = await connection.query(
                `UPDATE contas_pagar SET status = ? WHERE status IN (${m.antigos})`,
                [m.novo]
            );
            if (result.affectedRows > 0) {
                console.log(`  📝 CP: ${result.affectedRows} registros migrados para '${m.novo}'`);
            }
        }

        // ── 5. Auto-atualizar vencidas ──
        console.log('[MIGRATION] Marcando contas vencidas...');
        const [vencidasCR] = await connection.query(
            `UPDATE contas_receber SET status = 'vencida'
             WHERE status = 'a_vencer'
             AND COALESCE(data_vencimento, vencimento) < CURDATE()`
        );
        if (vencidasCR.affectedRows > 0) {
            console.log(`  📝 ${vencidasCR.affectedRows} CR marcadas como vencidas`);
        }

        const [vencidasCP] = await connection.query(
            `UPDATE contas_pagar SET status = 'vencida'
             WHERE status = 'a_vencer'
             AND COALESCE(data_vencimento, vencimento) < CURDATE()`
        );
        if (vencidasCP.affectedRows > 0) {
            console.log(`  📝 ${vencidasCP.affectedRows} CP marcadas como vencidas`);
        }

        console.log('[MIGRATION] ✅ Schema Financeiro atualizado com sucesso!');
    } catch (error) {
        console.error('[MIGRATION] ❌ Erro:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Se executado diretamente
if (require.main === module) {
    migrate()
        .then(() => { console.log('Migration concluída.'); process.exit(0); })
        .catch(err => { console.error('Migration falhou:', err); process.exit(1); });
}

module.exports = { migrate };
