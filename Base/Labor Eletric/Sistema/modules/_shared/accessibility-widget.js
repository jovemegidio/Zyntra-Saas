/**
 * ZYNTRA / ALUFORCE — Accessibility Widget v2.2
 * Sidebar e header sempre escuros (padrão permanente).
 * Painel abre pelo botão #accessibility-btn no header.
 * Dark mode afeta APENAS .sidebar e .header — conteúdo não muda.
 */
(function () {
    'use strict';

    if (window.__a11yWidgetLoaded) return;
    window.__a11yWidgetLoaded = true;

    var K = {
        dark:     'a11yDarkMode',
        font:     'a11yFontStep',
        contrast: 'a11yHighContrast',
        spacing:  'a11yTextSpacing',
        cursor:   'a11yBigCursor',
        links:    'a11yLinks',
        gray:     'a11yGrayscale'
    };

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function rm(k)  { try { localStorage.removeItem(k); } catch (e) {} }

    /* Dark mode é ON por padrão — só fica OFF se o usuário explicitamente desativou ('0') */
    var darkOn = get(K.dark) !== '0';

    /* Aplicar antes do paint para evitar flash */
    if (darkOn) document.documentElement.classList.add('a11y-dark-mode');

    /* Fonte salva */
    var _step = parseInt(get(K.font) || '0', 10);
    if (_step !== 0) document.documentElement.style.fontSize = (16 + _step * 2) + 'px';

    /* ── Estilos ── */
    function injectStyles() {
        if (document.getElementById('a11y-widget-styles')) return;
        var s = document.createElement('style');
        s.id = 'a11y-widget-styles';
        s.textContent =
            /* Sidebar escura */
            'html.a11y-dark-mode .sidebar{background:#111827!important;border-right-color:rgba(255,255,255,.06)!important}' +
            'html.a11y-dark-mode .sidebar-btn{color:#9ca3af!important}' +
            'html.a11y-dark-mode .sidebar-btn:hover{background:rgba(255,255,255,.08)!important;color:#f3f4f6!important}' +
            'html.a11y-dark-mode .sidebar-btn.active{background:rgba(255,255,255,.12)!important;color:#fff!important}' +
            'html.a11y-dark-mode .sidebar-btn.active::before{background:#fff!important}' +
            'html.a11y-dark-mode .sidebar-logo{background:#1f2937!important}' +
            'html.a11y-dark-mode .sidebar-divider{background:rgba(255,255,255,.06)!important}' +
            'html.a11y-dark-mode .sidebar-bottom{border-top-color:rgba(255,255,255,.06)!important}' +
            /* Sidebar nav buttons sem classe .sidebar-btn */
            'html.a11y-dark-mode .sidebar-nav>button,html.a11y-dark-mode .sidebar-bottom>button{color:#9ca3af!important}' +
            'html.a11y-dark-mode .sidebar-nav>button:hover,html.a11y-dark-mode .sidebar-bottom>button:hover{background:rgba(255,255,255,.08)!important;color:#f3f4f6!important}' +
            /* Header escuro */
            'html.a11y-dark-mode .header,html.a11y-dark-mode .main-header,html.a11y-dark-mode .topbar,html.a11y-dark-mode .dash-nav{background:#111827!important;border-bottom-color:rgba(255,255,255,.06)!important}' +
            'html.a11y-dark-mode .header-btn{color:#9ca3af!important}' +
            'html.a11y-dark-mode .header-btn:hover{background:rgba(255,255,255,.08)!important;color:#f3f4f6!important}' +
            'html.a11y-dark-mode .header-icon-btn{background:transparent!important;color:#9ca3af!important}' +
            'html.a11y-dark-mode .header-icon-btn:hover{background:rgba(255,255,255,.08)!important;color:#f3f4f6!important}' +
            'html.a11y-dark-mode .dash-nav__link,html.a11y-dark-mode .dash-nav__user,html.a11y-dark-mode .dash-nav__notifications{color:#d1d5db!important}' +
            'html.a11y-dark-mode .dash-nav__link:hover,html.a11y-dark-mode .dash-nav__link.active,html.a11y-dark-mode .dash-nav__user:hover,html.a11y-dark-mode .dash-nav__notifications:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}' +
            'html.a11y-dark-mode .user-greeting{color:#9ca3af!important;border-left-color:rgba(255,255,255,.08)!important}' +
            'html.a11y-dark-mode .user-greeting strong{color:#f3f4f6!important}' +
            'html.a11y-dark-mode .user-name,.user-info-header{color:#f3f4f6!important}' +
            'html.a11y-dark-mode .user-avatar,.user-avatar-header{background:#374151!important}' +
            'html.a11y-dark-mode .header-brand .page-title,.header-module{color:rgba(255,255,255,.85)!important}' +
            'html.a11y-dark-mode .header-divider{color:rgba(255,255,255,.18)!important}' +
            'html.a11y-dark-mode .header-logo img{opacity:.9}' +
            'html.a11y-dark-mode .header-logo .logo-azul,html.a11y-dark-mode .header-logo .logo-zyntra-azul{display:none!important}' +
            'html.a11y-dark-mode .header-logo .logo-branca,html.a11y-dark-mode .header-logo .logo-zyntra-branca{display:block!important}' +
            'html.a11y-dark-mode .header-logo .logo-separator{color:rgba(255,255,255,.3)!important}' +
            'html.a11y-dark-mode .notification-indicator{color:#9ca3af!important}' +
            'html.a11y-dark-mode .notification-indicator:hover{background:rgba(255,255,255,.08)!important;color:#f3f4f6!important}' +
            'html.a11y-dark-mode .user-chevron{color:#9ca3af!important}' +

            /* Alto contraste */
            'body.a11y-high-contrast{filter:contrast(1.5)!important}' +
            /* Espaçamento */
            'body.a11y-text-spacing p,body.a11y-text-spacing li,body.a11y-text-spacing td,body.a11y-text-spacing span{line-height:1.8!important;letter-spacing:.04em!important;word-spacing:.12em!important}' +
            /* Cursor grande */
            'body.a11y-big-cursor,body.a11y-big-cursor *{cursor:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cpath d=\'M0 0 L0 28 L8 20 L14 32 L18 30 L12 18 L22 18Z\' fill=\'%23000\' stroke=\'%23fff\' stroke-width=\'2\'/%3E%3C/svg%3E") 0 0,auto!important}' +
            /* Destacar links */
            'body.a11y-highlight-links a{background:rgba(255,220,0,.25)!important;outline:1px solid rgba(200,160,0,.5)!important;border-radius:2px!important;padding:0 2px!important}' +

            /* Painel */
            '#a11y-panel{position:fixed;top:50px;right:16px;width:260px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 20px 60px -12px rgba(0,0,0,.18),0 8px 20px -8px rgba(0,0,0,.12);z-index:99991;font-family:Inter,system-ui,sans-serif;overflow:hidden;transform:scale(.92) translateY(-8px);opacity:0;pointer-events:none;transition:transform .22s cubic-bezier(.34,1.2,.64,1),opacity .18s ease;transform-origin:top right}' +
            '#a11y-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto}' +
            '.a11y-ph{padding:11px 13px 8px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}' +
            '.a11y-ptitle{font-size:12px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:7px}' +
            '.a11y-fbar{display:flex;gap:3px}' +
            '.a11y-fb{width:23px;height:23px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:5px;cursor:pointer;font-weight:700;font-size:10px;color:#374151;transition:all .15s;display:flex;align-items:center;justify-content:center;font-family:inherit}' +
            '.a11y-fb:hover{background:#e2e8f0;color:#0f172a}' +
            '.a11y-pb{padding:4px 0 7px;max-height:310px;overflow-y:auto}' +
            '.a11y-sl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;padding:7px 13px 3px}' +
            '.a11y-row{display:flex;align-items:center;justify-content:space-between;padding:6px 13px;cursor:pointer;transition:background .12s}' +
            '.a11y-row:hover{background:#f8fafc}' +
            '.a11y-rl{display:flex;align-items:center;gap:8px}' +
            '.a11y-ri{width:27px;height:27px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}' +
            '.a11y-rt{font-size:11px;font-weight:500;color:#374151}' +
            '.a11y-rs{font-size:9px;color:#94a3b8;margin-top:1px}' +
            '.a11y-tog{position:relative;width:33px;height:18px;flex-shrink:0}' +
            '.a11y-tog input{opacity:0;width:0;height:0;position:absolute}' +
            '.a11y-tk{position:absolute;inset:0;border-radius:18px;background:#e2e8f0;transition:background .2s ease;cursor:pointer}' +
            '.a11y-tk::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.15);transition:transform .2s cubic-bezier(.34,1.3,.64,1)}' +
            '.a11y-tog input:checked+.a11y-tk{background:#6366f1}' +
            '.a11y-tog input:checked+.a11y-tk::after{transform:translateX(15px)}' +
            '.a11y-tog.dk input:checked+.a11y-tk{background:#818cf8}' +
            '.a11y-pf{padding:7px 13px;border-top:1px solid #f1f5f9}' +
            '.a11y-rb{width:100%;padding:6px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:7px;cursor:pointer;font-size:11px;font-weight:500;color:#64748b;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit}' +
            '.a11y-rb:hover{background:#e2e8f0;color:#374151}';
        document.head.appendChild(s);
    }

    function mkRow(icon, bg, col, title, sub, id, extra) {
        var active = (id === 'dark') ? darkOn : get(K[id === 'contrast' ? 'contrast' : id === 'gray' ? 'gray' : id === 'spacing' ? 'spacing' : id === 'links' ? 'links' : 'cursor']) === '1';
        var rBg  = (id === 'dark' && active) ? '#1e293b' : bg;
        var rCol = (id === 'dark' && active) ? '#818cf8' : col;
        return '<div class="a11y-row" data-id="' + id + '">' +
            '<div class="a11y-rl">' +
                '<div class="a11y-ri" id="a11y-ri-' + id + '" style="background:' + rBg + ';color:' + rCol + '"><i class="fas ' + icon + '"></i></div>' +
                '<div><div class="a11y-rt">' + title + '</div><div class="a11y-rs">' + sub + '</div></div>' +
            '</div>' +
            '<label class="a11y-tog ' + (extra || '') + '">' +
                '<input type="checkbox" id="a11y-chk-' + id + '"' + (active ? ' checked' : '') + '>' +
                '<span class="a11y-tk"></span>' +
            '</label>' +
        '</div>';
    }

    function createPanel() {
        if (document.getElementById('a11y-panel')) return;
        injectStyles();

        var panel = document.createElement('div');
        panel.id = 'a11y-panel';
        panel.setAttribute('role', 'dialog');
        panel.innerHTML =
            '<div class="a11y-ph">' +
                '<div class="a11y-ptitle"><i class="fas fa-universal-access" style="color:#6366f1;font-size:13px"></i>Acessibilidade</div>' +
                '<div class="a11y-fbar">' +
                    '<button class="a11y-fb" id="a11y-fdec">A-</button>' +
                    '<button class="a11y-fb" id="a11y-frst" style="font-size:11px">A</button>' +
                    '<button class="a11y-fb" id="a11y-finc" style="font-size:13px">A+</button>' +
                    '<button class="a11y-fb" id="a11y-undo" title="Restaurar" style="color:#94a3b8"><i class="fas fa-undo" style="font-size:8px"></i></button>' +
                '</div>' +
            '</div>' +
            '<div class="a11y-pb">' +
                '<div class="a11y-sl">Opções Visuais</div>' +
                mkRow('fa-moon',              '#1e293b','#818cf8', 'Modo Escuro',         'Sidebar e header escuros', 'dark',    'dk') +
                mkRow('fa-adjust',            '#fef3c7','#b45309', 'Alto Contraste',      'Aumenta contraste',        'contrast','') +
                mkRow('fa-circle-half-stroke','#f1f5f9','#64748b', 'Escala de Cinza',     'Remove cores',             'gray',    '') +
                '<div class="a11y-sl">Leitura</div>' +
                mkRow('fa-text-height',       '#ede9fe','#7c3aed', 'Espaçamento de Texto','Aumenta entrelinha',       'spacing', '') +
                mkRow('fa-link',              '#fef9c3','#a16207', 'Destacar Links',      'Realça links',             'links',   '') +
                '<div class="a11y-sl">Navegação</div>' +
                mkRow('fa-arrow-pointer',     '#fce7f3','#be185d', 'Cursor Grande',       'Cursor ampliado',          'cursor',  '') +
            '</div>' +
            '<div class="a11y-pf"><button class="a11y-rb" id="a11y-restore"><i class="fas fa-rotate-left" style="font-size:9px"></i> Restaurar Padrão</button></div>';

        document.body.appendChild(panel);

        /* Dark mode toggle */
        document.getElementById('a11y-chk-dark').addEventListener('change', function () {
            var on = this.checked;
            document.documentElement.classList.toggle('a11y-dark-mode', on);
            set(K.dark, on ? '1' : '0');
            var ri = document.getElementById('a11y-ri-dark');
            if (ri) { ri.style.background = on ? '#1e293b' : '#f1f5f9'; ri.style.color = on ? '#818cf8' : '#64748b'; }
        });

        /* Demais toggles */
        var map = {
            contrast: function (on) { document.body.classList.toggle('a11y-high-contrast', on);   set(K.contrast, on ? '1' : '0'); },
            gray:     function (on) { document.documentElement.style.filter = on ? 'grayscale(100%)' : ''; set(K.gray, on ? '1' : '0'); },
            spacing:  function (on) { document.body.classList.toggle('a11y-text-spacing', on);    set(K.spacing,  on ? '1' : '0'); },
            links:    function (on) { document.body.classList.toggle('a11y-highlight-links', on); set(K.links,    on ? '1' : '0'); },
            cursor:   function (on) { document.body.classList.toggle('a11y-big-cursor', on);      set(K.cursor,   on ? '1' : '0'); }
        };
        Object.keys(map).forEach(function (id) {
            var chk = document.getElementById('a11y-chk-' + id);
            if (chk) chk.addEventListener('change', function () { map[id](this.checked); });
        });

        /* Linha inteira clicável */
        panel.querySelectorAll('.a11y-row').forEach(function (row) {
            row.addEventListener('click', function (e) {
                if (e.target.tagName === 'INPUT' || e.target.closest('label')) return;
                var chk = row.querySelector('input');
                if (chk) { chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); }
            });
        });

        /* Fonte */
        function setStep(step) {
            var c = Math.max(-1, Math.min(3, step));
            set(K.font, String(c));
            document.documentElement.style.fontSize = (16 + c * 2) + 'px';
        }
        document.getElementById('a11y-fdec').addEventListener('click', function () { setStep(parseInt(get(K.font) || '0', 10) - 1); });
        document.getElementById('a11y-finc').addEventListener('click', function () { setStep(parseInt(get(K.font) || '0', 10) + 1); });
        document.getElementById('a11y-frst').addEventListener('click', function () { setStep(0); });
        document.getElementById('a11y-undo').addEventListener('click', function () { document.getElementById('a11y-restore').click(); });

        /* Restaurar — dark mode volta para ON */
        document.getElementById('a11y-restore').addEventListener('click', function () {
            [K.dark, K.font, K.contrast, K.spacing, K.cursor, K.links, K.gray].forEach(rm);
            /* Dark mode volta ao padrão (ON) */
            document.documentElement.classList.add('a11y-dark-mode');
            document.documentElement.style.filter   = '';
            document.documentElement.style.fontSize = '';
            document.body.classList.remove('a11y-high-contrast','a11y-text-spacing','a11y-big-cursor','a11y-highlight-links');
            document.getElementById('a11y-chk-dark').checked = true;
            ['contrast','gray','spacing','links','cursor'].forEach(function (id) {
                var chk = document.getElementById('a11y-chk-' + id);
                if (chk) chk.checked = false;
            });
            var ri = document.getElementById('a11y-ri-dark');
            if (ri) { ri.style.background = '#1e293b'; ri.style.color = '#818cf8'; }
        });
    }

    function bindHeaderBtn() {
        var btn = document.getElementById('accessibility-btn') ||
                  document.querySelector('[data-a11y-btn]');
        if (!btn) return;
        var open = false;
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            createPanel();
            open = !open;
            var p = document.getElementById('a11y-panel');
            if (p) p.classList.toggle('open', open);
        });
        document.addEventListener('click', function (e) {
            if (!open) return;
            var p = document.getElementById('a11y-panel');
            if (p && !p.contains(e.target) && !btn.contains(e.target)) {
                open = false;
                p.classList.remove('open');
            }
        });
    }

    function applyBodyPrefs() {
        if (get(K.contrast) === '1') document.body.classList.add('a11y-high-contrast');
        if (get(K.spacing)  === '1') document.body.classList.add('a11y-text-spacing');
        if (get(K.cursor)   === '1') document.body.classList.add('a11y-big-cursor');
        if (get(K.links)    === '1') document.body.classList.add('a11y-highlight-links');
        if (get(K.gray)     === '1') document.documentElement.style.filter = 'grayscale(100%)';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { applyBodyPrefs(); bindHeaderBtn(); });
    } else {
        applyBodyPrefs();
        bindHeaderBtn();
    }

})();
