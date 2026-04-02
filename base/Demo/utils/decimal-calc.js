/**
 * Decimal Calculation Utility — ALUFORCE ERP
 * 
 * Cálculos financeiros seguros usando aritmética de inteiros (centavos).
 * Evita problemas de precisão de ponto flutuante IEEE 754.
 * 
 * Exemplo: 0.1 + 0.2 === 0.30000000000000004 (float)
 *          add(0.1, 0.2) === 0.3 (correto)
 * 
 * Todas as funções aceitam e retornam números normais (reais),
 * mas internamente operam em centavos (inteiros) para precisão.
 */
'use strict';

const PRECISION = 2; // Casas decimais padrão (centavos)
const SCALE = Math.pow(10, PRECISION); // 100

/**
 * Converte valor real para centavos (inteiro)
 * @param {number|string} value
 * @returns {number} Valor em centavos
 */
function toCents(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;
    return Math.round(num * SCALE);
}

/**
 * Converte centavos para valor real
 * @param {number} cents
 * @returns {number}
 */
function fromCents(cents) {
    return Math.round(cents) / SCALE;
}

/**
 * Soma dois ou mais valores com precisão
 * @param {...number} values
 * @returns {number}
 */
function add(...values) {
    const total = values.reduce((sum, v) => sum + toCents(v), 0);
    return fromCents(total);
}

/**
 * Subtrai valores com precisão (a - b - c ...)
 * @param {number} base - Valor base
 * @param {...number} values - Valores a subtrair
 * @returns {number}
 */
function subtract(base, ...values) {
    const result = values.reduce((acc, v) => acc - toCents(v), toCents(base));
    return fromCents(result);
}

/**
 * Multiplica com precisão
 * @param {number} value
 * @param {number} multiplier
 * @returns {number}
 */
function multiply(value, multiplier) {
    return fromCents(Math.round(toCents(value) * multiplier));
}

/**
 * Divide com precisão
 * @param {number} value
 * @param {number} divisor
 * @returns {number}
 */
function divide(value, divisor) {
    if (divisor === 0) throw new Error('Divisão por zero');
    return fromCents(Math.round(toCents(value) / divisor));
}

/**
 * Calcula percentual de um valor
 * @param {number} value - Valor base
 * @param {number} percent - Percentual (ex: 15 para 15%)
 * @returns {number}
 */
function percent(value, pct) {
    return fromCents(Math.round(toCents(value) * pct / 100));
}

/**
 * Aplica desconto percentual
 * @param {number} value 
 * @param {number} discountPercent - ex: 10 para 10%
 * @returns {number}
 */
function applyDiscount(value, discountPercent) {
    const discountAmount = percent(value, discountPercent);
    return subtract(value, discountAmount);
}

/**
 * Distribui um valor em N parcelas iguais (tratando resto nos centavos)
 * @param {number} total - Valor total
 * @param {number} installments - Número de parcelas
 * @returns {number[]} Array de valores das parcelas
 */
function splitInstallments(total, installments) {
    if (installments <= 0) throw new Error('Número de parcelas deve ser positivo');
    const totalCents = toCents(total);
    const baseCents = Math.floor(totalCents / installments);
    const remainder = totalCents - (baseCents * installments);

    const result = [];
    for (let i = 0; i < installments; i++) {
        // Distribui o resto nas primeiras parcelas (1 centavo a mais cada)
        result.push(fromCents(baseCents + (i < remainder ? 1 : 0)));
    }
    return result;
}

/**
 * Soma um array de valores com precisão
 * @param {number[]} values
 * @returns {number}
 */
function sumArray(values) {
    if (!Array.isArray(values)) return 0;
    const total = values.reduce((sum, v) => sum + toCents(v), 0);
    return fromCents(total);
}

/**
 * Compara dois valores financeiros (com tolerância de centavo)
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
function equals(a, b) {
    return toCents(a) === toCents(b);
}

/**
 * Formata valor para exibição em BRL
 * @param {number} value
 * @returns {string}
 */
function formatBRL(value) {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

module.exports = {
    toCents,
    fromCents,
    add,
    subtract,
    multiply,
    divide,
    percent,
    applyDiscount,
    splitInstallments,
    sumArray,
    equals,
    formatBRL
};
