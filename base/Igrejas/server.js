/**
 * Zyntra Igrejas — Server
 * Serve os módulos da plataforma igreja (Glory features)
 * PM2: ecosystem.igrejas.config.js → port 3016
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3016;

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
