/**
 * Security Audit Tests — Input Sanitization
 * 
 * Tests the security-middleware.js sanitization functions
 * against XSS, command injection, and other malicious inputs.
 */
const assert = require('assert');

let passed = 0;
let total = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        console.log(`  PASS: ${name}`);
        passed++;
    } catch (e) {
        console.log(`  FAIL: ${name} — ${e.message}`);
    }
}

console.log('\n=== Input Sanitization Tests ===\n');

const {
    sanitizeHTML,
    sanitizeObject,
    validateRequired,
    validateEmail,
    validateCpfCnpj,
    validateSqlColumn
} = require('../../security-middleware');

// --- sanitizeHTML ---
test('sanitizeHTML removes script tags', () => {
    const result = sanitizeHTML('<script>alert("xss")</script>text');
    assert.ok(!result.includes('<script>'));
});

test('sanitizeHTML removes onerror attributes', () => {
    const result = sanitizeHTML('<img onerror="alert(1)" src="x">');
    assert.ok(!result.includes('onerror'));
});

test('sanitizeHTML handles null gracefully', () => {
    const result = sanitizeHTML(null);
    assert.strictEqual(result, '');
});

test('sanitizeHTML handles undefined', () => {
    const result = sanitizeHTML(undefined);
    assert.strictEqual(result, '');
});

test('sanitizeHTML handles number input', () => {
    const result = sanitizeHTML(42);
    assert.strictEqual(result, '42');
});

test('sanitizeHTML escapes < and >', () => {
    const result = sanitizeHTML('<b>bold</b>');
    assert.ok(!result.includes('<b>'));
});

test('sanitizeHTML preserves normal text', () => {
    const result = sanitizeHTML('Hello World');
    assert.strictEqual(result, 'Hello World');
});

test('sanitizeHTML handles encoded XSS', () => {
    const result = sanitizeHTML('&#60;script&#62;alert(1)&#60;/script&#62;');
    assert.ok(!result.includes('<script>'));
});

// --- sanitizeObject ---
test('sanitizeObject sanitizes nested strings', () => {
    const obj = {
        name: '<script>alert(1)</script>',
        nested: { value: '<img onerror=alert(1)>' }
    };
    const result = sanitizeObject(obj);
    assert.ok(!JSON.stringify(result).includes('<script>'));
});

test('sanitizeObject preserves numbers', () => {
    const obj = { amount: 1500.50, count: 42 };
    const result = sanitizeObject(obj);
    assert.strictEqual(result.amount, 1500.50);
    assert.strictEqual(result.count, 42);
});

test('sanitizeObject preserves booleans', () => {
    const obj = { active: true, deleted: false };
    const result = sanitizeObject(obj);
    assert.strictEqual(result.active, true);
    assert.strictEqual(result.deleted, false);
});

test('sanitizeObject handles empty object', () => {
    const result = sanitizeObject({});
    assert.deepStrictEqual(result, {});
});

test('sanitizeObject handles null', () => {
    const result = sanitizeObject(null);
    assert.strictEqual(result, null);
});

// --- validateRequired ---
test('validateRequired rejects missing fields', () => {
    const body = { name: 'Test' };
    const result = validateRequired(body, ['name', 'email']);
    assert.ok(result !== null);
    assert.ok(result.includes('email'));
});

test('validateRequired accepts all fields present', () => {
    const body = { name: 'Test', email: 'a@b.com' };
    const result = validateRequired(body, ['name', 'email']);
    assert.strictEqual(result, null);
});

test('validateRequired rejects empty string', () => {
    const body = { name: '' };
    const result = validateRequired(body, ['name']);
    assert.ok(result !== null);
});

// --- validateEmail ---
test('validateEmail (middleware) rejects XSS in email', () => {
    const result = validateEmail('<script>@test.com');
    assert.strictEqual(result, false);
});

test('validateEmail (middleware) accepts valid email', () => {
    const result = validateEmail('user@example.com');
    assert.strictEqual(result, true);
});

test('validateEmail (middleware) rejects empty', () => {
    const result = validateEmail('');
    assert.strictEqual(result, false);
});

// --- validateCpfCnpj ---
test('validateCpfCnpj rejects all same digits CPF', () => {
    const result = validateCpfCnpj('11111111111');
    assert.strictEqual(result, false);
});

test('validateCpfCnpj rejects too short', () => {
    const result = validateCpfCnpj('123');
    assert.strictEqual(result, false);
});

test('validateCpfCnpj rejects letters', () => {
    const result = validateCpfCnpj('abcdefghijk');
    assert.strictEqual(result, false);
});

test('validateCpfCnpj rejects SQL injection', () => {
    const result = validateCpfCnpj("'; DROP TABLE");
    assert.strictEqual(result, false);
});

// --- validateSqlColumn ---
test('validateSqlColumn rejects SQL keywords', () => {
    const result = validateSqlColumn('DROP TABLE users');
    assert.strictEqual(result, false);
});

test('validateSqlColumn rejects semicolons', () => {
    const result = validateSqlColumn('id; --');
    assert.strictEqual(result, false);
});

test('validateSqlColumn accepts valid column', () => {
    const result = validateSqlColumn('nome_completo');
    assert.strictEqual(result, true);
});

test('validateSqlColumn accepts column with underscore', () => {
    const result = validateSqlColumn('created_at');
    assert.strictEqual(result, true);
});

console.log(`\n--- ${passed}/${total} input sanitization tests passed ---\n`);
if (passed < total) process.exit(1);
