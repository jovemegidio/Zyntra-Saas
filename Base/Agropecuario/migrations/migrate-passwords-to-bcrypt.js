/**
 * Script de Migração em Massa: Plaintext → Bcrypt
 * Due Diligence Fix - 2026-02-15
 * 
 * Migra TODAS as senhas plaintext de funcionarios para bcrypt hash.
 * Executar: node migrations/migrate-passwords-to-bcrypt.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'aluforce_vendas',
        connectionLimit: 5
    });

    console.log('🔒 Migração de Senhas Plaintext → Bcrypt');
    console.log('========================================\n');

    try {
        // 1. Buscar funcionários com senha plaintext
        const [funcionarios] = await pool.query(
            "SELECT id, email, senha FROM funcionarios WHERE senha NOT LIKE '$2a$%' AND senha NOT LIKE '$2b$%' AND senha NOT LIKE '$2y$%' AND senha IS NOT NULL AND senha != ''"
        );

        console.log(`📋 Encontrados ${funcionarios.length} funcionários com senha plaintext\n`);

        let migrated = 0;
        let errors = 0;

        for (const func of funcionarios) {
            try {
                const hash = await bcrypt.hash(func.senha, 12);
                await pool.query(
                    'UPDATE funcionarios SET senha = ?, senha_texto = NULL WHERE id = ?',
                    [hash, func.id]
                );
                console.log(`  ✅ ID ${func.id} (${func.email}) - migrado para bcrypt`);
                migrated++;
            } catch (err) {
                console.error(`  ❌ ID ${func.id} (${func.email}) - ERRO: ${err.message}`);
                errors++;
            }
        }

        console.log('\n========================================');
        console.log(`✅ Migrados: ${migrated}`);
        console.log(`❌ Erros: ${errors}`);
        console.log(`📊 Total processado: ${funcionarios.length}`);

        // 2. Verificação final
        const [remaining] = await pool.query(
            "SELECT COUNT(*) as count FROM funcionarios WHERE senha NOT LIKE '$2a$%' AND senha NOT LIKE '$2b$%' AND senha NOT LIKE '$2y$%' AND senha IS NOT NULL AND senha != ''"
        );
        
        if (remaining[0].count === 0) {
            console.log('\n🎉 SUCESSO: Todas as senhas foram migradas para bcrypt!');
        } else {
            console.log(`\n⚠️  ATENÇÃO: ${remaining[0].count} senhas ainda em plaintext`);
        }

    } catch (err) {
        console.error('❌ Erro fatal:', err);
    } finally {
        await pool.end();
    }
}

migratePasswords();
