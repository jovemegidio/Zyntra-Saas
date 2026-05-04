/**
 * Migration 002: Mover 2FA de whitelist hardcoded para banco de dados
 * 
 * ANTES:  Lista de emails hardcoded em auth.js e auth-rbac.js
 * DEPOIS: Coluna `two_factor_enabled` na tabela usuarios (controlada pelo admin no painel)
 * 
 * - Adiciona coluna `two_factor_enabled` (TINYINT, default 0)
 * - Popula com os emails que estavam na whitelist antes
 * - Mantém compatibilidade com `two_factor_disabled` (que já existia)
 * 
 * Executar: node migrations/002-2fa-database-driven.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || 'aluforce_vendas',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};

// Emails que estavam na whitelist hardcoded (produção)
const WHITELIST_EMAILS = [
    'ti@aluforce.ind.br',
    'pcp@aluforce.ind.br',
    'rh@aluforce.ind.br',
    'augusto.santos@aluforce.ind.br',
    'vendas4@aluforce.ind.br',
    'financeiro2@aluforce.ind.br',
    'financeiro3@aluforce.ind.br',
    'adm@aluforce.ind.br',
    'compras@aluforce.ind.br',
    'aluforce@aluforce.ind.br'
];

async function runMigration() {
    let connection;

    try {
        console.log('Migration 002: 2FA Database-Driven');
        console.log('='.repeat(60));

        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Conectado ao banco de dados');

        // 1. Adicionar coluna two_factor_enabled (se não existir)
        console.log('\n1. Verificando coluna two_factor_enabled...');
        const [cols] = await connection.query(
            "SHOW COLUMNS FROM usuarios LIKE 'two_factor_enabled'"
        );

        if (cols.length === 0) {
            await connection.query(
                'ALTER TABLE usuarios ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0'
            );
            console.log('   Coluna two_factor_enabled criada com sucesso');
        } else {
            console.log('   Coluna two_factor_enabled já existe');
        }

        // 2. Garantir que two_factor_disabled também existe (compatibilidade)
        console.log('\n2. Verificando coluna two_factor_disabled...');
        const [colsDisabled] = await connection.query(
            "SHOW COLUMNS FROM usuarios LIKE 'two_factor_disabled'"
        );

        if (colsDisabled.length === 0) {
            await connection.query(
                'ALTER TABLE usuarios ADD COLUMN two_factor_disabled TINYINT(1) NOT NULL DEFAULT 0'
            );
            console.log('   Coluna two_factor_disabled criada');
        } else {
            console.log('   Coluna two_factor_disabled já existe');
        }

        // 3. Popular two_factor_enabled para os emails da whitelist
        console.log('\n3. Ativando 2FA para emails da whitelist anterior...');
        let ativados = 0;
        let naoEncontrados = [];

        for (const email of WHITELIST_EMAILS) {
            const [result] = await connection.query(
                'UPDATE usuarios SET two_factor_enabled = 1 WHERE LOWER(TRIM(email)) = ? AND two_factor_enabled = 0',
                [email.toLowerCase().trim()]
            );
            if (result.affectedRows > 0) {
                ativados++;
                console.log('   [ATIVADO] ' + email);
            } else {
                // Verificar se o usuario existe
                const [exists] = await connection.query(
                    'SELECT id, two_factor_enabled FROM usuarios WHERE LOWER(TRIM(email)) = ?',
                    [email.toLowerCase().trim()]
                );
                if (exists.length === 0) {
                    naoEncontrados.push(email);
                    console.log('   [NÃO ENCONTRADO] ' + email);
                } else {
                    console.log('   [JÁ ATIVO] ' + email);
                }
            }
        }

        // 4. Resumo
        console.log('\n' + '='.repeat(60));
        console.log('RESUMO DA MIGRAÇÃO');
        console.log('='.repeat(60));
        console.log('   Emails na whitelist:    ' + WHITELIST_EMAILS.length);
        console.log('   Ativados agora:         ' + ativados);
        console.log('   Não encontrados no DB:  ' + naoEncontrados.length);
        if (naoEncontrados.length > 0) {
            console.log('   Emails não encontrados:');
            naoEncontrados.forEach(e => console.log('     - ' + e));
        }

        // 5. Verificar estado final
        const [total2fa] = await connection.query(
            'SELECT COUNT(*) as cnt FROM usuarios WHERE two_factor_enabled = 1'
        );
        console.log('\n   Total usuarios com 2FA ativo: ' + total2fa[0].cnt);

        console.log('\nMigracao concluida com sucesso!');
        console.log('Agora o 2FA e controlado pela coluna `two_factor_enabled` no banco.');
        console.log('O admin pode ativar/desativar 2FA pelo painel sem alterar codigo.');

    } catch (error) {
        console.error('Erro na migracao:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
