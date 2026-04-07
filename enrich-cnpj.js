#!/usr/bin/env node
/**
 * Script de enriquecimento de clientes via CNPJ (BrasilAPI + ReceitaWS fallback)
 * Atualiza: inscricao_estadual, tipo_atividade, cnae, razao_social (se vazio),
 *           nome_fantasia (se vazio), endereco, bairro, cidade, estado, cep
 * 
 * Uso: node enrich-cnpj.js [--dry-run] [--limit N] [--all]
 *   --dry-run  Não grava no banco, só mostra o que faria
 *   --limit N  Processa no máximo N clientes
 *   --all      Processa todos (mesmo os que já têm IE)
 */
'use strict';

const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

const DB_CONFIG = {
    host: 'localhost',
    user: 'aluforce',
    password: 'Aluforce2026VpsDB',
    database: 'aluforce_vendas',
    charset: 'utf8mb4'
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ALL_MODE = args.includes('--all');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) || 50 : 0;

const DELAY_MS = 350; // delay between requests to avoid rate limiting

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function consultarCNPJ(cnpjLimpo) {
    // Tentar BrasilAPI primeiro
    try {
        const data = await fetchJSON(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
        return {
            razao_social: data.razao_social || null,
            nome_fantasia: data.nome_fantasia || null,
            inscricao_estadual: null, // BrasilAPI não retorna IE em todos os casos
            tipo_atividade: data.descricao_situacao_cadastral || data.natureza_juridica || null,
            cnae: data.cnae_fiscal_descricao || (data.cnae_fiscal ? String(data.cnae_fiscal) : null),
            cnae_codigo: data.cnae_fiscal ? String(data.cnae_fiscal) : null,
            endereco: data.logradouro || null,
            numero: data.numero || null,
            complemento: data.complemento || null,
            bairro: data.bairro || null,
            cidade: data.municipio || null,
            estado: data.uf || null,
            cep: data.cep ? String(data.cep).replace(/\D/g, '') : null,
            email: data.email && data.email !== '' ? data.email.toLowerCase() : null,
            telefone: data.ddd_telefone_1 || null,
            simples_nacional: data.opcao_pelo_simples ? 1 : 0,
            fonte: 'brasilapi'
        };
    } catch (e) {
        // Fallback ReceitaWS
        try {
            await sleep(500); // extra delay for ReceitaWS
            const data = await fetchJSON(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
            if (data.status === 'ERROR') return null;
            return {
                razao_social: data.nome || null,
                nome_fantasia: data.fantasia || null,
                inscricao_estadual: null,
                tipo_atividade: data.tipo || data.natureza_juridica || null,
                cnae: data.atividade_principal?.[0]?.text || null,
                cnae_codigo: data.atividade_principal?.[0]?.code || null,
                endereco: data.logradouro || null,
                numero: data.numero || null,
                complemento: data.complemento || null,
                bairro: data.bairro || null,
                cidade: data.municipio || null,
                estado: data.uf || null,
                cep: data.cep ? data.cep.replace(/\D/g, '') : null,
                email: data.email && data.email !== '' ? data.email.toLowerCase() : null,
                telefone: data.telefone || null,
                simples_nacional: data.simples?.optante ? 1 : 0,
                fonte: 'receitaws'
            };
        } catch (e2) {
            return null;
        }
    }
}

async function main() {
    console.log('=== ENRIQUECIMENTO DE CLIENTES VIA CNPJ ===');
    console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (sem gravação)' : 'PRODUÇÃO'}`);
    console.log(`Filtro: ${ALL_MODE ? 'TODOS com CNPJ' : 'Apenas sem IE/CNAE'}`);
    if (LIMIT) console.log(`Limite: ${LIMIT} clientes`);
    console.log('');

    const pool = await mysql.createPool(DB_CONFIG);

    // Buscar clientes com CNPJ
    let query = `SELECT id, cnpj, cnpj_cpf, razao_social, nome_fantasia, inscricao_estadual, 
                        tipo_atividade, cnae, endereco, bairro, cidade, estado, cep, email, telefone,
                        simples_nacional
                 FROM clientes 
                 WHERE (cnpj IS NOT NULL AND cnpj != '')`;
    
    if (!ALL_MODE) {
        query += ` AND (inscricao_estadual IS NULL OR inscricao_estadual = '' 
                     OR tipo_atividade IS NULL OR tipo_atividade = ''
                     OR cnae IS NULL OR cnae = '')`;
    }

    // Ignorar CNPJs fake/sequenciais (12.345.678, 23.456.789, etc.)
    query += ` AND id > 320`;
    
    query += ' ORDER BY id ASC';
    if (LIMIT) query += ` LIMIT ${LIMIT}`;

    const [clientes] = await pool.query(query);
    console.log(`Encontrados ${clientes.length} clientes para processar.`);
    console.log('');

    let atualizados = 0, erros = 0, semDados = 0, pulados = 0;

    for (let i = 0; i < clientes.length; i++) {
        const c = clientes[i];
        const cnpjLimpo = (c.cnpj || c.cnpj_cpf || '').replace(/\D/g, '');
        
        if (cnpjLimpo.length !== 14) {
            pulados++;
            continue;
        }

        process.stdout.write(`[${i + 1}/${clientes.length}] ID ${c.id} CNPJ ${cnpjLimpo}... `);

        try {
            const dados = await consultarCNPJ(cnpjLimpo);
            
            if (!dados) {
                console.log('❌ Sem dados');
                semDados++;
                await sleep(DELAY_MS);
                continue;
            }

            // Montar SET dinâmico - só atualiza campos vazios
            const updates = [];
            const params = [];

            const camposTexto = {
                inscricao_estadual: dados.inscricao_estadual,
                tipo_atividade: dados.tipo_atividade,
                cnae: dados.cnae_codigo ? `${dados.cnae_codigo} - ${dados.cnae}` : dados.cnae,
                razao_social: dados.razao_social,
                nome_fantasia: dados.nome_fantasia,
                endereco: dados.endereco,
                numero: dados.numero,
                complemento: dados.complemento,
                bairro: dados.bairro,
                cidade: dados.cidade,
                estado: dados.estado,
                cep: dados.cep ? dados.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : null,
                email: dados.email,
                telefone: dados.telefone
            };

            for (const [campo, valor] of Object.entries(camposTexto)) {
                if (valor && valor.trim() !== '') {
                    const atual = c[campo] || '';
                    if (atual === '' || atual === null) {
                        updates.push(`${campo} = ?`);
                        params.push(valor.trim());
                    }
                }
            }

            // simples_nacional - sempre atualizar se disponível
            if (dados.simples_nacional !== undefined) {
                updates.push('simples_nacional = ?');
                params.push(dados.simples_nacional);
            }

            if (updates.length === 0) {
                console.log(`⏩ Já completo (${dados.fonte})`);
                pulados++;
                await sleep(DELAY_MS);
                continue;
            }

            updates.push('data_ultima_alteracao = NOW()');
            updates.push("alterado_por = 'enrich-cnpj-script'");

            if (DRY_RUN) {
                console.log(`🔍 Atualizaria ${updates.length - 2} campos (${dados.fonte}): ${updates.slice(0, -2).join(', ')}`);
            } else {
                params.push(c.id);
                await pool.query(
                    `UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`,
                    params
                );
                console.log(`✅ ${updates.length - 2} campos (${dados.fonte})`);
            }
            atualizados++;
        } catch (err) {
            console.log(`❌ Erro: ${err.message}`);
            erros++;
        }

        await sleep(DELAY_MS);
    }

    console.log('');
    console.log('=== RESULTADO ===');
    console.log(`Total processados: ${clientes.length}`);
    console.log(`Atualizados: ${atualizados}`);
    console.log(`Já completos: ${pulados}`);
    console.log(`Sem dados na API: ${semDados}`);
    console.log(`Erros: ${erros}`);

    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
