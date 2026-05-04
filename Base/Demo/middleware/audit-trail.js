/**
 * Audit Trail Middleware — ALUFORCE ERP
 * 
 * Registra automaticamente operações de mutação (POST, PUT, PATCH, DELETE) 
 * na tabela auditoria_logs. Fire-and-forget — nunca bloqueia a resposta.
 * 
 * Uso: app.use('/api/financeiro', auditTrail('financeiro'));
 *   ou: router.post('/', auditTrail('vendas', 'CRIAR_PEDIDO'), handler);
 */

/**
 * Cria middleware de audit trail para um módulo
 * @param {string} moduleName - Nome do módulo (ex: 'financeiro', 'vendas')
 * @param {string} [actionOverride] - Ação específica (se não informada, deduz do método HTTP)
 * @returns {Function} Express middleware
 */
function auditTrail(moduleName, actionOverride) {
    return (req, res, next) => {
        // Só audita mutations
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

        // Capturar body antes (dados novos)
        const newData = req.body && Object.keys(req.body).length > 0 ? { ...req.body } : null;

        // Remover campos sensíveis do log
        if (newData) {
            const sensitiveFields = ['password', 'senha', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'secret'];
            for (const field of sensitiveFields) {
                if (newData[field]) newData[field] = '[REDACTED]';
            }
        }

        // Deduzir ação do método HTTP
        const action = actionOverride || {
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'PATCH': 'UPDATE',
            'DELETE': 'DELETE'
        }[req.method] || req.method;

        // Interceptar res.json para capturar o resultado
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            // Gravar audit log assincronamente (fire-and-forget)
            const pool = req.app?.locals?.pool;
            if (pool) {
                const userId = req.user?.id || req.user?.userId || null;
                const resourceId = req.params?.id || data?.id || null;
                const description = `${action} ${moduleName}${resourceId ? ' #' + resourceId : ''} — ${req.method} ${req.originalUrl}`;

                pool.query(
                    `INSERT INTO auditoria_logs (usuario_id, acao, modulo, descricao, dados_novos, ip_address, user_agent, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        userId,
                        action,
                        moduleName,
                        description,
                        newData ? JSON.stringify(newData) : null,
                        req.ip || req.connection?.remoteAddress || null,
                        (req.headers['user-agent'] || '').substring(0, 500)
                    ]
                ).catch(e => {
                    // Audit log failure should never break the app
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn('[AUDIT-TRAIL] Log falhou:', e.message);
                    }
                });
            }

            return originalJson(data);
        };

        next();
    };
}

/**
 * Registra uma ação de audit manualmente (para uso fora de middleware)
 * @param {object} pool - MySQL pool
 * @param {object} opts - Opções do log
 */
async function logAuditEvent(pool, { userId, action, module: mod, description, previousData, newData, ip, userAgent } = {}) {
    if (!pool) return;
    try {
        await pool.query(
            `INSERT INTO auditoria_logs (usuario_id, acao, modulo, descricao, dados_anteriores, dados_novos, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                userId || null,
                action || 'UNKNOWN',
                mod || null,
                description || null,
                previousData ? JSON.stringify(previousData) : null,
                newData ? JSON.stringify(newData) : null,
                ip || null,
                (userAgent || '').substring(0, 500)
            ]
        );
    } catch (e) {
        // Never throw from audit logging
    }
}

module.exports = { auditTrail, logAuditEvent };
