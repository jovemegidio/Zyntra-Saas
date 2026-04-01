/**
 * SEFAZ / BrasilAPI - Enriquecimento de Dados de Clientes
 * 
 * Consulta a Receita Federal via BrasilAPI para todos os clientes com CNPJ
 * e atualiza os dados cadastrais no banco de dados.
 * 
 * Uso: node scripts/sefaz-update.js
 * Em background: nohup node scripts/sefaz-update.js > /var/www/aluforce/logs/sefaz-run.log 2>&1 &
 */

'use strict';

const mysql = require('mysql2/promise');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const DB_CONFIG = {
    host: 'localhost',
    user: 'aluforce',
    password: 'CHANGE_ME_DB_PASSWORD',
    database: 'aluforce_vendas',
    waitForConnections: true,
    connectionLimit: 2
};

const LOG_FILE = '/var/www/aluforce/logs/sefaz-update.log';
const DELAY_MS = 1500; // 1.5s between requests (safe for BrasilAPI)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    try {
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (_) {}
}

function cleanCnpj(cnpj) {
    return (cnpj || '').replace(/\D/g, '');
}

function formatCep(cep) {
    const d = (cep || '').replace(/\D/g, '');
    if (d.length >= 8) return d.substring(0, 5) + '-' + d.substring(5, 8);
    return cep;
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Aluforce-ERP/1.0 (consulta-cnpj)',
                'Accept': 'application/json'
            },
            timeout: 15000
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (_) {
                    resolve({ status: res.statusCode, data: null });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('timeout após 15s'));
        });
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    // Garantir que a pasta de logs existe
    const logsDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    log('=== SEFAZ UPDATE INICIADO ===');

    const pool = await mysql.createPool(DB_CONFIG);

    try {
        // Buscar todos os clientes com CNPJ preenchido
        // Fase 1: coluna cnpj dedicada
        // Fase 2: coluna cnpj_cpf com 14 dígitos (CNPJ) onde cnpj está vazio
        const fase = process.argv[2] || '2'; // default: fase 2 (cnpj_cpf)

        let querySQL, queryParams = [];
        if (fase === '1') {
            querySQL = `SELECT id, nome, razao_social, cnpj, cnpj_cpf
                        FROM clientes
                        WHERE cnpj IS NOT NULL AND TRIM(cnpj) != ''
                        ORDER BY id ASC`;
            log('Modo: FASE 1 — coluna cnpj');
        } else {
            // Fase 2: clientes com CNPJ em cnpj_cpf mas cnpj vazio/nulo
            querySQL = `SELECT id, nome, razao_social, cnpj, cnpj_cpf
                        FROM clientes
                        WHERE (cnpj IS NULL OR TRIM(cnpj) = '')
                          AND cnpj_cpf IS NOT NULL
                          AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(cnpj_cpf,'.',''),'-',''),'/',''),'(',''),')','')) = 14
                        ORDER BY id ASC`;
            log('Modo: FASE 2 — coluna cnpj_cpf (14 dígitos)');
        }

        const [rows] = await pool.query(querySQL, queryParams);

        log(`Total de clientes com CNPJ: ${rows.length}`);

        let updated = 0;
        let skipped = 0;
        let notFound = 0;
        let errors = 0;

        for (let i = 0; i < rows.length; i++) {
            const cliente = rows[i];

            // Limpar CNPJ (apenas dígitos) — usar cnpj ou cnpj_cpf
            const cnpjRaw = (cliente.cnpj && cliente.cnpj.trim()) ? cliente.cnpj : (cliente.cnpj_cpf || '');
            const cnpjDigits = cleanCnpj(cnpjRaw);

            if (cnpjDigits.length !== 14) {
                log(`[${i + 1}/${rows.length}] SKIP ID:${cliente.id} "${cliente.nome}" — CNPJ inválido: "${cliente.cnpj}"`);
                skipped++;
                continue;
            }

            try {
                const res = await httpsGet(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);

                if (res.status === 200 && res.data) {
                    const d = res.data;
                    const updates = {};

                    // Dados da empresa
                    if (d.razao_social) updates.razao_social = d.razao_social.substring(0, 255);
                    if (d.nome_fantasia && d.nome_fantasia.trim()) {
                        updates.nome_fantasia = d.nome_fantasia.trim().substring(0, 255);
                    }

                    // Contato
                    if (d.email && d.email.trim()) updates.email = d.email.trim().substring(0, 255);

                    // Telefone: BrasilAPI retorna "DDD NÚMERO" ex: "11 12345678"
                    if (d.ddd_telefone_1 && d.ddd_telefone_1.trim()) {
                        const phone = d.ddd_telefone_1.trim();
                        if (phone.replace(/\D/g, '').length >= 8) {
                            updates.telefone = `(${phone.substring(0, 2)}) ${phone.substring(2).trim()}`.trim();
                            if (updates.telefone.length > 20) updates.telefone = phone.substring(0, 20);
                        }
                    }

                    // Endereço: montar da logradouro + número + complemento
                    const endParts = [];
                    if (d.logradouro && d.logradouro.trim()) endParts.push(d.logradouro.trim());
                    if (d.numero && d.numero !== '0' && d.numero.trim()) endParts.push(d.numero.trim());
                    if (d.complemento && d.complemento.trim()) endParts.push(d.complemento.trim());
                    if (endParts.length > 0) updates.endereco = endParts.join(', ').substring(0, 255);

                    if (d.bairro && d.bairro.trim()) updates.bairro = d.bairro.trim().substring(0, 100);
                    if (d.municipio && d.municipio.trim()) updates.cidade = d.municipio.trim().substring(0, 80);
                    if (d.uf && d.uf.trim()) updates.estado = d.uf.trim().substring(0, 2);
                    if (d.cep) updates.cep = formatCep(d.cep).substring(0, 12);

                    // CNAE
                    if (d.cnae_fiscal && d.cnae_fiscal_descricao) {
                        updates.cnae = `${d.cnae_fiscal} - ${d.cnae_fiscal_descricao}`.substring(0, 100);
                        updates.tipo_atividade = d.cnae_fiscal_descricao.substring(0, 100);
                    } else if (d.cnae_fiscal_descricao) {
                        updates.tipo_atividade = d.cnae_fiscal_descricao.substring(0, 100);
                    }

                    // Simples Nacional
                    if (d.opcao_pelo_simples !== undefined && d.opcao_pelo_simples !== null) {
                        updates.simples_nacional = d.opcao_pelo_simples ? 1 : 0;
                    }

                    // Inscrição estadual (situação)
                    // Se temos dados de atividade, salvar descrição da situação cadastral
                    if (d.descricao_situacao_cadastral && d.descricao_situacao_cadastral !== 'ATIVA') {
                        // Só registrar se não estiver ativa (para não poluir campos normais)
                        const situacao = `Situação: ${d.descricao_situacao_cadastral}`;
                        // Não sobrescrever obs_internas, apenas logar
                        log(`  ⚠️  Situação cadastral: ${d.descricao_situacao_cadastral}`);
                    }

                    // Timestamps
                    updates.data_ultima_alteracao = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    updates.alterado_por = 'SEFAZ-AUTO';

                    if (Object.keys(updates).length <= 2) {
                        // Apenas timestamps — sem dados úteis da API
                        log(`[${i + 1}/${rows.length}] VAZIO ID:${cliente.id} "${cliente.nome}" — API retornou dados vazios`);
                        skipped++;
                    } else {
                        // Executar UPDATE
                        const setCols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
                        const vals = [...Object.values(updates), cliente.id];
                        await pool.query(`UPDATE clientes SET ${setCols} WHERE id = ?`, vals);

                        const camposAtualizados = Object.keys(updates).filter(k => !['data_ultima_alteracao', 'alterado_por'].includes(k));
                        log(`[${i + 1}/${rows.length}] OK ID:${cliente.id} "${d.razao_social || cliente.nome}" [${camposAtualizados.join(', ')}]`);
                        updated++;
                    }

                } else if (res.status === 404) {
                    log(`[${i + 1}/${rows.length}] 404 ID:${cliente.id} "${cliente.nome}" CNPJ:${cnpjDigits} — não encontrado na Receita Federal`);
                    notFound++;
                } else if (res.status === 429) {
                    log(`[${i + 1}/${rows.length}] RATE LIMIT — aguardando 10s antes de continuar`);
                    await sleep(10000);
                    i--; // retry
                } else {
                    log(`[${i + 1}/${rows.length}] HTTP ${res.status} ID:${cliente.id} "${cliente.nome}"`);
                    errors++;
                }

            } catch (fetchErr) {
                log(`[${i + 1}/${rows.length}] ERRO ID:${cliente.id} "${cliente.nome}": ${fetchErr.message}`);
                errors++;
                await sleep(3000); // back-off on error
            }

            // Respeitar rate limit da BrasilAPI
            await sleep(DELAY_MS);
        }

        log('');
        log('=== CONCLUÍDO ===');
        log(`Total processados : ${rows.length}`);
        log(`Atualizados       : ${updated}`);
        log(`Não encontrados   : ${notFound}`);
        log(`Ignorados/vazios  : ${skipped}`);
        log(`Erros             : ${errors}`);

    } finally {
        await pool.end();
    }
}

main().catch(err => {
    log(`FATAL: ${err.message}`);
    log(err.stack || '');
    process.exit(1);
});
