/**
 * Two-Factor Authentication Service (Centralizado)
 * 
 * FONTE ÚNICA DE VERDADE para verificar se um usuário requer 2FA.
 * Consulta o banco de dados em vez de whitelist hardcoded.
 * 
 * Lógica:
 *   1. Verificar `two_factor_enabled` = 1 na tabela usuarios
 *   2. Se `two_factor_disabled` = 1 (admin desativou), NÃO exigir 2FA
 *   3. Cache em memória (TTL 60s) para evitar queries repetidas
 * 
 * Uso:
 *   const twoFactorService = require('../services/two-factor.service');
 *   const requires2FA = await twoFactorService.requires2FA(pool, userId);
 * 
 * @module services/two-factor.service
 */

// Cache em memória por userId → { enabled, disabled, timestamp }
const _cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 segundos

/**
 * Garante que as colunas 2FA existem na tabela usuarios.
 * Chamado uma vez na primeira execução.
 */
let _columnsVerified = false;
async function ensureColumns(pool) {
    if (_columnsVerified) return;
    try {
        const [cols1] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'two_factor_enabled'");
        if (cols1.length === 0) {
            await pool.query('ALTER TABLE usuarios ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0');
        }
        const [cols2] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'two_factor_disabled'");
        if (cols2.length === 0) {
            await pool.query('ALTER TABLE usuarios ADD COLUMN two_factor_disabled TINYINT(1) NOT NULL DEFAULT 0');
        }
        _columnsVerified = true;
    } catch (e) {
        console.error('[2FA Service] Erro ao verificar colunas:', e.message);
    }
}

/**
 * Verifica se um usuário requer 2FA.
 * 
 * @param {object} pool - Pool MySQL (mysql2/promise)
 * @param {number} userId - ID do usuário
 * @returns {Promise<boolean>} true se 2FA é necessário
 */
async function requires2FA(pool, userId) {
    // Verificar cache
    const cached = _cache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.enabled && !cached.disabled;
    }

    await ensureColumns(pool);

    try {
        const [rows] = await pool.query(
            'SELECT two_factor_enabled, two_factor_disabled FROM usuarios WHERE id = ?',
            [userId]
        );

        if (!rows || rows.length === 0) {
            return false;
        }

        const user = rows[0];
        const enabled = user.two_factor_enabled === 1;
        const disabled = user.two_factor_disabled === 1;

        // Atualizar cache
        _cache.set(userId, { enabled, disabled, timestamp: Date.now() });

        return enabled && !disabled;
    } catch (e) {
        console.error('[2FA Service] Erro ao verificar 2FA para userId ' + userId + ':', e.message);
        return false; // Fail-open: se der erro, não bloqueia login
    }
}

/**
 * Retorna o status detalhado do 2FA de um usuário (para painel admin).
 * 
 * @param {object} pool - Pool MySQL
 * @param {number} userId - ID do usuário
 * @returns {Promise<{eligible: boolean, disabled: boolean, active: boolean}>}
 */
async function get2FAStatus(pool, userId) {
    await ensureColumns(pool);

    try {
        const [rows] = await pool.query(
            'SELECT two_factor_enabled, two_factor_disabled FROM usuarios WHERE id = ?',
            [userId]
        );

        if (!rows || rows.length === 0) {
            return { eligible: false, disabled: false, active: false };
        }

        const user = rows[0];
        const eligible = user.two_factor_enabled === 1;
        const disabled = user.two_factor_disabled === 1;

        return {
            eligible,
            disabled,
            active: eligible && !disabled
        };
    } catch (e) {
        console.error('[2FA Service] Erro ao buscar status:', e.message);
        return { eligible: false, disabled: false, active: false };
    }
}

/**
 * Ativa ou desativa o 2FA para um usuário (via painel admin).
 * 
 * @param {object} pool - Pool MySQL
 * @param {number} userId - ID do usuário alvo
 * @param {boolean} enabled - true para ativar, false para desativar
 */
async function set2FAEnabled(pool, userId, enabled) {
    await ensureColumns(pool);
    await pool.query(
        'UPDATE usuarios SET two_factor_enabled = ? WHERE id = ?',
        [enabled ? 1 : 0, userId]
    );
    // Invalidar cache
    _cache.delete(userId);
}

/**
 * Define o override do admin (two_factor_disabled).
 * 
 * @param {object} pool - Pool MySQL  
 * @param {number} userId - ID do usuário alvo
 * @param {boolean} disabled - true para desabilitar override
 */
async function set2FADisabledByAdmin(pool, userId, disabled) {
    await ensureColumns(pool);
    await pool.query(
        'UPDATE usuarios SET two_factor_disabled = ? WHERE id = ?',
        [disabled ? 1 : 0, userId]
    );
    // Invalidar cache
    _cache.delete(userId);
}

/**
 * Limpa o cache (útil para testes).
 */
function clearCache() {
    _cache.clear();
}

module.exports = {
    requires2FA,
    get2FAStatus,
    set2FAEnabled,
    set2FADisabledByAdmin,
    clearCache
};
