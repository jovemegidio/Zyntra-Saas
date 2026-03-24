/**
 * Security Audit Tests — Password & Auth Validation
 * 
 * Tests password strength validation and PII sanitization.
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

console.log('\n=== Password & Auth Validation Tests ===\n');

const { validatePasswordStrength } = require('../../utils/password-validator');

// --- SQL injection via password field ---
test('password with SQL injection rejected for being weak', () => {
    const r = validatePasswordStrength("' OR 1=1 --");
    assert.strictEqual(r.valid, false);
});

test('password with DROP TABLE rejected', () => {
    const r = validatePasswordStrength("x'; DROP TABLE users;--");
    assert.strictEqual(r.valid, false);
});

// --- Edge cases ---
test('password null returns invalid', () => {
    const r = validatePasswordStrength(null);
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.length > 0);
});

test('password undefined returns invalid', () => {
    const r = validatePasswordStrength(undefined);
    assert.strictEqual(r.valid, false);
});

test('password empty string returns invalid', () => {
    const r = validatePasswordStrength('');
    assert.strictEqual(r.valid, false);
});

test('password with only whitespace rejected', () => {
    const r = validatePasswordStrength('          ');
    assert.strictEqual(r.valid, false);
});

test('password boolean false rejected', () => {
    const r = validatePasswordStrength(false);
    assert.strictEqual(r.valid, false);
});

test('password number 0 rejected', () => {
    const r = validatePasswordStrength(0);
    assert.strictEqual(r.valid, false);
});

// --- Minimum requirements ---
test('9 chars rejected (below minimum 10)', () => {
    const r = validatePasswordStrength('Abc1!efgh');
    assert.strictEqual(r.valid, false);
});

test('10 chars accepted (minimum)', () => {
    const r = validatePasswordStrength('Abc1!efghi');
    assert.strictEqual(r.valid, true);
});

test('no uppercase rejected', () => {
    const r = validatePasswordStrength('abcdefgh1!@#');
    assert.strictEqual(r.valid, false);
});

test('no lowercase rejected', () => {
    const r = validatePasswordStrength('ABCDEFGH1!@#');
    assert.strictEqual(r.valid, false);
});

test('no number rejected', () => {
    const r = validatePasswordStrength('Abcdefgh!@#&');
    assert.strictEqual(r.valid, false);
});

test('no special char rejected', () => {
    const r = validatePasswordStrength('Abcdefgh1234');
    assert.strictEqual(r.valid, false);
});

// --- Common passwords ---
test('Password123! rejected as common', () => {
    const r = validatePasswordStrength('Password123!');
    assert.strictEqual(r.valid, false);
});

test('Aluforce keyword rejected', () => {
    const r = validatePasswordStrength('Aluforce1!xx');
    assert.strictEqual(r.valid, false);
});

// --- Valid passwords ---
test('strong password accepted', () => {
    const r = validatePasswordStrength('Str0ng!Pass#99');
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.errors.length, 0);
});

test('strong password with unicode accepted', () => {
    const r = validatePasswordStrength('Str0ng!Pássw€rd');
    assert.strictEqual(r.valid, true);
});

test('long strong password accepted', () => {
    const r = validatePasswordStrength('MyV€ry$tr0ng&L0ngP@ssword2026!');
    assert.strictEqual(r.valid, true);
});

// --- PII Sanitizer ---
console.log('\n--- PII Sanitizer Tests ---\n');

const { sanitizePII, PII_PATTERNS } = require('../../utils/pii-sanitizer');

test('sanitizePII masks CPF', () => {
    const result = sanitizePII('CPF: 123.456.789-00');
    assert.ok(!result.includes('123.456.789-00'));
    assert.ok(result.includes('***'));
});

test('sanitizePII masks email', () => {
    const result = sanitizePII('Email: admin@aluforce.com');
    assert.ok(!result.includes('admin@aluforce.com'));
});

test('sanitizePII masks phone', () => {
    const result = sanitizePII('Fone: (11) 98765-4321');
    assert.ok(!result.includes('98765-4321'));
});

test('sanitizePII preserves non-PII text', () => {
    const result = sanitizePII('Pedido #12345 aprovado');
    assert.ok(result.includes('Pedido'));
    assert.ok(result.includes('12345'));
});

test('PII_PATTERNS has expected patterns', () => {
    assert.ok(PII_PATTERNS, 'PII_PATTERNS should exist');
    assert.ok(Object.keys(PII_PATTERNS).length >= 3, 'should have at least 3 patterns');
});

console.log(`\n--- ${passed}/${total} password & auth tests passed ---\n`);
if (passed < total) process.exit(1);
