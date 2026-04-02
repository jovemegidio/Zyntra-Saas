/**
 * Idempotency Key Middleware — ALUFORCE ERP
 * 
 * Previne operações duplicadas (double-click, retry) em endpoints financeiros
 * e de vendas usando um header X-Idempotency-Key.
 * 
 * Fluxo:
 * 1. Cliente envia X-Idempotency-Key: <uuid> no header
 * 2. Middleware verifica se a key já foi processada
 * 3. Se sim: retorna a resposta original (cached)
 * 4. Se não: processa normalmente e armazena resultado
 * 
 * Usa Redis quando disponível, senão Map local com TTL.
 */
'use strict';

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 horas em segundos
const localStore = new Map();

// Limpar entradas expiradas do Map local a cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of localStore.entries()) {
        if (now > entry.expiresAt) localStore.delete(key);
    }
}, 5 * 60 * 1000).unref();

/**
 * Middleware de idempotência
 * @param {object} [options]
 * @param {number} [options.ttl] - TTL em segundos (default: 24h)
 * @param {string[]} [options.methods] - Métodos HTTP para verificar (default: POST)
 * @returns {Function} Express middleware
 */
function idempotency(options = {}) {
    const ttl = options.ttl || IDEMPOTENCY_TTL;
    const methods = options.methods || ['POST'];

    return async (req, res, next) => {
        // Só aplica para métodos configurados
        if (!methods.includes(req.method)) return next();

        const idempotencyKey = req.headers['x-idempotency-key'];
        if (!idempotencyKey) return next(); // Sem key = não idempotente

        // Validar formato da key (UUID v4 ou string alfanumérica)
        if (!/^[a-zA-Z0-9\-_]{8,64}$/.test(idempotencyKey)) {
            return res.status(400).json({
                message: 'X-Idempotency-Key inválida. Use UUID ou string alfanumérica (8-64 chars).',
                code: 'INVALID_IDEMPOTENCY_KEY'
            });
        }

        const storeKey = `idem:${req.method}:${req.originalUrl}:${idempotencyKey}`;

        // Verificar se já foi processada
        let cached = null;
        try {
            const cacheService = require('../services/cache');
            cached = await cacheService.cacheGet(storeKey);
            if (cached && typeof cached === 'string') cached = JSON.parse(cached);
        } catch (e) {
            // Fallback to local Map
            const local = localStore.get(storeKey);
            if (local && Date.now() < local.expiresAt) cached = local.data;
        }

        if (cached) {
            // Retornar resposta cached
            res.setHeader('X-Idempotency-Replay', 'true');
            return res.status(cached.status).json(cached.body);
        }

        // Interceptar a resposta para armazená-la
        const originalJson = res.json.bind(res);
        res.json = function(body) {
            const data = { status: res.statusCode, body };

            // Armazenar resultado (fire-and-forget)
            try {
                const cacheService = require('../services/cache');
                cacheService.cacheSet(storeKey, JSON.stringify(data), ttl).catch(() => {});
            } catch (e) { /* ignore */ }

            // Sempre salvar no Map local como fallback
            localStore.set(storeKey, { data, expiresAt: Date.now() + (ttl * 1000) });

            return originalJson(body);
        };

        next();
    };
}

module.exports = { idempotency };
