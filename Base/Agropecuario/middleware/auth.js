/**
 * Authentication Middleware — PROXY para auth-central.js
 * Sprint 4 (FIN-06): Unificação de auth systems.
 * Este arquivo re-exporta do auth-central para manter compatibilidade
 * com imports existentes (ex: companySettings, módulos legados).
 * 
 * ⚠️ DEPRECATED: Novos imports devem usar './middleware/auth-central' diretamente.
 */

const authCentral = require('./auth-central');

module.exports = {
    authenticateToken: authCentral.authenticateToken,
    requireAdmin: authCentral.requireAdmin,
    checkPermission: authCentral.checkModuleAccess || function(permission) {
        // Fallback que delega para requireModule se checkModuleAccess não existir
        return authCentral.requireModule ? authCentral.requireModule(permission) : (req, res, next) => next();
    }
};
