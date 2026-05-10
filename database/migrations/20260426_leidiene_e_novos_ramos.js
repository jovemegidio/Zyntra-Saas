/**
 * Migration: Leidiene (permissões comercial) + Novos ramos Zyntra
 * Data: 2026-04-26
 *
 * Cria usuária Leidiene nas 3 empresas com role=comercial e
 * configura 4 novos ramos: Centro Espírita, Adegas, Farmácias, Mercados.
 *
 * ATENÇÃO: aplica em aluforce_vendas, labor_eletric_vendas, labor_energy_vendas.
 * A senha temporária "Zyntra@2026" deve ser trocada no primeiro acesso.
 */

'use strict';

const bcrypt = require('bcryptjs');

async function runMigration(pool) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // ── 1. Gerar hash bcrypt para a senha temporária ──────────────────────
        const tempHash = await bcrypt.hash('Zyntra@2026', 12);
        const permsVendas = JSON.stringify({
            criar: true, editar: true, aprovar: true,
            excluir: true, dashboard: true, visualizar: true
        });

        // ── 2. Criar Leidiene nas 3 empresas ─────────────────────────────────
        const leidieneDbs = [
            { db: 'aluforce_vendas',       email: 'leidiene@aluforce.ind.br',    empresaDefaultId: 1 },
            { db: 'labor_eletric_vendas',   email: 'leidiene@laboreletric.com.br', empresaDefaultId: 1 },
            { db: 'labor_energy_vendas',    email: 'leidiene@energy.com.br',      empresaDefaultId: 1 },
        ];

        for (const { db, email, empresaDefaultId } of leidieneDbs) {
            await conn.query(`
                INSERT INTO \`${db}\`.usuarios
                  (nome, email, password_hash, senha_hash, role, ativo, status,
                   forcar_troca_senha, permissoes_vendas, empresa_default_id)
                VALUES (?, ?, ?, ?, 'comercial', 1, 'ativo', 1, ?, ?)
                ON DUPLICATE KEY UPDATE
                  role = 'comercial', ativo = 1, status = 'ativo',
                  permissoes_vendas = ?, forcar_troca_senha = 1
            `, ['Leidiene', email, tempHash, tempHash, permsVendas, empresaDefaultId, permsVendas]);
        }

        // ── 3. Novos ramos em empresas_tenant ────────────────────────────────
        const novosRamos = [
            {
                slug: 'centro-espirita',
                razaoSocial: 'Zyntra Centro Espírita DEMO',
                nomeFantasia: 'Zyntra Espírita',
                setor: 'servicos',
                plano: 'starter',
                corPrimaria: '#7B68EE',
                modulos: ['dashboard', 'financeiro', 'rh', 'admin', 'chat', 'ajuda'],
            },
            {
                slug: 'adega',
                razaoSocial: 'Zyntra Adegas DEMO',
                nomeFantasia: 'Zyntra Adega',
                setor: 'comercio',
                plano: 'profissional',
                corPrimaria: '#8B4513',
                modulos: ['dashboard', 'vendas', 'compras', 'financeiro', 'logistica', 'faturamento', 'nfe', 'admin', 'chat', 'ajuda'],
            },
            {
                slug: 'farmacia',
                razaoSocial: 'Zyntra Farmacias DEMO',
                nomeFantasia: 'Zyntra Farmácia',
                setor: 'comercio',
                plano: 'profissional',
                corPrimaria: '#27AE60',
                modulos: ['dashboard', 'vendas', 'compras', 'financeiro', 'logistica', 'faturamento', 'nfe', 'admin', 'chat', 'ajuda'],
            },
            {
                slug: 'mercado',
                razaoSocial: 'Zyntra Mercados DEMO',
                nomeFantasia: 'Zyntra Mercado',
                setor: 'comercio',
                plano: 'profissional',
                corPrimaria: '#2980B9',
                modulos: ['dashboard', 'vendas', 'compras', 'financeiro', 'logistica', 'faturamento', 'nfe', 'admin', 'chat', 'ajuda'],
            },
        ];

        const adminDemoHash = await bcrypt.hash('Zyntra@2026Demo', 10);

        for (const ramo of novosRamos) {
            const [rows] = await conn.query(
                'SELECT id FROM aluforce_vendas.empresas_tenant WHERE slug = ?',
                [ramo.slug]
            );

            if (rows.length === 0) {
                const [result] = await conn.query(`
                    INSERT INTO aluforce_vendas.empresas_tenant
                      (slug, razao_social, nome_fantasia, setor, plano, isolamento,
                       cor_primaria, cor_secundaria, cor_accent, ativo, modulos_override)
                    VALUES (?, ?, ?, ?, ?, 'schema', ?, '#1a1a2e', '#00d4aa', 1, ?)
                `, [
                    ramo.slug, ramo.razaoSocial, ramo.nomeFantasia,
                    ramo.setor, ramo.plano, ramo.corPrimaria,
                    JSON.stringify(ramo.modulos)
                ]);

                const tenantId = result.insertId;

                // Admin user para o ramo
                const adminEmail = `admin@zyntra-${ramo.slug}.com.br`;
                await conn.query(`
                    INSERT INTO aluforce_vendas.usuarios
                      (nome, email, password_hash, senha_hash, role, ativo, status,
                       forcar_troca_senha, empresa_default_id)
                    VALUES (?, ?, ?, ?, 'admin', 1, 'ativo', 1, ?)
                    ON DUPLICATE KEY UPDATE role='admin', ativo=1, empresa_default_id=?
                `, [
                    `Admin ${ramo.nomeFantasia}`, adminEmail,
                    adminDemoHash, adminDemoHash, tenantId, tenantId
                ]);
            }
        }

        await conn.commit();
        console.log('[MIGRATION] ✅ Leidiene e novos ramos configurados com sucesso.');
    } catch (err) {
        await conn.rollback();
        console.error('[MIGRATION] ❌ Erro:', err.message);
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = { runMigration };
