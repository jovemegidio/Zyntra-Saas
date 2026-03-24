'use strict';

/**
 * Page authentication routes — extracted from server.js
 * All HTML-serving routes that require authenticatePage.
 * Includes: RH pages, Vendas pages, module redirects, Financeiro, NFe, Compras, PCP, etc.
 */
const path = require('path');
const fs = require('fs');

module.exports = function mountPageRoutes(app, { authenticatePage, userPermissions }) {
    // ===== FACTORY: Rota protegida por módulo (DRY) =====
    function modulePageHandler(moduleName, filePath, opts = {}) {
        return (req, res) => {
            if (req.user && (req.user.nome || req.user.email)) {
                const firstName = req.user.nome
                    ? req.user.nome.split(' ')[0].toLowerCase()
                    : (req.user.email || '').split('@')[0].toLowerCase();
                if (userPermissions.hasAccess(firstName, moduleName)) {
                    if (opts.noCache) {
                        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        res.setHeader('Pragma', 'no-cache');
                        res.setHeader('Expires', '0');
                    }
                    res.sendFile(path.join(__dirname, '..', filePath));
                } else {
                    res.status(403).send(`<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de ${moduleName}.</p>`);
                }
            } else {
                res.redirect('/login.html');
            }
        };
    }

    function adminPageHandler(filePath) {
        return (req, res) => {
            if (req.user && (req.user.nome || req.user.email)) {
                const firstName = req.user.nome ? req.user.nome.split(' ')[0].toLowerCase() : '';
                const emailPrefix = (req.user.email || '').split('@')[0].toLowerCase();
                if (userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)) {
                    res.sendFile(path.join(__dirname, '..', filePath));
                } else {
                    res.status(403).send('<h1>Acesso Negado</h1><p>Esta página é restrita a administradores.</p>');
                }
            } else {
                res.redirect('/login.html');
            }
        };
    }

    // ===== ROTAS RH =====
    app.get('/RecursosHumanos', authenticatePage, (req, res) => {
        if (req.user && (req.user.nome || req.user.email)) {
            const firstName = req.user.nome ? req.user.nome.split(' ')[0].toLowerCase() : '';
            const emailPrefix = req.user.email ? req.user.email.split('@')[0].toLowerCase() : '';
            if (userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)) {
                return res.redirect('/RH/areaadm.html');
            }
        }
        return res.redirect('/RH/funcionario.html');
    });

    app.get('/RH/', authenticatePage, (req, res) => {
        if (req.user && (req.user.nome || req.user.email)) {
            const firstName = req.user.nome ? req.user.nome.split(' ')[0].toLowerCase() : '';
            const emailPrefix = (req.user.email || '').split('@')[0].toLowerCase();
            if (userPermissions.hasAccess(firstName, 'rh') || userPermissions.hasAccess(emailPrefix, 'rh')) {
                if (userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)) {
                    return res.redirect('/RH/areaadm.html');
                }
                return res.redirect('/RH/funcionario.html');
            } else {
                return res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de RH.</p>');
            }
        }
        return res.redirect('/login.html');
    });

    // RH admin pages
    const rhAdminCheck = (req, res, next) => {
        if (req.user && (req.user.nome || req.user.email)) {
            const firstName = req.user.nome ? req.user.nome.split(' ')[0].toLowerCase() : '';
            const emailPrefix = (req.user.email || '').split('@')[0].toLowerCase();
            if (userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)) {
                return next();
            }
            return res.status(403).send('<h1>Acesso Negado</h1><p>Esta área é restrita a administradores.</p>');
        }
        res.redirect('/login.html');
    };

    app.get('/RH/areaadm.html', authenticatePage, rhAdminCheck, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'modules', 'RH', 'public', 'areaadm.html'));
    });

    app.get('/rh/areaadm', authenticatePage, rhAdminCheck, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'modules', 'RH', 'public', 'areaadm.html'));
    });

    // RH simple pages
    const rhPages = [
        { route: '/RH/area.html', file: 'modules/RH/public/area.html' },
        { route: '/RH/funcionario.html', file: 'modules/RH/public/funcionario.html' },
        { route: '/RH/dashboard.html', file: 'modules/RH/public/pages/dashboard.html' },
        { route: '/RH/dados-pessoais.html', file: 'modules/RH/public/dados-pessoais.html' },
        { route: '/RH/holerites.html', file: 'modules/RH/public/holerites.html' },
        { route: '/RH/solicitacoes.html', file: 'modules/RH/public/solicitacoes.html' },
        { route: '/RH/admin-dashboard.html', file: 'modules/RH/public/admin-dashboard.html' },
        { route: '/RH/admin-funcionarios.html', file: 'modules/RH/public/admin-funcionarios.html' },
        { route: '/RH/admin-folha-pagamento.html', file: 'modules/RH/public/admin-folha-pagamento.html' },
        { route: '/RH/admin-ponto.html', file: 'modules/RH/public/admin-ponto.html' },
        { route: '/RH/gestao-ponto.html', file: 'modules/RH/public/pages/gestao-ponto.html' },
        { route: '/RH/admin-beneficios.html', file: 'modules/RH/public/admin-beneficios.html' },
    ];

    for (const p of rhPages) {
        app.get(p.route, authenticatePage, (req, res) => {
            res.sendFile(path.join(__dirname, '..', p.file));
        });
    }

    app.get('/rh/pages/:page', authenticatePage, (req, res) => {
        const page = req.params.page;
        const fileName = page.endsWith('.html') ? page : `${page}.html`;
        const filePath = path.join(__dirname, '..', 'modules', 'RH', 'public', 'pages', fileName);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send('<h1>Página não encontrada</h1>');
        }
    });

    app.get('/rh/solicitacoes', authenticatePage, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'modules', 'RH', 'public', 'solicitacoes.html'));
    });

    app.get('/rh/funcionario', authenticatePage, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'modules', 'RH', 'public', 'funcionario.html'));
    });

    // ===== VENDAS =====
    app.get('/Vendas/', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/index.html'));
    app.get('/Vendas/kanban.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));
    app.get('/Vendas/index.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));
    app.get('/Vendas/vendas.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));

    app.get('/Vendas/pedidos.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/pedidos.html'));
    app.get('/Vendas/clientes.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/clientes.html'));
    app.get('/Vendas/dashboard.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/dashboard.html'));
    app.get('/Vendas/dashboard-admin.html', authenticatePage, adminPageHandler('modules/Vendas/public/dashboard-admin.html'));
    app.get('/Vendas/relatorios.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/relatorios.html'));
    app.get('/Vendas/prospeccao.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/prospeccao.html'));
    app.get('/Vendas/estoque.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/estoque.html'));
    app.get('/Vendas/comissoes.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/comissoes.html'));
    app.get('/Vendas/cte.html', authenticatePage, modulePageHandler('vendas', 'modules/Vendas/public/cte.html'));

    app.get('/modules/Vendas/', authenticatePage, (req, res) => res.redirect('/Vendas/'));
    app.get('/modules/Vendas/index.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));

    // ===== PCP =====
    app.get('/PCP/index.html', authenticatePage, modulePageHandler('pcp', 'modules/PCP/index.html', { noCache: true }));
    app.get('/modules/PCP/index.html', authenticatePage, (req, res) => res.redirect('/PCP/index.html'));

    // ===== CRM =====
    app.get('/CRM/crm.html', authenticatePage, modulePageHandler('crm', 'modules/CRM/crm.html'));

    // ===== NFe =====
    app.get('/NFe/nfe.html', authenticatePage, modulePageHandler('nfe', 'modules/NFe/index.html'));

    // ===== Compras =====
    app.get('/Compras/compras.html', authenticatePage, modulePageHandler('compras', 'modules/Compras/public/index.html'));
    app.get('/Compras', authenticatePage, modulePageHandler('compras', 'modules/Compras/public/index.html'));
    app.get('/Compras/:page', authenticatePage, modulePageHandler('compras', 'modules/Compras/public/index.html'));

    // ===== REDIRECTS de módulos ("legacy") =====
    app.get('/modules/RH/public/areaadm.html', authenticatePage, (req, res) => res.redirect('/RH/areaadm.html'));
    app.get('/modules/RH/public/area.html', authenticatePage, (req, res) => res.redirect('/RH/funcionario.html'));
    app.get('/modules/RH/public/funcionario.html', authenticatePage, (req, res) => res.redirect('/RH/funcionario.html'));

    app.get('/teste-sincronizacao-estoque.html', authenticatePage, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'teste-sincronizacao-estoque.html'));
    });

    app.get('/dashboard-integracao.html', authenticatePage, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'dashboard-integracao.html'));
    });

    app.get('/integracao', authenticatePage, (req, res) => res.redirect('/dashboard-integracao.html'));

    // Vendas legacy redirects
    app.get('/modules/Vendas/public/vendas.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));
    app.get('/modules/Vendas/public/', authenticatePage, (req, res) => res.redirect('/Vendas/'));
    app.get('/modules/Vendas/public/index.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));

    // Compras redirects
    app.get('/modules/Compras/', authenticatePage, (req, res) => res.redirect('/Compras/compras.html'));
    app.get('/modules/Compras/index.html', authenticatePage, modulePageHandler('compras', 'modules/Compras/public/index.html'));
    app.get('/modules/Compras/public/', authenticatePage, (req, res) => res.redirect('/Compras/compras.html'));
    app.get('/modules/Compras/public/index.html', authenticatePage, modulePageHandler('compras', 'modules/Compras/public/index.html'));

    // Financeiro redirects
    app.get('/modules/Financeiro/', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/index.html'));
    app.get('/modules/Financeiro/public/', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/index.html'));
    app.get('/modules/Financeiro/public/index.html', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/index.html'));

    app.get('/modules/Financeiro/public/contas_pagar.html', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/contas-pagar.html'));
    app.get('/modules/Financeiro/public/contas_receber.html', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/contas-receber.html'));
    app.get('/modules/Financeiro/public/fluxo_caixa.html', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/fluxo-caixa.html'));
    app.get('/modules/Financeiro/public/contas_bancarias.html', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/bancos.html'));
    app.get('/modules/Financeiro/public/relatorios.html', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/relatorios.html'));

    app.get('/modules/Financeiro/index.html', authenticatePage, modulePageHandler('financeiro', 'modules/Financeiro/index.html'));

    app.get('/modules/Financeiro/public/*.html', authenticatePage, (req, res) => {
        const fileName = req.path.split('/').pop();
        const fileMapping = {
            'index.html': 'index.html',
            'contas_pagar.html': 'contas-pagar.html',
            'contas_receber.html': 'contas-receber.html',
            'fluxo_caixa.html': 'fluxo-caixa.html',
            'contas_bancarias.html': 'bancos.html',
            'relatorios.html': 'relatorios.html'
        };
        const newFileName = fileMapping[fileName] || fileName.replace(/_/g, '-');
        res.redirect(`/modules/Financeiro/${newFileName}`);
    });

    // NFe redirects
    app.get('/modules/NFe/', authenticatePage, (req, res) => res.redirect('/NFe/nfe.html'));
    app.get('/modules/NFe/public/', authenticatePage, (req, res) => res.redirect('/NFe/nfe.html'));
    app.get('/modules/NFe/index.html', authenticatePage, modulePageHandler('nfe', 'modules/NFe/index.html'));
    app.get('/modules/NFe/nfe.html', authenticatePage, (req, res) => res.redirect('/NFe/nfe.html'));
    app.get('/NFe/', authenticatePage, (req, res) => res.redirect('/NFe/nfe.html'));

    app.get('/modules/Compras/compras.html', authenticatePage, (req, res) => res.redirect('/Compras/compras.html'));
    app.get('/Compras/', authenticatePage, (req, res) => res.redirect('/Compras/compras.html'));

    app.get('/modules/Financeiro/financeiro.html', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/index.html'));

    // Faturamento
    app.get('/modules/Faturamento/index.html', authenticatePage, (req, res) => {
        if (req.user && req.user.permissoes && req.user.permissoes.includes('nfe')) {
            res.sendFile(path.join(__dirname, '..', 'modules', 'Faturamento', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Faturamento.</p>');
        }
    });

    app.get('/Faturamento/', authenticatePage, (req, res) => res.redirect('/modules/Faturamento/index.html'));
    app.get('/Financeiro/', authenticatePage, (req, res) => res.redirect('/modules/Financeiro/index.html'));

    // NFe legacy redirects
    app.get('/e-Nf-e/nfe.html', authenticatePage, (req, res) => res.redirect('/NFe/nfe.html'));
    app.get('/modules/e-Nf-e/nfe.html', authenticatePage, (req, res) => res.redirect('/NFe/nfe.html'));

    // Login redirects — force all module login pages to central login
    app.get([
        '/Vendas/login.html', '/Vendas/login', '/Vendas/public/login.html', '/Vendas/public/login',
        '/PCP/login', '/PCP/login.html',
        '/CRM/login', '/CRM/login.html',
        '/Financeiro/login', '/Financeiro/login.html',
        '/NFe/login', '/NFe/login.html',
        '/Compras/login', '/Compras/login.html'
    ], (req, res) => {
        return res.redirect('/login.html');
    });
};
