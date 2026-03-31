/**
 * ITAÚ BAAS — Serviço de Integração
 * Portal: https://devportal.itau.com.br/baas/#/
 *
 * Produtos suportados:
 *  - PIX Itaú (cobranças, pagamentos, webhooks)
 *  - Boleto / Bolecode
 *
 * Autenticação: OAuth2 client_credentials + mTLS (certificado dinâmico)
 * Token URL: https://sts.itau.com.br/api/oauth/token
 * API base:  https://api.itau.com.br
 *
 * Pré-requisitos:
 *  1. Conta no devportal.itau.com.br (usuário admin da empresa)
 *  2. Credenciais geradas em "Gestão de Credenciais" → client_id + client_secret
 *  3. Certificado dinâmico (.crt + .key) gerado com OpenSSL e enviado ao STS Itaú
 *  4. Variáveis de ambiente configuradas (veja .env.example)
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────────────────────────────────────
// Configuração via variáveis de ambiente
// ──────────────────────────────────────────────────────────────────────────────

const ITAU_CLIENT_ID     = process.env.ITAU_CLIENT_ID;
const ITAU_CLIENT_SECRET = process.env.ITAU_CLIENT_SECRET;
const ITAU_CERT_PATH     = process.env.ITAU_CERT_PATH;     // caminho para .crt
const ITAU_KEY_PATH      = process.env.ITAU_KEY_PATH;      // caminho para .key
const ITAU_ENV           = process.env.ITAU_ENV || 'sandbox'; // 'sandbox' | 'production'

const BASE_URLS = {
    sandbox:    'https://sandbox.devportal.itau.com.br',
    production: 'https://api.itau.com.br'
};
const TOKEN_URLS = {
    sandbox:    'https://sts.itau.com.br/sandbox/api/oauth/token',
    production: 'https://sts.itau.com.br/api/oauth/token'
};

const BASE_URL  = BASE_URLS[ITAU_ENV]  || BASE_URLS.sandbox;
const TOKEN_URL = TOKEN_URLS[ITAU_ENV] || TOKEN_URLS.sandbox;

// ──────────────────────────────────────────────────────────────────────────────
// Cache de token (evita requisição a cada chamada — token válido por 300s)
// ──────────────────────────────────────────────────────────────────────────────
let _tokenCache = null; // { access_token, expiresAt }

/**
 * Retorna o agente HTTPS com mTLS (certificado + chave privada do Itaú).
 * Em sandbox o certificado não é obrigatório; em produção é mandatório.
 */
function _buildHttpsAgent() {
    if (ITAU_ENV === 'production') {
        if (!ITAU_CERT_PATH || !ITAU_KEY_PATH) {
            throw new Error('[Itaú] ITAU_CERT_PATH e ITAU_KEY_PATH são obrigatórios em produção.');
        }
        return new https.Agent({
            cert: fs.readFileSync(path.resolve(ITAU_CERT_PATH)),
            key:  fs.readFileSync(path.resolve(ITAU_KEY_PATH)),
            rejectUnauthorized: true
        });
    }
    // Sandbox: sem mTLS
    return new https.Agent({ rejectUnauthorized: false });
}

/**
 * Obtém access_token via OAuth2 client_credentials + mTLS.
 * Resultado fica em cache até 30s antes do vencimento.
 * @returns {Promise<string>} access_token
 */
async function getAccessToken() {
    const now = Date.now();

    if (_tokenCache && _tokenCache.expiresAt > now + 30_000) {
        return _tokenCache.access_token;
    }

    if (!ITAU_CLIENT_ID || !ITAU_CLIENT_SECRET) {
        throw new Error('[Itaú] ITAU_CLIENT_ID e ITAU_CLIENT_SECRET não configurados. Configure o .env.');
    }

    const { default: fetch } = await import('node-fetch');
    const agent = _buildHttpsAgent();

    const body = new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     ITAU_CLIENT_ID,
        client_secret: ITAU_CLIENT_SECRET
    });

    const response = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
        agent
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`[Itaú] Falha ao obter token (${response.status}): ${text}`);
    }

    const data = await response.json();

    _tokenCache = {
        access_token: data.access_token,
        expiresAt:    now + (data.expires_in || 300) * 1000
    };

    return _tokenCache.access_token;
}

/**
 * Executa uma chamada autenticada à API do Itaú.
 * @param {string} method  GET | POST | PATCH | DELETE
 * @param {string} path    Caminho relativo, ex: '/pix/v2/cob'
 * @param {Object} [body]  Corpo JSON (opcional)
 * @returns {Promise<Object>}
 */
async function _request(method, urlPath, body = null) {
    const { default: fetch } = await import('node-fetch');
    const token = await getAccessToken();
    const agent = _buildHttpsAgent();

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
            'x-itau-apikey': ITAU_CLIENT_ID || ''
        },
        agent
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${urlPath}`, options);
    const text = await response.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = { raw: text };
    }

    if (!response.ok) {
        const err = new Error(`[Itaú] ${method} ${urlPath} → ${response.status}`);
        err.status = response.status;
        err.body   = data;
        throw err;
    }

    return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// PIX — Cobranças (QRCODE dinâmico)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Cria uma cobrança PIX imediata (QRCODE dinâmico).
 *
 * @param {Object} params
 * @param {string} params.txid         Identificador único da cobrança (máx 35 chars, alphanum)
 * @param {number} params.valor        Valor em reais (ex: 50.00)
 * @param {string} params.chavePix     Chave PIX do recebedor (CPF, CNPJ, email, telefone, EVP)
 * @param {Object} params.devedor      { cpf|cnpj, nome }
 * @param {string} [params.info]       Informação adicional (ex: "Pagamento pedido #123")
 * @param {number} [params.expiracao]  Segundos até expirar (padrão: 3600 = 1h)
 * @returns {Promise<Object>} Resposta da API com loc, pixCopiaECola, qrcode
 */
async function criarCobrancaPix({ txid, valor, chavePix, devedor, info, expiracao = 3600 }) {
    const body = {
        calendario:  { expiracao },
        devedor,
        valor:       { original: valor.toFixed(2) },
        chave:       chavePix,
        solicitacaoPagador: info || 'Pagamento via Zyntra ERP'
    };

    return _request('PUT', `/pix/v2/cob/${txid}`, body);
}

/**
 * Consulta o status de uma cobrança PIX pelo txid.
 * @param {string} txid
 * @returns {Promise<Object>}
 */
async function consultarCobrancaPix(txid) {
    return _request('GET', `/pix/v2/cob/${txid}`);
}

/**
 * Lista cobranças PIX com filtros opcionais.
 * @param {Object} params  { inicio, fim, status, cpf, cnpj }
 * @returns {Promise<Object>}
 */
async function listarCobrancasPix(params = {}) {
    const qs = new URLSearchParams({
        inicio: params.inicio || new Date(Date.now() - 86400000).toISOString(),
        fim:    params.fim    || new Date().toISOString(),
        ...(params.status && { status: params.status }),
        ...(params.cpf    && { cpf:    params.cpf }),
        ...(params.cnpj   && { cnpj:   params.cnpj })
    });

    return _request('GET', `/pix/v2/cob?${qs.toString()}`);
}

/**
 * Cancela / revisa uma cobrança PIX (status → REMOVIDA_PELO_USUARIO_RECEBEDOR).
 * @param {string} txid
 * @returns {Promise<Object>}
 */
async function cancelarCobrancaPix(txid) {
    return _request('PATCH', `/pix/v2/cob/${txid}`, {
        status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR'
    });
}

/**
 * Consulta os PIX recebidos em uma janela de tempo.
 * @param {string} inicio  ISO 8601
 * @param {string} fim     ISO 8601
 * @returns {Promise<Object>}
 */
async function listarPixRecebidos(inicio, fim) {
    const qs = new URLSearchParams({ inicio, fim });
    return _request('GET', `/pix/v2/pix?${qs.toString()}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// PIX — Pagamentos (envio de PIX)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Inicia um pagamento PIX para uma chave externa.
 * @param {Object} params
 * @param {string} params.chavePix   Chave PIX do recebedor
 * @param {number} params.valor      Valor em reais
 * @param {string} params.descricao  Descrição da transferência
 * @returns {Promise<Object>}
 */
async function pagarPix({ chavePix, valor, descricao }) {
    return _request('POST', '/pix/v2/gn/pix', {
        valor:     valor.toFixed(2),
        chave:     chavePix,
        descricao: descricao || 'Pagamento Zyntra ERP'
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Webhook — Validação e helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Valida a autenticidade de um webhook do Itaú.
 * O Itaú envia um header x-webhook-secret configurado na gestão de webhooks.
 *
 * @param {string} receivedSecret   Valor do header x-webhook-secret
 * @returns {boolean}
 */
function validarWebhook(receivedSecret) {
    const expected = process.env.ITAU_WEBHOOK_SECRET;
    if (!expected) return true; // Se não configurado, aceita (não recomendado em produção)
    return receivedSecret === expected;
}

/**
 * Processa o payload de um webhook PIX recebido.
 * Retorna array de PIX liquidados prontos para baixa no sistema.
 *
 * @param {Object} payload  Body do webhook
 * @returns {Array<Object>} pixLiquidados
 */
function processarWebhookPix(payload) {
    const pixLiquidados = [];

    if (payload && Array.isArray(payload.pix)) {
        for (const p of payload.pix) {
            pixLiquidados.push({
                endToEndId: p.endToEndId,
                txid:       p.txid,
                valor:      parseFloat(p.valor),
                horario:    p.horario,
                infoPagador: p.infoPagador || '',
                devolucoes: p.devolucoes || []
            });
        }
    }

    return pixLiquidados;
}

// ──────────────────────────────────────────────────────────────────────────────
// Diagnóstico
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se as credenciais estão configuradas.
 * @returns {Object} status de cada variável necessária
 */
function diagnostico() {
    return {
        ambiente:         ITAU_ENV,
        client_id:        !!ITAU_CLIENT_ID,
        client_secret:    !!ITAU_CLIENT_SECRET,
        cert_path:        !!ITAU_CERT_PATH,
        key_path:         !!ITAU_KEY_PATH,
        webhook_secret:   !!process.env.ITAU_WEBHOOK_SECRET,
        base_url:         BASE_URL,
        token_url:        TOKEN_URL,
        token_em_cache:   !!(_tokenCache && _tokenCache.expiresAt > Date.now())
    };
}

module.exports = {
    getAccessToken,
    criarCobrancaPix,
    consultarCobrancaPix,
    listarCobrancasPix,
    cancelarCobrancaPix,
    listarPixRecebidos,
    pagarPix,
    validarWebhook,
    processarWebhookPix,
    diagnostico
};
