/**
 * CONFIGURAÇÃO MULTI-EMPRESAS (MULTI-TENANT)
 * 
 * Cada tenant (empresa contratante) pode ter:
 * - Seu próprio setor (industria, comercio, servicos, agropecuario, completo)
 * - Seu próprio banco de dados (isolamento total) OU schema compartilhado
 * - Suas cores, logo, branding
 * - Seus módulos habilitados (herda do setor, mas pode customizar)
 * - Seu plano (starter, profissional, enterprise)
 *
 * Modos de isolamento:
 * - 'database'  → cada empresa tem seu próprio DB (ex: zyntra_empresa_1)
 * - 'schema'    → todas compartilham o DB, filtrado por empresa_id
 * - 'hybrid'    → tabelas críticas isoladas, auxiliares compartilhadas
 *
 * Criado: 30/03/2026
 */

'use strict';

const { getSectorConfig, SECTOR_CONFIG } = require('./sector');

// =========================================================
// PLANOS DISPONÍVEIS
// =========================================================
const PLANOS = {
    starter: {
        label: 'Starter',
        maxUsuarios: 3,
        maxEmpresas: 1,         // filiais
        modulosMax: 5,
        armazenamento: '5GB',
        suporte: 'email',
        preco: 119,
    },
    profissional: {
        label: 'Profissional',
        maxUsuarios: 15,
        maxEmpresas: 3,
        modulosMax: 10,
        armazenamento: '25GB',
        suporte: 'chat',
        preco: 299,
    },
    enterprise: {
        label: 'Enterprise',
        maxUsuarios: -1,         // ilimitado
        maxEmpresas: -1,
        modulosMax: -1,
        armazenamento: 'ilimitado',
        suporte: 'dedicado',
        preco: 599,
    }
};

// =========================================================
// CONFIGURAÇÃO DO TENANT
// =========================================================

/**
 * Carrega configuração de uma empresa do banco de dados
 * @param {object} pool - MySQL pool
 * @param {number} empresaId - ID da empresa
 * @returns {object} Configuração completa do tenant
 */
async function getEmpresaConfig(pool, empresaId) {
    const [rows] = await pool.query(
        `SELECT et.*, 
                ec.razao_social, ec.nome_fantasia, ec.cnpj, ec.logo_url, ec.favicon_url,
                ec.cor_primaria, ec.cor_secundaria, ec.cor_accent
         FROM empresas_tenant et
         LEFT JOIN configuracoes_empresa ec ON ec.empresa_id = et.id
         WHERE et.id = ? AND et.ativo = 1`,
        [empresaId]
    );

    if (!rows || rows.length === 0) return null;

    const empresa = rows[0];
    const sectorName = empresa.setor || 'completo';
    const sectorConfig = SECTOR_CONFIG[sectorName] || SECTOR_CONFIG.completo;
    const plano = PLANOS[empresa.plano] || PLANOS.starter;

    // Mesclar módulos do setor com overrides da empresa
    let modulosOverride = {};
    try {
        if (empresa.modulos_override) {
            modulosOverride = JSON.parse(empresa.modulos_override);
        }
    } catch (e) { /* ignore parse errors */ }

    const modulosFinal = {};
    for (const [key, mod] of Object.entries(sectorConfig.modules)) {
        modulosFinal[key] = {
            ...mod,
            ...(modulosOverride[key] || {})
        };
    }

    return {
        id: empresa.id,
        slug: empresa.slug,
        razaoSocial: empresa.razao_social,
        nomeFantasia: empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        setor: sectorName,
        setorConfig: sectorConfig,
        plano: empresa.plano,
        planoConfig: plano,
        isolamento: empresa.isolamento || 'schema',
        dbName: empresa.db_name || null,
        branding: {
            logoUrl: empresa.logo_url || null,
            faviconUrl: empresa.favicon_url || null,
            corPrimaria: empresa.cor_primaria || '#6C63FF',
            corSecundaria: empresa.cor_secundaria || '#1a1a2e',
            corAccent: empresa.cor_accent || '#00d4aa',
        },
        modules: modulosFinal,
        features: sectorConfig.features,
        dashboard: sectorConfig.dashboard,
        ativo: !!empresa.ativo,
        criadoEm: empresa.criado_em,
    };
}

/**
 * Retorna todas as empresas de um usuário
 * @param {object} pool - MySQL pool
 * @param {number} userId - ID do usuário
 * @returns {Array} Lista de empresas acessíveis
 */
async function getEmpresasDoUsuario(pool, userId) {
    const [rows] = await pool.query(
        `SELECT et.id, et.slug, et.nome_fantasia, et.cnpj, et.setor, et.plano, et.logo_url, et.ativo,
                ue.role AS user_role, ue.is_admin AS user_is_admin
         FROM usuarios_empresas ue
         INNER JOIN empresas_tenant et ON et.id = ue.empresa_id
         WHERE ue.usuario_id = ? AND et.ativo = 1
         ORDER BY et.nome_fantasia`,
        [userId]
    );

    return rows.map(r => ({
        id: r.id,
        slug: r.slug,
        nomeFantasia: r.nome_fantasia,
        cnpj: r.cnpj,
        setor: r.setor,
        setorLabel: (SECTOR_CONFIG[r.setor] || SECTOR_CONFIG.completo).label,
        setorIcon: (SECTOR_CONFIG[r.setor] || SECTOR_CONFIG.completo).icon,
        plano: r.plano,
        planoLabel: (PLANOS[r.plano] || PLANOS.starter).label,
        logoUrl: r.logo_url,
        ativo: !!r.ativo,
        userRole: r.user_role,
        userIsAdmin: !!r.user_is_admin,
    }));
}

/**
 * Retorna o pool de conexão correto para a empresa
 * Para isolamento por database, cria/retorna pool específico
 * Para schema, retorna o pool principal
 */
const _empresaPools = new Map();

function getEmpresaPool(mainPool, empresaConfig) {
    if (!empresaConfig || empresaConfig.isolamento !== 'database' || !empresaConfig.dbName) {
        return mainPool;
    }

    const dbName = empresaConfig.dbName;
    if (_empresaPools.has(dbName)) {
        return _empresaPools.get(dbName);
    }

    // Cria pool específico para o DB da empresa
    const mysql = require('mysql2/promise');
    const baseConfig = mainPool.pool ? mainPool.pool.config.connectionConfig : {};

    const empresaPool = mysql.createPool({
        host: baseConfig.host || process.env.DB_HOST || 'localhost',
        user: baseConfig.user || process.env.DB_USER || 'root',
        password: baseConfig.password || process.env.DB_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '10'),
        queueLimit: 0,
        charset: 'utf8mb4',
    });

    _empresaPools.set(dbName, empresaPool);
    return empresaPool;
}

/**
 * Limpa pools de empresas (para shutdown)
 */
async function closeEmpresaPools() {
    for (const [name, pool] of _empresaPools) {
        try { await pool.end(); } catch (e) { /* ignore */ }
    }
    _empresaPools.clear();
}

module.exports = {
    PLANOS,
    getEmpresaConfig,
    getEmpresasDoUsuario,
    getEmpresaPool,
    closeEmpresaPools,
};
