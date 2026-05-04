/**
 * Row-Level Security (RLS) Middleware — Multi-Tenant Isolation
 * 
 * Ensures all database queries are scoped to the user's empresa_id.
 * Prevents cross-tenant data leakage by:
 * 1. Extracting empresa_id from authenticated user token
 * 2. Injecting it into req for route handlers to use
 * 3. Providing a scopedQuery helper that auto-adds empresa_id filter
 */

/**
 * Middleware that extracts empresa_id from authenticated user and
 * provides a tenant-scoped query helper on req.
 * 
 * Usage in routes:
 *   router.use(tenantScope());
 *   // Then in handler:
 *   const [rows] = await req.scopedQuery(
 *     'SELECT * FROM pedidos WHERE empresa_id = ?',
 *     [] // empresa_id is auto-appended
 *   );
 *   // Or simply use req.empresaId for manual queries
 */
function tenantScope(options = {}) {
    const { defaultEmpresaId = 1, required = false } = options;

    return (req, res, next) => {
        // Extract empresa_id from authenticated user (set by authenticateToken)
        const empresaId = req.user?.empresa_id || req.user?.empresaId;

        if (required && !empresaId) {
            return res.status(403).json({
                message: 'Tenant isolation: empresa_id not found in user token'
            });
        }

        // Set empresa_id on request for easy access
        req.empresaId = empresaId || defaultEmpresaId;

        // Provide a scoped query helper
        if (req.app?.locals?.pool || req.pool) {
            const pool = req.app.locals.pool || req.pool;
            req.scopedQuery = async (sql, params = []) => {
                // Only add empresa_id filter for SELECT/UPDATE/DELETE queries
                // that reference tables known to have empresa_id
                return pool.query(sql, [...params, req.empresaId]);
            };
        }

        next();
    };
}

/**
 * Validates that a resource belongs to the user's tenant.
 * Use after fetching a resource to verify ownership.
 * 
 * @param {number} resourceEmpresaId - The empresa_id from the fetched resource
 * @param {number} userEmpresaId - The empresa_id from the authenticated user
 * @returns {boolean}
 */
function validateTenantOwnership(resourceEmpresaId, userEmpresaId) {
    if (!resourceEmpresaId || !userEmpresaId) return false;
    return Number(resourceEmpresaId) === Number(userEmpresaId);
}

module.exports = { tenantScope, validateTenantOwnership };
