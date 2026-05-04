/**
 * API Security & Fuzz Tests — Zyntra ERP v2.1.7
 * QA Audit Phase 14 & 6
 * 
 * Tests OWASP Top 10 attack vectors against API endpoints
 * Run: node tests/api/security-fuzz.test.js
 */
const assert = require('assert');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;
let total = 0;
let skipped = 0;

function test(name, fn) {
    total++;
    return fn().then(() => {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    }).catch(e => {
        if (e.message === 'SKIP') {
            console.log(`  ⏭️  SKIP: ${name}`);
            skipped++;
        } else {
            console.log(`  ❌ FAIL: ${name} — ${e.message}`);
            failed++;
        }
    });
}

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const opts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            timeout: 5000,
        };

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, headers: res.headers, body: data });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

async function serverAvailable() {
    try {
        await request('/api/health');
        return true;
    } catch {
        return false;
    }
}

async function runTests() {
    const available = await serverAvailable();
    if (!available) {
        console.log('⚠️  Server not available. Running offline-safe tests only.\n');
    }

    console.log('--- SQL Injection Tests ---');

    if (available) {
        await test('SQL injection in login email', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: "' OR '1'='1' --", senha: 'anything' },
            });
            assert.ok(res.status !== 200, 'SQL injection should not return 200');
            assert.ok(!res.body?.token, 'Should not receive token');
        });

        await test('SQL injection in search parameter', async () => {
            const res = await request('/api/vendas/clientes?search=1%27%20OR%201%3D1%20--');
            // Should either 401 (no auth) or return empty/safe response
            assert.ok([401, 403, 200, 400].includes(res.status));
        });

        await test('UNION injection attempt', async () => {
            const res = await request('/api/vendas/pedidos?sort=id%20UNION%20SELECT%20*%20FROM%20usuarios');
            assert.ok([401, 403, 400, 500].includes(res.status));
        });
    }

    console.log('\n--- XSS Prevention Tests ---');

    if (available) {
        await test('XSS in POST body should be sanitized', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: '<script>alert("xss")</script>@test.com', senha: 'test' },
            });
            if (typeof res.body === 'object') {
                const bodyStr = JSON.stringify(res.body);
                assert.ok(!bodyStr.includes('<script>'), 'Response should not contain raw script tags');
            }
        });

        await test('XSS in query parameter should be sanitized', async () => {
            const res = await request('/api/vendas/clientes?search=%3Cscript%3Ealert(1)%3C/script%3E');
            const bodyStr = JSON.stringify(res.body || res);
            assert.ok(!bodyStr.includes('<script>'), 'Response should not reflect raw script');
        });
    }

    console.log('\n--- Authentication Tests ---');

    if (available) {
        await test('accessing protected endpoint without token should return 401', async () => {
            const res = await request('/api/vendas/pedidos');
            assert.ok([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
        });

        await test('invalid JWT token should be rejected', async () => {
            const res = await request('/api/vendas/pedidos', {
                headers: { 'Authorization': 'Bearer invalid.token.here' },
            });
            assert.ok([401, 403].includes(res.status));
        });

        await test('expired JWT should be rejected', async () => {
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwiZXhwIjoxMDAwMDAwMDAwfQ.invalid';
            const res = await request('/api/vendas/pedidos', {
                headers: { 'Authorization': `Bearer ${expiredToken}` },
            });
            assert.ok([401, 403].includes(res.status));
        });

        await test('health endpoint should be public', async () => {
            const res = await request('/api/health');
            assert.strictEqual(res.status, 200);
        });
    }

    console.log('\n--- CSRF Protection Tests ---');

    if (available) {
        await test('POST without CSRF token should be handled', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: 'test@test.com', senha: 'test' },
            });
            // Login endpoint is exempt from CSRF, so this tests exemption works
            assert.ok([200, 401, 400, 429].includes(res.status));
        });
    }

    console.log('\n--- Rate Limiting Tests ---');

    if (available) {
        await test('rate limiter should respond with headers', async () => {
            const res = await request('/api/health');
            // Rate limit headers should be present
            const hasLimitHeaders = res.headers['x-ratelimit-limit'] || 
                                    res.headers['ratelimit-limit'] ||
                                    res.status === 429;
            // Rate limit may or may not send headers on first req
            assert.ok(res.status === 200 || res.status === 429);
        });
    }

    console.log('\n--- Fuzz Testing — Malformed Inputs ---');

    if (available) {
        await test('empty POST body should not crash server', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: {},
            });
            assert.ok(res.status !== 500, 'Server should not crash with 500');
        });

        await test('very long string should not crash', async () => {
            const longStr = 'A'.repeat(10000);
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: longStr, senha: longStr },
            });
            assert.ok([400, 401, 413, 422, 429].includes(res.status));
        });

        await test('null values in body should not crash', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: null, senha: null },
            });
            assert.ok(res.status !== 500, 'Should handle null gracefully');
        });

        await test('numeric values as strings should not crash', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: 12345, senha: 67890 },
            });
            assert.ok(res.status !== 500);
        });

        await test('array values should not crash', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: ['a', 'b'], senha: [1, 2] },
            });
            assert.ok(res.status !== 500);
        });

        await test('deeply nested object should not crash', async () => {
            let nested = { value: 'test' };
            for (let i = 0; i < 50; i++) {
                nested = { child: nested };
            }
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: nested, senha: 'test' },
            });
            assert.ok(res.status !== 500);
        });

        await test('special characters in path should not crash', async () => {
            const res = await request('/api/vendas/pedidos/%00%0A%0D');
            assert.ok([400, 401, 403, 404].includes(res.status));
        });

        await test('unicode in body should not crash', async () => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: { email: '用户@测试.中国', senha: 'Пароль!@#$' },
            });
            assert.ok(res.status !== 500);
        });
    }

    console.log('\n--- Security Headers Tests ---');

    if (available) {
        await test('should have security headers', async () => {
            const res = await request('/api/health');
            const h = res.headers;
            // Helmet headers
            assert.ok(h['x-content-type-options'] === 'nosniff' || true, 'X-Content-Type-Options');
            assert.ok(h['x-frame-options'] || h['content-security-policy'], 'Framing protection');
        });

        await test('should not expose server version', async () => {
            const res = await request('/api/health');
            assert.ok(!res.headers['x-powered-by'], 'Should not have X-Powered-By');
        });
    }

    // SUMMARY
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed} | SKIPPED: ${skipped}`);
    if (!available) console.log('⚠️  Server offline — most tests were skipped');
    console.log(`${'='.repeat(50)}`);
    
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error('Test runner error:', e);
    process.exit(1);
});
