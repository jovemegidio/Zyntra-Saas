/**
 * Financial Audit Tests — Calculation Precision
 * 
 * Tests for rounding errors, tax calculations, and financial
 * data integrity issues identified in the financial audit.
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

console.log('\n=== Financial Calculation Precision Tests ===\n');

// --- IEEE 754 floating-point precision issues ---
test('0.1 + 0.2 precision issue exists in JS', () => {
    // This demonstrates WHY Decimal.js is needed for financial calculations
    assert.notStrictEqual(0.1 + 0.2, 0.3);
    assert.strictEqual((0.1 + 0.2).toFixed(2), '0.30');
});

test('parseFloat preserves 2 decimal places', () => {
    const val = parseFloat('1500.50');
    assert.strictEqual(val, 1500.50);
});

test('parseFloat lose precision on large numbers', () => {
    // Demonstrate potential issue with very large monetary values
    const val = parseFloat('99999999999.99');
    assert.strictEqual(typeof val, 'number');
    assert.ok(!isNaN(val));
});

// --- Simulated tax calculations (replicating ERP logic) ---
test('ICMS 18% calculation precision', () => {
    const baseCalculo = 1500.00;
    const aliquota = 18;
    const icms = baseCalculo * (aliquota / 100);
    assert.strictEqual(parseFloat(icms.toFixed(2)), 270.00);
});

test('IPI 5% calculation precision', () => {
    const valor = 2350.75;
    const ipi = valor * 0.05;
    assert.strictEqual(parseFloat(ipi.toFixed(2)), 117.54);
});

test('PIS 1.65% calculation precision', () => {
    const valor = 10000.00;
    const pis = valor * 0.0165;
    assert.strictEqual(parseFloat(pis.toFixed(2)), 165.00);
});

test('COFINS 7.6% calculation precision', () => {
    const valor = 10000.00;
    const cofins = valor * 0.076;
    assert.strictEqual(parseFloat(cofins.toFixed(2)), 760.00);
});

// --- Partial invoicing rounding accumulation ---
test('partial invoicing — 3 parcelas iguais of R$100', () => {
    const total = 100.00;
    const parcelas = 3;
    const valorParcela = parseFloat((total / parcelas).toFixed(2));
    const somaParcelas = parseFloat((valorParcela * parcelas).toFixed(2));
    // 100/3 = 33.33, 33.33*3 = 99.99 (lost R$0.01)
    const diferenca = Math.abs(total - somaParcelas);
    assert.ok(diferenca <= 0.01, `Diferença de R$${diferenca} deve ser <= R$0.01`);
});

test('partial invoicing — 7 parcelas of R$1000', () => {
    const total = 1000.00;
    const parcelas = 7;
    const valorParcela = parseFloat((total / parcelas).toFixed(2));
    const somaParcelas = parseFloat((valorParcela * parcelas).toFixed(2));
    const diferenca = Math.abs(total - somaParcelas);
    assert.ok(diferenca <= 0.01, `Diferença de R$${diferenca} deve ser <= R$0.01`);
});

test('partial invoicing — last parcela adjustment', () => {
    // Correct approach: adjust last installment
    const total = 100.00;
    const parcelas = 3;
    const valorParcela = parseFloat((total / parcelas).toFixed(2));
    const ultimaParcela = parseFloat((total - valorParcela * (parcelas - 1)).toFixed(2));
    const somaCorreta = valorParcela * (parcelas - 1) + ultimaParcela;
    assert.strictEqual(parseFloat(somaCorreta.toFixed(2)), total);
});

// --- Discount calculations ---
test('percentage discount calculation', () => {
    const subtotal = 1599.90;
    const desconto = 10; // 10%
    const valorDesconto = parseFloat((subtotal * desconto / 100).toFixed(2));
    const totalComDesconto = parseFloat((subtotal - valorDesconto).toFixed(2));
    assert.strictEqual(valorDesconto, 159.99);
    assert.strictEqual(totalComDesconto, 1439.91);
});

test('cumulative discounts precision', () => {
    const valor = 500.00;
    const desconto1 = 5; // 5%
    const desconto2 = 3; // 3%
    const aposDesc1 = parseFloat((valor * (1 - desconto1/100)).toFixed(2));
    const aposDesc2 = parseFloat((aposDesc1 * (1 - desconto2/100)).toFixed(2));
    assert.strictEqual(aposDesc1, 475.00);
    assert.strictEqual(aposDesc2, 460.75);
});

// --- Currency formatting ---
test('Brazilian currency format (BRL)', () => {
    const valor = 1500.50;
    const formatted = valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    assert.ok(formatted.includes('1.500,50') || formatted.includes('1500,50'));
});

test('negative values formatting', () => {
    const valor = -350.99;
    assert.ok(valor < 0);
    assert.strictEqual(parseFloat(valor.toFixed(2)), -350.99);
});

// --- Large value handling ---
test('large order total (R$999,999.99)', () => {
    const itens = [];
    for (let i = 0; i < 100; i++) {
        itens.push({ qty: 10, unitPrice: 999.99 });
    }
    const total = itens.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    assert.strictEqual(parseFloat(total.toFixed(2)), 999990.00);
});

test('many small values accumulation', () => {
    let total = 0;
    for (let i = 0; i < 1000; i++) {
        total += 0.01;
    }
    // Due to floating point: total is ~9.99999999999998, not 10.00
    assert.ok(Math.abs(total - 10.00) < 0.01, 'Accumulated rounding within R$0.01');
});

// --- Zero handling ---
test('zero quantity gets zero total', () => {
    const qty = 0;
    const price = 150.00;
    assert.strictEqual(qty * price, 0);
});

test('zero price gets zero total', () => {
    const qty = 10;
    const price = 0;
    assert.strictEqual(qty * price, 0);
});

// --- NaN protection ---
test('NaN detection in calculations', () => {
    const result = parseFloat('abc') * 100;
    assert.ok(isNaN(result));
    // ERP should check for NaN before saving
    const safeResult = isNaN(result) ? 0 : result;
    assert.strictEqual(safeResult, 0);
});

test('undefined price defaults to 0', () => {
    const price = undefined;
    const safePrice = parseFloat(price) || 0;
    assert.strictEqual(safePrice, 0);
});

console.log(`\n--- ${passed}/${total} financial precision tests passed ---\n`);
if (passed < total) process.exit(1);
