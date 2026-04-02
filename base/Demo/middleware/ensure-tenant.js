/**
 * Middleware: ensure-tenant.js
 * Garante que req.user.empresa_id existe em toda request autenticada.
 * Bloqueia requests sem contexto de tenant (multi-tenant isolation).
 */
module.exports = function ensureTenant(req, res, next) {
    // Só valida se já passou por authenticateToken (req.user existe)
    if (req.user && !req.user.empresa_id) {
        return res.status(403).json({ 
            error: 'TENANT_MISSING', 
            message: 'Contexto de empresa não encontrado no token' 
        });
    }
    next();
};
