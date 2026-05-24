/**
 * Migration: Dados cadastrais completos — Labor Eletric e Energy Comercio
 * Data: 2026-05-17
 *
 * Insere/atualiza configuracoes_empresa no banco corrente com base em DB_NAME.
 * Também atualiza a tabela `empresas` (qualquer banco que a contenha).
 * Idempotente — seguro rodar múltiplas vezes.
 */

'use strict';

const DADOS = {
    'labor_eletric_vendas': {
        empresa_id: 2,
        razao_social: 'LABOR ELETRIC INDUSTRIA E COMERCIO UNIPESSOAL LTDA',
        nome_fantasia: 'LABOR ELETRIC INDUSTRIA E COMERCIO UNIPESSOAL',
        cnpj: '35.165.246/0001-06',
        inscricao_estadual: '305.273.601.111',
        telefone: '(11) 5196-7020',
        cep: '',
        estado: 'SP',
        cidade: 'Ferraz de Vasconcelos',
        bairro: 'Vila São João',
        endereco: 'Rua Ernestina',
        numero: '270',
    },
    'labor_energy_vendas': {
        empresa_id: 3,
        razao_social: 'ENERGY COMERCIO LTDA',
        nome_fantasia: 'ENERGY COMERCIO LTDA',
        cnpj: '53.937.474/0001-20',
        inscricao_estadual: '135.295.053.116',
        telefone: '(11) 5199-7173',
        cep: '08270-610',
        estado: 'SP',
        cidade: 'São Paulo',
        bairro: 'Jardim Nossa Senhora do Carmo',
        endereco: 'Rua Blecaute',
        numero: 'Lote 13 Quadra 13',
    },
};

async function runMigration(pool) {
    const dbName = process.env.DB_NAME || '';
    const dados = DADOS[dbName];

    // ── configuracoes_empresa (banco corrente) ────────────────────────────
    if (dados) {
        try {
            const [rows] = await pool.query('SELECT id FROM configuracoes_empresa LIMIT 1');
            if (rows.length === 0) {
                await pool.query(`
                    INSERT INTO configuracoes_empresa
                      (razao_social, nome_fantasia, cnpj, inscricao_estadual,
                       telefone, cep, estado, cidade, bairro, endereco, numero)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    dados.razao_social, dados.nome_fantasia, dados.cnpj,
                    dados.inscricao_estadual, dados.telefone, dados.cep,
                    dados.estado, dados.cidade, dados.bairro,
                    dados.endereco, dados.numero,
                ]);
            } else {
                await pool.query(`
                    UPDATE configuracoes_empresa SET
                      razao_social       = ?,
                      nome_fantasia      = ?,
                      cnpj               = ?,
                      inscricao_estadual = ?,
                      telefone           = ?,
                      cep                = ?,
                      estado             = ?,
                      cidade             = ?,
                      bairro             = ?,
                      endereco           = ?,
                      numero             = ?
                    WHERE id = ?
                `, [
                    dados.razao_social, dados.nome_fantasia, dados.cnpj,
                    dados.inscricao_estadual, dados.telefone, dados.cep,
                    dados.estado, dados.cidade, dados.bairro,
                    dados.endereco, dados.numero,
                    rows[0].id,
                ]);
            }
            console.log('[MIGRATION] ✅ configuracoes_empresa atualizada: ' + dados.razao_social);
        } catch (err) {
            console.warn('[MIGRATION] ⚠️ configuracoes_empresa: ' + err.message);
        }
    }

    // ── tabela empresas (presente em qualquer banco do sistema) ──────────
    for (const [, d] of Object.entries(DADOS)) {
        try {
            await pool.query(`
                UPDATE empresas SET
                  razao_social  = ?,
                  nome_fantasia = ?,
                  cnpj          = ?
                WHERE id = ?
            `, [d.razao_social, d.nome_fantasia, d.cnpj, d.empresa_id]);
        } catch (_) {
            // empresas pode não existir neste banco — ignorar
        }
    }
}

module.exports = { runMigration };
