#!/usr/bin/env node
/**
 * ZYNTRA/ALUFORCE — Lifecycle Test Suite
 * Testa o sistema inteiro end-to-end: health, auth, CRUD de cada módulo, DB, assets
 * Uso: node lifecycle-test.js [BASE_URL]
 */

const http = require('http');
const https = require('https');

const BASE = process.argv[2] || 'http://localhost:3000';
const RESULTS = { pass: 0, fail: 0, warn: 0, errors: [] };
let AUTH_COOKIE = '';

// ============================================================
// HTTP Helper
// ============================================================
function request(method, path, body, extraHeaders = {}) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...extraHeaders
        };
        if (AUTH_COOKIE) headers['Cookie'] = AUTH_COOKIE;

        const bodyStr = body ? JSON.stringify(body) : null;
        if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

        const opts = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers,
            timeout: 15000,
            rejectUnauthorized: false
        };

        const req = lib.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch (_) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: json,
                    raw: data.substring(0, 2000),
                    ok: res.statusCode >= 200 && res.statusCode < 400
                });
            });
        });

        req.on('error', (e) => {
            resolve({ status: 0, headers: {}, body: null, raw: e.message, ok: false, error: e.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 0, headers: {}, body: null, raw: 'TIMEOUT', ok: false, error: 'TIMEOUT' });
        });

        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ============================================================
// Test runner
// ============================================================
function test(name, status, detail = '') {
    if (status === 'PASS') {
        RESULTS.pass++;
        console.log(`  ✅ ${name}`);
    } else if (status === 'WARN') {
        RESULTS.warn++;
        console.log(`  ⚠️  ${name}${detail ? ' — ' + detail : ''}`);
    } else {
        RESULTS.fail++;
        RESULTS.errors.push({ name, detail });
        console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    }
}

// ============================================================
// 1. HEALTH & STATIC ASSETS
// ============================================================
async function testHealth() {
    console.log('\n━━━ 1. HEALTH CHECK & STATIC ━━━');

    // Root page
    const root = await request('GET', '/');
    test('GET / (login page)', root.status === 200 ? 'PASS' : 'FAIL', `status=${root.status}`);

    // Server health (common endpoint patterns)
    for (const ep of ['/api/health', '/api/status', '/health']) {
        const r = await request('GET', ep);
        if (r.status === 200) {
            test(`GET ${ep}`, 'PASS');
            break;
        }
    }

    // Static assets
    const assets = [
        '/login.html',
        '/css/global.css',
        '/js/offline-sync-manager.js',
        '/js/api-config.js'
    ];
    for (const a of assets) {
        const r = await request('GET', a);
        test(`Static: ${a}`, r.status === 200 ? 'PASS' : 'WARN', `status=${r.status}`);
    }

    // Favicon
    const fav = await request('GET', '/favicon.ico');
    test('Favicon', fav.status === 200 || fav.status === 204 || fav.status === 304 ? 'PASS' : 'WARN', `status=${fav.status}`);
}

// ============================================================
// 2. AUTH / LOGIN
// ============================================================
async function testAuth() {
    console.log('\n━━━ 2. AUTENTICAÇÃO ━━━');

    // Login with invalid credentials (should return 401)
    const badLogin = await request('POST', '/api/auth/login', { email: 'invalid@test.com', password: 'wrong123' });
    test('Login inválido → 401', badLogin.status === 401 ? 'PASS' : 'WARN', `status=${badLogin.status}`);

    // Login with valid test credentials (admin@aluforce)
    const goodLogin = await request('POST', '/api/auth/login', {
        email: 'admin@aluforce.com.br',
        password: 'admin123'
    });

    if (goodLogin.status === 200 && goodLogin.headers['set-cookie']) {
        AUTH_COOKIE = goodLogin.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        test('Login válido → 200 + cookie', 'PASS');
    } else {
        // Try alternate credentials
        const altLogin = await request('POST', '/api/auth/login', {
            email: 'admin',
            senha: 'admin123'
        });
        if (altLogin.status === 200 && altLogin.headers['set-cookie']) {
            AUTH_COOKIE = altLogin.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            test('Login válido (alt) → 200 + cookie', 'PASS');
        } else {
            test('Login válido', 'WARN', `status=${goodLogin.status} — não consegui autenticar para testes CRUD`);
        }
    }

    // Token/session check
    if (AUTH_COOKIE) {
        const me = await request('GET', '/api/auth/me');
        test('GET /api/auth/me (session check)', me.ok ? 'PASS' : 'WARN', `status=${me.status}`);
    }

    // Protected route without auth (should 401)
    const noAuth = await request('GET', '/api/dashboard/kpis', null, { Cookie: '' });
    test('Rota protegida sem auth → 401/403', [401, 403].includes(noAuth.status) ? 'PASS' : 'WARN', `status=${noAuth.status}`);
}

// ============================================================
// 3. MODULE APIs — GET (read-only, non-destructive)
// ============================================================
async function testModuleAPIs() {
    console.log('\n━━━ 3. APIs DOS MÓDULOS (READ) ━━━');

    const endpoints = [
        // Dashboard
        { path: '/api/dashboard/kpis', name: 'Dashboard KPIs' },
        { path: '/api/dashboard/alertas', name: 'Dashboard Alertas' },

        // Vendas
        { path: '/api/vendas/pedidos', name: 'Vendas: Listar pedidos' },
        { path: '/api/vendas/clientes', name: 'Vendas: Listar clientes' },
        { path: '/api/vendas/kanban', name: 'Vendas: Kanban' },
        { path: '/api/vendas/dashboard', name: 'Vendas: Dashboard' },

        // Produtos
        { path: '/api/produtos?limit=5', name: 'Produtos: Listar (limit=5)' },

        // Compras
        { path: '/api/compras/cotacoes', name: 'Compras: Cotações' },
        { path: '/api/compras/fornecedores', name: 'Compras: Fornecedores' },
        { path: '/api/compras/dashboard', name: 'Compras: Dashboard' },

        // Financeiro
        { path: '/api/financeiro/contas-receber', name: 'Financeiro: Contas a receber' },
        { path: '/api/financeiro/contas-pagar', name: 'Financeiro: Contas a pagar' },
        { path: '/api/financeiro/dashboard', name: 'Financeiro: Dashboard' },
        { path: '/api/financeiro/fluxo-caixa', name: 'Financeiro: Fluxo caixa' },

        // RH
        { path: '/api/rh/funcionarios', name: 'RH: Funcionários' },
        { path: '/api/rh/ponto', name: 'RH: Registro ponto' },
        { path: '/api/rh/dashboard', name: 'RH: Dashboard' },

        // PCP
        { path: '/api/pcp/ordens', name: 'PCP: Ordens produção' },

        // Estoque
        { path: '/api/estoque/produtos', name: 'Estoque: Produtos' },

        // Logística
        { path: '/api/logistica/entregas', name: 'Logística: Entregas' },
        { path: '/api/logistica/nfe', name: 'Logística: NF-e' },

        // Faturamento
        { path: '/api/faturamento/notas', name: 'Faturamento: Notas' },

        // Configurações
        { path: '/api/configuracoes/empresa', name: 'Config: Empresa' },
        { path: '/api/configuracoes/usuarios', name: 'Config: Usuários' },

        // Notificações
        { path: '/api/notificacoes', name: 'Notificações' },

        // Integrações
        { path: '/api/integracao/status', name: 'Integração: Status' },

        // Chat
        { path: '/api/chat/canais', name: 'Chat: Canais' },
    ];

    for (const ep of endpoints) {
        const r = await request('GET', ep.path);
        if (r.ok) {
            test(ep.name, 'PASS');
        } else if (r.status === 401 || r.status === 403) {
            test(ep.name, 'WARN', `auth required (${r.status})`);
        } else if (r.status === 404) {
            test(ep.name, 'WARN', 'rota não encontrada (404)');
        } else {
            test(ep.name, 'FAIL', `status=${r.status} ${r.error || (r.body?.message || r.raw?.substring(0, 80))}`);
        }
    }
}

// ============================================================
// 4. WRITE OPERATIONS (safe CRUD cycle)
// ============================================================
async function testCRUD() {
    console.log('\n━━━ 4. CRUD LIFECYCLE (safe) ━━━');

    if (!AUTH_COOKIE) {
        test('CRUD skipped (sem auth)', 'WARN', 'Login falhou, pulando testes de escrita');
        return;
    }

    // --- Vendas: criar pedido de teste, verificar, deletar ---
    const createPedido = await request('POST', '/api/vendas/pedidos', {
        cliente: '__LIFECYCLE_TEST__',
        valor: 0.01,
        status: 'Orçamento',
        observacao: 'Teste lifecycle automatizado — pode ser excluído'
    });

    if (createPedido.ok || createPedido.status === 201) {
        const pedidoId = createPedido.body?.id || createPedido.body?.pedidoId || createPedido.body?.insertId;
        test('Vendas: CREATE pedido teste', 'PASS');

        if (pedidoId) {
            // Read
            const readPedido = await request('GET', `/api/vendas/pedidos/${pedidoId}`);
            test('Vendas: READ pedido criado', readPedido.ok ? 'PASS' : 'WARN', `status=${readPedido.status}`);

            // Update
            const updatePedido = await request('PUT', `/api/vendas/pedidos/${pedidoId}`, {
                observacao: 'Teste lifecycle — UPDATED'
            });
            test('Vendas: UPDATE pedido', updatePedido.ok ? 'PASS' : 'WARN', `status=${updatePedido.status}`);

            // Delete
            const deletePedido = await request('DELETE', `/api/vendas/pedidos/${pedidoId}`);
            test('Vendas: DELETE pedido teste', deletePedido.ok ? 'PASS' : 'WARN', `status=${deletePedido.status}`);
        } else {
            test('Vendas: READ/UPDATE/DELETE', 'WARN', 'não obteve ID do pedido criado');
        }
    } else {
        test('Vendas: CREATE pedido teste', 'WARN', `status=${createPedido.status} — ${createPedido.body?.message || ''}`);
    }

    // --- Notificação lifecycle ---
    const createNotif = await request('POST', '/api/notificacoes', {
        titulo: '__LIFECYCLE_TEST__',
        mensagem: 'Teste automatizado',
        tipo: 'info'
    });
    if (createNotif.ok || createNotif.status === 201) {
        test('Notificações: CREATE', 'PASS');
    } else {
        test('Notificações: CREATE', 'WARN', `status=${createNotif.status}`);
    }
}

// ============================================================
// 5. DATABASE HEALTH
// ============================================================
async function testDatabase() {
    console.log('\n━━━ 5. DATABASE & INTEGRIDADE ━━━');

    // Test via API endpoints that query DB
    const dbEndpoints = [
        { path: '/api/vendas/pedidos?limit=1', name: 'DB: Query vendas' },
        { path: '/api/produtos?limit=1', name: 'DB: Query produtos' },
        { path: '/api/rh/funcionarios?limit=1', name: 'DB: Query RH' },
    ];

    for (const ep of dbEndpoints) {
        const start = Date.now();
        const r = await request('GET', ep.path);
        const elapsed = Date.now() - start;
        if (r.ok) {
            const perf = elapsed > 3000 ? 'WARN' : 'PASS';
            test(`${ep.name} (${elapsed}ms)`, perf, elapsed > 3000 ? 'LENTO >3s' : '');
        } else {
            test(ep.name, r.status === 401 ? 'WARN' : 'FAIL', `status=${r.status} (${elapsed}ms)`);
        }
    }
}

// ============================================================
// 6. SECURITY CHECKS
// ============================================================
async function testSecurity() {
    console.log('\n━━━ 6. SEGURANÇA ━━━');

    // SQL injection attempt
    const sqli = await request('GET', '/api/produtos?search=\' OR 1=1 --');
    test('SQLi attempt → sem crash', sqli.status !== 500 ? 'PASS' : 'FAIL', `status=${sqli.status}`);

    // XSS in query
    const xss = await request('GET', '/api/produtos?search=<script>alert(1)</script>');
    test('XSS in query → sem crash', xss.status !== 500 ? 'PASS' : 'FAIL', `status=${xss.status}`);

    // Path traversal
    const pt = await request('GET', '/../../etc/passwd');
    test('Path traversal blocked', pt.status !== 200 ? 'PASS' : 'FAIL', `status=${pt.status}`);

    // Rate limit headers
    const rl = await request('GET', '/api/auth/login');
    const hasRL = rl.headers['x-ratelimit-limit'] || rl.headers['retry-after'] || rl.headers['ratelimit-limit'];
    test('Rate limiting headers presentes', hasRL ? 'PASS' : 'WARN', hasRL ? '' : 'sem headers de rate limit');

    // Security headers
    const sec = await request('GET', '/');
    const secHeaders = ['x-content-type-options', 'x-frame-options'];
    for (const h of secHeaders) {
        test(`Header: ${h}`, sec.headers[h] ? 'PASS' : 'WARN', sec.headers[h] || 'ausente');
    }
}

// ============================================================
// 7. MODULE HTML PAGES
// ============================================================
async function testModulePages() {
    console.log('\n━━━ 7. PÁGINAS DOS MÓDULOS ━━━');

    const pages = [
        { path: '/vendas/', name: 'Vendas index' },
        { path: '/compras/', name: 'Compras index' },
        { path: '/financeiro/', name: 'Financeiro index' },
        { path: '/pcp/', name: 'PCP index' },
        { path: '/rh/', name: 'RH index' },
        { path: '/logistica/', name: 'Logística index' },
        { path: '/faturamento/', name: 'Faturamento index' },
        { path: '/configuracoes/', name: 'Configurações index' },
        { path: '/estoque.html', name: 'Estoque page' },
        { path: '/dashboard.html', name: 'Dashboard page' },
    ];

    for (const p of pages) {
        const r = await request('GET', p.path);
        if (r.status === 200) {
            test(p.name, 'PASS');
        } else if (r.status === 301 || r.status === 302) {
            test(p.name, 'PASS', `redirect → ${r.headers.location || ''}`);
        } else if (r.status === 401 || r.status === 403) {
            test(p.name, 'WARN', `auth required (${r.status})`);
        } else {
            test(p.name, 'FAIL', `status=${r.status}`);
        }
    }
}

// ============================================================
// 8. PERFORMANCE BASELINE
// ============================================================
async function testPerformance() {
    console.log('\n━━━ 8. PERFORMANCE ━━━');

    // Sequential requests timing
    const urls = ['/', '/login.html', '/api/vendas/pedidos?limit=1'];
    for (const u of urls) {
        const times = [];
        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            await request('GET', u);
            times.push(Date.now() - start);
        }
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const max = Math.max(...times);
        const status = avg > 5000 ? 'FAIL' : avg > 2000 ? 'WARN' : 'PASS';
        test(`Perf: ${u} avg=${avg}ms max=${max}ms`, status, avg > 2000 ? 'LENTO' : '');
    }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ZYNTRA/ALUFORCE — Lifecycle Test Suite                 ║');
    console.log(`║  Target: ${BASE.padEnd(47)}║`);
    console.log(`║  Date: ${new Date().toISOString().padEnd(49)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    await testHealth();
    await testAuth();
    await testModuleAPIs();
    await testCRUD();
    await testDatabase();
    await testSecurity();
    await testModulePages();
    await testPerformance();

    // Report
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log(`║  RESULTADO FINAL                                        ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ PASS: ${String(RESULTS.pass).padEnd(46)}║`);
    console.log(`║  ⚠️  WARN: ${String(RESULTS.warn).padEnd(46)}║`);
    console.log(`║  ❌ FAIL: ${String(RESULTS.fail).padEnd(46)}║`);
    console.log(`║  Total:  ${String(RESULTS.pass + RESULTS.warn + RESULTS.fail).padEnd(47)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    if (RESULTS.errors.length > 0) {
        console.log('\nFALHAS DETALHADAS:');
        RESULTS.errors.forEach((e, i) => {
            console.log(`  ${i + 1}. ${e.name}: ${e.detail}`);
        });
    }

    process.exit(RESULTS.fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
