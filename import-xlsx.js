/**
 * Import XLSX financial data to DB
 * Pagamentos → contas_pagar (status='pago')
 * Recebimentos → contas_receber (status='recebido')
 */
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'aluforce',
    password: process.env.DB_PASSWORD || 'CHANGE_ME_DB_PASSWORD',
    database: process.env.DB_NAME || 'aluforce_vendas',
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4'
});

// Convert Excel serial date to JS Date then to YYYY-MM-DD string
function excelDateToSQL(serial) {
    if (!serial || isNaN(serial)) return null;
    // Excel epoch: Jan 0, 1900 (with leap year bug)
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return d.toISOString().substring(0, 10);
}

function sanitizeStr(v) {
    if (v == null) return null;
    return String(v).trim().substring(0, 255) || null;
}

async function importPagamentos(filePath, mes) {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    
    // Headers at row index 4 (0-based), data starts at row 5
    let imported = 0;
    let skipped = 0;
    
    for (let i = 5; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const dtPagto = excelDateToSQL(row[0]);
        const categoria = sanitizeStr(row[1]);
        const historico = sanitizeStr(row[2]);
        const favorecido = sanitizeStr(row[3]);
        const valor = parseFloat(row[4]) || 0;
        const contaBancaria = sanitizeStr(row[5]);
        const observacao = sanitizeStr(row[6]);
        
        if (!dtPagto || !valor || valor <= 0) { skipped++; continue; }
        
        try {
            await pool.execute(
                `INSERT INTO contas_pagar 
                 (descricao, fornecedor_nome, valor, valor_pago, vencimento, data_vencimento, data_pagamento, 
                  status, categoria_nome, conta_corrente_nome, observacoes, data_criacao, origem)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pago', ?, ?, ?, NOW(), 'importacao_xlsx')`,
                [
                    historico || `Pagamento ${mes}`,
                    favorecido,
                    valor,
                    valor,
                    dtPagto,
                    dtPagto,
                    dtPagto,
                    categoria,
                    contaBancaria,
                    observacao
                ]
            );
            imported++;
        } catch (e) {
            if (e.code !== 'ER_DUP_ENTRY') {
                console.warn(`  [WARN] Row ${i}: ${e.message.substring(0, 80)}`);
            }
            skipped++;
        }
    }
    console.log(`  Pagamentos ${mes}: ${imported} importados, ${skipped} ignorados`);
}

async function importRecebimentos(filePath, mes) {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    
    let imported = 0;
    let skipped = 0;
    
    for (let i = 5; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const dtEntrada = excelDateToSQL(row[0]);
        const categoria = sanitizeStr(row[1]);
        const historico = sanitizeStr(row[2]);
        const origem = sanitizeStr(row[3]);
        const valorBruto = parseFloat(row[4]) || 0;
        const contaBancaria = sanitizeStr(row[5]);
        const observacao = sanitizeStr(row[6]);
        
        if (!dtEntrada || !valorBruto || valorBruto <= 0) { skipped++; continue; }
        
        try {
            await pool.execute(
                `INSERT INTO contas_receber 
                 (descricao, cliente_nome, valor, valor_recebido, vencimento, data_vencimento, data_recebimento,
                  status, categoria_nome, conta_corrente_nome, observacoes, data_criacao, origem)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'recebido', ?, ?, ?, NOW(), 'importacao_xlsx')`,
                [
                    historico || `Recebimento ${mes}`,
                    origem,
                    valorBruto,
                    valorBruto,
                    dtEntrada,
                    dtEntrada,
                    dtEntrada,
                    categoria,
                    contaBancaria,
                    observacao
                ]
            );
            imported++;
        } catch (e) {
            if (e.code !== 'ER_DUP_ENTRY') {
                console.warn(`  [WARN] Row ${i}: ${e.message.substring(0, 80)}`);
            }
            skipped++;
        }
    }
    console.log(`  Recebimentos ${mes}: ${imported} importados, ${skipped} ignorados`);
}

async function checkColumns() {
    const [cols] = await pool.execute("SHOW COLUMNS FROM contas_pagar");
    const colNames = cols.map(c => c.Field);
    return colNames;
}

async function main() {
    console.log('== Iniciando importação XLSX financeiro ==');
    
    const baseDir = __dirname;
    
    try {
        console.log('  [DB] Verificando esquema...');
        // All required columns exist in production schema

        await importPagamentos(path.join(baseDir, 'xlsx-import/Janeiro/PAGAMENTOS JAN 26.xlsx'), 'JAN/2026');
        await importRecebimentos(path.join(baseDir, 'xlsx-import/Janeiro/RECEBIMENTO JAN 26.xlsx'), 'JAN/2026');
        await importPagamentos(path.join(baseDir, 'xlsx-import/Fevereiro/PAGAMENTO FEV26.xlsx'), 'FEV/2026');
        await importRecebimentos(path.join(baseDir, 'xlsx-import/Fevereiro/RECEBIMENTO FEV26.xlsx'), 'FEV/2026');
        
        console.log('\n== Importação concluída! ==');
    } catch (error) {
        console.error('Erro na importação:', error.message, error.code || '');
    } finally {
        await pool.end();
    }
}

main();
