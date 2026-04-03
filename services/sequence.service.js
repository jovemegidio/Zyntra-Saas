'use strict';

/**
 * Sequence Service — Geração atômica de números sequenciais.
 * Usa tabela `sequences` com FOR UPDATE para garantir unicidade
 * mesmo sob alta concorrência.
 *
 * Uso:
 *   const { nextVal } = require('./sequence.service');
 *   const num = await nextVal(pool, 'nfe');  // retorna inteiro
 */

/**
 * Garante que a tabela sequences existe (idempotente).
 * Chamar uma vez na inicialização do app.
 */
async function ensureTable(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sequences (
            seq_name VARCHAR(50) PRIMARY KEY,
            current_val BIGINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    `);
}

/**
 * Retorna o próximo valor da sequência de forma atômica.
 * Usa SELECT ... FOR UPDATE dentro de transaction para evitar race conditions.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} seqName - Nome da sequência (ex: 'nfe', 'pedido_op')
 * @param {import('mysql2/promise').PoolConnection} [existingConn] - Conexão existente (para usar dentro de transaction maior)
 * @returns {Promise<number>}
 */
async function nextVal(pool, seqName, existingConn) {
    const conn = existingConn || await pool.getConnection();
    const ownConnection = !existingConn;
    try {
        if (ownConnection) await conn.beginTransaction();

        // Tentar obter o registro com lock exclusivo
        const [rows] = await conn.query(
            'SELECT current_val FROM sequences WHERE seq_name = ? FOR UPDATE',
            [seqName]
        );

        let nextValue;
        if (rows.length === 0) {
            // Criar sequência com valor inicial 1
            nextValue = 1;
            await conn.query(
                'INSERT INTO sequences (seq_name, current_val) VALUES (?, ?)',
                [seqName, nextValue]
            );
        } else {
            nextValue = rows[0].current_val + 1;
            await conn.query(
                'UPDATE sequences SET current_val = ? WHERE seq_name = ?',
                [nextValue, seqName]
            );
        }

        if (ownConnection) await conn.commit();
        return nextValue;
    } catch (err) {
        if (ownConnection) await conn.rollback();
        throw err;
    } finally {
        if (ownConnection) conn.release();
    }
}

module.exports = { ensureTable, nextVal };
