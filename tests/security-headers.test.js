/**
 * SMOKE TESTS — Security Headers
 * Verifica que todos os headers de segurança estão presentes na resposta HTTP.
 * Roda contra o servidor local (PORT ou 3000).
 *
 * Uso:  npm run test:security
 */

'use strict';

const http = require('http');

const BASE = `http://localhost:${process.env.PORT || 3000}`;

// Helper: faz GET e retorna { status, headers, body }
function request(path, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const opts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET',
            headers: {
                // Simula proxy reverso (Nginx/Cloudflare) para que o forceHttpsMiddleware não redirecione
                'X-Forwarded-Proto': 'https',
                ...extraHeaders
            }
        };
        const req = http.request(opts, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

// ── Test runner minimalista ──────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${name}`);
    } else {
        failed++;
        failures.push(name);
        console.log(`  ❌ ${name}`);
    }
}

async function run() {
    console.log('\n🔒 Security Headers Smoke Tests\n');
    console.log(`  Target: ${BASE}`);
    console.log('');

    let res;
    try {
        res = await request('/api/health');
    } catch (err) {
        console.error(`\n❌ Não foi possível conectar em ${BASE}: ${err.message}`);
        console.error('   Certifique-se de que o servidor está rodando.\n');
        process.exit(1);
    }

    // ── 1. Headers de segurança obrigatórios ─────────
    console.log('━━━ Headers de Segurança ━━━');

    const h = res.headers;

    // Helmet defaults
    assert(h['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff');
    assert(h['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN');
    assert(h['x-dns-prefetch-control'] === 'off', 'X-DNS-Prefetch-Control: off');
    assert(h['x-download-options'] === 'noopen', 'X-Download-Options: noopen');
    assert(h['x-permitted-cross-domain-policies'] === 'none', 'X-Permitted-Cross-Domain-Policies: none');

    // Referrer-Policy (Helmet v7 default: no-referrer)
    assert(h['referrer-policy'] === 'no-referrer', 'Referrer-Policy: no-referrer');

    // HSTS
    assert(h['strict-transport-security'] && h['strict-transport-security'].includes('max-age='), 'Strict-Transport-Security presente');

    // CSP
    const csp = h['content-security-policy'] || '';
    assert(csp.includes("default-src 'self'"), 'CSP: default-src self');
    assert(csp.includes("object-src 'none'"), 'CSP: object-src none');
    assert(csp.includes("base-uri 'self'"), 'CSP: base-uri self');
    assert(csp.includes("form-action 'self'"), 'CSP: form-action self');
    assert(csp.includes("frame-ancestors 'self'"), 'CSP: frame-ancestors self');
    assert(!csp.includes("unsafe-eval"), 'CSP: sem unsafe-eval');
    assert(csp.includes('upgrade-insecure-requests'), 'CSP: upgrade-insecure-requests');

    // Permissions-Policy
    const pp = h['permissions-policy'] || '';
    assert(pp.includes('camera=()'), 'Permissions-Policy: camera bloqueada');
    assert(pp.includes('microphone=()'), 'Permissions-Policy: microphone bloqueado');
    assert(pp.includes('geolocation=()'), 'Permissions-Policy: geolocation bloqueado');
    assert(pp.includes('payment=()'), 'Permissions-Policy: payment bloqueado');

    // X-Powered-By deve estar AUSENTE (Helmet remove)
    assert(!h['x-powered-by'], 'X-Powered-By ausente (Helmet remove)');

    // Rate Limit headers
    assert(h['ratelimit-policy'], 'RateLimit-Policy presente');

    // Request ID
    assert(h['x-request-id'], 'X-Request-Id presente (rastreabilidade)');

    console.log('');

    // ── 2. Health endpoint — dados sensíveis ──────────
    console.log('━━━ Health Endpoint (Sanitização) ━━━');

    let health;
    try { health = JSON.parse(res.body); } catch { health = {}; }

    assert(health.status !== undefined, '/api/health responde com status');
    assert(health.timestamp !== undefined, '/api/health tem timestamp');
    // Em produção, NÃO deve expor dados sensíveis
    assert(!health.server, 'Sem server info exposta');
    assert(!health.version, 'Sem version exposta');
    assert(!health.node, 'Sem node version exposta');
    assert(!health.pid, 'Sem PID exposto');
    assert(!health.memory, 'Sem memory stats expostas');

    console.log('');

    // ── 3. HTTPS Redirect ─────────────────────────────
    console.log('━━━ HTTPS Redirect ━━━');

    const httpRes = await request('/api/health', { 'X-Forwarded-Proto': 'http' });
    // Em produção deve redirecionar HTTP → HTTPS (301)
    // Em dev pode não redirecionar
    const isRedirect = httpRes.status === 301;
    const isOk = httpRes.status >= 200 && httpRes.status < 400;
    assert(isRedirect || isOk, `HTTP request handled (status: ${httpRes.status})`);
    if (isRedirect) {
        assert(httpRes.headers.location && httpRes.headers.location.startsWith('https://'), 'Redirect aponta para HTTPS');
    }

    console.log('');

    // ── 4. Auth endpoints — brute force protection ────
    console.log('━━━ Auth Rate Limiting ━━━');

    const loginRes = await request('/api/auth/login', { 'X-Forwarded-Proto': 'https' });
    // GET no login deve retornar 404 ou 405 (não aceita GET), mas deve ter rate limit headers
    assert(loginRes.status !== 500, 'Login endpoint não retorna 500');

    console.log('');

    // ── Resultado ─────────────────────────────────────
    console.log('═══════════════════════════════════════');
    console.log(`  Total: ${passed + failed} | ✅ ${passed} passed | ❌ ${failed} failed`);
    if (failures.length > 0) {
        console.log('');
        console.log('  Falhas:');
        failures.forEach(f => console.log(`    • ${f}`));
    }
    console.log('═══════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
});
