/**
 * Migration 004 — MOD-004: Adicionar UNIQUE constraint em email
 * 
 * Garante que não existam emails duplicados nas tabelas usuarios e funcionarios.
 * Antes de aplicar a constraint, resolve duplicados (mantém o mais recente).
 * 
 * Uso: node migrations/004-unique-email-constraint.js
 */

'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
        user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'aluforce_vendas',
        waitForConnections: true,
        connectionLimit: 2
    });

    const conn = await pool.getConnection();
    console.log('🔗 Conectado ao banco de dados');

    const tables = ['usuarios', 'funcionarios'];

    for (const table of tables) {
        console.log(`\n📋 Processando tabela: ${table}`);

        // Verificar se a tabela existe
        const [tableCheck] = await conn.query(
            'SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
            [table]
        );
        if (tableCheck[0].cnt === 0) {
            console.log(`  ⏭️  Tabela ${table} não existe, pulando...`);
            continue;
        }

        // Verificar se coluna email existe
        const [colCheck] = await conn.query(
            'SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [table, 'email']
        );
        if (colCheck[0].cnt === 0) {
            console.log(`  ⏭️  Coluna email não existe em ${table}, pulando...`);
            continue;
        }

        // Verificar se UNIQUE index já existe
        const [idxCheck] = await conn.query(
            `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'email' AND NON_UNIQUE = 0`,
            [table]
        );
        if (idxCheck[0].cnt > 0) {
            console.log(`  ✅ UNIQUE index já existe em ${table}.email`);
            continue;
        }

        // Identificar duplicados
        const [dupes] = await conn.query(
            `SELECT LOWER(TRIM(email)) AS email_norm, COUNT(*) AS cnt, GROUP_CONCAT(id ORDER BY id DESC) AS ids
             FROM ${table}
             WHERE email IS NOT NULL AND email != ''
             GROUP BY email_norm
             HAVING cnt > 1`
        );

        if (dupes.length > 0) {
            console.log(`  ⚠️  Encontrados ${dupes.length} emails duplicados:`);
            for (const dupe of dupes) {
                const ids = dupe.ids.split(',').map(Number);
                const keepId = ids[0]; // manter o mais recente (maior ID)
                const removeIds = ids.slice(1);
                console.log(`    📧 ${dupe.email_norm}: IDs ${ids.join(', ')} → mantendo ${keepId}, desativando ${removeIds.join(', ')}`);

                // Em vez de deletar, marcar como inativo e adicionar sufixo ao email
                for (const rid of removeIds) {
                    await conn.query(
                        `UPDATE ${table} SET email = CONCAT(email, '_dup_', id), ativo = 0 WHERE id = ?`,
                        [rid]
                    );
                }
            }
            console.log(`  ✅ Duplicados resolvidos (desativados com sufixo _dup_)`);
        }

        // Aplicar UNIQUE constraint
        try {
            await conn.query(`ALTER TABLE ${table} ADD UNIQUE INDEX uq_email (email)`);
            console.log(`  ✅ UNIQUE constraint adicionada em ${table}.email`);
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                console.error(`  ❌ Ainda existem duplicados em ${table}.email — revise manualmente`);
            } else {
                throw e;
            }
        }
    }

    conn.release();
    await pool.end();
    console.log('\n✅ Migration 004 concluída');
}

run().catch(err => {
    console.error('❌ Erro na migration:', err);
    process.exit(1);
});
