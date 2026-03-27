/**
 * ALUFORCE - Sistema de Permissões do Módulo Financeiro
 * Gerencia a visibilidade de itens da sidebar baseado nas permissões do usuário
 */

(function() {
    'use strict';

    // Executar verificação de acesso IMEDIATAMENTE (antes do DOM)
    verificarAcessoImediato();

    // Aguardar o carregamento do DOM e aplicar permissões na sidebar
    document.addEventListener('DOMContentLoaded', function() {
        carregarEAplicarPermissoesSidebar();
    });

    function verificarAcessoImediato() {
        fetch('/api/financeiro/permissoes', { credentials: 'include' })
            .then(resp => {
                if (!resp.ok) return null;
                return resp.json();
            })
            .then(data => {
                if (data && data.permissoes) {
                    const perms = data.permissoes;
                    const pathname = window.location.pathname.toLowerCase();

                    window.financeiroPermissoes = perms;

                    // Verificar acesso à página atual
                    if (pathname.includes('contas-pagar') && perms.contas_pagar === false) {
                        redirecionarParaPaginaPermitidaAPI(perms);
                    }
                    if (pathname.includes('contas-receber') && perms.contas_receber === false) {
                        redirecionarParaPaginaPermitidaAPI(perms);
                    }

                    if (document.readyState !== 'loading') {
                        aplicarPermissoesSidebar(perms);
                    }
                }
            })
            .catch(err => {
                console.error('[FinanceiroPermissions] Erro:', err);
            });
    }

    function redirecionarParaPaginaPermitidaAPI(perms) {
        if (perms.contas_receber !== false) {
            window.location.href = 'contas-receber.html';
        } else if (perms.contas_pagar !== false) {
            window.location.href = 'contas-pagar.html';
        } else if (perms.fluxo_caixa !== false) {
            window.location.href = 'fluxo-caixa.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    async function carregarEAplicarPermissoesSidebar() {
        try {
            if (window.financeiroPermissoes) {
                aplicarPermissoesSidebar(window.financeiroPermissoes);
                return;
            }

            const resp = await fetch('/api/financeiro/permissoes', { credentials: 'include' });
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.permissoes) {
                    window.financeiroPermissoes = data.permissoes;
                    aplicarPermissoesSidebar(data.permissoes);
                }
            }
        } catch (e) {
            console.error('[FinanceiroPermissions] Erro:', e);
        }
    }

    function aplicarPermissoesSidebar(perms) {
        // Esconder itens da sidebar baseado nas permissões (por ID)
        ocultarItemSeNaoTemPermissao('menu-contas-receber', perms.contas_receber);
        ocultarItemSeNaoTemPermissao('menu-contas-pagar', perms.contas_pagar);
        ocultarItemSeNaoTemPermissao('menu-fluxo-caixa', perms.fluxo_caixa);
        ocultarItemSeNaoTemPermissao('menu-bancos', perms.bancos);
        ocultarItemSeNaoTemPermissao('menu-conciliacao', perms.conciliacao);
        ocultarItemSeNaoTemPermissao('menu-relatorios', perms.relatorios);

        // Por href (nomes de arquivo reais com hífens)
        ocultarLinkPorHref('contas-receber.html', perms.contas_receber);
        ocultarLinkPorHref('contas-pagar.html', perms.contas_pagar);
        ocultarLinkPorHref('fluxo-caixa.html', perms.fluxo_caixa);
        ocultarLinkPorHref('bancos.html', perms.bancos);
        ocultarLinkPorHref('conciliacao.html', perms.conciliacao);

        // Esconder aba de relatórios CR/CP conforme permissão
        aplicarPermissoesRelatorios(perms);
    }

    function ocultarItemSeNaoTemPermissao(id, temPermissao) {
        if (temPermissao === false) {
            const item = document.getElementById(id);
            if (item) item.style.display = 'none';
        }
    }

    function ocultarLinkPorHref(href, temPermissao) {
        if (temPermissao === false) {
            document.querySelectorAll('.sidebar-nav a[href*="' + href + '"]').forEach(function(link) {
                var container = link.closest('li') || link;
                container.style.display = 'none';
            });
        }
    }

    function aplicarPermissoesRelatorios(perms) {
        // Na página de relatórios, esconder aba CR ou CP conforme permissão
        if (perms.contas_receber === false) {
            var tabCR = document.getElementById('tab-btn-cr');
            if (tabCR) tabCR.style.display = 'none';
            document.querySelectorAll('[data-aba="cr"]').forEach(function(el) { el.style.display = 'none'; });
            // Ativar aba CP por padrão se CR bloqueada
            var tabCP = document.getElementById('tab-btn-cp');
            if (tabCP) { tabCP.classList.add('ativa'); }
            document.querySelectorAll('[data-aba="cp"]').forEach(function(el) { el.style.display = ''; });
        }
        if (perms.contas_pagar === false) {
            var tabCP2 = document.getElementById('tab-btn-cp');
            if (tabCP2) tabCP2.style.display = 'none';
            document.querySelectorAll('[data-aba="cp"]').forEach(function(el) { el.style.display = 'none'; });
            // Ativar aba CR por padrão se CP bloqueada
            var tabCR2 = document.getElementById('tab-btn-cr');
            if (tabCR2) { tabCR2.classList.add('ativa'); }
            document.querySelectorAll('[data-aba="cr"]').forEach(function(el) { el.style.display = ''; });
        }
    }

    // Exportar para uso global
    window.FinanceiroPermissions = {
        aplicar: aplicarPermissoesSidebar,
        carregar: carregarEAplicarPermissoesSidebar
    };
})();
