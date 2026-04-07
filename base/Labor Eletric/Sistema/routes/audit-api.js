'use strict';

/**
 * Audit Log API — extracted from server.js
 * Reads from 3 audit tables: auditoria_logs, audit_logs, audit_log
 * POST endpoint registers frontend actions.
 */
const express = require('express');

module.exports = function createAuditApiRouter({ authenticateToken, authorizeAdmin, pool, writeAuditLog }) {
    const router = express.Router();

    // GET /api/audit-log — unified history
    router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
        try {
            const limite = Math.min(parseInt(req.query.limite) || 500, 2000);
            const allLogs = [];

            // 1. auditoria_logs (main server)
            try {
                const [rows] = await pool.query(
                    `SELECT id, usuario_id, acao, modulo, descricao, ip_address AS ip, user_agent, created_at AS data
                     FROM auditoria_logs ORDER BY created_at DESC LIMIT ?`, [limite]
                );
                rows.forEach(r => {
                    allLogs.push({
                        id: 'main-' + r.id,
                        usuario: r.usuario_id ? ('Usuário #' + r.usuario_id) : 'Sistema',
                        acao: r.acao || 'info',
                        modulo: r.modulo || 'sistema',
                        descricao: r.descricao || 'Ação registrada',
                        ip: r.ip || '',
                        data: r.data,
                        fonte: 'principal'
                    });
                });
            } catch (e) { console.log('[AUDIT-API] auditoria_logs skip:', e.message); }

            // 2. audit_logs (Vendas module)
            try {
                const [rows] = await pool.query(
                    `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.meta, al.created_at,
                            COALESCE(u.nome, CONCAT('Usuário #', al.user_id)) AS usuario_nome
                     FROM audit_logs al LEFT JOIN usuarios u ON al.user_id = u.id
                     ORDER BY al.created_at DESC LIMIT ?`, [limite]
                );
                rows.forEach(r => {
                    let meta = {};
                    try { meta = r.meta ? JSON.parse(r.meta) : {}; } catch {}
                    allLogs.push({
                        id: 'vendas-' + r.id,
                        usuario: r.usuario_nome || 'Sistema',
                        acao: r.action || 'info',
                        modulo: 'vendas',
                        descricao: `${r.action || ''} ${r.resource_type || ''} ${r.resource_id ? '#' + r.resource_id : ''}`.trim() || 'Ação registrada',
                        ip: meta.ip || '',
                        data: r.created_at,
                        fonte: 'vendas'
                    });
                });
            } catch (e) { console.log('[AUDIT-API] audit_logs (vendas) skip:', e.message); }

            // 3. audit_log (PCP module)
            try {
                const [rows] = await pool.query(
                    `SELECT id, user_id, action, entity_type, entity_id, details, user_name, created_at
                     FROM audit_log ORDER BY created_at DESC LIMIT ?`, [limite]
                );
                rows.forEach(r => {
                    allLogs.push({
                        id: 'pcp-' + r.id,
                        usuario: r.user_name || ('Usuário #' + r.user_id),
                        acao: r.action || 'info',
                        modulo: 'pcp',
                        descricao: `${r.action || ''} ${r.entity_type || ''} ${r.entity_id ? '#' + r.entity_id : ''} ${r.details || ''}`.trim() || 'Ação registrada',
                        ip: '',
                        data: r.created_at,
                        fonte: 'pcp'
                    });
                });
            } catch (e) { console.log('[AUDIT-API] audit_log (pcp) skip:', e.message); }

            // Sort all by date descending and limit
            allLogs.sort((a, b) => new Date(b.data) - new Date(a.data));
            const finalLogs = allLogs.slice(0, limite);

            // Enrich with user names
            try {
                const [usuarios] = await pool.query('SELECT id, nome FROM usuarios');
                const userMap = {};
                usuarios.forEach(u => { userMap[u.id] = u.nome; });
                finalLogs.forEach(log => {
                    const match = log.usuario.match(/^Usuário #(\d+)$/);
                    if (match && userMap[parseInt(match[1])]) {
                        log.usuario = userMap[parseInt(match[1])];
                    }
                });
            } catch (e) { /* skip */ }

            res.json({ logs: finalLogs, total: finalLogs.length });
        } catch (error) {
            console.error('[AUDIT-API] Erro:', error);
            res.status(500).json({ error: 'Erro ao carregar histórico', logs: [] });
        }
    });

    // POST /api/audit-log — register frontend actions
    router.post('/', authenticateToken, async (req, res) => {
        try {
            const { usuario, acao, modulo, descricao } = req.body;
            const ip = req.ip || req.headers['x-forwarded-for'] || '';
            const userAgent = req.headers['user-agent'] || '';
            const userId = req.user?.id || req.user?.userId || null;

            await writeAuditLog({
                userId,
                action: acao,
                module: modulo,
                description: descricao || `${usuario}: ${acao} em ${modulo}`,
                ip,
                userAgent
            });

            res.json({ success: true });
        } catch (error) {
            console.error('[AUDIT-API] POST erro:', error);
            res.status(500).json({ error: 'Erro ao registrar' });
        }
    });

    return router;
};
