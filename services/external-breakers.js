/**
 * EXTERNAL SERVICES — Circuit breakers for outbound calls
 * AUDIT-FIX RES-001: Wrap external calls (SMTP, Discord, n8n, SEFAZ) with circuit breakers
 * 
 * Usage:
 *   const { smtpBreaker, discordBreaker, n8nBreaker } = require('./external-breakers');
 *   await smtpBreaker.execute(() => transporter.sendMail(opts));
 * 
 * @module services/external-breakers
 */
'use strict';

const { CircuitBreaker } = require('./resilience');

// SMTP — email sending (tolerant: 3 failures before opening)
const smtpBreaker = new CircuitBreaker({
    name: 'smtp',
    failureThreshold: 3,
    resetTimeout: 60000,  // 1 min cooldown
    callTimeout: 10000    // CHAOS-FIX NET-005: 10s per-call timeout
});

// Discord — webhook notifications (tolerant: 5 failures)
const discordBreaker = new CircuitBreaker({
    name: 'discord',
    failureThreshold: 5,
    resetTimeout: 120000, // 2 min cooldown
    callTimeout: 8000     // CHAOS-FIX NET-005: 8s per-call timeout
});

// n8n — workflow automation (tolerant: 3 failures)
const n8nBreaker = new CircuitBreaker({
    name: 'n8n',
    failureThreshold: 3,
    resetTimeout: 60000,  // 1 min cooldown
    callTimeout: 15000    // CHAOS-FIX NET-005: 15s per-call timeout
});

// SEFAZ — NF-e emission (tolerant: 2 failures, longer cooldown)
const sefazBreaker = new CircuitBreaker({
    name: 'sefaz',
    failureThreshold: 2,
    resetTimeout: 180000, // 3 min cooldown
    callTimeout: 30000    // CHAOS-FIX NET-005: 30s per-call timeout (SEFAZ is slow)
});

/**
 * Get status of all circuit breakers
 */
function getAllBreakerStates() {
    return {
        smtp: smtpBreaker.getState(),
        discord: discordBreaker.getState(),
        n8n: n8nBreaker.getState(),
        sefaz: sefazBreaker.getState()
    };
}

module.exports = {
    smtpBreaker,
    discordBreaker,
    n8nBreaker,
    sefazBreaker,
    getAllBreakerStates
};
