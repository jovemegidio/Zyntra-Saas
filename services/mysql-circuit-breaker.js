/**
 * MySQL Circuit Breaker — ALUFORCE ERP
 * 
 * Wraps the MySQL pool with a circuit breaker pattern to prevent
 * cascade failures when the database is unavailable.
 * 
 * States: CLOSED (normal) → OPEN (DB down, fail fast) → HALF_OPEN (testing)
 * 
 * Usage:
 *   const { createMySQLBreaker } = require('./services/mysql-circuit-breaker');
 *   const dbBreaker = createMySQLBreaker(pool);
 *   const [rows] = await dbBreaker.query('SELECT * FROM users WHERE id = ?', [1]);
 */
'use strict';

const EventEmitter = require('events');

class MySQLCircuitBreaker extends EventEmitter {
    constructor(pool, options = {}) {
        super();
        this.pool = pool;
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeoutMs = options.resetTimeoutMs || 30000; // 30s
        this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 2;
        this.monitorIntervalMs = options.monitorIntervalMs || 15000; // 15s

        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.halfOpenAttempts = 0;
        this.stats = { total: 0, success: 0, failure: 0, rejected: 0 };

        // Periodic health check when circuit is OPEN
        this._monitorTimer = setInterval(() => this._healthCheck(), this.monitorIntervalMs);
        this._monitorTimer.unref();
    }

    /**
     * Execute a query through the circuit breaker
     * @param {string} sql 
     * @param {any[]} params 
     * @returns {Promise<any>}
     */
    async query(sql, params) {
        this.stats.total++;

        if (this.state === 'OPEN') {
            // Check if enough time has passed to try half-open
            if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
                this.state = 'HALF_OPEN';
                this.halfOpenAttempts = 0;
                this.emit('halfOpen');
            } else {
                this.stats.rejected++;
                throw new Error('Banco de dados temporariamente indisponível (circuit breaker OPEN). Tente novamente em instantes.');
            }
        }

        if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
            this.stats.rejected++;
            throw new Error('Banco de dados em teste de recuperação. Tente novamente em instantes.');
        }

        try {
            const result = await this.pool.query(sql, params);
            this._onSuccess();
            return result;
        } catch (err) {
            this._onFailure(err);
            throw err;
        }
    }

    /**
     * Execute a prepared statement through the circuit breaker
     */
    async execute(sql, params) {
        this.stats.total++;

        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
                this.state = 'HALF_OPEN';
                this.halfOpenAttempts = 0;
                this.emit('halfOpen');
            } else {
                this.stats.rejected++;
                throw new Error('Banco de dados temporariamente indisponível (circuit breaker OPEN).');
            }
        }

        try {
            const result = this.pool.execute ? await this.pool.execute(sql, params) : await this.pool.query(sql, params);
            this._onSuccess();
            return result;
        } catch (err) {
            this._onFailure(err);
            throw err;
        }
    }

    _onSuccess() {
        this.stats.success++;
        if (this.state === 'HALF_OPEN') {
            this.halfOpenAttempts++;
            if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
                this.state = 'CLOSED';
                this.failureCount = 0;
                this.emit('close');
                console.log('[DB-CB] ✅ Circuit breaker CLOSED — banco recuperado');
            }
        } else {
            this.failureCount = Math.max(0, this.failureCount - 1); // Slowly recover
        }
    }

    _onFailure(err) {
        this.stats.failure++;
        // Only count connection/fatal errors, not query syntax errors
        const isConnectionError = err.code === 'ECONNREFUSED' || 
                                   err.code === 'PROTOCOL_CONNECTION_LOST' ||
                                   err.code === 'ER_CON_COUNT_ERROR' ||
                                   err.code === 'ENOTFOUND' ||
                                   err.code === 'ETIMEDOUT' ||
                                   err.message?.includes('timeout') ||
                                   err.fatal === true;

        if (!isConnectionError) return;

        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.emit('open', err);
            console.error('[DB-CB] ❌ Circuit breaker OPEN — banco falhou durante recovery');
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.emit('open', err);
            console.error(`[DB-CB] ❌ Circuit breaker OPEN — ${this.failureCount} falhas consecutivas`);
        }
    }

    async _healthCheck() {
        if (this.state !== 'OPEN') return;
        if (Date.now() - this.lastFailureTime < this.resetTimeoutMs) return;

        try {
            await this.pool.query('SELECT 1');
            this.state = 'HALF_OPEN';
            this.halfOpenAttempts = 1; // Count health check as one success
            this.emit('halfOpen');
            console.log('[DB-CB] 🔄 Health check passou — circuit breaker HALF_OPEN');
        } catch (e) {
            this.lastFailureTime = Date.now();
        }
    }

    getStatus() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            stats: { ...this.stats },
            lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null
        };
    }

    destroy() {
        if (this._monitorTimer) clearInterval(this._monitorTimer);
    }
}

function createMySQLBreaker(pool, options) {
    return new MySQLCircuitBreaker(pool, options);
}

module.exports = { MySQLCircuitBreaker, createMySQLBreaker };
