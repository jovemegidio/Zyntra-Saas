/**
 * MIDDLEWARE MULTI-EMPRESAS (MULTI-TENANT)
 * 
 * Injeta contexto da empresa no request.
 * Deve ser usado APÓS o middleware de autenticação.
 *
 * Fluxo:
 * 1. Usuário faz login → recebe JWT com { id, empresa_id }
 * 2. Cada request carrega empresa_id do JWT
 * 3. Middleware injeta req.empresa com configuração completa
 * 4. Queries usam req.empresa.id para filtrar dados
 * 5. Para isolamento por DB, req.empresaPool aponta pro DB certo
 *
 * Header alternativo: X-Empresa-Id (para trocar de empresa sem re-login)
 *
 * Criado: 30/03/2026
 */

'use strict';

const { getEmpresaConfig, getEmpresaPool } = require('../config/empresa');

// Cache de configurações (TTL 5 min)
const _configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCachedConfig(empresaId) {
    const cached = _configCache.get(empresaId);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedConfig(empresaId, data) {
    _configCache.set(empresaId, { data, ts: Date.now() });
}

/**
 * Invalida cache de uma empresa (chamado após atualizar config)
 */
function invalidateEmpresaCache(empresaId) {
    _configCache.delete(empresaId);
}

/**
 * Middleware principal multi-tenant
 * @param {object} pool - MySQL pool principal
 */
function empresaMiddleware(pool) {
    return async (req, res, next) => {
        // Pular rotas públicas (login, LP, health, assets)
        const publicPaths = ['/api/login', '/api/register', '/api/health', '/lp', '/api/empresas/public'];
        if (publicPaths.some(p => req.path.startsWith(p)) || 
            req.path.match(/\.(css|js|png|jpg|svg|ico|woff2?)$/)) {
            return next();
        }

        // Sem user autenticado = pular (middleware de auth já tratou)
        if (!req.user) return next();

        // Determinar empresa_id: header X-Empresa-Id > JWT empresa_id > default
        let empresaId = null;

        const headerEmpresa = req.headers['x-empresa-id'];
        if (headerEmpresa && !isNaN(parseInt(headerEmpresa))) {
            empresaId = parseInt(headerEmpresa);
        } else if (req.user.empresa_id) {
            empresaId = req.user.empresa_id;
        }

        // Se não tem empresa_id, modo single-tenant (compatibilidade)
        if (!empresaId) {
            req.empresa = null;
            req.empresaId = null;
            req.empresaPool = pool;
            return next();
        }

        try {
            // Tentar cache primeiro
            let empresaConfig = getCachedConfig(empresaId);

            if (!empresaConfig) {
                empresaConfig = await getEmpresaConfig(pool, empresaId);
                if (empresaConfig) {
                    setCachedConfig(empresaId, empresaConfig);
                }
            }

            if (!empresaConfig) {
                return res.status(403).json({
                    success: false,
                    message: 'Empresa não encontrada ou inativa'
                });
            }

            // Injetar no request
            req.empresa = empresaConfig;
            req.empresaId = empresaConfig.id;
            req.empresaSlug = empresaConfig.slug;
            req.empresaPool = getEmpresaPool(pool, empresaConfig);

            // Injetar setor da empresa (sobrescreve process.env.SECTOR)
            req.sector = empresaConfig.setorConfig;
            req.sectorName = empresaConfig.setor;

        } catch (err) {
            console.error(`[EMPRESA] Erro ao carregar empresa ${empresaId}:`, err.message);
            // Em caso de erro, continuar com pool principal (graceful degradation)
            req.empresa = null;
            req.empresaId = null;
            req.empresaPool = pool;
        }

        next();
    };
}

/**
 * Middleware que exige empresa selecionada
 * Usar em rotas que DEVEM ter contexto de empresa
 */
function requireEmpresa(req, res, next) {
    if (!req.empresa || !req.empresaId) {
        return res.status(400).json({
            success: false,
            message: 'Nenhuma empresa selecionada. Use o header X-Empresa-Id ou selecione uma empresa.'
        });
    }
    next();
}

/**
 * Helper para adicionar filtro empresa_id em queries
 * Uso: const where = empresaFilter(req); → "AND empresa_id = 5"
 */
function empresaFilter(req) {
    if (!req.empresaId) return '';
    return ` AND empresa_id = ${parseInt(req.empresaId)}`;
}

/**
 * Helper para valor empresa_id em INSERT
 */
function empresaValue(req) {
    return req.empresaId ? parseInt(req.empresaId) : null;
}

module.exports = {
    empresaMiddleware,
    requireEmpresa,
    empresaFilter,
    empresaValue,
    invalidateEmpresaCache,
};
