/**
 * Migração LGPD: Criptografar dados PII existentes em plaintext
 * 
 * ESCOPO: Apenas dados pessoais de PESSOA NATURAL (LGPD Art. 5º, I)
 *   - CPF, PIS/PASEP: identificadores pessoais
 *   - cpf_recebedor: CPF de dependente/recebedor de pensão
 * 
 * FORA DO ESCOPO (motivos):
 *   - CNPJ: dado de pessoa jurídica, não é "dado pessoal" sob LGPD.
 *           Além disso, é usado em WHERE/LIKE para buscas — criptografar quebraria a aplicação.
 *   - Salário: dado sensível mas numérico, usado em cálculos SQL (SUM, AVG).
 *           Protegido via controle de acesso + audit trail.
 *
 * Tabelas e campos afetados:
 *   - funcionarios: cpf, pis_pasep
 *   - rh_pensao_alimenticia: cpf_recebedor
 *   - rh_sf_dependentes: cpf
 *
 * IMPORTANTE:
 *   - Requer PII_ENCRYPTION_KEY definida no ambiente
 *   - Executa em lotes de 100 registros para não sobrecarregar o banco
 *   - Dados já criptografados (prefixo ENC:) são ignorados
 *
 * Uso:
 *   NODE_ENV=production PII_ENCRYPTION_KEY=<sua-chave-32+> node migrations/003-encrypt-existing-pii.js
 */

const mysql = require('mysql2/promise');

// Carregar configuração do banco
let dbConfig;
try {
    const envConfig = require('../config/env');
    dbConfig = {
        host: process.env.DB_HOST || envConfig.DB_HOST || 'localhost',
        user: process.env.DB_USER || envConfig.DB_USER || 'root',
        password: process.env.DB_PASSWORD || envConfig.DB_PASSWORD || '',
        database: process.env.DB_NAME || envConfig.DB_NAME || 'aluforce_vendas',
        port: Number(process.env.DB_PORT || envConfig.DB_PORT || 3306),
    };
} catch {
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aluforce_vendas',
        port: Number(process.env.DB_PORT || 3306),
    };
}

const { encryptPII } = require('../lgpd-crypto');

// Validar que a chave de criptografia existe
if (!process.env.PII_ENCRYPTION_KEY && !process.env.JWT_SECRET) {
    console.error('❌ FATAL: PII_ENCRYPTION_KEY ou JWT_SECRET deve estar definida.');
    console.error('   Use: PII_ENCRYPTION_KEY=<chave-32-chars-min> node migrations/003-encrypt-existing-pii.js');
    process.exit(1);
}

const BATCH_SIZE = 100;

/**
 * Definição das tabelas e campos a criptografar.
 * salary_fields são convertidos de número para string antes de criptografar.
 */
const TABLES = [
    {
        table: 'funcionarios',
        fields: ['cpf', 'pis_pasep'],
        salary_fields: [],
    },
    {
        table: 'rh_pensao_alimenticia',
        fields: ['cpf_recebedor'],
        salary_fields: [],
    },
    {
        table: 'rh_sf_dependentes',
        fields: ['cpf'],
        salary_fields: [],
    },
];

async function tableExists(conn, tableName) {
    const [rows] = await conn.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
        [tableName]
    );
    return rows[0].cnt > 0;
}

async function columnExists(conn, tableName, columnName) {
    const [rows] = await conn.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [tableName, columnName]
    );
    return rows[0].cnt > 0;
}

async function encryptTable(conn, { table, fields, salary_fields }) {
    if (!(await tableExists(conn, table))) {
        console.log(`  ⏭️  Tabela ${table} não existe — pulando`);
        return { table, encrypted: 0, skipped: 0 };
    }

    // Filtrar apenas colunas que existem
    const validFields = [];
    for (const f of fields) {
        if (await columnExists(conn, table, f)) validFields.push(f);
        else console.log(`  ⏭️  Coluna ${table}.${f} não existe — pulando`);
    }
    const validSalaryFields = [];
    for (const f of salary_fields) {
        if (await columnExists(conn, table, f)) validSalaryFields.push(f);
        else console.log(`  ⏭️  Coluna ${table}.${f} não existe — pulando`);
    }

    const allFields = [...validFields, ...validSalaryFields];
    if (allFields.length === 0) {
        console.log(`  ⏭️  Nenhuma coluna válida para ${table} — pulando`);
        return { table, encrypted: 0, skipped: 0 };
    }

    // Selecionar todos os registros que tenham pelo menos um campo não-nulo e não-criptografado
    const whereClauses = allFields.map(f => `(${f} IS NOT NULL AND ${f} != '' AND ${f} NOT LIKE 'ENC:%')`);
    const selectQuery = `SELECT id, ${allFields.join(', ')} FROM \`${table}\` WHERE ${whereClauses.join(' OR ')}`;
    
    const [rows] = await conn.query(selectQuery);
    
    let encrypted = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
            const updates = [];
            const values = [];
            let hasChange = false;

            for (const field of validFields) {
                const val = row[field];
                if (val && typeof val === 'string' && val.trim() !== '' && !val.startsWith('ENC:')) {
                    updates.push(`${field} = ?`);
                    values.push(encryptPII(val));
                    hasChange = true;
                }
            }

            for (const field of validSalaryFields) {
                const val = row[field];
                if (val !== null && val !== undefined && val !== '') {
                    const strVal = String(val);
                    if (!strVal.startsWith('ENC:')) {
                        updates.push(`${field} = ?`);
                        values.push(encryptPII(strVal));
                        hasChange = true;
                    }
                }
            }

            if (hasChange) {
                values.push(row.id);
                await conn.query(`UPDATE \`${table}\` SET ${updates.join(', ')} WHERE id = ?`, values);
                encrypted++;
            } else {
                skipped++;
            }
        }

        if (i + BATCH_SIZE < rows.length) {
            process.stdout.write(`  📦 ${table}: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} processados\r`);
        }
    }

    return { table, encrypted, skipped };
}

async function run() {
    console.log('🔐 Migração LGPD: Criptografia retroativa de PII');
    console.log('=' .repeat(55));
    console.log(`📊 Tabelas a processar: ${TABLES.length}`);
    console.log(`🔑 Chave: ${process.env.PII_ENCRYPTION_KEY ? 'PII_ENCRYPTION_KEY' : 'JWT_SECRET'}`);
    console.log('');

    const conn = await mysql.createConnection(dbConfig);
    const results = [];

    try {
        for (const tableDef of TABLES) {
            console.log(`\n🔄 Processando: ${tableDef.table}`);
            const result = await encryptTable(conn, tableDef);
            results.push(result);
            console.log(`  ✅ ${result.encrypted} registros criptografados, ${result.skipped} já estavam criptografados`);
        }

        console.log('\n' + '='.repeat(55));
        console.log('📋 RESUMO DA MIGRAÇÃO');
        console.log('='.repeat(55));
        
        let totalEncrypted = 0;
        let totalSkipped = 0;
        for (const r of results) {
            console.log(`  ${r.table}: ${r.encrypted} criptografados, ${r.skipped} pulados`);
            totalEncrypted += r.encrypted;
            totalSkipped += r.skipped;
        }
        
        console.log('');
        console.log(`  TOTAL: ${totalEncrypted} registros criptografados, ${totalSkipped} pulados`);
        console.log('\n✅ Migração concluída com sucesso!');
    } catch (err) {
        console.error('\n❌ Erro durante a migração:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

run();
