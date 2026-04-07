/**
 * user-greeting-avatar.js — Zyntra ERP v1.0
 * Componente global de saudação, nome e avatar do usuário logado.
 * Inclua em qualquer página: <script src="/js/user-greeting-avatar.js" defer></script>
 *
 * DOM IDs esperados (todos opcionais — só atualiza se existir):
 *   #greeting-text   → "Bom dia" / "Boa tarde" / "Boa noite"
 *   #user-name        → Primeiro nome  (ou #greeting-name como fallback)
 *   #user-name-display→ Primeiro nome  (header secundário)
 *   #user-photo       → <img> com src do avatar
 *   #user-initials    → <span> com iniciais (fallback visual)
 *   #user-avatar      → container que pode receber classe .has-photo
 *   #dropdown-avatar  → avatar no dropdown (se existir)
 *   #dropdown-user-name → nome no dropdown (se existir)
 */
(function () {
    'use strict';

    /* ── Avatar name→path map (centralizado) ── */
    var avatarMap = {
        'clemerson': '/avatars/Clemerson.png',
        'isabela': '/avatars/Isabela.png', 'isabella': '/avatars/Isabela.png',
        'thaina': '/avatars/Thaina.webp', 'thiago': '/avatars/Thiago.png',
        'nicolas': '/avatars/NicolasDaniel.webp', 'nicolasdaniel': '/avatars/NicolasDaniel.webp',
        'rh': '/avatars/Rh.webp', 'admin': '/avatars/admin.webp',
        'ti': '/avatars/TI.webp', 'tialuforce': '/avatars/TI.webp',
        'antonio': '/avatars/Antonio.webp', 'antônio': '/avatars/Antonio.webp',
        'andreia': '/avatars/Andreia.webp', 'andréia': '/avatars/Andreia.webp',
        'guilherme': '/avatars/GuilhermeBastos.png', 'augusto': '/avatars/Augusto.png',
        'renata': '/avatars/Renata.png', 'fabiano': '/avatars/Fabiano.png',
        'fabiola': '/avatars/Fabiola.webp', 'marcia': '/avatars/Marcia.png', 'márcia': '/avatars/Marcia.png',
        'ronaldo': '/avatars/Ronaldo.png', 'joao': '/avatars/JoaoVitor.png', 'joão': '/avatars/JoaoVitor.png',
        'douglas': '/avatars/Douglas.webp', 'fernando': '/avatars/Fernando.png',
        'robson': '/avatars/Robson.png', 'junior': '/avatars/Junior.png',
        'bruno': '/avatars/Bruno.png', 'tatiane': '/avatars/Tatiane.png',
        'felipesimoes': '/avatars/FelipeSimoes.png', 'felipe': '/avatars/FelipeSimoes.png',
        'marcelo': '/avatars/Marcelo.webp', 'financeiro': '/avatars/Financeiro.webp',
        'hellen': '/avatars/Hellen.webp', 'helen': '/avatars/Hellen.webp',
        'jamesson': '/avatars/jamerson.svg',
        'sergio': '/avatars/Sergio.png', 'lucas': '/avatars/Lucas.png',
        'miqueias': '/avatars/Miqueias.png', 'lucio': '/avatars/Lucio.png', 'lúcio': '/avatars/Lucio.png'
    };

    /* ── Saudação por horário ── */
    function getSaudacao() {
        var h = new Date().getHours();
        if (h >= 5 && h < 12) return 'Bom dia';
        if (h >= 12 && h < 18) return 'Boa tarde';
        return 'Boa noite';
    }

    /* ── Extrair APENAS primeiro nome ── */
    function primeiroNome(nome) {
        if (!nome) return 'Usuário';
        return nome.trim().split(/\s+/)[0] || 'Usuário';
    }

    /* ── Resolver avatar: API > mapa > iniciais ── */
    function resolverAvatar(user) {
        var url = user.avatar || user.foto || user.foto_perfil_url || '';
        if (url && url !== '/avatars/default.webp' && url !== 'null' && url !== 'undefined') {
            return url;
        }
        var email = (user.email || '').toLowerCase();
        var prefix = email.split('@')[0].replace(/[^a-záàãâéêíóôõúç]/gi, '');
        if (avatarMap[prefix]) return avatarMap[prefix];
        var nome = primeiroNome(user.nome || user.name || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (avatarMap[nome]) return avatarMap[nome];
        return null;
    }

    /* ── Gerar iniciais para fallback ── */
    function getIniciais(nome) {
        if (!nome) return 'U';
        var partes = nome.trim().split(/\s+/);
        if (partes.length >= 2) {
            return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
        }
        return (partes[0][0] || 'U').toUpperCase();
    }

    /* ── Aplicar avatar em um <img> + <span> ── */
    function aplicarAvatar(imgEl, initialsEl, containerEl, avatarUrl, nome) {
        var iniciais = getIniciais(nome);
        if (initialsEl) initialsEl.textContent = iniciais;

        if (avatarUrl) {
            if (imgEl) {
                imgEl.src = avatarUrl;
                imgEl.alt = nome || 'Avatar';
                imgEl.style.display = '';
                imgEl.onerror = function () {
                    this.style.display = 'none';
                    if (initialsEl) initialsEl.style.display = '';
                    if (containerEl) containerEl.classList.remove('has-photo');
                };
                imgEl.onload = function () {
                    this.style.display = '';
                    if (initialsEl) initialsEl.style.display = 'none';
                    if (containerEl) containerEl.classList.add('has-photo');
                };
            }
        } else {
            if (imgEl) imgEl.style.display = 'none';
            if (initialsEl) initialsEl.style.display = '';
            if (containerEl) containerEl.classList.remove('has-photo');
        }
    }

    /* ── Atualizar DOM ── */
    function atualizarUI(user) {
        var nome = primeiroNome(user.apelido || user.nome || user.name);
        var avatarUrl = resolverAvatar(user);

        // Saudação
        var greetEl = document.getElementById('greeting-text');
        if (greetEl) greetEl.textContent = getSaudacao();

        // Nome — tenta IDs comuns
        ['user-name', 'greeting-name', 'user-name-display'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = nome;
        });

        // Avatar principal
        aplicarAvatar(
            document.getElementById('user-photo'),
            document.getElementById('user-initials') || document.getElementById('user-initial'),
            document.getElementById('user-avatar'),
            avatarUrl,
            user.nome || user.name || nome
        );

        // Avatar dropdown (se existir)
        var ddAvatar = document.getElementById('dropdown-avatar');
        if (ddAvatar) {
            if (ddAvatar.tagName === 'IMG') {
                ddAvatar.src = avatarUrl || '';
                ddAvatar.onerror = function () { this.style.display = 'none'; };
            } else if (avatarUrl) {
                ddAvatar.style.backgroundImage = 'url(' + avatarUrl + ')';
            } else {
                ddAvatar.textContent = getIniciais(user.nome || nome);
            }
        }
        var ddName = document.getElementById('dropdown-user-name');
        if (ddName) ddName.textContent = nome;
    }

    /* ── Expor globalmente para módulos que precisem ── */
    window.ZyntraUser = {
        getSaudacao: getSaudacao,
        primeiroNome: primeiroNome,
        resolverAvatar: resolverAvatar,
        getIniciais: getIniciais,
        aplicarAvatar: aplicarAvatar,
        atualizarUI: atualizarUI,
        avatarMap: avatarMap,
        _applied: false
    };

    /* ── Auto-init: busca /api/me e aplica se nenhum módulo chamou ── */
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            if (window.ZyntraUser._applied) return;
            var hasGreeting = document.getElementById('greeting-text') || document.getElementById('greeting-name');
            if (!hasGreeting) return;
            fetch('/api/me', { credentials: 'include' })
                .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(function (user) {
                    if (!window.ZyntraUser._applied && user && (user.nome || user.name)) {
                        atualizarUI(user);
                    }
                })
                .catch(function () { /* silêncio — módulo tratará */ });
        }, 350);
    });
})();
