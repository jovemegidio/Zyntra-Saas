// =================================================================
// MIDDLEWARE: Interceptor de Relatórios → Notificação n8n
// ALUFORCE ERP v2.0
// =================================================================
// Intercepta res.send/res.end em rotas de relatórios e dispara
// notificação automática para o n8n quando qualquer relatório
// é gerado (PDF, Excel, CSV, XML, ZIP).
// =================================================================

'use strict';

const { getN8nIntegration } = require('../services/n8n-integration');

// Mapeamento de Content-Type → tipo de relatório
const REPORT_CONTENT_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
    'application/vnd.ms-excel': 'excel',
    'text/csv': 'csv',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'application/zip': 'zip',
    'application/octet-stream': 'arquivo'
};

// Mapeamento de path → módulo + nome do relatório
const REPORT_ROUTES = {
    // ─── VENDAS ────────────────────────────
    '/relatorios/vendas-periodo/pdf':    { modulo: 'vendas', nome: 'Relatório de Vendas por Período' },
    '/relatorios/comissoes/pdf':         { modulo: 'vendas', nome: 'Relatório de Comissões' },
    '/relatorios/clientes/pdf':          { modulo: 'vendas', nome: 'Relatório de Clientes' },
    '/relatorios/produtos/pdf':          { modulo: 'vendas', nome: 'Relatório de Produtos' },
    '/comissoes/exportar':               { modulo: 'vendas', nome: 'Exportação de Comissões (CSV)' },
    '/orcamento':                        { modulo: 'vendas', nome: 'Orçamento/Pedido PDF' },
    '/pdf':                              { modulo: 'vendas', nome: 'Pedido PDF' },

    // ─── FINANCEIRO ────────────────────────
    '/financeiro/relatorios/dre':        { modulo: 'financeiro', nome: 'DRE - Demonstrativo de Resultados' },
    '/financeiro/relatorios/lucratividade': { modulo: 'financeiro', nome: 'Relatório de Lucratividade' },
    '/financeiro/relatorios':            { modulo: 'financeiro', nome: 'Relatório Financeiro Personalizado' },

    // ─── NF-e / FISCAL ────────────────────
    '/nfe/relatorios/faturamento':       { modulo: 'nfe', nome: 'Relatório de Faturamento NF-e' },
    '/nfe/contabilidade/xmls':           { modulo: 'nfe', nome: 'Download XMLs Contabilidade' },
    '/nfe/xml':                          { modulo: 'nfe', nome: 'XML de NF-e' },

    // ─── PCP / PRODUÇÃO ───────────────────
    '/api/templates/generate-excel':     { modulo: 'pcp', nome: 'Template Excel Gerado' },
    '/api/gerar-ordem-excel':            { modulo: 'pcp', nome: 'Ordem de Produção (Excel)' },

    // ─── RH ───────────────────────────────
    '/holerites/download':               { modulo: 'rh', nome: 'Holerite (Download PDF)' },
    '/holerites/relatorio/visualizacoes': { modulo: 'rh', nome: 'Relatório de Visualizações de Holerites' },

    // ─── COMPRAS ──────────────────────────
    '/compras/relatorios/gastos':        { modulo: 'compras', nome: 'Relatório de Gastos por Período' },

    // ─── LGPD ─────────────────────────────
    '/lgpd/exportar':                    { modulo: 'lgpd', nome: 'Exportação de Dados Pessoais (LGPD)' }
};

/**
 * Detecta o módulo a partir do path da requisição
 */
function detectarModulo(path) {
    // Checar rotas exatas primeiro
    for (const [route, info] of Object.entries(REPORT_ROUTES)) {
        if (path.includes(route)) return info;
    }

    // Fallback: detectar pelo path
    if (path.includes('/vendas'))       return { modulo: 'vendas', nome: 'Relatório de Vendas' };
    if (path.includes('/financeiro'))   return { modulo: 'financeiro', nome: 'Relatório Financeiro' };
    if (path.includes('/nfe'))          return { modulo: 'nfe', nome: 'Relatório NF-e' };
    if (path.includes('/pcp'))          return { modulo: 'pcp', nome: 'Relatório PCP' };
    if (path.includes('/rh'))           return { modulo: 'rh', nome: 'Relatório RH' };
    if (path.includes('/compras'))      return { modulo: 'compras', nome: 'Relatório Compras' };
    if (path.includes('/logistica'))    return { modulo: 'logistica', nome: 'Relatório Logística' };
    if (path.includes('/lgpd'))         return { modulo: 'lgpd', nome: 'Relatório LGPD' };

    return { modulo: 'sistema', nome: 'Relatório do Sistema' };
}

/**
 * Extrai nome do arquivo do Content-Disposition header
 */
function extrairNomeArquivo(contentDisposition) {
    if (!contentDisposition) return null;
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    return match ? match[1].replace(/['"]/g, '') : null;
}

/**
 * Middleware interceptor de relatórios.
 * Coloque ANTES das rotas que geram relatórios.
 * Não bloqueia nem altera a resposta — apenas observa e notifica.
 */
function reportInterceptor() {
    return function (req, res, next) {
        // Guardar referência do método original
        const originalSend = res.send.bind(res);
        const originalEnd = res.end.bind(res);

        let notified = false;

        function notificarSeRelatorio() {
            if (notified) return;

            const contentType = (res.getHeader('content-type') || '').toString().toLowerCase();
            const contentDisposition = (res.getHeader('content-disposition') || '').toString();
            const statusCode = res.statusCode;

            // Só notificar respostas de sucesso (2xx)
            if (statusCode < 200 || statusCode >= 300) return;

            // Verificar se é um tipo de relatório
            let tipoRelatorio = null;
            for (const [ct, tipo] of Object.entries(REPORT_CONTENT_TYPES)) {
                if (contentType.includes(ct)) {
                    tipoRelatorio = tipo;
                    break;
                }
            }

            // Se tem Content-Disposition com filename, provavelmente é relatório/download
            if (!tipoRelatorio && contentDisposition.includes('filename')) {
                const filename = extrairNomeArquivo(contentDisposition) || '';
                if (filename.endsWith('.pdf')) tipoRelatorio = 'pdf';
                else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) tipoRelatorio = 'excel';
                else if (filename.endsWith('.csv')) tipoRelatorio = 'csv';
                else if (filename.endsWith('.xml')) tipoRelatorio = 'xml';
                else if (filename.endsWith('.zip')) tipoRelatorio = 'zip';
            }

            if (!tipoRelatorio) return;

            notified = true;

            // Detectar módulo e nome
            const routeInfo = detectarModulo(req.originalUrl || req.url);
            const nomeArquivo = extrairNomeArquivo(contentDisposition);

            // Dados do usuário (do JWT ou session)
            const usuario = req.user?.nome || req.user?.name || req.user?.username || 'Sistema';
            const emailUsuario = req.user?.email || '';

            // Disparar evento assíncrono (não bloqueia a resposta)
            const n8n = getN8nIntegration();
            n8n.onRelatorioGerado({
                modulo: routeInfo.modulo,
                nome_relatorio: nomeArquivo
                    ? `${routeInfo.nome} (${nomeArquivo})`
                    : routeInfo.nome,
                tipo_relatorio: tipoRelatorio,
                usuario: usuario,
                email_usuario: emailUsuario,
                descricao: `Gerado via ${req.method} ${req.originalUrl || req.url}`,
                parametros: req.query || {},
                link_download: ''
            }).catch(err => {
                console.error('⚠️ [n8n] Erro ao notificar relatório:', err.message);
            });
        }

        // Interceptar res.send
        res.send = function (...args) {
            notificarSeRelatorio();
            return originalSend(...args);
        };

        // Interceptar res.end (para streams/pipes)
        res.end = function (...args) {
            notificarSeRelatorio();
            return originalEnd(...args);
        };

        next();
    };
}

module.exports = { reportInterceptor, REPORT_ROUTES, REPORT_CONTENT_TYPES };
