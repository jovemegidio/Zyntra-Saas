'use strict';

/**
 * Pool MySQL centralizado — ÚNICA FONTE de conexões do sistema.
 * Todos os módulos devem importar deste arquivo em vez de criar pools próprios.
 *
 * Uso:
 *   const pool = require('../../database/pool');
 *   const [rows] = await pool.query('SELECT 1');
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'aluforce_vendas',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 250,
    // AUDIT-FIX S1 + S4.4: Timeout e keepalive para resiliência
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
    // Idle connection cleanup
    idleTimeout: 60000
});

// ── AUDIT-FIX S4.4: Circuit Breaker simples para DB ──
let _cbFailures = 0;
let _cbState = 'closed'; // closed | open | half-open
let _cbOpenedAt = 0;
const CB_THRESHOLD = 5;       // falhas consecutivas para abrir
const CB_COOLDOWN  = 30000;   // 30s cooldown antes de half-open

const _originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async function circuitBreakerGetConnection() {
    // Se circuit está aberto, verifica cooldown
    if (_cbState === 'open') {
        if (Date.now() - _cbOpenedAt >= CB_COOLDOWN) {
            _cbState = 'half-open';
            console.log('[DB-CB] 🔄 Circuit half-open — tentando reconectar...');
        } else {
            const err = new Error('Database circuit breaker OPEN — aguarde recuperação');
            err.code = 'DB_CIRCUIT_OPEN';
            throw err;
        }
    }

    try {
        const conn = await _originalGetConnection();
        // Sucesso → reset circuit
        if (_cbFailures > 0 || _cbState !== 'closed') {
            console.log('[DB-CB] ✅ Conexão restaurada — circuit fechado');
        }
        _cbFailures = 0;
        _cbState = 'closed';
        return conn;
    } catch (err) {
        _cbFailures++;
        if (_cbFailures >= CB_THRESHOLD && _cbState !== 'open') {
            _cbState = 'open';
            _cbOpenedAt = Date.now();
            console.error(`[DB-CB] 🔴 Circuit OPEN após ${_cbFailures} falhas consecutivas — cooldown ${CB_COOLDOWN / 1000}s`);
        }
        throw err;
    }
};

// Expor estado para health-check
pool.circuitState = () => ({ state: _cbState, failures: _cbFailures });

module.exports = pool;
