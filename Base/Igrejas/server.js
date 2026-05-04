/**
 * Zyntra Igrejas — Server
 * Serve os módulos da plataforma igreja (Glory features)
 * PM2: ecosystem.igrejas.config.js → port 3016
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const https = require('https');

// —— Load .env file (no external deps) ——
try {
    var envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf8').split('\n').forEach(function(line) {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            var eq = line.indexOf('=');
            if (eq > 0) {
                var key = line.slice(0, eq).trim();
                var val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) process.env[key] = val;
            }
        });
    }
} catch(e) { /* ignore */ }

const app = express();
const PORT = process.env.PORT || 3016;

// —— Asaas API config ——
const ASAAS_ENV = process.env.ASAAS_ENV || 'sandbox';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE = ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';

// —— Security headers ——
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// —— Compression ——
app.use(compression());

// —— Parsing ——
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// —— Request logging ——
app.use(function (req, _res, next) {
    if (process.env.NODE_ENV !== 'production') {
        console.log('[%s] %s %s', new Date().toISOString(), req.method, req.url);
    }
    next();
});

// —— Static assets for Igreja module ——
const igrejaPath = path.join(__dirname, 'modules', 'Igreja');
app.use('/igreja', express.static(igrejaPath, { maxAge: '1d', etag: true }));

// —— Shared assets (images, favicon, etc.) ——
app.use('/images', express.static(path.join(__dirname, 'images'), { maxAge: '7d' }));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '7d' }));
app.use('/favicon-zyntra.jpg', express.static(path.join(__dirname, 'images', 'favicon-zyntra.jpg')));

// —— Root → redirect to Igreja login ——
app.get('/', function (_req, res) {
    res.redirect('/igreja/login.html');
});

// —— Health check ——
app.get('/health', function (_req, res) {
    res.json({
        status: 'ok',
        module: 'zyntra-igrejas',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ═══════════════════════════════════════
// ══ Asaas PIX API Proxy Routes ══
// ═══════════════════════════════════════

function asaasRequest(method, endpoint, body) {
    return new Promise(function (resolve, reject) {
        if (!ASAAS_API_KEY) {
            return reject(new Error('ASAAS_API_KEY não configurada'));
        }
        var url = new URL(ASAAS_BASE + endpoint);
        var postData = body ? JSON.stringify(body) : '';
        var options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'access_token': ASAAS_API_KEY
            }
        };
        if (method !== 'GET' && postData) {
            options.headers['content-length'] = Buffer.byteLength(postData);
        }
        var req = https.request(options, function (resp) {
            var data = '';
            resp.on('data', function (chunk) { data += chunk; });
            resp.on('end', function () {
                try {
                    resolve({ status: resp.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: resp.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (method !== 'GET' && postData) req.write(postData);
        req.end();
    });
}

// —— Configuração Asaas (apenas status, sem expor chave) ——
app.get('/api/asaas/config', function (_req, res) {
    res.json({
        configured: !!ASAAS_API_KEY,
        environment: ASAAS_ENV
    });
});

// —— Saldo da conta ——
app.get('/api/asaas/balance', function (_req, res) {
    asaasRequest('GET', '/finance/balance')
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Criar cliente Asaas ——
app.post('/api/asaas/customers', function (req, res) {
    var b = req.body;
    if (!b.name) return res.status(400).json({ error: 'Nome é obrigatório' });
    asaasRequest('POST', '/customers', {
        name: b.name,
        cpfCnpj: b.cpfCnpj || undefined,
        email: b.email || undefined,
        phone: b.phone || undefined
    })
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Buscar cliente por CPF ——
app.get('/api/asaas/customers', function (req, res) {
    var cpf = req.query.cpfCnpj || '';
    asaasRequest('GET', '/customers?cpfCnpj=' + encodeURIComponent(cpf))
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Criar cobrança PIX (receber doação) ——
app.post('/api/asaas/payments', function (req, res) {
    var b = req.body;
    if (!b.customer || !b.value) {
        return res.status(400).json({ error: 'customer e value são obrigatórios' });
    }
    asaasRequest('POST', '/payments', {
        customer: b.customer,
        billingType: 'PIX',
        value: parseFloat(b.value),
        dueDate: b.dueDate || new Date().toISOString().split('T')[0],
        description: b.description || 'Doação Igreja'
    })
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Obter QR Code PIX de uma cobrança ——
app.get('/api/asaas/payments/:id/pixQrCode', function (req, res) {
    asaasRequest('GET', '/payments/' + encodeURIComponent(req.params.id) + '/pixQrCode')
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Listar cobranças ——
app.get('/api/asaas/payments', function (req, res) {
    var qs = '?limit=50';
    if (req.query.status) qs += '&status=' + encodeURIComponent(req.query.status);
    if (req.query.offset) qs += '&offset=' + encodeURIComponent(req.query.offset);
    asaasRequest('GET', '/payments' + qs)
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Status de uma cobrança ——
app.get('/api/asaas/payments/:id', function (req, res) {
    asaasRequest('GET', '/payments/' + encodeURIComponent(req.params.id))
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Transferir via PIX (pagar despesas) ——
app.post('/api/asaas/transfers', function (req, res) {
    var b = req.body;
    if (!b.value || !b.pixAddressKey) {
        return res.status(400).json({ error: 'value e pixAddressKey são obrigatórios' });
    }
    asaasRequest('POST', '/transfers', {
        value: parseFloat(b.value),
        operationType: 'PIX',
        pixAddressKey: b.pixAddressKey,
        pixAddressKeyType: b.pixAddressKeyType || 'CPF',
        description: b.description || 'Pagamento Igreja'
    })
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Listar transferências ——
app.get('/api/asaas/transfers', function (req, res) {
    var qs = '?limit=50';
    if (req.query.offset) qs += '&offset=' + encodeURIComponent(req.query.offset);
    asaasRequest('GET', '/transfers' + qs)
        .then(function (r) { res.status(r.status).json(r.data); })
        .catch(function (e) { res.status(500).json({ error: e.message }); });
});

// —— Webhook Asaas (receber notificações de pagamento) ——
app.post('/api/asaas/webhook', function (req, res) {
    var event = req.body.event;
    var payment = req.body.payment;
    console.log('[ASAAS-WEBHOOK] Evento:', event, payment ? payment.id : '');
    // Futuro: salvar em banco, notificar UI via SSE/WS
    res.json({ received: true });
});

// —— 404 handler ——
app.use(function (_req, res) {
    res.status(404).sendFile(path.join(igrejaPath, 'login.html'));
});

// —— Error handler ——
app.use(function (err, _req, res, _next) {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// —— Start ——
app.listen(PORT, function () {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   ✝️  Zyntra Igrejas — Glory Platform     ║');
    console.log('  ║   🌐 http://localhost:' + PORT + '                ║');
    console.log('  ║   📂 Módulo: Igreja (27 páginas)         ║');
    console.log('  ║   🔒 Ambiente: ' + (process.env.NODE_ENV || 'development').padEnd(24) + ' ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
