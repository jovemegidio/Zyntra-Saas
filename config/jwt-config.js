/**
 * CONFIGURAÇáO CENTRALIZADA DE JWT
 * 
 * Este módulo garante que o JWT_SECRET seja carregado APENAS do .env
 * e NUNCA tenha fallback para valores hardcoded.
 * 
 * USO:
 *   const { JWT_SECRET, verifyToken, signToken } = require('./config/jwt-config');
 */

'use strict';

require('dotenv').config();
const jwt = require('jsonwebtoken');

// ========================================
// VALIDAÇáO DO JWT_SECRET
// ========================================

const JWT_SECRET = process.env.JWT_SECRET;

// Validação obrigatória
if (!JWT_SECRET) {
    console.error('❌ ERRO FATAL: JWT_SECRET não definido no arquivo .env');
    console.error('💡 Adicione JWT_SECRET=<sua-chave-secreta-de-32-caracteres> ao .env');
    process.exit(1);
}

// Validação de segurança em produção
if (process.env.NODE_ENV === 'production') {
    if (JWT_SECRET.length < 32) {
        console.error('❌ ERRO FATAL: JWT_SECRET deve ter pelo menos 32 caracteres em produção');
        process.exit(1);
    }
    
    // Lista de secrets conhecidos que NáO devem ser usados em produção
    const BLACKLISTED_SECRETS = [
        'pvZKtJ3h9V4FdxYSMws51iRgPBXl7IWE', // Secret antigo exposto no código
        'dev-only-secret-change-in-production-2026',
        'secret',
        'jwt-secret',
        'your-secret-key'
    ];
    
    if (BLACKLISTED_SECRETS.includes(JWT_SECRET)) {
        console.error('❌ ERRO FATAL: JWT_SECRET está em uma lista de secrets comprometidos');
        console.error('💡 Gere um novo secret com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        process.exit(1);
    }
}

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

/**
 * Assina um token JWT
 * @param {Object} payload - Dados a serem incluídos no token
 * @param {Object} options - Opções do JWT (expiresIn, etc)
 * @returns {string} Token JWT
 */
function signToken(payload, options = { expiresIn: '8h' }) {
    const finalOptions = Object.assign({ algorithm: 'HS256' }, options);
    return jwt.sign(payload, JWT_SECRET, finalOptions);
}

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT
 * @returns {Object} Payload decodificado
 * @throws {Error} Se token inválido ou expirado
 */
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

/**
 * Middleware de autenticação Express
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
function authenticateToken(req, res, next) {
    // Tentar obter token de múltiplas fontes
    let token = null;
    
    // 1. Header Authorization
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    
    // 2. Cookie
    if (!token && req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
    }
    
    // 3. Query param (não recomendado, mas para compatibilidade)
    if (!token && req.query && req.query.token) {
        token = req.query.token;
    }
    
    if (!token) {
        return res.status(401).json({ 
            message: 'Token de autenticação não fornecido',
            code: 'NO_TOKEN'
        });
    }
    
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(403).json({ 
            message: 'Token inválido',
            code: 'INVALID_TOKEN'
        });
    }
}

/**
 * Middleware opcional - não falha se não tiver token
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : 
                  req.cookies?.auth_token;
    
    if (token) {
        try {
            req.user = verifyToken(token);
        } catch (e) {
            // Token inválido, mas não bloqueia
            req.user = null;
        }
    }
    next();
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    JWT_SECRET,
    signToken,
    verifyToken,
    authenticateToken,
    optionalAuth
};

// Log de inicialização (apenas em dev)
if (process.env.NODE_ENV !== 'production') {
    console.log('✅ [JWT-CONFIG] Módulo JWT carregado (secret length:', JWT_SECRET.length, 'chars)');
}
