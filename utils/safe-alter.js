/**
 * Safe ALTER TABLE utilities for MySQL 8.0
 * MySQL 8.0 does NOT support ADD COLUMN IF NOT EXISTS syntax (MariaDB only)
 * These helpers check before altering to avoid errors.
 */
'use strict';

async function safeAddColumn(pool, table, column, definition) {
    const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (cols.length === 0) {
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        return true;
    }
    return false;
}

async function safeAddIndex(pool, table, indexName, columns) {
    const [indexes] = await pool.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
    if (indexes.length === 0) {
        await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`);
        return true;
    }
    return false;
}

module.exports = { safeAddColumn, safeAddIndex };
