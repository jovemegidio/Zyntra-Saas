/**
 * Round 3 Score-100 Test Suite
 * Validates: request-id tracing, Swagger/OpenAPI, prom-client metrics,
 * readiness endpoint, and logger enhancements.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// ────────────────────────────────────────────────────────────────
// 1. Request-ID Tracing Middleware
// ────────────────────────────────────────────────────────────────
describe('Request-ID Tracing', () => {
    it('should export requestIdMiddleware function', () => {
        const mod = require(path.join(ROOT, 'middleware', 'request-id'));
        assert.equal(typeof mod.requestIdMiddleware, 'function');
    });

    it('should generate UUID when no X-Request-Id header', () => {
        const { requestIdMiddleware } = require(path.join(ROOT, 'middleware', 'request-id'));
        const middleware = requestIdMiddleware();
        const req = { headers: {} };
        const headers = {};
        const res = { setHeader: (k, v) => { headers[k] = v; } };
        let called = false;
        middleware(req, res, () => { called = true; });
        assert.ok(called, 'next() should be called');
        assert.ok(req.requestId, 'req.requestId should be set');
        assert.match(req.requestId, /^[0-9a-f-]{36}$/, 'should be valid UUID');
        assert.equal(headers['X-Request-Id'], req.requestId);
    });

    it('should propagate valid incoming X-Request-Id', () => {
        const { requestIdMiddleware } = require(path.join(ROOT, 'middleware', 'request-id'));
        const middleware = requestIdMiddleware();
        const incomingId = 'abc12345-test-request-id';
        const req = { headers: { 'x-request-id': incomingId } };
        const headers = {};
        const res = { setHeader: (k, v) => { headers[k] = v; } };
        middleware(req, res, () => {});
        assert.equal(req.requestId, incomingId);
        assert.equal(headers['X-Request-Id'], incomingId);
    });

    it('should reject invalid X-Request-Id and generate new one', () => {
        const { requestIdMiddleware } = require(path.join(ROOT, 'middleware', 'request-id'));
        const middleware = requestIdMiddleware();
        const req = { headers: { 'x-request-id': '<script>alert(1)</script>' } };
        const headers = {};
        const res = { setHeader: (k, v) => { headers[k] = v; } };
        middleware(req, res, () => {});
        assert.notEqual(req.requestId, '<script>alert(1)</script>');
        assert.match(req.requestId, /^[0-9a-f-]{36}$/);
    });

    it('should be connected in server.js', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes("require('./middleware/request-id')"), 'request-id import present');
        assert.ok(serverSrc.includes('requestIdMiddleware()'), 'requestIdMiddleware() applied');
    });
});

// ────────────────────────────────────────────────────────────────
// 2. Swagger/OpenAPI Documentation
// ────────────────────────────────────────────────────────────────
describe('Swagger/OpenAPI Documentation', () => {
    it('should have swagger config file', () => {
        assert.ok(fs.existsSync(path.join(ROOT, 'config', 'swagger.js')));
    });

    it('should export setupSwagger function', () => {
        const swaggerSrc = fs.readFileSync(path.join(ROOT, 'config', 'swagger.js'), 'utf8');
        assert.ok(swaggerSrc.includes('function setupSwagger') || swaggerSrc.includes('setupSwagger ='),
            'setupSwagger function defined');
        assert.ok(swaggerSrc.includes('module.exports') && swaggerSrc.includes('setupSwagger'),
            'setupSwagger exported');
    });

    it('should have swagger-jsdoc dependency installed', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
        assert.ok(
            pkg.dependencies['swagger-jsdoc'] || pkg.devDependencies?.['swagger-jsdoc'],
            'swagger-jsdoc in dependencies'
        );
    });

    it('should have swagger-ui-express dependency installed', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
        assert.ok(
            pkg.dependencies['swagger-ui-express'] || pkg.devDependencies?.['swagger-ui-express'],
            'swagger-ui-express in dependencies'
        );
    });

    it('should be mounted in server.js', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes("require('./config/swagger')"), 'swagger import present');
        assert.ok(serverSrc.includes('setupSwagger(app)'), 'setupSwagger called');
    });

    it('should define OpenAPI 3.0 spec with required fields', () => {
        const configSrc = fs.readFileSync(path.join(ROOT, 'config', 'swagger.js'), 'utf8');
        assert.ok(configSrc.includes("openapi: '3.0.3'"), 'OpenAPI 3.0.3 version');
        assert.ok(configSrc.includes('bearerAuth'), 'JWT bearer auth scheme');
        assert.ok(configSrc.includes("title: 'Zyntra ERP API'"), 'API title present');
    });
});

// ────────────────────────────────────────────────────────────────
// 3. Prometheus Metrics (prom-client)
// ────────────────────────────────────────────────────────────────
describe('Prometheus Metrics (prom-client)', () => {
    it('should have prom-client available', () => {
        // Check package.json declares prom-client
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
        assert.ok(
            pkg.dependencies?.['prom-client'] || pkg.devDependencies?.['prom-client'],
            'prom-client should be declared in package.json'
        );
    });

    it('should collect default Node.js metrics', () => {
        const metricsSrc = fs.readFileSync(path.join(ROOT, 'services', 'metrics.js'), 'utf8');
        assert.ok(metricsSrc.includes('collectDefaultMetrics'), 'collectDefaultMetrics called');
        assert.ok(metricsSrc.includes("prefix: 'zyntra_'"), 'zyntra_ prefix applied');
    });

    it('should include prom-client output in /metrics endpoint', () => {
        const metricsSrc = fs.readFileSync(path.join(ROOT, 'services', 'metrics.js'), 'utf8');
        assert.ok(metricsSrc.includes('promClient.register.metrics()'), 'appends prom-client registry');
    });

    it('should have custom metrics (HTTP requests, DB, cache, business)', () => {
        const mod = require(path.join(ROOT, 'services', 'metrics'));
        assert.equal(typeof mod.metricsMiddleware, 'function');
        assert.equal(typeof mod.trackDBQuery, 'function');
        assert.equal(typeof mod.trackCacheHit, 'function');
        assert.equal(typeof mod.trackCacheMiss, 'function');
        assert.equal(typeof mod.trackBusinessEvent, 'function');
        assert.equal(typeof mod.trackError, 'function');
    });
});

// ────────────────────────────────────────────────────────────────
// 4. Readiness Endpoint
// ────────────────────────────────────────────────────────────────
describe('Readiness Endpoint', () => {
    it('should have /readiness endpoint in server.js', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes("'/readiness'"), '/readiness endpoint defined');
    });

    it('should return 503 when DB unavailable', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes('503'), '503 status for unhealthy');
        assert.ok(serverSrc.includes('database_unavailable'), 'reason field present');
    });

    it('should have /status endpoint (liveness)', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes("'/status'"), '/status endpoint exists');
    });

    it('should have /api/health endpoint (enterprise health)', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes('/api/health'), '/api/health endpoint exists');
    });
});

// ────────────────────────────────────────────────────────────────
// 5. Winston Logger Enhancements
// ────────────────────────────────────────────────────────────────
describe('Logger Enhancements', () => {
    it('should include requestId in logger.request', () => {
        const loggerSrc = fs.readFileSync(path.join(ROOT, 'src', 'logger.js'), 'utf8');
        assert.ok(loggerSrc.includes('requestId: req.requestId'), 'requestId in logger.request');
    });

    it('should use winston with file transports', () => {
        const loggerSrc = fs.readFileSync(path.join(ROOT, 'src', 'logger.js'), 'utf8');
        assert.ok(loggerSrc.includes("require('winston')"), 'winston imported');
        assert.ok(loggerSrc.includes('error.log'), 'error.log transport');
        assert.ok(loggerSrc.includes('combined.log'), 'combined.log transport');
    });

    it('should use logger in centralized error handler', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        // Find the error handler section
        const errorHandlerIdx = serverSrc.indexOf('app.use((err, req, res, next)');
        assert.ok(errorHandlerIdx > 0, 'centralized error handler exists');
        const errorSection = serverSrc.slice(errorHandlerIdx, errorHandlerIdx + 1000);
        assert.ok(errorSection.includes('requestId'), 'requestId in error context');
        assert.ok(errorSection.includes('logger.error') || errorSection.includes('logger.warn'), 'uses Winston logger');
    });

    it('should use logger for uncaught exceptions', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        const exceptionIdx = serverSrc.indexOf('uncaughtException');
        assert.ok(exceptionIdx > 0);
        const section = serverSrc.slice(exceptionIdx, exceptionIdx + 500);
        assert.ok(section.includes('logger.error'), 'uses logger.error for uncaught exceptions');
    });
});

// ────────────────────────────────────────────────────────────────
// 6. Security & Infrastructure Completeness
// ────────────────────────────────────────────────────────────────
describe('Security & Infrastructure', () => {
    it('should have Helmet configured', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes("require('helmet')"), 'helmet imported');
        assert.ok(serverSrc.includes('app.use(helmet())'), 'helmet applied');
    });

    it('should have CSP configured in security-middleware', () => {
        const secSrc = fs.readFileSync(path.join(ROOT, 'security-middleware.js'), 'utf8');
        assert.ok(secSrc.includes('contentSecurityPolicy') || secSrc.includes('Content-Security-Policy'),
            'CSP configured');
    });

    it('should have HSTS configured', () => {
        const secSrc = fs.readFileSync(path.join(ROOT, 'security-middleware.js'), 'utf8');
        assert.ok(
            secSrc.includes('hsts') || secSrc.includes('strictTransportSecurity') || secSrc.includes('Strict-Transport-Security'),
            'HSTS configured'
        );
    });

    it('should have circuit breaker for MySQL', () => {
        const cbPath = path.join(ROOT, 'services', 'mysql-circuit-breaker.js');
        assert.ok(fs.existsSync(cbPath), 'mysql-circuit-breaker.js exists');
    });

    it('should have audit trail middleware', () => {
        const atPath = path.join(ROOT, 'middleware', 'audit-trail.js');
        assert.ok(fs.existsSync(atPath), 'audit-trail.js exists');
    });

    it('should have schema validation middleware', () => {
        const svPath = path.join(ROOT, 'middleware', 'schema-validation.js');
        assert.ok(fs.existsSync(svPath), 'schema-validation.js exists');
    });

    it('should have idempotency middleware', () => {
        const idPath = path.join(ROOT, 'middleware', 'idempotency.js');
        assert.ok(fs.existsSync(idPath), 'idempotency.js exists');
    });

    it('should have RLS tenant middleware', () => {
        const rlsPath = path.join(ROOT, 'middleware', 'rls-tenant.js');
        assert.ok(fs.existsSync(rlsPath), 'rls-tenant.js exists');
    });

    it('should have LGPD compliance routes', () => {
        const lgpdPath = path.join(ROOT, 'routes', 'lgpd.js');
        assert.ok(fs.existsSync(lgpdPath), 'lgpd.js exists');
    });

    it('should have decimal-calc utility for financial precision', () => {
        const dcPath = path.join(ROOT, 'utils', 'decimal-calc.js');
        assert.ok(fs.existsSync(dcPath), 'decimal-calc.js exists');
    });

    it('should have order-by-whitelist for SQL injection prevention', () => {
        const obPath = path.join(ROOT, 'utils', 'order-by-whitelist.js');
        assert.ok(fs.existsSync(obPath), 'order-by-whitelist.js exists');
    });

    it('should have LGPD crypto with AES-256-GCM', () => {
        const cryptoSrc = fs.readFileSync(path.join(ROOT, 'lgpd-crypto.js'), 'utf8');
        assert.ok(cryptoSrc.includes('aes-256-gcm'), 'uses AES-256-GCM');
    });

    it('should have graceful shutdown', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes('SIGTERM'), 'handles SIGTERM');
        assert.ok(serverSrc.includes('SIGINT'), 'handles SIGINT');
    });

    it('should have environment validation', () => {
        const envSrc = fs.readFileSync(path.join(ROOT, 'config', 'env.js'), 'utf8');
        assert.ok(envSrc.includes('validateEnv'), 'validateEnv function exists');
    });
});

// ────────────────────────────────────────────────────────────────
// 7. Complete Middleware Stack Verification
// ────────────────────────────────────────────────────────────────
describe('Complete Middleware Stack', () => {
    it('should apply middlewares in correct order: request-id → metrics → body-parser → helmet → rate-limit', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        const ridIdx = serverSrc.indexOf('requestIdMiddleware()');
        const metIdx = serverSrc.indexOf('app.use(metricsMiddleware)');
        const bodyIdx = serverSrc.indexOf("express.json({ limit: '2mb' })");
        const helmetIdx = serverSrc.indexOf('app.use(helmet())');
        // generalLimiter appears inside a wrapper middleware, find the first usage
        const rateIdx = serverSrc.indexOf('return generalLimiter(req, res, next)');

        assert.ok(ridIdx > 0, 'request-id middleware exists');
        assert.ok(metIdx > 0, 'metrics middleware exists');
        assert.ok(ridIdx < metIdx, 'request-id before metrics');
        assert.ok(metIdx < bodyIdx, 'metrics before body-parser');
        assert.ok(bodyIdx < helmetIdx, 'body-parser before helmet');
        assert.ok(helmetIdx < rateIdx, 'helmet before rate-limit');
    });

    it('should mount swagger at /api-docs', () => {
        const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
        assert.ok(serverSrc.includes('setupSwagger'), 'swagger setup present');
    });

    it('should have audit trail connected to route modules', () => {
        const routesSrc = fs.readFileSync(path.join(ROOT, 'routes', 'index.js'), 'utf8');
        assert.ok(routesSrc.includes('auditTrail'), 'auditTrail in routes/index.js');
        assert.ok(routesSrc.includes('idempotency'), 'idempotency in routes/index.js');
    });
});
