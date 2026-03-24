/* ============================================
   FIX DE NAVEGAÇÃO - PCP
   Garante que as views sejam exibidas corretamente
   ============================================ */

(function() {
    'use strict';

    console.log('🔧 [FIX] Script de correção de Navegação carregado');

    // Aguardar TUDO carregar (DOM + outros scripts)
    window.addEventListener('load', function() {
        // Esperar mais 500ms para garantir que pcp_modern.js terminou
        setTimeout(initFix, 500);
    });

    function initFix() {
        console.log('🔧 [FIX v3] Aplicando correções de Navegação (sobrescrevendo pcp_modern.js)...');

        // 1. Garantir que dashboard-view esteja visível ao carregar
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView) {
            dashboardView.classList.remove('hidden');
            dashboardView.style.display = 'block';
            console.log('✅ [FIX] Dashboard configurado como visível');
        }

        // 2. Garantir que outras views estejam ocultas
        const viewIds = [
            'materiais-view',
            'ordem-compra-view',
            'faturamento-view',
            'gestao-produtos-view'
        ];

        viewIds.forEach(id => {
            const view = document.getElementById(id);
            if (view) {
                view.classList.add('hidden');
                view.style.display = 'none';
            }
        });

        // 3. CORREÇÃO CRÍTICA: Substituir Navegação com mapeamento correto
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        const correctViewMapping = {
            'btn-dashboard': 'dashboard-view',
            'btn-materiais': 'materiais-view',
            'btn-ordem-compra': 'ordem-compra-view',
            'btn-ordens-producao': null, // Página externa - ordens-producao.html
            'btn-faturamento': 'faturamento-view',
            'btn-gestao-produtos': 'gestao-produtos-view'
        };

        console.log(`🔧 [FIX v3] Instalando Navegação corrigida para ${navLinks.length} links...`);
        
        // Usar capture=true para capturar ANTES de outros listeners
        navLinks.forEach((link, index) => {
            console.log(`🔧 [FIX v3] Configurando link ${index + 1}: ${link.id}`);
            
            link.addEventListener('click', function(e) {
                console.log(`🔧 [FIX v3] 🎯 CAPTURADO: ${this.id}`);
                
                const buttonId = this.id;
                console.log(`🔧 [FIX] Navegação corrigida - Clique em: ${buttonId}`);
                
                // Sair é especial
                if (buttonId === 'btn-sair') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    window.location.href = '/painel-controle.html';
                    return;
                }
                
                // Ordens de Produção é página externa - deixar Navegação natural
                if (buttonId === 'btn-ordens-producao') {
                    // não impedir Navegação natural para ordens-producao.html
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Impedir TODOS os outros listeners
                
                const targetViewId = correctViewMapping[buttonId];
                if (!targetViewId) {
                    console.warn('🔧 [FIX] ID de botão desconhecido:', buttonId);
                    return;
                }
                
                console.log(`🔧 [FIX] Mostrando view: ${targetViewId}`);
                
                // Remover active de todos os links
                document.querySelectorAll('.sidebar-nav a').forEach(l => {
                    l.classList.remove('active');
                });
                
                // Adicionar active ao link clicado
                this.classList.add('active');
                
                // Ocultar todas as views
                const allViews = document.querySelectorAll('[id$="-view"]');
                allViews.forEach(view => {
                    view.classList.add('hidden');
                    view.style.display = 'none';
                });
                
                // Mostrar view correta
                const targetView = document.getElementById(targetViewId);
                if (targetView) {
                    targetView.classList.remove('hidden');
                    targetView.style.display = 'block';
                    console.log(`✅ [FIX] View ${targetViewId} exibida com sucesso`);
                    
                    // Inicializar view se necessário
                    setTimeout(() => {
                        if (targetViewId === 'materiais-view' && typeof window.initializeMaterialsView === 'function') {
                            window.initializeMaterialsView();
                        } else if (targetViewId === 'ordem-compra-view' && typeof window.initOrdensCompra === 'function') {
                            window.initOrdensCompra();
                        } else if (targetViewId === 'gestao-produtos-view' && typeof window.initGestaoProdutos === 'function') {
                            window.initGestaoProdutos();
                        }
                    }, 100);
                } else {
                    console.error(`❌ [FIX] View não encontrada: ${targetViewId}`);
                }
                
                // Fechar sidebar mobile se aberta
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.sidebar-overlay');
                if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    if (overlay) overlay.classList.remove('visible');
                }
            }, true); // true = capture phase, executa ANTES
        });
        
        console.log('✅ [FIX v3] Navegação corrigida instalada com capture=true');

        // 3. Adicionar proteção extra para evitar que modal CSS afete views
        const style = document.createElement('style');
        style.textContent = `
            /* proteção: Garantir que views não sejam afetadas pelo CSS do modal */
            [id$="-view"] {
                width: 100%;
                min-height: 100vh;
            }
            
            [id$="-view"]:not(.hidden) {
                display: block !important;
            }
            
            [id$="-view"].hidden {
                display: none !important;
            }
            
            /* Garantir que headers das views sejam visíveis */
            [id$="-view"] .topbar {
                display: flex !important;
                width: 100%;
            }
            
            /* Garantir que modal não interfira */
            #modal-editar-produto {
                position: fixed !important;
                z-index: 10000 !important;
            }
        `;
        document.head.appendChild(style);
        console.log('✅ [FIX] Estilos de proteção aplicados');

        // 4. Forçar re-renderizAção após um momento
        setTimeout(() => {
            const activeView = document.querySelector('[id$="-view"]:not(.hidden)');
            if (activeView) {
                console.log('✅ [FIX] View ativa:', activeView.id);
                // Forçar reflow
                activeView.style.display = 'none';
                activeView.offsetHeight; // Trigger reflow
                activeView.style.display = 'block';
            }
        }, 100);

        console.log('✅ [FIX] Correções aplicadas com sucesso');
    }

})();






