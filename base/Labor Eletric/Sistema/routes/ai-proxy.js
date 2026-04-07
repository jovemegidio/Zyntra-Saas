'use strict';

/**
 * AI Proxy Route — /api/ai/chat
 * =============================================================
 * Proxy server-side para chamadas de IA (OpenAI, etc).
 * A OPENAI_API_KEY NUNCA é exposta ao frontend.
 *
 * Rate limiting: 20 req/min por usuário autenticado.
 * Requer authenticateToken.
 */

const express = require('express');
const router = express.Router();

// Rate limit simples per-user (sem dependência externa)
const _rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 min
const RATE_LIMIT_MAX = 20;

function rateLimitPerUser(req, res, next) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });

    const now = Date.now();
    let entry = _rateLimits.get(userId);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        entry = { windowStart: now, count: 0 };
        _rateLimits.set(userId, entry);
    }
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        return res.status(429).json({
            error: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
            code: 'AI_RATE_LIMIT'
        });
    }
    next();
}

// Limpar entries expiradas a cada 5 min
setInterval(() => {
    const now = Date.now();
    for (const [uid, entry] of _rateLimits) {
        if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
            _rateLimits.delete(uid);
        }
    }
}, 5 * 60 * 1000).unref();

/**
 * POST /api/ai/chat
 * Body: { message: string, context?: string }
 * Responde via OpenAI se OPENAI_API_KEY estiver configurada,
 * senão retorna fallback para o Bob IA local.
 */
router.post('/chat', rateLimitPerUser, async (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: 'Serviço de IA não configurado. Usando assistente local.',
            code: 'AI_NOT_CONFIGURED',
            fallback: true
        });
    }

    const { message, context } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Campo "message" é obrigatório.' });
    }
    if (message.length > 4000) {
        return res.status(400).json({ error: 'Mensagem muito longa (máx 4000 caracteres).' });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const messages = [
            { role: 'system', content: 'Você é o Bob, assistente do ERP Zyntra. Responda de forma concisa e profissional em português brasileiro.' }
        ];
        if (context && typeof context === 'string') {
            messages.push({ role: 'system', content: context.substring(0, 2000) });
        }
        messages.push({ role: 'user', content: message.trim() });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages,
                max_tokens: 1000,
                temperature: 0.7
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            console.error(`[AI-PROXY] OpenAI error ${response.status}: ${errBody.substring(0, 200)}`);
            return res.status(502).json({
                error: 'Erro no serviço de IA. Tente novamente.',
                code: 'AI_UPSTREAM_ERROR'
            });
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '';

        res.json({
            success: true,
            reply: reply,
            model: data.model,
            usage: data.usage
        });
    } catch (err) {
        if (err.name === 'AbortError') {
            return res.status(504).json({ error: 'Timeout na resposta do serviço de IA.', code: 'AI_TIMEOUT' });
        }
        console.error('[AI-PROXY] Erro:', err.message);
        res.status(500).json({ error: 'Erro interno no proxy de IA.', code: 'AI_INTERNAL_ERROR' });
    }
});

module.exports = router;
