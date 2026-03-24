/**
 * Financial Math Utility — Decimal.js wrapper for precise monetary arithmetic
 * Prevents IEEE 754 floating-point errors in financial calculations (e.g., 0.1 + 0.2 ≠ 0.3)
 * @module services/financial-math
 */
const Decimal = require('decimal.js');

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/** Sum multiple values with arbitrary precision, return Number rounded to 2 decimals */
function safeAdd(...values) {
    return values
        .reduce((acc, v) => acc.plus(new Decimal(v || 0)), new Decimal(0))
        .toDecimalPlaces(2)
        .toNumber();
}

/** Subtract b from a, return Number rounded to 2 decimals */
function safeSub(a, b) {
    return new Decimal(a || 0).minus(new Decimal(b || 0)).toDecimalPlaces(2).toNumber();
}

/** Multiply values, return Number rounded to 2 decimals */
function safeMul(...values) {
    return values
        .reduce((acc, v) => acc.times(new Decimal(v || 0)), new Decimal(1))
        .toDecimalPlaces(2)
        .toNumber();
}

/** Divide a by b, return Number rounded to 2 decimals */
function safeDiv(a, b) {
    if (!b || Number(b) === 0) return 0;
    return new Decimal(a || 0).div(new Decimal(b)).toDecimalPlaces(2).toNumber();
}

/** Multiply value by percentage (e.g. 1000, 2 → 20.00), return Number rounded to 2 decimals */
function pct(value, percentage) {
    return new Decimal(value || 0).times(new Decimal(percentage || 0)).div(100).toDecimalPlaces(2).toNumber();
}

/** Convert value to integer cents (e.g. 149.99 → 14999) — for barcode/boleto fields */
function toCents(value) {
    return new Decimal(value || 0).times(100).round().toNumber();
}

/** Compare: a >= b with precision */
function gte(a, b) {
    return new Decimal(a || 0).gte(new Decimal(b || 0));
}

/** Absolute value rounded to 2 decimals */
function safeAbs(value) {
    return new Decimal(value || 0).abs().toDecimalPlaces(2).toNumber();
}

/** Round value to N decimal places (default 2) */
function toFixed(value, dp = 2) {
    return new Decimal(value || 0).toDecimalPlaces(dp).toNumber();
}

module.exports = { safeAdd, safeSub, safeMul, safeDiv, pct, toCents, gte, safeAbs, toFixed };
