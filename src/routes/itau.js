/**
 * ITAÚ BAAS — Rotas Express
 * Prefixo: /api/itau
 *
 * Endpoints:
 *  GET  /api/itau/diagnostico          – verifica credenciais configuradas
 *  POST /api/itau/pix/cobranca         – cria cobrança PIX (QR dinâmico)
 *  GET  /api/itau/pix/cobranca/:txid   – consulta cobrança pelo txid
 *  GET  /api/itau/pix/cobranças        – lista cobranças com filtros
 *  DELETE /api/itau/pix/cobranca/:txid – cancela cobrança
 *  GET  /api/itau/pix/recebidos        – lista PIX recebidos (período)
 *  POST /api/itau/pix/pagar            – envia PIX para chave externa
 *  POST /api/itau/webhook/pix          – endpoint de webhook (sem autenticação JWT)
 */

'use strict';

const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const itau     = require('../services/itau-service');

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// Middleware de autenticação JWT (reutilizado do servidor principal)
// Importamos dinamicamente para evitar dependência circular
// ──────────────────────────────────────────────────────────────────────────────
function getAuthMiddleware() {
    try {
        return require('../../middleware/auth-unified').authenticateToken;
    } catch {
        try {
            return require('../../middleware/auth-central').requireAuth;
        } catch {
            // Fallback: nenhuma proteção (não recomendado em produção)
            return (req, res, next) => next();
        }
    }
}

const auth = getAuthMiddleware();

// ──────────────────────────────────────────────────────────────────────────────
// Helper: resposta de erro padronizada
// ──────────────────────────────────────────────────────────────────────────────
function apiError(res, status, mensagem, detalhes) {
    return res.status(status).json({
        sucesso: false,
        mensagem,
        ...(detalhes && { detalhes })
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/itau/diagnostico
// ──────────────────────────────────────────────────────────────────────────────
router.get('/diagnostico', auth, (req, res) => {
    res.json({ sucesso: true, diagnostico: itau.diagnostico() });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/itau/pix/cobranca
// Body: { valor, chavePix, devedor: { cpf|cnpj, nome }, info?, expiracao? }
// ──────────────────────────────────────────────────────────────────────────────
router.post('/pix/cobranca', auth, async (req, res) => {
    const { valor, chavePix, devedor, info, expiracao, txid } = req.body;

    if (!valor || !chavePix || !devedor) {
        return apiError(res, 400, 'Campos obrigatórios: valor, chavePix, devedor');
    }

    if (!devedor.nome || (!devedor.cpf && !devedor.cnpj)) {
        return apiError(res, 400, 'devedor deve ter: nome + (cpf ou cnpj)');
    }

    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        return apiError(res, 400, 'valor deve ser um número positivo');
    }

    // Gera txid único se não fornecido (máx 35 chars alphanum)
    const cobrancaTxid = (txid || uuidv4()).replace(/-/g, '').slice(0, 35);

    try {
        const resultado = await itau.criarCobrancaPix({
            txid:       cobrancaTxid,
            valor:      parseFloat(valor),
            chavePix,
            devedor,
            info,
            expiracao:  expiracao ? parseInt(expiracao) : 3600
        });

        res.status(201).json({ sucesso: true, txid: cobrancaTxid, cobranca: resultado });
    } catch (err) {
        console.error('[Itaú] Erro ao criar cobrança PIX:', err.message);
        return apiError(res, err.status || 502, 'Falha ao criar cobrança PIX', err.body);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/itau/pix/cobranca/:txid
// ──────────────────────────────────────────────────────────────────────────────
router.get('/pix/cobranca/:txid', auth, async (req, res) => {
    const { txid } = req.params;
    if (!txid || !/^[a-zA-Z0-9]{1,35}$/.test(txid)) {
        return apiError(res, 400, 'txid inválido');
    }

    try {
        const cobranca = await itau.consultarCobrancaPix(txid);
        res.json({ sucesso: true, cobranca });
    } catch (err) {
        return apiError(res, err.status || 502, 'Falha ao consultar cobrança', err.body);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/itau/pix/cobranças?inicio=&fim=&status=&cpf=&cnpj=
// ──────────────────────────────────────────────────────────────────────────────
router.get('/pix/cobranças', auth, async (req, res) => {
    try {
        const lista = await itau.listarCobrancasPix(req.query);
        res.json({ sucesso: true, ...lista });
    } catch (err) {
        return apiError(res, err.status || 502, 'Falha ao listar cobranças', err.body);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/itau/pix/cobranca/:txid
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/pix/cobranca/:txid', auth, async (req, res) => {
    const { txid } = req.params;
    if (!txid || !/^[a-zA-Z0-9]{1,35}$/.test(txid)) {
        return apiError(res, 400, 'txid inválido');
    }

    try {
        const resultado = await itau.cancelarCobrancaPix(txid);
        res.json({ sucesso: true, resultado });
    } catch (err) {
        return apiError(res, err.status || 502, 'Falha ao cancelar cobrança', err.body);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/itau/pix/recebidos?inicio=&fim=
// ──────────────────────────────────────────────────────────────────────────────
router.get('/pix/recebidos', auth, async (req, res) => {
    const inicio = req.query.inicio || new Date(Date.now() - 86400000).toISOString();
    const fim    = req.query.fim    || new Date().toISOString();

    try {
        const pix = await itau.listarPixRecebidos(inicio, fim);
        res.json({ sucesso: true, ...pix });
    } catch (err) {
        return apiError(res, err.status || 502, 'Falha ao listar PIX recebidos', err.body);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/itau/pix/pagar
// Body: { chavePix, valor, descricao }
// ──────────────────────────────────────────────────────────────────────────────
router.post('/pix/pagar', auth, async (req, res) => {
    const { chavePix, valor, descricao } = req.body;

    if (!chavePix || !valor) {
        return apiError(res, 400, 'Campos obrigatórios: chavePix, valor');
    }

    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        return apiError(res, 400, 'valor deve ser um número positivo');
    }

    try {
        const resultado = await itau.pagarPix({
            chavePix,
            valor:     parseFloat(valor),
            descricao
        });
        res.json({ sucesso: true, resultado });
    } catch (err) {
        return apiError(res, err.status || 502, 'Falha ao enviar PIX', err.body);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/itau/webhook/pix
// Endpoint público (sem JWT) — autenticado pelo ITAU_WEBHOOK_SECRET no header
// O Itaú chama este endpoint quando um PIX é liquidado
// ──────────────────────────────────────────────────────────────────────────────
router.post('/webhook/pix', express.json(), async (req, res) => {
    const secret = req.headers['x-webhook-secret'] || '';

    if (!itau.validarWebhook(secret)) {
        console.warn('[Itaú Webhook] Requisição rejeitada — secret inválido');
        return res.status(401).json({ sucesso: false, mensagem: 'Unauthorized' });
    }

    const pixRecebidos = itau.processarWebhookPix(req.body);

    if (pixRecebidos.length > 0) {
        console.log(`[Itaú Webhook] PIX recebidos para processar: ${pixRecebidos.length}`);

        // Emite evento para baixa automática via financeiro (integração com n8n ou direto)
        // O servidor principal pode escutar 'itau:pix:recebido' pelo EventEmitter global
        if (global.eventBus) {
            for (const pix of pixRecebidos) {
                global.eventBus.emit('itau:pix:recebido', pix);
            }
        }
    }

    // O Itaú espera HTTP 200 rápido para confirmar recebimento
    res.status(200).json({ sucesso: true });
});

module.exports = router;
