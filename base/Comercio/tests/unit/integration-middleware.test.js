/**
 * Integration Tests — Middleware Connection Verification
 * 
 * Verifies that all middleware modules created in the audit are
 * properly connected to the application routes and functional.
 */

const assert = require('node:assert');
const { describe, it } = require('node:test');

// ============================================================
// 1. Schema Validation connected to Auth Routes
// ============================================================
describe('Schema Validation Integration', () => {
    it('auth.js imports schema-validation module', () => {
        const authSource = require('fs').readFileSync(
            require('path').join(__dirname, '..', '..', 'src', 'routes', 'auth.js'),
            'utf8'
        );
        assert.ok(authSource.includes("require('../../middleware/schema-validation')"),
            'auth.js should import schema-validation');
        assert.ok(authSource.includes('validate(schemas.login)'),
            'auth.js should use validate(schemas.login) middleware on login route');
    });

    it('validate middleware returns 400 for invalid input', () => {
        const { validate, schemas } = require('../../middleware/schema-validation');
        const middleware = validate(schemas.login);

        const req = { body: { email: 'not-an-email', password: '12' } };
        let statusCode, jsonBody;
        const res = {
            status(code) { statusCode = code; return this; },
            json(body) { jsonBody = body; }
        };
        const next = () => { statusCode = 200; };

        middleware(req, res, next);
        assert.strictEqual(statusCode, 400, 'Should return 400 for invalid data');
        assert.ok(jsonBody.errors, 'Should have errors array');
    });

    it('validate middleware calls next() for valid input', () => {
        const { validate, schemas } = require('../../middleware/schema-validation');
        const middleware = validate(schemas.login);

        const req = { body: { email: 'user@aluforce.com.br', password: 'Senha123!' } };
        let nextCalled = false;
        const res = {
            status() { return this; },
            json() {}
        };
        const next = () => { nextCalled = true; };

        middleware(req, res, next);
        assert.ok(nextCalled, 'Should call next() for valid data');
    });
});

// ============================================================
// 2. Circuit Breaker Connected to Pool
// ============================================================
describe('Circuit Breaker Integration', () => {
    it('server.js creates MySQL circuit breaker', () => {
        const serverSource = require('fs').readFileSync(
            require('path').join(__dirname, '..', '..', 'server.js'),
            'utf8'
        );
        assert.ok(serverSource.includes("require('./services/mysql-circuit-breaker')"),
            'server.js should import mysql-circuit-breaker');
        assert.ok(serverSource.includes('createMySQLBreaker(pool'),
            'server.js should create circuit breaker with pool');
        assert.ok(serverSource.includes('global.dbCircuitBreaker'),
            'server.js should expose circuit breaker globally');
    });

    it('circuit breaker module exports correctly', () => {
        const { createMySQLBreaker } = require('../../services/mysql-circuit-breaker');
        assert.strictEqual(typeof createMySQLBreaker, 'function');
    });
});

// ============================================================
// 3. Audit Trail Connected to Financeiro Routes
// ============================================================
describe('Audit Trail Integration', () => {
    it('financeiro-core.js imports audit-trail', () => {
        const source = require('fs').readFileSync(
            require('path').join(__dirname, '..', '..', 'routes', 'financeiro-core.js'),
            'utf8'
        );
        assert.ok(source.includes("require('../middleware/audit-trail')"),
            'financeiro-core.js should import audit-trail');
        assert.ok(source.includes("auditTrail('financeiro')"),
            'financeiro-core.js should use auditTrail middleware');
    });

    it('auditTrail middleware passes through GET requests', () => {
        const { auditTrail } = require('../../middleware/audit-trail');
        const middleware = auditTrail('financeiro');

        let nextCalled = false;
        const req = { method: 'GET', path: '/test', user: { id: 1 } };
        const res = {};
        const next = () => { nextCalled = true; };

        middleware(req, res, next);
        assert.ok(nextCalled, 'GET should pass through');
    });
});

// ============================================================
// 4. Idempotency Connected to Financeiro Routes
// ============================================================
describe('Idempotency Integration', () => {
    it('financeiro-core.js imports idempotency', () => {
        const source = require('fs').readFileSync(
            require('path').join(__dirname, '..', '..', 'routes', 'financeiro-core.js'),
            'utf8'
        );
        assert.ok(source.includes("require('../middleware/idempotency')"),
            'financeiro-core.js should import idempotency');
        assert.ok(source.includes('idempotency()'),
            'financeiro-core.js should use idempotency middleware');
    });

    it('idempotency middleware passes through without key', () => {
        const { idempotency } = require('../../middleware/idempotency');
        const middleware = idempotency();

        let nextCalled = false;
        const req = { method: 'POST', headers: {} };
        const res = {};
        const next = () => { nextCalled = true; };

        middleware(req, res, next);
        assert.ok(nextCalled, 'Should pass through without idempotency key');
    });
});

// ============================================================
// 5. Route Orchestrator has auditTrail and idempotency in sharedDeps
// ============================================================
describe('Route Orchestrator Integration', () => {
    it('routes/index.js imports audit-trail and idempotency', () => {
        const source = require('fs').readFileSync(
            require('path').join(__dirname, '..', '..', 'routes', 'index.js'),
            'utf8'
        );
        assert.ok(source.includes("require('../middleware/audit-trail')"),
            'index.js should import audit-trail');
        assert.ok(source.includes("require('../middleware/idempotency')"),
            'index.js should import idempotency');
        assert.ok(source.includes('auditTrail, idempotency'),
            'sharedDeps should include auditTrail and idempotency');
    });
});

// ============================================================
// 6. RLS Tenant Middleware
// ============================================================
describe('RLS Tenant Middleware', () => {
    it('tenantScope sets empresaId on request', () => {
        const { tenantScope } = require('../../middleware/rls-tenant');
        const middleware = tenantScope();

        const req = { user: { empresa_id: 5 } };
        let nextCalled = false;
        const res = {};
        const next = () => { nextCalled = true; };

        middleware(req, res, next);
        assert.strictEqual(req.empresaId, 5);
        assert.ok(nextCalled);
    });

    it('tenantScope uses default when no empresa_id', () => {
        const { tenantScope } = require('../../middleware/rls-tenant');
        const middleware = tenantScope({ defaultEmpresaId: 1 });

        const req = { user: { id: 1 } };
        let nextCalled = false;
        const res = {};
        const next = () => { nextCalled = true; };

        middleware(req, res, next);
        assert.strictEqual(req.empresaId, 1);
        assert.ok(nextCalled);
    });

    it('tenantScope rejects when required and missing', () => {
        const { tenantScope } = require('../../middleware/rls-tenant');
        const middleware = tenantScope({ required: true });

        const req = { user: { id: 1 } };
        let statusCode;
        const res = {
            status(code) { statusCode = code; return this; },
            json() {}
        };
        const next = () => {};

        middleware(req, res, next);
        assert.strictEqual(statusCode, 403);
    });

    it('validateTenantOwnership checks correctly', () => {
        const { validateTenantOwnership } = require('../../middleware/rls-tenant');
        assert.ok(validateTenantOwnership(1, 1));
        assert.ok(validateTenantOwnership('1', 1));
        assert.ok(!validateTenantOwnership(1, 2));
        assert.ok(!validateTenantOwnership(null, 1));
    });
});

// ============================================================
// 7. LGPD Routes Exist and Are Mounted
// ============================================================
describe('LGPD Routes Integration', () => {
    it('LGPD route file exists with proper exports', () => {
        const lgpdModule = require('../../routes/lgpd');
        assert.ok(lgpdModule.createLGPDRouter || typeof lgpdModule === 'function',
            'LGPD module should export createLGPDRouter or be a factory function');
    });

    it('routes/index.js mounts LGPD routes', () => {
        const source = require('fs').readFileSync(
            require('path').join(__dirname, '..', '..', 'routes', 'index.js'),
            'utf8'
        );
        assert.ok(source.includes("'/api/lgpd'"),
            'LGPD routes should be mounted at /api/lgpd');
    });
});

// ============================================================
// 8. Decimal Calc for Financial Precision
// ============================================================
describe('Decimal Calc Integration', () => {
    it('decimal-calc provides precise financial operations', () => {
        const { add, subtract, multiply, formatBRL, splitInstallments } = require('../../utils/decimal-calc');

        // Classic floating point problem
        assert.strictEqual(add(0.1, 0.2), 0.3);
        assert.strictEqual(subtract(1.00, 0.99), 0.01);
        assert.strictEqual(multiply(19.99, 3), 59.97);

        // BRL formatting
        const formatted = formatBRL(1234.56);
        assert.ok(formatted.includes('1.234,56') || formatted.includes('1234,56'));
    });

    it('splitInstallments handles remainders correctly', () => {
        const { splitInstallments } = require('../../utils/decimal-calc');
        const installments = splitInstallments(100, 3);
        assert.strictEqual(installments.length, 3);

        // Sum of installments must equal original
        const sum = installments.reduce((a, b) => a + b, 0);
        assert.strictEqual(Math.round(sum * 100) / 100, 100);
    });
});

// ============================================================
// 9. Order By Whitelist prevents SQL Injection
// ============================================================
describe('Order By Whitelist Integration', () => {
    it('blocks SQL injection in ORDER BY', () => {
        const { safeOrderBy } = require('../../utils/order-by-whitelist');

        const safe = safeOrderBy('id; DROP TABLE users', 'ASC');
        assert.ok(!safe.includes('DROP'), 'Should not contain DROP');
        assert.ok(safe.includes('ORDER BY'), 'Should still have ORDER BY clause');
    });
});

// ============================================================
// 10. ESLint Config Validation
// ============================================================
describe('Code Quality Config', () => {
    it('.eslintrc.json is valid JSON', () => {
        const fs = require('fs');
        const path = require('path');
        const content = fs.readFileSync(
            path.join(__dirname, '..', '..', '.eslintrc.json'),
            'utf8'
        );
        assert.doesNotThrow(() => JSON.parse(content), 'ESLint config should be valid JSON');
    });

    it('.prettierrc is valid JSON', () => {
        const fs = require('fs');
        const path = require('path');
        const content = fs.readFileSync(
            path.join(__dirname, '..', '..', '.prettierrc'),
            'utf8'
        );
        assert.doesNotThrow(() => JSON.parse(content), 'Prettier config should be valid JSON');
    });
});

// ============================================================
// 11. Environment Validation
// ============================================================
describe('Environment Validation Integration', () => {
    it('server.js calls validateEnv()', () => {
        const source = require('fs').readFileSync(
            require('path').join(__dirname, '..', '..', 'server.js'),
            'utf8'
        );
        assert.ok(source.includes('validateEnv()'),
            'server.js should call validateEnv() at startup');
    });

    it('validateEnv returns structured result', () => {
        const { validateEnv } = require('../../config/env');
        const result = validateEnv();
        assert.ok(Array.isArray(result.errors), 'Should have errors array');
        assert.ok(Array.isArray(result.warnings), 'Should have warnings array');
    });
});
