/**
 * Security Audit Tests — CSRF Protection
 * 
 * Tests CSRF token generation, validation, and middleware behavior.
 */
const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');

describe('CSRF Protection (src/middleware/csrf.js)', async () => {
    const { generateToken, csrfProtection, csrfTokenRoute, originValidation, CSRF_CONFIG } = await import('../../src/middleware/csrf.js');

    describe('generateToken', () => {
        it('generates 64-char hex token', () => {
            const token = generateToken();
            assert.strictEqual(token.length, 64);
            assert.match(token, /^[a-f0-9]{64}$/);
        });

        it('generates unique tokens (1000 iterations)', () => {
            const tokens = new Set();
            for (let i = 0; i < 1000; i++) {
                tokens.add(generateToken());
            }
            assert.strictEqual(tokens.size, 1000);
        });
    });

    describe('csrfProtection middleware', () => {
        let req, res, nextCalled;

        beforeEach(() => {
            nextCalled = false;
            req = {
                method: 'GET',
                path: '/api/test',
                headers: {},
                cookies: {},
                body: {}
            };
            res = {
                statusCode: 200,
                cookie: mock.fn(),
                status: mock.fn(function(code) { this.statusCode = code; return this; }),
                json: mock.fn()
            };
        });

        it('allows GET requests without token', () => {
            const mw = csrfProtection();
            mw(req, res, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, true);
        });

        it('allows HEAD requests without token', () => {
            req.method = 'HEAD';
            const mw = csrfProtection();
            mw(req, res, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, true);
        });

        it('allows OPTIONS requests without token', () => {
            req.method = 'OPTIONS';
            const mw = csrfProtection();
            mw(req, res, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, true);
        });

        it('blocks POST without CSRF token', () => {
            req.method = 'POST';
            const mw = csrfProtection();
            mw(req, res, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, false);
        });

        it('allows POST with matching CSRF token', () => {
            const issueReq = {
                method: 'GET',
                path: '/api/csrf-token',
                headers: {},
                cookies: {},
                ip: '127.0.0.1'
            };
            csrfTokenRoute(issueReq, res);
            const token = res.json.mock.calls[0].arguments[0].token;

            req.method = 'POST';
            req.headers['x-csrf-token'] = token;
            req.cookies[CSRF_CONFIG.cookieName] = token;
            const mw = csrfProtection();
            mw(req, res, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, true);
        });

        it('blocks POST with mismatched CSRF token', () => {
            const issueReq = {
                method: 'GET',
                path: '/api/csrf-token',
                headers: {},
                cookies: {},
                ip: '127.0.0.1'
            };
            csrfTokenRoute(issueReq, res);
            const token = res.json.mock.calls[0].arguments[0].token;

            req.method = 'POST';
            req.headers['x-csrf-token'] = token;
            req.cookies[CSRF_CONFIG.cookieName] = generateToken(); // Different
            const mw = csrfProtection();
            mw(req, res, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, false);
        });
    });

    describe('originValidation middleware', () => {
        let req, res, nextCalled;

        beforeEach(() => {
            nextCalled = false;
            req = {
                method: 'POST',
                headers: {},
                get: function(h) { return this.headers[h.toLowerCase()]; }
            };
            res = {
                status: mock.fn(function() { return this; }),
                json: mock.fn()
            };
        });

        it('allows requests from allowed origins', () => {
            const mw = originValidation({ allowedOrigins: ['http://localhost:3000'] });
            req.headers['origin'] = 'http://localhost:3000';
            mw(req, res, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, true);
        });
    });

    describe('CSRF_CONFIG', () => {
        it('has required configuration fields', () => {
            assert.ok(CSRF_CONFIG.cookieName, 'should have cookieName');
            assert.ok(CSRF_CONFIG.headerName, 'should have headerName');
            assert.strictEqual(CSRF_CONFIG.COOKIE_NAME, CSRF_CONFIG.cookieName);
            assert.strictEqual(CSRF_CONFIG.HEADER_NAME, CSRF_CONFIG.headerName);
        });
    });
});
