// =================================================================
// n8n WEBHOOKS — Endpoints para integração com n8n
// ALUFORCE ERP v2.0
// =================================================================
// Estes endpoints permitem que o n8n dispare ações no ALUFORCE
// e receba eventos do sistema via webhooks.
// =================================================================

'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// ── Middleware de autenticação por API Key para n8n ──────────────
const N8N_API_KEY = process.env.N8N_API_KEY;
if (!N8N_API_KEY) {
    console.error('❌ [N8N] ERRO: N8N_API_KEY não definido no .env — rotas n8n desabilitadas');
}

function authenticateN8N(req, res, next) {
    // SECURITY: Aceitar apenas via header (query params ficam em logs/proxies)
    const apiKey = req.headers['x-n8n-api-key'] || req.headers['x-api-key'];

    if (!apiKey || !N8N_API_KEY) {
        return res.status(401).json({
            success: false,
            error: 'API Key inválida. Use o header X-N8N-API-Key.'
        });
    }

    // DEBT-009: timing-safe comparison para prevenir timing attacks
    const keyBuf = Buffer.from(apiKey);
    const expectedBuf = Buffer.from(N8N_API_KEY);
    if (keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
        return res.status(401).json({
            success: false,
            error: 'API Key inválida. Use o header X-N8N-API-Key.'
        });
    }

    // SEC-042: HMAC request signing — verify payload integrity (optional, enabled when N8N_SIGNING_SECRET is set)
    const signingSecret = process.env.N8N_SIGNING_SECRET;
    if (signingSecret && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const signature = req.headers['x-n8n-signature'];
        if (!signature) {
            return res.status(401).json({ success: false, error: 'Header X-N8N-Signature obrigatório para requests com body.' });
        }
        const rawBody = JSON.stringify(req.body || {});
        const expectedSig = crypto.createHmac('sha256', signingSecret).update(rawBody).digest('hex');
        const sigBuf = Buffer.from(signature);
        const expectedBuf2 = Buffer.from(expectedSig);
        if (sigBuf.length !== expectedBuf2.length || !crypto.timingSafeEqual(sigBuf, expectedBuf2)) {
            return res.status(401).json({ success: false, error: 'Assinatura HMAC inválida.' });
        }
    }

    req.isN8N = true;
    next();
}

// Aplicar autenticação em todas as rotas
router.use(authenticateN8N);

// =================================================================
// 📊 DADOS / CONSULTAS — Para workflows do n8n consultarem o ERP
// =================================================================

/**
 * GET /api/n8n/vendas/resumo-diario
 * Retorna resumo de vendas do dia (para relatório diário)
 */
router.get('/vendas/resumo-diario', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const data = req.query.data || new Date().toISOString().split('T')[0];

        const [vendas] = await pool.query(
            `SELECT 
                COUNT(*) AS total_vendas,
                COALESCE(SUM(valor), 0) AS faturamento,
                COALESCE(AVG(valor), 0) AS ticket_medio,
                COUNT(DISTINCT cliente_id) AS clientes_unicos
             FROM pedidos 
             WHERE DATE(created_at) = ? AND deleted_at IS NULL`,
            [data]
        );

        const [topProdutos] = await pool.query(
            `SELECT ip.descricao AS nome, SUM(ip.quantidade) AS qtd, SUM(ip.preco_total) AS total
             FROM itens_pedido ip
             JOIN pedidos p ON ip.pedido_id = p.id
             WHERE DATE(p.created_at) = ? AND p.deleted_at IS NULL
             GROUP BY ip.descricao
             ORDER BY total DESC
             LIMIT 5`,
            [data]
        );

        res.json({
            success: true,
            data: {
                data,
                ...vendas[0],
                top_produtos: topProdutos
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/financeiro/contas-vencer
 * Retorna contas a receber que vencem hoje ou em X dias
 */
router.get('/financeiro/contas-vencer', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 0; // 0 = hoje
        const tipo = req.query.tipo || 'receber'; // 'receber' ou 'pagar'
        const tabela = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber';

        const [contas] = await pool.query(
            `SELECT id, ${tipo === 'receber' ? 'cliente_id, cliente_nome,' : 'fornecedor_id, fornecedor_nome,'} 
                    valor, data_vencimento, status, descricao
             FROM ${tabela}
             WHERE status = 'pendente'
               AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
             ORDER BY data_vencimento ASC`,
            [dias]
        );

        res.json({
            success: true,
            total: contas.length,
            tipo,
            data: contas
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/compras/pedidos-atrasados
 * Retorna pedidos de compra com entrega atrasada
 */
router.get('/compras/pedidos-atrasados', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');

        const [pedidos] = await pool.query(`
            SELECT pc.id, pc.numero_pedido, pc.data_entrega_prevista,
                   f.razao_social AS fornecedor, f.email AS fornecedor_email,
                   u.nome AS solicitante, u.email AS solicitante_email,
                   DATEDIFF(CURDATE(), pc.data_entrega_prevista) AS dias_atraso,
                   pc.valor_total
            FROM pedidos_compra pc
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
            LEFT JOIN usuarios u ON pc.usuario_solicitante_id = u.id
            WHERE pc.data_entrega_prevista < CURDATE()
              AND pc.status NOT IN ('recebido', 'cancelado')
            ORDER BY dias_atraso DESC
        `);

        res.json({
            success: true,
            total: pedidos.length,
            data: pedidos
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/compras/fornecedores-docs-vencendo
 * Retorna fornecedores com documentação vencendo em 30 dias
 */
router.get('/compras/fornecedores-docs-vencendo', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 30;

        const [fornecedores] = await pool.query(`
            SELECT id, razao_social, cnpj, email, telefone,
                   data_vencimento_certidao_federal,
                   data_vencimento_certidao_estadual,
                   data_vencimento_certidao_municipal,
                   data_vencimento_certidao_fgts,
                   data_vencimento_certidao_trabalhista
            FROM fornecedores
            WHERE status = 'ativo'
              AND (
                  data_vencimento_certidao_federal BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                  OR data_vencimento_certidao_estadual BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                  OR data_vencimento_certidao_municipal BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                  OR data_vencimento_certidao_fgts BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                  OR data_vencimento_certidao_trabalhista BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
              )
        `, [dias, dias, dias, dias, dias]);

        // Enriquecer com quais docs estão vencendo
        const result = fornecedores.map(f => {
            const now = new Date();
            const limit = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000);
            const docsVencendo = [];

            const check = (campo, label) => {
                if (f[campo] && new Date(f[campo]) >= now && new Date(f[campo]) <= limit) {
                    docsVencendo.push({ tipo: label, vencimento: f[campo] });
                }
            };

            check('data_vencimento_certidao_federal', 'Certidão Federal');
            check('data_vencimento_certidao_estadual', 'Certidão Estadual');
            check('data_vencimento_certidao_municipal', 'Certidão Municipal');
            check('data_vencimento_certidao_fgts', 'FGTS');
            check('data_vencimento_certidao_trabalhista', 'Certidão Trabalhista');

            return { ...f, documentos_vencendo: docsVencendo };
        });

        res.json({ success: true, total: result.length, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/compras/aprovacoes-pendentes
 * Retorna aprovações pendentes há mais de X dias
 */
router.get('/compras/aprovacoes-pendentes', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const diasMinimo = parseInt(req.query.dias) || 2;

        const [aprovacoes] = await pool.query(`
            SELECT wa.id, wa.aprovador_id, wa.referencia_tipo, wa.referencia_id,
                   wa.created_at AS data_solicitacao, wa.titulo, wa.valor,
                   u.nome AS aprovador, u.email AS aprovador_email,
                   pc.numero_pedido, pc.valor_total,
                   DATEDIFF(CURDATE(), wa.created_at) AS dias_pendente
            FROM workflow_aprovacoes wa
            JOIN usuarios u ON wa.aprovador_id = u.id
            LEFT JOIN pedidos_compra pc ON wa.referencia_id = pc.id AND wa.referencia_tipo = 'pedido_compra'
            WHERE wa.status = 'pendente'
              AND DATEDIFF(CURDATE(), wa.created_at) >= ?
            ORDER BY dias_pendente DESC
        `, [diasMinimo]);

        res.json({ success: true, total: aprovacoes.length, data: aprovacoes });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/estoque/criticos
 * Retorna produtos com estoque abaixo do mínimo
 */
router.get('/estoque/criticos', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');

        const [produtos] = await pool.query(`
            SELECT p.id, p.codigo, p.nome, p.unidade_medida AS unidade,
                   COALESCE(p.estoque_atual, 0) AS estoque_atual,
                   COALESCE(p.estoque_minimo, 0) AS estoque_minimo,
                   COALESCE(p.estoque_minimo, 0) - COALESCE(p.estoque_atual, 0) AS deficit
            FROM produtos p
            WHERE COALESCE(p.estoque_atual, 0) < COALESCE(p.estoque_minimo, 0)
              AND p.ativo = 1
            ORDER BY deficit DESC
        `);

        res.json({ success: true, total: produtos.length, data: produtos });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/rh/aniversariantes
 * Retorna aniversariantes do dia ou da semana
 */
router.get('/rh/aniversariantes', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const periodo = req.query.periodo || 'dia'; // 'dia' ou 'semana'

        let whereClause;
        if (periodo === 'semana') {
            whereClause = `YEARWEEK(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(data_nascimento, '%m-%d')), 1) = YEARWEEK(CURDATE(), 1)`;
        } else {
            whereClause = `DATE_FORMAT(data_nascimento, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')`;
        }

        const [aniversariantes] = await pool.query(`
            SELECT id, nome_completo AS nome, email, cargo, departamento, data_nascimento,
                   TIMESTAMPDIFF(YEAR, data_nascimento, CURDATE()) AS idade
            FROM funcionarios
            WHERE ativo = 1
              AND data_nascimento IS NOT NULL
              AND ${whereClause}
            ORDER BY nome_completo
        `);

        res.json({ success: true, total: aniversariantes.length, periodo, data: aniversariantes });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/clientes/inativos
 * Retorna clientes que serão inativados (sem movimentação há 90 dias)
 */
router.get('/clientes/inativos', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 90;

        const [clientes] = await pool.query(`
            SELECT c.id, c.razao_social, c.cnpj_cpf AS cnpj, c.email, c.telefone,
                   c.ativo, c.vendedor_responsavel,
                   MAX(p.created_at) AS ultima_movimentacao,
                   DATEDIFF(CURDATE(), COALESCE(MAX(p.created_at), c.created_at)) AS dias_sem_movimento
            FROM clientes c
            LEFT JOIN pedidos p ON c.id = p.cliente_id AND p.deleted_at IS NULL
            WHERE c.ativo = 1
            GROUP BY c.id
            HAVING dias_sem_movimento >= ?
            ORDER BY dias_sem_movimento DESC
        `, [dias]);

        res.json({ success: true, total: clientes.length, dias_limite: dias, data: clientes });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 🔧 AÇÕES — Para o n8n executar operações no ERP
// =================================================================

/**
 * POST /api/n8n/acoes/inativar-clientes
 * Executa a inativação de clientes sem movimentação
 */
router.post('/acoes/inativar-clientes', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.body.dias) || 90;

        const [result] = await pool.query(`
            UPDATE clientes
            SET ativo = 0
            WHERE ativo = 1
            AND id NOT IN (
                SELECT DISTINCT cliente_id FROM pedidos
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                  AND deleted_at IS NULL AND cliente_id IS NOT NULL
            )
            AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [dias, dias]);

        res.json({
            success: true,
            message: `${result.affectedRows} clientes inativados`,
            affected: result.affectedRows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/acoes/atualizar-avaliacoes-fornecedores
 * Recalcula as avaliações médias dos fornecedores
 */
router.post('/acoes/atualizar-avaliacoes-fornecedores', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');

        const [result] = await pool.query(`
            UPDATE fornecedores f
            SET
                nota_qualidade = (SELECT AVG(nota_qualidade) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                nota_prazo = (SELECT AVG(nota_prazo) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                nota_preco = (SELECT AVG(nota_preco) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                nota_atendimento = (SELECT AVG(nota_atendimento) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                avaliacao_geral = (
                    SELECT AVG((nota_qualidade + nota_prazo + nota_preco + nota_atendimento + IFNULL(nota_entrega, 0)) / 5)
                    FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id
                ),
                total_pedidos = (SELECT COUNT(*) FROM pedidos_compra WHERE fornecedor_id = f.id AND status != 'cancelado'),
                total_compras = (SELECT SUM(valor_total) FROM pedidos_compra WHERE fornecedor_id = f.id AND status = 'recebido')
            WHERE id IN (SELECT DISTINCT fornecedor_id FROM fornecedor_avaliacoes)
        `);

        res.json({
            success: true,
            message: `Avaliações atualizadas para ${result.affectedRows} fornecedores`,
            affected: result.affectedRows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/acoes/verificar-estoque-minimo
 * Executa a stored procedure de verificação de estoque
 */
router.post('/acoes/verificar-estoque-minimo', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        await pool.query('CALL sp_verificar_estoque_minimo()');
        res.json({ success: true, message: 'Verificação de estoque mínimo executada' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/acoes/marcar-lembrete-enviado
 * Marca aprovações como "lembrete enviado" (após n8n enviar o email)
 */
router.post('/acoes/marcar-lembrete-enviado', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const { ids } = req.body; // Array de IDs de workflow_aprovacoes

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Envie um array de IDs' });
        }

        const placeholders = ids.map(() => '?').join(',');
        await pool.execute(
            `UPDATE workflow_aprovacoes SET lembrete_enviado = TRUE, data_lembrete = NOW() WHERE id IN (${placeholders})`,
            ids
        );

        res.json({ success: true, message: `${ids.length} lembretes marcados como enviados` });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/acoes/criar-notificacao-compra
 * Cria uma notificação no módulo de compras
 */
router.post('/acoes/criar-notificacao-compra', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const { usuario_id, tipo, titulo, mensagem, entidade_tipo, entidade_id, prioridade } = req.body;

        if (!usuario_id || !tipo || !titulo || !mensagem) {
            return res.status(400).json({ success: false, error: 'Campos obrigatórios: usuario_id, tipo, titulo, mensagem' });
        }

        await pool.execute(
            `INSERT INTO compras_notificacoes
            (usuario_id, tipo, titulo, mensagem, entidade_tipo, entidade_id, prioridade, enviar_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [usuario_id, tipo, titulo, mensagem, entidade_tipo || null, entidade_id || null, prioridade || 'normal']
        );

        res.json({ success: true, message: 'Notificação criada' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/acoes/backup-database
 * Dispara backup do banco de dados
 */
router.post('/acoes/backup-database', async (req, res) => {
    try {
        const { spawnSync } = require('child_process');
        const path = require('path');
        const fs = require('fs');
        const zlib = require('zlib');

        const backupDir = path.join(__dirname, '..', 'backups', 'db');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = path.join(backupDir, `aluforce_n8n_${ts}.sql.gz`);

        const dbHost = process.env.DB_HOST || 'localhost';
        const dbUser = process.env.DB_USER || 'aluforce';
        const dbPass = process.env.DB_PASSWORD || '';
        const dbName = process.env.DB_NAME || 'aluforce_vendas';

        const mysqldump = spawnSync('mysqldump', [
            '-h', dbHost, '-u', dbUser, `--password=${dbPass}`,
            '--single-transaction', '--routines', '--triggers', dbName
        ], { timeout: 120000, maxBuffer: 100 * 1024 * 1024 });

        if (mysqldump.error) throw mysqldump.error;
        if (mysqldump.status !== 0) {
            throw new Error(`mysqldump falhou: ${(mysqldump.stderr || '').toString().slice(0, 500)}`);
        }

        const compressed = zlib.gzipSync(mysqldump.stdout);
        fs.writeFileSync(backupFile, compressed);

        const sizeMB = (compressed.length / (1024 * 1024)).toFixed(2);

        // Limpar backups antigos (>30 dias)
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        let removidos = 0;
        for (const f of fs.readdirSync(backupDir)) {
            const fp = path.join(backupDir, f);
            if (fs.statSync(fp).mtimeMs < cutoff) {
                fs.unlinkSync(fp);
                removidos++;
            }
        }

        res.json({
            success: true,
            message: `Backup realizado: ${sizeMB}MB`,
            arquivo: backupFile,
            tamanho_mb: sizeMB,
            backups_removidos: removidos
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 📡 EVENTOS — Recebe webhooks do n8n (ações reversas)
// =================================================================

/**
 * POST /api/n8n/eventos/workflow-concluido
 * Recebe notificação quando um workflow n8n termina
 */
router.post('/eventos/workflow-concluido', async (req, res) => {
    try {
        const { workflow_id, workflow_name, status, execution_id, data } = req.body;

        console.log(`[n8n] Workflow concluído: ${workflow_name} (${workflow_id}) - Status: ${status}`);

        // Emitir via Socket.IO para dashboard em tempo real
        const io = req.app.get('io');
        if (io) {
            io.emit('n8n:workflow-concluido', {
                workflow_id,
                workflow_name,
                status,
                execution_id,
                timestamp: new Date().toISOString(),
                data
            });
        }

        res.json({ success: true, received: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/eventos/alerta
 * Recebe alertas do n8n (monitoramento, erros, etc.)
 */
router.post('/eventos/alerta', async (req, res) => {
    try {
        const { tipo, titulo, mensagem, severidade, dados } = req.body;

        console.warn(`[n8n ALERTA] [${severidade || 'info'}] ${titulo}: ${mensagem}`);

        // Emitir para dashboard
        const io = req.app.get('io');
        if (io) {
            io.emit('n8n:alerta', {
                tipo,
                titulo,
                mensagem,
                severidade: severidade || 'info',
                dados,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ success: true, received: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 📋 STATUS — Para o n8n verificar saúde do sistema
// =================================================================

/**
 * GET /api/n8n/status
 * Retorna status geral do sistema para monitoramento n8n
 */
router.get('/status', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const cacheService = req.app.get('cacheService');

        // Verificar DB
        let dbOk = false;
        try {
            await pool.query('SELECT 1');
            dbOk = true;
        } catch (e) { /* ignore */ }

        // Verificar Redis/Cache
        let cacheOk = false;
        try {
            if (cacheService && cacheService.isReady) {
                cacheOk = cacheService.isReady();
            }
        } catch (e) { /* ignore */ }

        const memUsage = process.memoryUsage();

        res.json({
            success: true,
            status: dbOk ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
            database: dbOk ? 'connected' : 'disconnected',
            cache: cacheOk ? 'connected' : 'disconnected',
            memory: {
                heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
                heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss_mb: Math.round(memUsage.rss / 1024 / 1024)
            },
            node_version: process.version,
            pid: process.pid
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/sql
 * Executa uma query SQL segura (apenas SELECT) — para workflows customizados
 */
router.get('/sql', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const { query: sqlQuery } = req.query;

        if (!sqlQuery) {
            return res.status(400).json({ success: false, error: 'Parâmetro query é obrigatório' });
        }

        // SEGURANÇA: Permitir apenas SELECT
        const normalized = sqlQuery.trim().toUpperCase();
        if (!normalized.startsWith('SELECT')) {
            return res.status(403).json({
                success: false,
                error: 'Apenas queries SELECT são permitidas por este endpoint'
            });
        }

        // Bloquear keywords perigosas
        const blocked = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
        for (const kw of blocked) {
            if (normalized.includes(kw)) {
                return res.status(403).json({ success: false, error: `Keyword bloqueada: ${kw}` });
            }
        }

        const [rows] = await pool.query(sqlQuery);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 💰 FINANCEIRO — Resumo diário para WhatsApp/Email
// =================================================================

/**
 * GET /api/n8n/financeiro/resumo-diario
 * Resumo financeiro do dia: a receber vs a pagar, saldo, inadimplência
 */
router.get('/financeiro/resumo-diario', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const data = req.query.data || new Date().toISOString().split('T')[0];

        const [receber] = await pool.query(
            `SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total
             FROM contas_receber WHERE DATE(data_vencimento) = ? AND status = 'pendente'`, [data]
        );
        const [pagar] = await pool.query(
            `SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total
             FROM contas_pagar WHERE DATE(data_vencimento) = ? AND status = 'pendente'`, [data]
        );
        const [vencidas] = await pool.query(
            `SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total
             FROM contas_receber WHERE data_vencimento < CURDATE() AND status = 'pendente'`
        );
        const [recebidosHoje] = await pool.query(
            `SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total
             FROM contas_receber WHERE DATE(data_recebimento) = ? AND status = 'pago'`, [data]
        );

        res.json({
            success: true,
            data,
            a_receber: receber[0],
            a_pagar: pagar[0],
            vencidas_total: vencidas[0],
            recebidos_hoje: recebidosHoje[0],
            saldo_dia: (receber[0].valor_total - pagar[0].valor_total).toFixed(2)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 📄 NFe — Notas fiscais vencendo/pendentes
// =================================================================

/**
 * GET /api/n8n/nfe/pendentes
 * NF-e com prazo de cancelamento próximo ou pendentes de envio
 */
router.get('/nfe/pendentes', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 7;

        const [nfePendentes] = await pool.query(`
            SELECT id, numero, serie, chave_acesso, valor_total,
                   data_emissao, status, destinatario_nome, destinatario_cnpj_cpf,
                   DATEDIFF(DATE_ADD(data_emissao, INTERVAL 24 HOUR), NOW()) AS horas_para_cancelar
            FROM nfes
            WHERE status IN ('digitacao', 'autorizada', 'rejeitada')
              AND data_emissao >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY data_emissao DESC
        `, [dias]);

        res.json({ success: true, total: nfePendentes.length, data: nfePendentes });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 📊 VENDAS — Orçamentos sem follow-up e metas
// =================================================================

/**
 * GET /api/n8n/vendas/orcamentos-pendentes
 * Orçamentos criados há mais de X dias sem resposta
 */
router.get('/vendas/orcamentos-pendentes', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 3;

        const [orcamentos] = await pool.query(`
            SELECT p.id, p.cliente_nome, p.created_at, p.valor,
                   c.razao_social AS cliente, c.email AS cliente_email,
                   u.nome AS vendedor, u.email AS vendedor_email,
                   DATEDIFF(CURDATE(), p.created_at) AS dias_sem_resposta
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.status = 'orcamento'
              AND p.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
              AND p.deleted_at IS NULL
            ORDER BY dias_sem_resposta DESC
        `, [dias]);

        res.json({ success: true, total: orcamentos.length, data: orcamentos });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/vendas/meta-mensal
 * Progresso da meta de vendas do mês
 */
router.get('/vendas/meta-mensal', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');

        const [vendas] = await pool.query(`
            SELECT COUNT(*) AS total_vendas,
                   COALESCE(SUM(valor), 0) AS faturado,
                   COUNT(DISTINCT cliente_id) AS clientes
            FROM pedidos
            WHERE MONTH(created_at) = MONTH(CURDATE())
              AND YEAR(created_at) = YEAR(CURDATE())
              AND status NOT IN ('cancelado', 'orcamento')
              AND deleted_at IS NULL
        `);

        const [metaDb] = await pool.query(`
            SELECT COALESCE(SUM(valor_meta), 0) AS meta_valor
            FROM metas_vendas
            WHERE periodo = DATE_FORMAT(CURDATE(), '%Y-%m')
        `).catch(() => [[{ meta_valor: 0 }]]);

        let meta = metaDb[0]?.meta_valor || 0;
        if (meta === 0) {
            const [metaConfig] = await pool.query(`
                SELECT valor AS meta_valor FROM configuracoes
                WHERE chave = 'meta_vendas_mensal' LIMIT 1
            `).catch(() => [[{ meta_valor: 0 }]]);
            meta = metaConfig[0]?.meta_valor || 0;
        }

        const faturado = vendas[0]?.faturado || 0;
        const percentual = meta > 0 ? ((faturado / meta) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            mes: new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
            total_vendas: vendas[0].total_vendas,
            faturado: parseFloat(faturado),
            meta: parseFloat(meta),
            percentual: parseFloat(percentual),
            clientes: vendas[0].clientes,
            falta: Math.max(0, meta - faturado).toFixed(2)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 🏭 PCP — Produção parada
// =================================================================

/**
 * GET /api/n8n/pcp/producao-parada
 * Ordens de produção sem movimentação há X horas
 */
router.get('/pcp/producao-parada', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const horas = parseInt(req.query.horas) || 24;

        const [ops] = await pool.query(`
            SELECT op.id, op.codigo, op.produto_nome, op.quantidade,
                   op.status, op.data_inicio, op.responsavel,
                   TIMESTAMPDIFF(HOUR, COALESCE(op.updated_at, op.data_inicio), NOW()) AS horas_parada
            FROM ordens_producao op
            WHERE op.status IN ('em_producao', 'ativa')
              AND TIMESTAMPDIFF(HOUR, COALESCE(op.updated_at, op.data_inicio), NOW()) >= ?
            ORDER BY horas_parada DESC
        `, [horas]);

        res.json({ success: true, total: ops.length, horas_limite: horas, data: ops });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 👥 RH — Relatório semanal
// =================================================================

/**
 * GET /api/n8n/rh/resumo-semanal
 * Resumo semanal: admissões, férias, aniversários da semana
 */
router.get('/rh/resumo-semanal', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');

        const [admissoes] = await pool.query(`
            SELECT id, nome_completo AS nome, cargo, departamento, data_admissao
            FROM funcionarios WHERE ativo = 1
            AND YEARWEEK(data_admissao, 1) = YEARWEEK(CURDATE(), 1)
        `).catch(() => [[]]);

        const [aniversariantes] = await pool.query(`
            SELECT id, nome_completo AS nome, email, cargo, data_nascimento,
                   TIMESTAMPDIFF(YEAR, data_nascimento, CURDATE()) AS idade
            FROM funcionarios WHERE ativo = 1
            AND data_nascimento IS NOT NULL
            AND YEARWEEK(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(data_nascimento, '%m-%d')), 1) = YEARWEEK(CURDATE(), 1)
        `).catch(() => [[]]);

        const [feriasProximas] = await pool.query(`
            SELECT fn.id, fn.nome_completo AS nome, fn.cargo, f.data_inicio, f.data_fim,
                   DATEDIFF(f.data_inicio, CURDATE()) AS dias_para_ferias
            FROM ferias_solicitacoes f
            JOIN funcionarios fn ON f.funcionario_id = fn.id
            WHERE f.status = 'aprovada'
              AND f.data_inicio BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
            ORDER BY f.data_inicio
        `).catch(() => [[]]);

        const [totalAtivos] = await pool.query(`
            SELECT COUNT(*) AS total FROM funcionarios WHERE ativo = 1
        `).catch(() => [[{ total: 0 }]]);

        res.json({
            success: true,
            semana: `${new Date().toLocaleDateString('pt-BR')}`,
            total_colaboradores: totalAtivos[0].total,
            admissoes_semana: admissoes,
            aniversariantes_semana: aniversariantes,
            ferias_proximas: feriasProximas
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 🏦 FINANCEIRO — Conciliação bancária
// =================================================================

/**
 * GET /api/n8n/financeiro/divergencias
 * Detecta divergências entre lançamentos e pagamentos
 */
router.get('/financeiro/divergencias', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 7;

        const [semBaixa] = await pool.query(`
            SELECT id, descricao, valor, data_vencimento, status,
                   'contas_receber' AS tipo
            FROM contas_receber
            WHERE status = 'pago' AND data_recebimento IS NULL
              AND data_criacao >= DATE_SUB(NOW(), INTERVAL ? DAY)
            UNION ALL
            SELECT id, descricao, valor, data_vencimento, status,
                   'contas_pagar' AS tipo
            FROM contas_pagar
            WHERE status = 'pago' AND data_pagamento IS NULL
              AND data_criacao >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [dias, dias]);

        const [duplicatas] = await pool.query(`
            SELECT valor, data_vencimento, COUNT(*) AS qtd, GROUP_CONCAT(id) AS ids
            FROM contas_receber
            WHERE data_criacao >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status != 'cancelado'
            GROUP BY valor, data_vencimento, cliente_id
            HAVING COUNT(*) > 1
        `, [dias]).catch(() => [[]]);

        res.json({
            success: true,
            periodo_dias: dias,
            pagos_sem_data: semBaixa,
            possiveis_duplicatas: duplicatas,
            total_divergencias: semBaixa.length + duplicatas.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// ⏰ COMPRAS — Escalonamento de aprovações
// =================================================================

/**
 * GET /api/n8n/compras/aprovacoes-escalar
 * Aprovações pendentes que precisam escalar para gerência
 */
router.get('/compras/aprovacoes-escalar', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const horasLimite = parseInt(req.query.horas) || 48;

        const [escalar] = await pool.query(`
            SELECT wa.id, wa.aprovador_id, wa.referencia_tipo, wa.referencia_id,
                   wa.titulo, wa.valor, wa.created_at AS data_solicitacao,
                   u.nome AS aprovador, u.email AS aprovador_email,
                   pc.numero_pedido, pc.valor_total,
                   TIMESTAMPDIFF(HOUR, wa.created_at, NOW()) AS horas_pendente
            FROM workflow_aprovacoes wa
            JOIN usuarios u ON wa.aprovador_id = u.id
            LEFT JOIN pedidos_compra pc ON wa.referencia_id = pc.id AND wa.referencia_tipo = 'pedido_compra'
            WHERE wa.status = 'pendente'
              AND TIMESTAMPDIFF(HOUR, wa.created_at, NOW()) >= ?
            ORDER BY horas_pendente DESC
        `, [horasLimite]);

        res.json({ success: true, total: escalar.length, horas_limite: horasLimite, data: escalar });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 📱 WHATSAPP — Para n8n enviar alertas via WhatsApp
// =================================================================

/**
 * POST /api/n8n/whatsapp/enviar
 * n8n → WhatsApp: Enviar mensagem individual
 * Body: { telefone, mensagem }
 */
router.post('/whatsapp/enviar', async (req, res) => {
    try {
        const { telefone, mensagem } = req.body;
        if (!telefone || !mensagem) {
            return res.status(400).json({ success: false, error: 'telefone e mensagem são obrigatórios' });
        }

        const whatsappUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3002';
        const http = require('http');
        const payload = JSON.stringify({ telefone, mensagem });

        const result = await new Promise((resolve, reject) => {
            const url = new URL('/api/whatsapp/enviar', whatsappUrl);
            const reqOpts = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
                timeout: 15000
            };
            const r = http.request(reqOpts, (resp) => {
                let data = '';
                resp.on('data', c => data += c);
                resp.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch { resolve({ success: false, raw: data }); }
                });
            });
            r.on('error', reject);
            r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
            r.write(payload);
            r.end();
        });

        res.json({ success: true, whatsapp: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/whatsapp/enviar-grupo
 * n8n → WhatsApp: Enviar para múltiplos números
 * Body: { telefones: [...], mensagem }
 */
router.post('/whatsapp/enviar-grupo', async (req, res) => {
    try {
        const { telefones, mensagem } = req.body;
        if (!telefones || !Array.isArray(telefones) || !mensagem) {
            return res.status(400).json({ success: false, error: 'telefones (array) e mensagem são obrigatórios' });
        }

        const whatsappUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3002';
        const http = require('http');
        const payload = JSON.stringify({ telefones, mensagem });

        const result = await new Promise((resolve, reject) => {
            const url = new URL('/api/whatsapp/enviar-multiplos', whatsappUrl);
            const reqOpts = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
                timeout: 60000
            };
            const r = http.request(reqOpts, (resp) => {
                let data = '';
                resp.on('data', c => data += c);
                resp.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch { resolve({ success: false, raw: data }); }
                });
            });
            r.on('error', reject);
            r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
            r.write(payload);
            r.end();
        });

        res.json({ success: true, whatsapp: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/whatsapp/status
 * Retorna status do serviço WhatsApp
 */
router.get('/whatsapp/status', async (req, res) => {
    try {
        const whatsappUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3002';
        const http = require('http');

        const result = await new Promise((resolve, reject) => {
            const url = new URL('/api/whatsapp/status', whatsappUrl);
            http.get(url.href, { timeout: 5000 }, (resp) => {
                let data = '';
                resp.on('data', c => data += c);
                resp.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch { resolve({ status: 'unknown' }); }
                });
            }).on('error', () => resolve({ status: 'offline', error: 'WhatsApp service não acessível' }))
              .on('timeout', () => resolve({ status: 'timeout' }));
        });

        res.json({ success: true, whatsapp: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * POST /api/n8n/whatsapp/alerta
 * Endpoint pronto para n8n chamar: monta mensagem formatada e envia
 * Body: { tipo: 'estoque_critico'|'conta_vencida'|..., dados: {...}, telefones: [...] }
 */
router.post('/whatsapp/alerta', async (req, res) => {
    try {
        const { tipo, dados, telefones, telefone } = req.body;

        // Templates de alerta WhatsApp
        const templates = {
            estoque_critico: (d) => `⚠️ *ALERTA: Estoque Crítico*\n\n📦 Produto: *${d.produto || d.material || '?'}*\n📊 Estoque atual: *${d.quantidade || d.estoque_atual || 0}*\n📉 Mínimo: ${d.minimo || d.estoque_minimo || 0}\n\nVerificar necessidade de compra!\n\n_n8n Automação - ALUFORCE_`,

            conta_vencida: (d) => `🚨 *CONTA VENCIDA*\n\n📋 ${d.descricao || d.cliente || '?'}\n💰 Valor: R$ ${d.valor || 0}\n⏰ Dias em atraso: *${d.dias_atraso || 0}*\n\n_n8n Automação - ALUFORCE_`,

            conta_vencer: (d) => `💳 *Conta a Vencer*\n\n📋 ${d.descricao || d.cliente || '?'}\n💰 Valor: R$ ${d.valor || 0}\n📅 Vencimento: *${d.vencimento || '?'}*\n\n_n8n Automação - ALUFORCE_`,

            pedido_atrasado: (d) => `🚨 *PEDIDO ATRASADO*\n\n📋 Pedido: *${d.numero || d.pedido_id || '?'}*\n🏢 Fornecedor: ${d.fornecedor || '?'}\n⏰ Dias de atraso: *${d.dias_atraso || 0}*\n\nEntrar em contato!\n\n_n8n Automação - ALUFORCE_`,

            health_check_failed: (d) => `🔴 *ALERTA: Sistema Indisponível*\n\n🔧 Componente: ${d.componente || 'API'}\n📊 Status: ${d.status || 'offline'}\n⏰ Verificado: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n_n8n Automação - ALUFORCE_`,

            aniversariante: (d) => `🎂 *Feliz Aniversário, ${d.nome || '?'}!*\n\nA família *ALUFORCE* deseja um dia incrível!\n🎉🎈🎁\n\n_n8n Automação - ALUFORCE_`,

            geral: (d) => `📢 *${d.titulo || 'Alerta ALUFORCE'}*\n\n${d.mensagem || d.descricao || ''}\n\n_n8n Automação - ALUFORCE_`
        };

        const template = templates[tipo] || templates.geral;
        const mensagem = template(dados || {});

        // Determinar destinatários
        const destinos = telefones || (telefone ? [telefone] : []);

        if (destinos.length === 0) {
            return res.json({ success: true, message: 'Nenhum destinatário, alerta registrado mas não enviado', tipo });
        }

        // Enviar via WhatsApp API
        const whatsappUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3002';
        const http = require('http');
        const payload = JSON.stringify({ telefones: destinos, mensagem });

        const result = await new Promise((resolve, reject) => {
            const url = new URL('/api/whatsapp/enviar-multiplos', whatsappUrl);
            const reqOpts = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
                timeout: 60000
            };
            const r = http.request(reqOpts, (resp) => {
                let data = '';
                resp.on('data', c => data += c);
                resp.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch { resolve({ success: false, raw: data }); }
                });
            });
            r.on('error', reject);
            r.write(payload);
            r.end();
        });

        res.json({ success: true, tipo, destinatarios: destinos.length, whatsapp: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 🚚 LOGÍSTICA — Entregas e expedição
// =================================================================

/**
 * GET /api/n8n/logistica/entregas-atrasadas
 * Pedidos despachados com prazo de entrega estourado
 */
router.get('/logistica/entregas-atrasadas', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const [rows] = await pool.query(`
            SELECT p.id, p.cliente_nome, p.valor, p.status_logistica,
                   p.data_prevista, p.codigo_rastreio, p.transportadora_nome,
                   p.vendedor_nome, p.metodo_envio,
                   DATEDIFF(CURDATE(), p.data_prevista) AS dias_atraso
            FROM pedidos p
            WHERE p.status_logistica IN ('em_transito','expedido','despachado')
              AND p.data_prevista < CURDATE()
              AND p.deleted_at IS NULL
            ORDER BY dias_atraso DESC
        `);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/logistica/resumo-expedicao
 * Resumo diário de expedição por status
 */
router.get('/logistica/resumo-expedicao', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const [statusCounts] = await pool.query(`
            SELECT status_logistica, COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total
            FROM pedidos
            WHERE status NOT IN ('cancelado','orcamento')
              AND deleted_at IS NULL
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY status_logistica
        `);
        const [hojeExpedidos] = await pool.query(`
            SELECT COUNT(*) AS total FROM pedidos
            WHERE status_logistica IN ('expedido','despachado')
              AND DATE(updated_at) = CURDATE() AND deleted_at IS NULL
        `);
        const [hojeEntregues] = await pool.query(`
            SELECT COUNT(*) AS total FROM pedidos
            WHERE status_logistica = 'entregue'
              AND DATE(updated_at) = CURDATE() AND deleted_at IS NULL
        `);
        res.json({
            success: true,
            data: new Date().toISOString().split('T')[0],
            por_status: statusCounts,
            expedidos_hoje: hojeExpedidos[0].total,
            entregues_hoje: hojeEntregues[0].total
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/logistica/performance-transportadoras
 * Performance mensal por transportadora
 */
router.get('/logistica/performance-transportadoras', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const meses = parseInt(req.query.meses) || 1;
        const [rows] = await pool.query(`
            SELECT p.transportadora_nome,
                   COUNT(*) AS total_pedidos,
                   SUM(CASE WHEN p.status_logistica = 'entregue' AND p.data_prevista >= DATE(p.updated_at) THEN 1 ELSE 0 END) AS no_prazo,
                   SUM(CASE WHEN p.status_logistica = 'entregue' AND p.data_prevista < DATE(p.updated_at) THEN 1 ELSE 0 END) AS atrasadas,
                   COALESCE(SUM(p.frete), 0) AS total_frete,
                   ROUND(AVG(DATEDIFF(p.updated_at, p.data_aprovacao)), 1) AS media_dias_entrega
            FROM pedidos p
            WHERE p.transportadora_nome IS NOT NULL
              AND p.transportadora_nome != ''
              AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
              AND p.deleted_at IS NULL
            GROUP BY p.transportadora_nome
            ORDER BY total_pedidos DESC
        `, [meses]);
        res.json({ success: true, periodo_meses: meses, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 📄 FATURAMENTO — NF-e sem emissão
// =================================================================

/**
 * GET /api/n8n/faturamento/sem-nfe
 * Pedidos faturados/aprovados sem NF-e emitida
 */
router.get('/faturamento/sem-nfe', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const horas = parseInt(req.query.horas) || 24;
        const [rows] = await pool.query(`
            SELECT p.id, p.cliente_nome, p.valor, p.status, p.data_faturamento,
                   p.vendedor_nome, p.numero_nf,
                   TIMESTAMPDIFF(HOUR, COALESCE(p.data_faturamento, p.data_aprovacao), NOW()) AS horas_sem_nfe
            FROM pedidos p
            WHERE p.status IN ('faturado','aprovado','faturamento_parcial')
              AND (p.nfe_chave IS NULL OR p.nfe_chave = '')
              AND (p.numero_nf IS NULL OR p.numero_nf = '')
              AND TIMESTAMPDIFF(HOUR, COALESCE(p.data_faturamento, p.data_aprovacao, p.created_at), NOW()) >= ?
              AND p.deleted_at IS NULL
            ORDER BY horas_sem_nfe DESC
        `, [horas]);
        res.json({ success: true, total: rows.length, horas_limite: horas, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 💰 FINANCEIRO — Recorrências, boletos, fluxo de caixa
// =================================================================

/**
 * POST /api/n8n/financeiro/processar-recorrencias
 * Processa transações recorrentes automáticas
 */
router.post('/financeiro/processar-recorrencias', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const [recorrencias] = await pool.query(`
            SELECT * FROM recorrencias_financeiras
            WHERE ativo = 1
              AND (proxima_execucao IS NULL OR proxima_execucao <= CURDATE())
              AND (data_fim IS NULL OR data_fim >= CURDATE())
        `);
        let processadas = 0;
        for (const rec of recorrencias) {
            const tabela = rec.tipo === 'receber' ? 'contas_receber' : 'contas_pagar';
            await pool.query(
                `INSERT INTO ${tabela} (descricao, valor, data_vencimento, status, categoria_id, banco_id, data_criacao)
                 VALUES (?, ?, CURDATE(), 'pendente', ?, ?, NOW())`,
                [rec.descricao, rec.valor, rec.categoria_id, rec.banco_id]
            );
            // Calcular próxima execução
            let proxima;
            switch (rec.frequencia) {
                case 'trimestral': proxima = 'DATE_ADD(CURDATE(), INTERVAL 3 MONTH)'; break;
                case 'semestral': proxima = 'DATE_ADD(CURDATE(), INTERVAL 6 MONTH)'; break;
                case 'anual': proxima = 'DATE_ADD(CURDATE(), INTERVAL 1 YEAR)'; break;
                default: proxima = 'DATE_ADD(CURDATE(), INTERVAL 1 MONTH)';
            }
            await pool.query(
                `UPDATE recorrencias_financeiras SET ultima_execucao = CURDATE(), proxima_execucao = ${proxima} WHERE id = ?`,
                [rec.id]
            );
            processadas++;
        }
        res.json({ success: true, processadas, total_ativas: recorrencias.length });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/financeiro/boletos-vencidos
 * Boletos emitidos que passaram do vencimento sem pagamento
 */
router.get('/financeiro/boletos-vencidos', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 3;
        const [rows] = await pool.query(`
            SELECT b.id, b.nosso_numero, b.valor, b.data_vencimento,
                   b.sacado_nome, b.sacado_cpf_cnpj, b.status,
                   b.linha_digitavel, b.pix_qrcode,
                   cr.descricao, cr.cliente_nome,
                   DATEDIFF(CURDATE(), b.data_vencimento) AS dias_vencido
            FROM boletos b
            LEFT JOIN contas_receber cr ON b.conta_receber_id = cr.id
            WHERE b.status IN ('emitido','enviado')
              AND b.data_vencimento < CURDATE()
              AND b.data_vencimento >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ORDER BY dias_vencido DESC
        `, [dias + 30]);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/financeiro/fluxo-caixa-projecao
 * Projeção de fluxo de caixa para os próximos X dias
 */
router.get('/financeiro/fluxo-caixa-projecao', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 15;
        const [receber] = await pool.query(`
            SELECT DATE(data_vencimento) AS dia, COUNT(*) AS qtd, COALESCE(SUM(valor), 0) AS total
            FROM contas_receber
            WHERE status = 'pendente'
              AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(data_vencimento) ORDER BY dia
        `, [dias]);
        const [pagar] = await pool.query(`
            SELECT DATE(data_vencimento) AS dia, COUNT(*) AS qtd, COALESCE(SUM(valor), 0) AS total
            FROM contas_pagar
            WHERE status = 'pendente'
              AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(data_vencimento) ORDER BY dia
        `, [dias]);
        const totalReceber = receber.reduce((s, r) => s + parseFloat(r.total), 0);
        const totalPagar = pagar.reduce((s, r) => s + parseFloat(r.total), 0);
        res.json({
            success: true,
            periodo_dias: dias,
            total_a_receber: totalReceber.toFixed(2),
            total_a_pagar: totalPagar.toFixed(2),
            saldo_projetado: (totalReceber - totalPagar).toFixed(2),
            detalhamento: { a_receber: receber, a_pagar: pagar }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/financeiro/retornos-bancarios-pendentes
 * Boletos com retorno bancário processável
 */
router.get('/financeiro/retornos-bancarios-pendentes', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const [rows] = await pool.query(`
            SELECT ib.id, ib.banco_id, ib.status, ib.cnab_auto_processar,
                   ib.ultima_sync,
                   cb.nome AS banco_nome
            FROM integracoes_bancarias ib
            LEFT JOIN contas_bancarias cb ON ib.banco_id = cb.id
            WHERE ib.status = 'conectado' AND ib.sync_automatico = 1
        `).catch(() => [[]]);
        const [naoConc] = await pool.query(`
            SELECT COUNT(*) AS total, COALESCE(SUM(ABS(valor)), 0) AS valor_total
            FROM extrato_bancario WHERE conciliado = 0
        `).catch(() => [[{ total: 0, valor_total: 0 }]]);
        res.json({
            success: true,
            integracoes_ativas: rows.length,
            integracoes: rows,
            extrato_nao_conciliado: naoConc[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 👥 RH — Ponto e férias
// =================================================================

/**
 * GET /api/n8n/rh/ponto-inconsistencias
 * Funcionários com marcação de ponto inconsistente
 */
router.get('/rh/ponto-inconsistencias', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 1;

        // Funcionários com número ímpar de marcações (entrada sem saída)
        const [impares] = await pool.query(`
            SELECT pm.funcionario_id, f.nome_completo, pm.data,
                   COUNT(*) AS total_marcacoes
            FROM ponto_marcacoes pm
            JOIN funcionarios f ON pm.funcionario_id = f.id
            WHERE pm.data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND f.ativo = 1
            GROUP BY pm.funcionario_id, pm.data
            HAVING MOD(total_marcacoes, 2) = 1
        `, [dias]);

        // Funcionários ativos sem marcação no dia útil
        const [semMarcacao] = await pool.query(`
            SELECT f.id, f.nome_completo, f.cargo, f.departamento
            FROM funcionarios f
            WHERE f.ativo = 1
              AND f.id NOT IN (
                  SELECT DISTINCT funcionario_id FROM ponto_marcacoes
                  WHERE data = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
              )
              AND DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL 1 DAY)) BETWEEN 2 AND 6
              AND f.id NOT IN (
                  SELECT funcionario_id FROM ferias_solicitacoes
                  WHERE status = 'aprovada'
                    AND DATE_SUB(CURDATE(), INTERVAL 1 DAY) BETWEEN data_inicio AND data_fim
              )
        `).catch(() => [[]]);

        res.json({
            success: true,
            marcacoes_impares: impares,
            sem_marcacao_ontem: semMarcacao,
            total_inconsistencias: impares.length + semMarcacao.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/rh/ferias-vencendo
 * Funcionários com período aquisitivo prestes a vencer
 */
router.get('/rh/ferias-vencendo', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const diasAlerta = parseInt(req.query.dias) || 60;

        // Funcionários com mais de 23 meses desde admissão sem férias gozadas
        const [vencendo] = await pool.query(`
            SELECT f.id, f.nome_completo, f.cargo, f.departamento, f.data_admissao,
                   TIMESTAMPDIFF(MONTH, f.data_admissao, CURDATE()) AS meses_empresa,
                   DATEDIFF(
                       DATE_ADD(f.data_admissao, INTERVAL (FLOOR(TIMESTAMPDIFF(MONTH, f.data_admissao, CURDATE()) / 12) + 1) * 12 MONTH),
                       CURDATE()
                   ) AS dias_para_vencer
            FROM funcionarios f
            WHERE f.ativo = 1
              AND f.data_admissao IS NOT NULL
              AND TIMESTAMPDIFF(MONTH, f.data_admissao, CURDATE()) >= 11
              AND f.id NOT IN (
                  SELECT DISTINCT funcionario_id FROM ferias_solicitacoes
                  WHERE status IN ('aprovada','em_gozo','concluida')
                    AND periodo_aquisitivo_fim >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
              )
            HAVING dias_para_vencer <= ?
            ORDER BY dias_para_vencer ASC
        `, [diasAlerta]).catch(() => [[]]);

        // Férias aprovadas para a próxima semana
        const [proximaSemana] = await pool.query(`
            SELECT f.nome_completo, f.cargo, fs.data_inicio, fs.data_fim, fs.dias_solicitados
            FROM ferias_solicitacoes fs
            JOIN funcionarios f ON fs.funcionario_id = f.id
            WHERE fs.status = 'aprovada'
              AND fs.data_inicio BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        `).catch(() => [[]]);

        res.json({
            success: true,
            ferias_vencendo: vencendo,
            ferias_proxima_semana: proximaSemana,
            total_alertas: vencendo.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 🛒 COMPRAS — Requisições pendentes
// =================================================================

/**
 * GET /api/n8n/compras/requisicoes-paradas
 * Requisições de compra paradas sem avançar
 */
router.get('/compras/requisicoes-paradas', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 5;
        const [rows] = await pool.query(`
            SELECT rc.id, rc.numero, rc.solicitante, rc.data_solicitacao,
                   rc.data_necessidade, rc.prioridade, rc.status,
                   rc.valor_estimado, rc.justificativa,
                   DATEDIFF(CURDATE(), rc.data_solicitacao) AS dias_parada
            FROM requisicoes_compra rc
            WHERE rc.status IN ('pendente','rascunho')
              AND DATEDIFF(CURDATE(), rc.data_solicitacao) >= ?
            ORDER BY rc.prioridade = 'urgente' DESC, rc.prioridade = 'alta' DESC,
                     dias_parada DESC
        `, [dias]);
        res.json({ success: true, total: rows.length, dias_limite: dias, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 🏭 PCP — Material e produção
// =================================================================

/**
 * GET /api/n8n/pcp/ordens-sem-material
 * OPs prontas mas com material insuficiente
 */
router.get('/pcp/ordens-sem-material', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const [rows] = await pool.query(`
            SELECT op.id, op.codigo, op.produto_nome, op.quantidade,
                   op.status, op.data_prevista, op.responsavel, op.cliente_nome
            FROM ordens_producao op
            WHERE op.status IN ('pendente','ativa')
              AND op.data_prevista <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            ORDER BY op.data_prevista ASC
        `);
        // Verificar se materiais estão disponíveis (simplificado)
        const semMaterial = [];
        for (const op of rows) {
            const [itens] = await pool.query(`
                SELECT ipo.descricao, ipo.quantidade AS qtd_necessaria,
                       COALESCE(p.estoque_atual, 0) AS estoque_disponivel
                FROM itens_ordem_producao ipo
                LEFT JOIN produtos p ON ipo.produto_id = p.id
                WHERE ipo.ordem_producao_id = ?
                  AND COALESCE(p.estoque_atual, 0) < ipo.quantidade
            `, [op.id]).catch(() => [[]]);
            if (itens.length > 0) {
                semMaterial.push({ ...op, materiais_faltantes: itens });
            }
        }
        res.json({ success: true, total: semMaterial.length, data: semMaterial });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/pcp/resumo-diario-producao
 * Resumo diário: OPs concluídas, produção, refugo
 */
router.get('/pcp/resumo-diario-producao', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const data = req.query.data || new Date(Date.now() - 86400000).toISOString().split('T')[0]; // ontem

        const [diario] = await pool.query(`
            SELECT COUNT(*) AS total_registros,
                   COALESCE(SUM(producao), 0) AS total_producao,
                   COALESCE(SUM(refugo), 0) AS total_refugo,
                   COUNT(DISTINCT operador_id) AS operadores
            FROM diario_producao WHERE data = ?
        `, [data]);

        const [opsConcluidas] = await pool.query(`
            SELECT COUNT(*) AS total FROM ordens_producao
            WHERE status = 'concluida' AND DATE(data_conclusao) = ?
        `, [data]);

        const [opsIniciadas] = await pool.query(`
            SELECT COUNT(*) AS total FROM ordens_producao
            WHERE DATE(data_inicio) = ?
        `, [data]);

        const eficiencia = diario[0].total_producao > 0
            ? ((diario[0].total_producao / (diario[0].total_producao + diario[0].total_refugo)) * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            data,
            producao: parseFloat(diario[0].total_producao),
            refugo: parseFloat(diario[0].total_refugo),
            eficiencia_pct: parseFloat(eficiencia),
            operadores_ativos: diario[0].operadores,
            ops_concluidas: opsConcluidas[0].total,
            ops_iniciadas: opsIniciadas[0].total
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 📊 VENDAS — Reativação de clientes
// =================================================================

/**
 * GET /api/n8n/vendas/clientes-reativacao
 * Clientes entre 60-90 dias sem compra (janela de reativação)
 */
router.get('/vendas/clientes-reativacao', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const diasMin = parseInt(req.query.dias_min) || 60;
        const diasMax = parseInt(req.query.dias_max) || 90;
        const [rows] = await pool.query(`
            SELECT c.id, c.nome, c.razao_social, c.email, c.telefone,
                   c.vendedor_responsavel,
                   MAX(p.created_at) AS ultima_compra,
                   DATEDIFF(CURDATE(), MAX(p.created_at)) AS dias_sem_compra,
                   COUNT(p.id) AS total_pedidos_historico,
                   COALESCE(SUM(p.valor), 0) AS valor_total_historico
            FROM clientes c
            LEFT JOIN pedidos p ON c.id = p.cliente_id AND p.deleted_at IS NULL
                AND p.status NOT IN ('cancelado','orcamento')
            WHERE c.ativo = 1
            GROUP BY c.id
            HAVING dias_sem_compra BETWEEN ? AND ?
            ORDER BY valor_total_historico DESC
        `, [diasMin, diasMax]);
        res.json({ success: true, total: rows.length, janela: `${diasMin}-${diasMax} dias`, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// =================================================================
// 🔒 ADMIN — Segurança e auditoria
// =================================================================

/**
 * GET /api/n8n/admin/usuarios-inativos
 * Usuários que não logam há X dias
 */
router.get('/admin/usuarios-inativos', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const dias = parseInt(req.query.dias) || 60;
        const [rows] = await pool.query(`
            SELECT id, nome, email, role, departamento, ultimo_login,
                   DATEDIFF(CURDATE(), COALESCE(ultimo_login, created_at)) AS dias_inativo
            FROM usuarios
            WHERE ativo = 1 AND status = 'ativo'
              AND (
                  (ultimo_login IS NOT NULL AND ultimo_login < DATE_SUB(NOW(), INTERVAL ? DAY))
                  OR (ultimo_login IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY))
              )
            ORDER BY dias_inativo DESC
        `, [dias, dias]);
        res.json({ success: true, total: rows.length, dias_limite: dias, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * GET /api/n8n/admin/audit-anomalias
 * Padrões anômalos no log de auditoria
 */
router.get('/admin/audit-anomalias', async (req, res) => {
    try {
        const pool = req.app.get('dbPool');
        const horas = parseInt(req.query.horas) || 24;

        // Exclusões em massa (>5 por usuário em X horas)
        const [exclusoes] = await pool.query(`
            SELECT user_id, u.nome, u.email, COUNT(*) AS total_exclusoes,
                   GROUP_CONCAT(DISTINCT entity_type) AS tipos
            FROM audit_log al
            LEFT JOIN usuarios u ON al.user_id = u.id
            WHERE al.action = 'DELETE'
              AND al.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            GROUP BY al.user_id HAVING total_exclusoes > 5
        `, [horas]).catch(() => [[]]);

        // Acessos fora do horário comercial (antes 6h ou depois 22h)
        const [foraHorario] = await pool.query(`
            SELECT user_id, u.nome, COUNT(*) AS acessos,
                   MIN(TIME(al.created_at)) AS primeiro, MAX(TIME(al.created_at)) AS ultimo
            FROM audit_log al
            LEFT JOIN usuarios u ON al.user_id = u.id
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
              AND (HOUR(al.created_at) < 6 OR HOUR(al.created_at) >= 22)
            GROUP BY al.user_id HAVING acessos > 3
        `, [horas]).catch(() => [[]]);

        // Alto volume de ações por um único usuário (>100)
        const [altoVolume] = await pool.query(`
            SELECT user_id, u.nome, u.email, COUNT(*) AS total_acoes,
                   GROUP_CONCAT(DISTINCT action) AS acoes
            FROM audit_log al
            LEFT JOIN usuarios u ON al.user_id = u.id
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            GROUP BY al.user_id HAVING total_acoes > 100
            ORDER BY total_acoes DESC
        `, [horas]).catch(() => [[]]);

        res.json({
            success: true,
            periodo_horas: horas,
            exclusoes_massa: exclusoes,
            fora_horario: foraHorario,
            alto_volume: altoVolume,
            total_anomalias: exclusoes.length + foraHorario.length + altoVolume.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

module.exports = router;
