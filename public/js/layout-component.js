/**
 * ZYNTRA ERP — Layout Component
 * Injeta header + sidebar padronizados em qualquer página do sistema.
 *
 * Uso: adicione ao <body>:
 *   data-empresa-id="1"          — ID da empresa (opcional, usa sessionStorage se omitido)
 *   data-modulo-ativo="faturamento" — slug do módulo atual (para marcar ativo na sidebar)
 *   data-titulo-modulo="NF-e"    — título exibido no header após o logo
 *   data-empresa-nome="Aluforce" — nome da empresa (opcional, usa sessionStorage)
 *
 * Versão: 1.0 | Data: 2026-05-01
 */
(function () {
    'use strict';

    // ── 1. CONFIGURAÇÃO DOS MÓDULOS ────────────────────────────────
    const MODULOS = [
        { slug: 'dashboard',   icon: 'fas fa-home',               label: 'Painel',           href: '/dashboard' },
        { slug: 'vendas',      icon: 'fas fa-shopping-cart',      label: 'Vendas',            href: '/modules/Vendas/public/index.html' },
        { slug: 'faturamento', icon: 'fas fa-file-invoice-dollar',label: 'Faturamento',       href: '/modules/Faturamento/public/index.html' },
        { slug: 'financeiro',  icon: 'fas fa-wallet',             label: 'Financeiro',        href: '/modules/Financeiro/index.html' },
        { slug: 'compras',     icon: 'fas fa-truck-loading',      label: 'Compras',           href: '/modules/Compras/index.html' },
        { slug: 'pcp',         icon: 'fas fa-industry',           label: 'PCP',               href: '/modules/PCP/index.html' },
        { slug: 'logistica',   icon: 'fas fa-shipping-fast',      label: 'Log\u00edstica',    href: '/modules/Logistica/public/index.html' },
        { slug: 'rh',          icon: 'fas fa-users',              label: 'RH',                href: '/modules/RH/index.html' },
        { slug: 'relatorios',  icon: 'fas fa-chart-bar',          label: 'Relat\u00f3rios',   href: '/relatorios', bottom: true },
        { slug: 'config',      icon: 'fas fa-cog',                label: 'Configura\u00e7\u00f5es', href: '/config.html', bottom: true },
    ];

    // ── 2. LEITURA DOS ATRIBUTOS ───────────────────────────────────
    function getBodyAttr(name, fallback) {
        return document.body.getAttribute('data-' + name) || fallback;
    }

    function getUserData() {
        try {
            const raw = sessionStorage.getItem('userData') || localStorage.getItem('userData');
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return null;
    }

    function getEmpresaNome() {
        const fromAttr = getBodyAttr('empresa-nome', null);
        if (fromAttr) return fromAttr;
        const user = getUserData();
        if (user && user.empresa_nome) return user.empresa_nome;
        return 'Zyntra ERP';
    }

    function getUserNome() {
        const user = getUserData();
        if (!user) return '';
        return user.nome || user.name || user.username || 'Usuário';
    }

    function getModuloAtivo() {
        return getBodyAttr('modulo-ativo', '');
    }

    function getTituloModulo() {
        return getBodyAttr('titulo-modulo', '');
    }

    // ── 3. SAUDAÇÃO TEMPORAL ───────────────────────────────────────
    function getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Bom dia';
        if (h < 18) return 'Boa tarde';
        return 'Boa noite';
    }

    // ── 4. CSS CRÍTICO — injetar se não estiver no <head> ─────────
    const REQUIRED_CSS = [
        { id: 'css-design-system',     href: '/css/design-system.css?v=20260501' },
        { id: 'css-global-header',     href: '/css/global-header-sidebar.css?v=20260501' },
        { id: 'css-components',        href: '/css/components.css?v=20260501' },
    ];

    function injectCSS() {
        const head = document.head;
        REQUIRED_CSS.forEach(function (css) {
            if (!document.getElementById(css.id)) {
                const link = document.createElement('link');
                link.id = css.id;
                link.rel = 'stylesheet';
                link.href = css.href;
                head.insertBefore(link, head.firstChild);
            }
        });
    }

    // ── 5. CONSTRUIR HTML DO SIDEBAR ──────────────────────────────
    function buildSidebar(moduloAtivo) {
        const mainItems = MODULOS.filter(function (m) { return !m.bottom; });
        const bottomItems = MODULOS.filter(function (m) { return m.bottom; });

        function renderItem(m) {
            const isActive = moduloAtivo && m.slug === moduloAtivo;
            return '<a href="' + m.href + '" class="sidebar-btn' + (isActive ? ' active' : '') + '" data-title="' + m.label + '">' +
                   '<i class="' + m.icon + '"></i></a>';
        }

        const navHTML = mainItems.map(renderItem).join('\n');
        const bottomHTML = bottomItems.map(renderItem).join('\n');

        return '' +
            '<div class="sidebar-overlay" id="zc-sidebar-overlay"></div>' +
            '<aside class="sidebar" id="zc-sidebar">' +
            '  <a href="/dashboard" class="sidebar-logo" data-title="Painel Principal"><i class="fas fa-home"></i></a>' +
            '  <nav class="sidebar-nav" id="zc-sidebar-nav">' +
            navHTML +
            '  </nav>' +
            '  <div class="sidebar-bottom">' +
            bottomHTML +
            '  </div>' +
            '</aside>';
    }

    // ── 6. CONSTRUIR HTML DO HEADER ───────────────────────────────
    function buildHeader(empresaNome, tituloModulo, userNome) {
        const greeting = getGreeting();
        const moduloLabel = tituloModulo ? ' \u2014 ' + tituloModulo : '';

        // Iniciais do usuário para avatar
        const initials = userNome
            ? userNome.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase()
            : 'U';

        return '<header class="header" id="zc-header">' +
            '  <div class="header-left">' +
            '    <button class="mobile-menu-btn" id="zc-mobile-menu-btn" title="Menu" aria-label="Abrir menu">' +
            '      <i class="fas fa-bars"></i>' +
            '    </button>' +
            '    <div class="header-brand">' +
            '      <img id="zc-empresa-logo" src="/images/Logo Monocromatico - Branco - Aluforce.png" alt="' + empresaNome + '" style="height:22px;object-fit:contain;">' +
            '      <span style="color:rgba(255,255,255,0.2);font-weight:300;font-size:18px;">|</span>' +
            '      <img src="/images/zyntra-branco.png" alt="Zyntra" style="height:22px;object-fit:contain;">' +
            '      <span id="zc-modulo-label" style="color:rgba(255,255,255,0.3);font-size:12px;margin-left:4px;">' + moduloLabel + '</span>' +
            '    </div>' +
            '  </div>' +
            '  <div class="header-right">' +
            '    <button class="header-btn" title="Atualizar" onclick="location.reload()">' +
            '      <i class="fas fa-sync-alt"></i>' +
            '    </button>' +
            '    <button class="header-btn" id="zc-notification-btn" title="Notificações">' +
            '      <i class="fas fa-bell"></i>' +
            '    </button>' +
            '    <div class="user-greeting">' +
            '      <span id="zc-greeting">' + greeting + '</span>, <strong id="zc-user-name">' + userNome + '</strong>' +
            '    </div>' +
            '    <div class="user-avatar" id="zc-user-avatar" title="' + userNome + '">' +
            '      <span id="zc-user-initials">' + initials + '</span>' +
            '    </div>' +
            '  </div>' +
            '</header>';
    }

    // ── 7. INJEÇÃO NO DOM ─────────────────────────────────────────
    function injectLayout() {
        const moduloAtivo   = getModuloAtivo();
        const tituloModulo  = getTituloModulo();
        const empresaNome   = getEmpresaNome();
        const userNome      = getUserNome();

        // Garante que .app-container existe
        let container = document.querySelector('.app-container');
        if (!container) {
            const wrapper = document.createElement('div');
            wrapper.className = 'app-container';
            while (document.body.firstChild) {
                wrapper.appendChild(document.body.firstChild);
            }
            document.body.appendChild(wrapper);
            container = wrapper;
        }

        // ── Verificar se já existe sidebar com navegação do módulo ────
        // Se existir, PRESERVAR (respeitar navegação intra-módulo específica).
        // Se não existir, injetar o sidebar de navegação cross-módulo.
        const existingSidebar = container.querySelector('aside.sidebar:not(#zc-sidebar)');
        const hasManagedSidebar = !!document.getElementById('zc-sidebar');
        const shouldInjectSidebar = !existingSidebar && !hasManagedSidebar;

        // Remover apenas duplicatas gerenciadas por este script
        const zcSidebar  = document.getElementById('zc-sidebar');
        const zcOverlay  = document.getElementById('zc-sidebar-overlay');
        const zcHeader   = document.getElementById('zc-header');
        if (zcSidebar)  zcSidebar.remove();
        if (zcOverlay)  zcOverlay.remove();
        if (zcHeader)   zcHeader.remove();

        // Remover header hardcoded (sempre substituído pelo padronizado)
        const existingHeader = container.querySelector('header.header:not(#zc-header)');
        if (existingHeader) existingHeader.remove();

        // Garantir .main-area
        let mainArea = container.querySelector('.main-area');
        if (!mainArea) {
            mainArea = document.createElement('main');
            mainArea.className = 'main-area';
            const children = Array.from(container.children);
            children.forEach(function (child) {
                if (!child.classList.contains('sidebar') &&
                    !child.classList.contains('sidebar-overlay') &&
                    !child.classList.contains('header')) {
                    mainArea.appendChild(child);
                }
            });
            container.appendChild(mainArea);
        }

        if (shouldInjectSidebar) {
            // Nenhum sidebar existente → injetar sidebar de navegação cross-módulo
            const sidebarFrag = document.createElement('div');
            sidebarFrag.innerHTML = buildSidebar(moduloAtivo);
            while (sidebarFrag.firstChild) {
                container.insertBefore(sidebarFrag.firstChild, mainArea);
            }
        } else if (existingSidebar && !existingSidebar.id) {
            // Sidebar existente sem ID → atribuir ID para ser gerenciado
            existingSidebar.id = 'zc-sidebar';
            // Atualizar botão ativo no sidebar existente
            if (moduloAtivo) {
                existingSidebar.querySelectorAll('.sidebar-btn').forEach(function (btn) {
                    const href = btn.getAttribute('href') || '';
                    const isActive = href.toLowerCase().includes(moduloAtivo);
                    btn.classList.toggle('active', isActive);
                });
            }
        }

        // Sempre injetar/substituir o header (padronização visual)
        const headerFrag = document.createElement('div');
        headerFrag.innerHTML = buildHeader(empresaNome, tituloModulo, userNome);
        mainArea.insertBefore(headerFrag.firstChild, mainArea.firstChild);

        // Eventos mobile (funciona com qualquer sidebar)
        setupMobileEvents();

        // Atualizar dados do usuário via sessionStorage (assíncrono)
        refreshUserData();
    }

    // ── 8. MOBILE — abrir/fechar sidebar ─────────────────────────
    function setupMobileEvents() {
        const menuBtn = document.getElementById('zc-mobile-menu-btn');
        // Compatível com sidebar gerenciado (#zc-sidebar) e pré-existente
        const getSidebar = function () {
            return document.getElementById('zc-sidebar') ||
                   document.querySelector('aside.sidebar');
        };
        const getOverlay = function () {
            return document.getElementById('zc-sidebar-overlay') ||
                   document.getElementById('sidebar-overlay') ||
                   document.querySelector('.sidebar-overlay');
        };

        function openSidebar() {
            const s = getSidebar();
            const o = getOverlay();
            if (s) s.classList.add('open');
            if (o) o.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebar() {
            const s = getSidebar();
            const o = getOverlay();
            if (s) s.classList.remove('open');
            if (o) o.classList.remove('active');
            document.body.style.overflow = '';
        }

        if (menuBtn) {
            menuBtn.removeEventListener('click', menuBtn._zcOpen);
            menuBtn._zcOpen = openSidebar;
            menuBtn.addEventListener('click', openSidebar);
        }
        const overlay = getOverlay();
        if (overlay && !overlay._zcBound) {
            overlay._zcBound = true;
            overlay.addEventListener('click', closeSidebar);
        }

        // Fechar ao pressionar Escape
        if (!window._zcEscBound) {
            window._zcEscBound = true;
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') closeSidebar();
            });
        }

        // Expor globalmente para compatibilidade com código legado
        window.toggleMobileSidebar = function () {
            const s = getSidebar();
            if (s && s.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        };
    }

    // ── 9. ATUALIZAR DADOS DO USUÁRIO ─────────────────────────────
    function refreshUserData() {
        // Verificar se auth-unified.js já expôs os dados
        const tryUpdate = function () {
            const user = getUserData();
            if (!user) return;

            const nameEl     = document.getElementById('zc-user-name');
            const initialsEl = document.getElementById('zc-user-initials');
            const avatarEl   = document.getElementById('zc-user-avatar');

            const nome = user.nome || user.name || user.username || 'Usuário';

            if (nameEl)     nameEl.textContent = nome;
            if (initialsEl) {
                const initials = nome.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
                initialsEl.textContent = initials;
            }

            // Avatar com foto se disponível
            if (avatarEl && user.avatar_url) {
                avatarEl.innerHTML = '<img src="' + user.avatar_url + '" alt="' + nome + '">';
            }

            // Atualizar saudação
            const greetingEl = document.getElementById('zc-greeting');
            if (greetingEl) greetingEl.textContent = getGreeting();

            // Atualizar logo da empresa se empresa_id diferente de Aluforce
            const logoEl = document.getElementById('zc-empresa-logo');
            if (logoEl && user.empresa_id) {
                const logoMap = {
                    1: '/images/Logo Monocromatico - Branco - Aluforce.png',
                    2: '/images/Logo Monocromatico - Branco - Labor Eletric.png',
                    3: '/images/Logo Monocromatico - Branco - Labor Energy.png',
                };
                const src = logoMap[user.empresa_id];
                if (src) {
                    logoEl.src = src;
                    logoEl.onerror = function () {
                        // Fallback se a imagem não existir
                        this.src = '/images/Logo Monocromatico - Branco - Aluforce.png';
                        this.onerror = null;
                    };
                }
            }
        };

        tryUpdate();
        // Tentativas progressivas caso auth-unified.js ainda não finalizou
        setTimeout(tryUpdate, 300);
        setTimeout(tryUpdate, 800);
    }

    // ── 10. MARCAR MÓDULO ATIVO COM BASE NA URL ───────────────────
    function detectModuloAtivo() {
        const moduloAtivo = getModuloAtivo();
        if (moduloAtivo) return moduloAtivo;

        const path = window.location.pathname.toLowerCase();
        for (let i = 0; i < MODULOS.length; i++) {
            const m = MODULOS[i];
            if (path.includes('/' + m.slug + '/') || path.includes('/' + m.slug + '.html')) {
                return m.slug;
            }
        }
        if (path === '/' || path.includes('/dashboard')) return 'dashboard';
        return '';
    }

    // ── 11. INICIALIZAÇÃO ─────────────────────────────────────────
    function init() {
        injectCSS();

        // Definir modulo ativo via auto-detecção se não definido
        if (!document.body.getAttribute('data-modulo-ativo')) {
            const detected = detectModuloAtivo();
            if (detected) document.body.setAttribute('data-modulo-ativo', detected);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectLayout);
        } else {
            injectLayout();
        }
    }

    init();

    // ── 12. API PÚBLICA ───────────────────────────────────────────
    window.ZyntraLayout = {
        /** Re-renderizar o layout (útil após troca de empresa) */
        refresh: function () { injectLayout(); },
        /** Atualizar apenas os dados do usuário no header */
        refreshUser: function () { refreshUserData(); },
        /** Fechar sidebar mobile */
        closeSidebar: function () {
            const sidebar = document.getElementById('zc-sidebar');
            const overlay  = document.getElementById('zc-sidebar-overlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

})();
