/**
 * CONFIGURAÇÃO DE SETOR / RAMO DE ATUAÇÃO
 * Define quais módulos, menus e funcionalidades estão ativos
 * conforme o setor da empresa.
 *
 * Setores suportados:
 * - industria  → Fábricas e produção (PCP, Faturamento, NFe, Estoque forte)
 * - comercio   → Varejo/Atacado (Vendas, Estoque, NFe, CRM)
 * - servicos   → Prestação de serviços (Financeiro, RH, NFS-e, CRM)
 * - agropecuario → Agricultura/Pecuária (Estoque, Financeiro, NFe, Logística)
 * - completo   → Todos os módulos (padrão, para Sistema/Demo)
 *
 * Criado: 30/03/2026
 */

'use strict';

const SECTOR_CONFIG = {

    // =========================================================
    // INDÚSTRIA — Fábricas e produção
    // =========================================================
    industria: {
        label: 'Indústria',
        description: 'Fábricas e produção que transformam matéria-prima em produtos finais',
        icon: '🏭',
        modules: {
            vendas:       { enabled: true,  label: 'Vendas',           priority: 2 },
            financeiro:   { enabled: true,  label: 'Financeiro',       priority: 3 },
            pcp:          { enabled: true,  label: 'PCP - Produção',   priority: 1 },  // DESTAQUE
            nfe:          { enabled: true,  label: 'NF-e / Fiscal',    priority: 4 },
            faturamento:  { enabled: true,  label: 'Faturamento',      priority: 5 },
            compras:      { enabled: true,  label: 'Compras',          priority: 6 },
            estoque:      { enabled: true,  label: 'Estoque',          priority: 7 },
            rh:           { enabled: true,  label: 'RH',               priority: 8 },
            logistica:    { enabled: true,  label: 'Logística',        priority: 9 },
            consultoria:  { enabled: false, label: 'Consultoria',      priority: 99 },
        },
        features: {
            mrp: true,              // Planejamento de materiais
            ordemProducao: true,    // Ordens de produção
            kanbanPCP: true,        // Kanban de produção
            apontamentos: true,     // Apontamentos de produção
            curvaABC: true,         // Curva ABC de estoque
            custoProduto: true,     // Custo do produto fabricado
            fichaTenica: true,      // Ficha técnica / BOM
            qualidade: true,        // Controle de qualidade
            nfServico: false,       // NFS-e (não é foco)
        },
        dashboard: {
            widgets: ['producao-dia', 'pedidos-pendentes', 'estoque-critico', 'faturamento-mes', 'eficiencia-oee'],
            theme: 'industrial'
        }
    },

    // =========================================================
    // COMÉRCIO — Varejo e Atacado
    // =========================================================
    comercio: {
        label: 'Comércio',
        description: 'Empresas que compram e vendem produtos (varejo e atacado)',
        icon: '🛒',
        modules: {
            vendas:       { enabled: true,  label: 'Vendas / PDV',     priority: 1 },  // DESTAQUE
            financeiro:   { enabled: true,  label: 'Financeiro',       priority: 2 },
            estoque:      { enabled: true,  label: 'Estoque',          priority: 3 },
            nfe:          { enabled: true,  label: 'NF-e / NFC-e',     priority: 4 },
            compras:      { enabled: true,  label: 'Compras',          priority: 5 },
            faturamento:  { enabled: true,  label: 'Faturamento',      priority: 6 },
            rh:           { enabled: true,  label: 'RH',               priority: 7 },
            logistica:    { enabled: true,  label: 'Logística',        priority: 8 },
            pcp:          { enabled: false, label: 'PCP',              priority: 99 },
            consultoria:  { enabled: false, label: 'Consultoria',      priority: 99 },
        },
        features: {
            pdv: true,              // Ponto de venda
            crmClientes: true,      // CRM de clientes
            tabelaPreco: true,      // Múltiplas tabelas de preço
            comissoes: true,        // Comissões de vendedores
            curvaABC: true,         // Curva ABC
            promocoes: true,        // Promoções e descontos
            nfConsumidor: true,     // NFC-e
            inventario: true,       // Inventário periódico
            mrp: false,             // Sem MRP
            ordemProducao: false,   // Sem produção
        },
        dashboard: {
            widgets: ['vendas-dia', 'ticket-medio', 'estoque-critico', 'contas-receber', 'top-produtos'],
            theme: 'comercial'
        }
    },

    // =========================================================
    // SERVIÇOS — Prestação de serviços
    // =========================================================
    servicos: {
        label: 'Serviços',
        description: 'Prestação de trabalho especializado sem venda de produtos físicos',
        icon: '💼',
        modules: {
            financeiro:   { enabled: true,  label: 'Financeiro',        priority: 1 },  // DESTAQUE
            vendas:       { enabled: true,  label: 'CRM / Propostas',   priority: 2 },
            rh:           { enabled: true,  label: 'RH / Pessoas',      priority: 3 },
            nfe:          { enabled: true,  label: 'NFS-e / Fiscal',    priority: 4 },
            faturamento:  { enabled: true,  label: 'Faturamento',       priority: 5 },
            consultoria:  { enabled: true,  label: 'Projetos',          priority: 6 },
            compras:      { enabled: true,  label: 'Compras',           priority: 7 },
            estoque:      { enabled: false, label: 'Estoque',           priority: 99 },
            pcp:          { enabled: false, label: 'PCP',               priority: 99 },
            logistica:    { enabled: false, label: 'Logística',         priority: 99 },
        },
        features: {
            nfServico: true,        // NFS-e (foco principal)
            contratos: true,        // Contratos de serviço
            timesheet: true,        // Controle de horas
            propostas: true,        // Propostas comerciais
            crmClientes: true,      // CRM avançado
            comissoes: true,        // Comissões
            agendamento: true,      // Agendamento de serviços
            mrp: false,
            ordemProducao: false,
            pdv: false,
        },
        dashboard: {
            widgets: ['receita-mes', 'contratos-ativos', 'contas-receber', 'contas-pagar', 'horas-time'],
            theme: 'servicos'
        }
    },

    // =========================================================
    // AGROPECUÁRIO — Agricultura e Pecuária
    // =========================================================
    agropecuario: {
        label: 'Agropecuário',
        description: 'Produção agrícola, pecuária e extração vegetal/animal',
        icon: '🌾',
        modules: {
            financeiro:   { enabled: true,  label: 'Financeiro',       priority: 1 },  // DESTAQUE
            estoque:      { enabled: true,  label: 'Estoque / Insumos', priority: 2 },
            vendas:       { enabled: true,  label: 'Vendas',           priority: 3 },
            nfe:          { enabled: true,  label: 'NF-e / Fiscal',    priority: 4 },
            compras:      { enabled: true,  label: 'Compras / Insumos', priority: 5 },
            logistica:    { enabled: true,  label: 'Logística',         priority: 6 },
            rh:           { enabled: true,  label: 'RH / Colaboradores', priority: 7 },
            faturamento:  { enabled: true,  label: 'Faturamento',       priority: 8 },
            pcp:          { enabled: false, label: 'PCP',               priority: 99 },
            consultoria:  { enabled: false, label: 'Consultoria',       priority: 99 },
        },
        features: {
            safra: true,            // Controle de safra
            talhoes: true,          // Mapeamento de talhões
            manejo: true,           // Manejo de animais
            custoPorHectare: true,  // Custo por hectare
            curvaABC: true,         // Curva ABC de insumos
            notaProdutor: true,     // Nota fiscal de produtor rural
            climaIntegracao: true,  // Integração com previsão do tempo
            mrp: false,
            pdv: false,
            ordemProducao: false,
        },
        dashboard: {
            widgets: ['producao-safra', 'estoque-insumos', 'contas-pagar', 'faturamento-mes', 'clima-previsao'],
            theme: 'agropecuario'
        }
    },

    // =========================================================
    // COMPLETO — Todos os módulos (Sistema base / Demo)
    // =========================================================
    completo: {
        label: 'Completo',
        description: 'Todos os módulos habilitados',
        icon: '⚡',
        modules: {
            vendas:       { enabled: true, label: 'Vendas',       priority: 1 },
            financeiro:   { enabled: true, label: 'Financeiro',   priority: 2 },
            pcp:          { enabled: true, label: 'PCP',          priority: 3 },
            nfe:          { enabled: true, label: 'NF-e',         priority: 4 },
            faturamento:  { enabled: true, label: 'Faturamento',  priority: 5 },
            compras:      { enabled: true, label: 'Compras',      priority: 6 },
            estoque:      { enabled: true, label: 'Estoque',      priority: 7 },
            rh:           { enabled: true, label: 'RH',           priority: 8 },
            logistica:    { enabled: true, label: 'Logística',    priority: 9 },
            consultoria:  { enabled: true, label: 'Consultoria',  priority: 10 },
        },
        features: {
            mrp: true, ordemProducao: true, kanbanPCP: true, apontamentos: true,
            curvaABC: true, custoProduto: true, fichaTenica: true, qualidade: true,
            pdv: true, crmClientes: true, tabelaPreco: true, comissoes: true,
            promocoes: true, nfConsumidor: true, inventario: true,
            nfServico: true, contratos: true, timesheet: true, propostas: true,
            agendamento: true, safra: true, talhoes: true, manejo: true,
            custoPorHectare: true, notaProdutor: true, climaIntegracao: true,
        },
        dashboard: {
            widgets: ['vendas-dia', 'faturamento-mes', 'estoque-critico', 'contas-receber', 'contas-pagar'],
            theme: 'default'
        }
    }
};

/**
 * Retorna a configuração do setor atual
 * Lê de process.env.SECTOR ou retorna 'completo'
 */
function getSectorConfig() {
    const sector = (process.env.SECTOR || 'completo').toLowerCase();
    return SECTOR_CONFIG[sector] || SECTOR_CONFIG.completo;
}

/**
 * Retorna lista de módulos habilitados, ordenados por prioridade
 */
function getEnabledModules() {
    const config = getSectorConfig();
    return Object.entries(config.modules)
        .filter(([, mod]) => mod.enabled)
        .sort(([, a], [, b]) => a.priority - b.priority)
        .map(([key, mod]) => ({ key, ...mod }));
}

/**
 * Verifica se um módulo está habilitado no setor atual
 */
function isModuleEnabled(moduleName) {
    const config = getSectorConfig();
    const mod = config.modules[moduleName.toLowerCase()];
    return mod ? mod.enabled : false;
}

/**
 * Verifica se uma feature está habilitada no setor atual
 */
function isFeatureEnabled(featureName) {
    const config = getSectorConfig();
    return config.features[featureName] === true;
}

/**
 * Middleware Express que injeta configuração do setor no request
 */
function sectorMiddleware(req, res, next) {
    req.sector = getSectorConfig();
    req.sectorName = (process.env.SECTOR || 'completo').toLowerCase();
    next();
}

/**
 * Retorna configuração do setor como JSON (para API /api/sector/config)
 */
function getSectorConfigAPI() {
    const config = getSectorConfig();
    return {
        sector: (process.env.SECTOR || 'completo').toLowerCase(),
        label: config.label,
        description: config.description,
        icon: config.icon,
        modules: getEnabledModules(),
        features: config.features,
        dashboard: config.dashboard
    };
}

module.exports = {
    SECTOR_CONFIG,
    getSectorConfig,
    getEnabledModules,
    isModuleEnabled,
    isFeatureEnabled,
    sectorMiddleware,
    getSectorConfigAPI
};
