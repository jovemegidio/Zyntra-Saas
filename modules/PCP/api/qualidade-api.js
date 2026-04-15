/**
 * API Qualidade - Módulo de Qualidade do PCP
 * 
 * Funcionalidades:
 * - Inspeções de qualidade (recebimento, em processo, final, dimensional, visual)
 * - Não conformidades (NC) com severidade e ações corretivas
 * - Checklists de qualidade reutilizáveis
 * - KPIs de qualidade
 * - Integração com ordens de produção
 */

const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aluforce_vendas',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

// ===================================================================
// AUTO-MIGRAÇÃO: Criar tabelas se não existirem
// ===================================================================
async function ensureTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS qualidade_inspecoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ordem_producao VARCHAR(100),
                pedido_id INT NULL,
                produto VARCHAR(255),
                tipo ENUM('recebimento','em_processo','final','dimensional','visual') DEFAULT 'final',
                status ENUM('pendente','em_andamento','aprovado','reprovado') DEFAULT 'pendente',
                responsavel VARCHAR(255),
                observacoes TEXT,
                resultado TEXT,
                data_inspecao DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_tipo (tipo),
                INDEX idx_data (data_inspecao),
                INDEX idx_pedido (pedido_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS qualidade_nao_conformidades (
                id INT AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT,
                severidade ENUM('critica','maior','menor','observacao') DEFAULT 'menor',
                origem ENUM('inspecao','reclamacao_cliente','processo_interno','auditoria') DEFAULT 'inspecao',
                status ENUM('aberta','em_analise','resolvida','fechada') DEFAULT 'aberta',
                inspecao_id INT NULL,
                ordem_producao VARCHAR(100),
                produto VARCHAR(255),
                acao_corretiva TEXT,
                responsavel VARCHAR(255),
                prazo DATE NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_severidade (severidade),
                INDEX idx_inspecao (inspecao_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS qualidade_checklists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                tipo ENUM('recebimento','em_processo','final','dimensional','visual') DEFAULT 'final',
                ativo TINYINT(1) DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tipo (tipo),
                INDEX idx_ativo (ativo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS qualidade_checklist_itens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                checklist_id INT NOT NULL,
                descricao VARCHAR(500) NOT NULL,
                obrigatorio TINYINT(1) DEFAULT 1,
                ordem INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_checklist (checklist_id),
                FOREIGN KEY (checklist_id) REFERENCES qualidade_checklists(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        console.log('[QUALIDADE] Tabelas verificadas/criadas com sucesso');
    } catch (err) {
        console.error('[QUALIDADE] Erro ao criar tabelas:', err.message);
    }
}
ensureTables();

// ===================================================================
// KPIs
// ===================================================================
router.get('/kpis', async (req, res) => {
    try {
        const mesAtual = new Date();
        const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).toISOString().slice(0, 10);
        const ultimoDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).toISOString().slice(0, 10);

        const [[totalMes]] = await pool.query(
            `SELECT COUNT(*) AS total FROM qualidade_inspecoes WHERE data_inspecao BETWEEN ? AND ?`,
            [primeiroDia, ultimoDia + ' 23:59:59']
        );
        const [[aprovadas]] = await pool.query(
            `SELECT COUNT(*) AS total FROM qualidade_inspecoes WHERE status = 'aprovado' AND data_inspecao BETWEEN ? AND ?`,
            [primeiroDia, ultimoDia + ' 23:59:59']
        );
        const [[ncAbertas]] = await pool.query(
            `SELECT COUNT(*) AS total FROM qualidade_nao_conformidades WHERE status IN ('aberta', 'em_analise')`
        );
        const [[pendentes]] = await pool.query(
            `SELECT COUNT(*) AS total FROM qualidade_inspecoes WHERE status = 'pendente'`
        );
        const [[checklistsAtivos]] = await pool.query(
            `SELECT COUNT(*) AS total FROM qualidade_checklists WHERE ativo = 1`
        );

        const totalInspecoes = totalMes.total || 0;
        const taxaAprovacao = totalInspecoes > 0 ? Math.round((aprovadas.total / totalInspecoes) * 100) : 0;

        res.json({
            success: true,
            data: {
                totalInspecoesMes: totalInspecoes,
                taxaAprovacao,
                ncAbertas: ncAbertas.total || 0,
                inspecoesPendentes: pendentes.total || 0,
                checklistsAtivos: checklistsAtivos.total || 0
            }
        });
    } catch (error) {
        console.error('[QUALIDADE] Erro KPIs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===================================================================
// INSPEÇÕES
// ===================================================================
router.get('/inspecoes', async (req, res) => {
    try {
        const { status, tipo, data_inicio, data_fim } = req.query;
        let sql = 'SELECT * FROM qualidade_inspecoes WHERE 1=1';
        const params = [];

        if (status) { sql += ' AND status = ?'; params.push(status); }
        if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
        if (data_inicio) { sql += ' AND data_inspecao >= ?'; params.push(data_inicio); }
        if (data_fim) { sql += ' AND data_inspecao <= ?'; params.push(data_fim + ' 23:59:59'); }

        sql += ' ORDER BY created_at DESC LIMIT 500';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[QUALIDADE] Erro listar inspeções:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/inspecoes/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM qualidade_inspecoes WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Inspeção não encontrada' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/inspecoes', async (req, res) => {
    try {
        const { ordem_producao, pedido_id, produto, tipo, status, responsavel, observacoes, resultado } = req.body;
        if (!produto) return res.status(400).json({ success: false, message: 'Produto é obrigatório' });

        const [result] = await pool.query(
            `INSERT INTO qualidade_inspecoes (ordem_producao, pedido_id, produto, tipo, status, responsavel, observacoes, resultado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [ordem_producao || null, pedido_id || null, produto, tipo || 'final', status || 'pendente', responsavel || null, observacoes || null, resultado || null]
        );
        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Inspeção criada com sucesso' });
    } catch (error) {
        console.error('[QUALIDADE] Erro criar inspeção:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/inspecoes/:id', async (req, res) => {
    try {
        const { ordem_producao, pedido_id, produto, tipo, status, responsavel, observacoes, resultado } = req.body;
        await pool.query(
            `UPDATE qualidade_inspecoes SET ordem_producao=?, pedido_id=?, produto=?, tipo=?, status=?, responsavel=?, observacoes=?, resultado=?
             WHERE id = ?`,
            [ordem_producao || null, pedido_id || null, produto, tipo, status, responsavel || null, observacoes || null, resultado || null, req.params.id]
        );
        res.json({ success: true, message: 'Inspeção atualizada' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/inspecoes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM qualidade_inspecoes WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Inspeção excluída' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===================================================================
// NÃO CONFORMIDADES
// ===================================================================
router.get('/nao-conformidades', async (req, res) => {
    try {
        const { status, severidade } = req.query;
        let sql = 'SELECT * FROM qualidade_nao_conformidades WHERE 1=1';
        const params = [];

        if (status) { sql += ' AND status = ?'; params.push(status); }
        if (severidade) { sql += ' AND severidade = ?'; params.push(severidade); }

        sql += ' ORDER BY created_at DESC LIMIT 500';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[QUALIDADE] Erro listar NCs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/nao-conformidades/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM qualidade_nao_conformidades WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'NC não encontrada' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/nao-conformidades', async (req, res) => {
    try {
        const { titulo, descricao, severidade, origem, status, inspecao_id, ordem_producao, produto, acao_corretiva, responsavel, prazo } = req.body;
        if (!titulo) return res.status(400).json({ success: false, message: 'Título é obrigatório' });

        const [result] = await pool.query(
            `INSERT INTO qualidade_nao_conformidades (titulo, descricao, severidade, origem, status, inspecao_id, ordem_producao, produto, acao_corretiva, responsavel, prazo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [titulo, descricao || null, severidade || 'menor', origem || 'inspecao', status || 'aberta', inspecao_id || null, ordem_producao || null, produto || null, acao_corretiva || null, responsavel || null, prazo || null]
        );
        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'NC registrada com sucesso' });
    } catch (error) {
        console.error('[QUALIDADE] Erro criar NC:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/nao-conformidades/:id', async (req, res) => {
    try {
        const { titulo, descricao, severidade, origem, status, acao_corretiva, responsavel, prazo } = req.body;
        await pool.query(
            `UPDATE qualidade_nao_conformidades SET titulo=?, descricao=?, severidade=?, origem=?, status=?, acao_corretiva=?, responsavel=?, prazo=?
             WHERE id = ?`,
            [titulo, descricao || null, severidade, origem, status, acao_corretiva || null, responsavel || null, prazo || null, req.params.id]
        );
        res.json({ success: true, message: 'NC atualizada' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/nao-conformidades/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM qualidade_nao_conformidades WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'NC excluída' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===================================================================
// CHECKLISTS
// ===================================================================
router.get('/checklists', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, COUNT(ci.id) AS total_itens
            FROM qualidade_checklists c
            LEFT JOIN qualidade_checklist_itens ci ON ci.checklist_id = c.id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[QUALIDADE] Erro listar checklists:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/checklists/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM qualidade_checklists WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Checklist não encontrado' });
        const [itens] = await pool.query('SELECT * FROM qualidade_checklist_itens WHERE checklist_id = ? ORDER BY ordem', [req.params.id]);
        res.json({ success: true, data: { ...rows[0], itens } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/checklists/:id/itens', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM qualidade_checklist_itens WHERE checklist_id = ? ORDER BY ordem', [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/checklists', async (req, res) => {
    try {
        const { nome, descricao, tipo, itens } = req.body;
        if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });

        const [result] = await pool.query(
            `INSERT INTO qualidade_checklists (nome, descricao, tipo) VALUES (?, ?, ?)`,
            [nome, descricao || null, tipo || 'final']
        );
        const checklistId = result.insertId;

        // Inserir itens se fornecidos
        if (Array.isArray(itens) && itens.length > 0) {
            for (let i = 0; i < itens.length; i++) {
                await pool.query(
                    `INSERT INTO qualidade_checklist_itens (checklist_id, descricao, obrigatorio, ordem) VALUES (?, ?, ?, ?)`,
                    [checklistId, itens[i].descricao || itens[i], itens[i].obrigatorio !== false ? 1 : 0, i + 1]
                );
            }
        }

        res.status(201).json({ success: true, data: { id: checklistId }, message: 'Checklist criado com sucesso' });
    } catch (error) {
        console.error('[QUALIDADE] Erro criar checklist:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/checklists/:id', async (req, res) => {
    try {
        const { nome, descricao, tipo, ativo, itens } = req.body;
        await pool.query(
            `UPDATE qualidade_checklists SET nome=?, descricao=?, tipo=?, ativo=? WHERE id = ?`,
            [nome, descricao || null, tipo, ativo !== undefined ? (ativo ? 1 : 0) : 1, req.params.id]
        );

        // Atualizar itens se fornecidos
        if (Array.isArray(itens)) {
            await pool.query('DELETE FROM qualidade_checklist_itens WHERE checklist_id = ?', [req.params.id]);
            for (let i = 0; i < itens.length; i++) {
                await pool.query(
                    `INSERT INTO qualidade_checklist_itens (checklist_id, descricao, obrigatorio, ordem) VALUES (?, ?, ?, ?)`,
                    [req.params.id, itens[i].descricao || itens[i], itens[i].obrigatorio !== false ? 1 : 0, i + 1]
                );
            }
        }

        res.json({ success: true, message: 'Checklist atualizado' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/checklists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM qualidade_checklists WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Checklist excluído' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
