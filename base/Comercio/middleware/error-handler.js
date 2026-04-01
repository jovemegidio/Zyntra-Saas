'use strict';

/**
 * Error Handler centralizado — Tratamento padronizado de erros para todos os módulos.
 * Substitui error handlers inconsistentes em 5+ server.js de módulos.
 * 
 * Uso:
 *   const { errorHandler } = require('../../middleware/error-handler');
 *   // ... rotas ...
 *   app.use(errorHandler); // SEMPRE no final, após todas as rotas
 * 
 * Criado: Sprint 7 — Consolidação de Arquitetura
 */

const multer = require('multer');

function errorHandler(err, req, res, next) {
    // Multer errors (file upload)
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message, code: 'UPLOAD_ERROR' });
    }

    // CORS errors
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ error: 'Origem não permitida.', code: 'CORS_BLOCKED' });
    }

    // File type errors
    if (err.message && (err.message.includes('Tipo de arquivo') || err.message.includes('Apenas imagens'))) {
        return res.status(400).json({ error: err.message, code: 'INVALID_FILE_TYPE' });
    }

    // Log in non-production
    if (process.env.NODE_ENV !== 'production') {
        console.error(`❌ [ERROR] ${req.method} ${req.url}:`, err.message);
        if (err.stack) console.error(err.stack);
    }

    // API responses (JSON)
    res.status(err.status || 500).json({
        error: 'Erro interno no servidor.',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { detail: err.message })
    });
}

module.exports = { errorHandler };
