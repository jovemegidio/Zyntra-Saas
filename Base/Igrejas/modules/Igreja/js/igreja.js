/* ===== ZYNTRA IGREJAS — COMMON JS ===== */
(function(){
'use strict';

// ===== AUTH CHECK =====
const AUTH_KEY = 'zyntra_igreja_auth';
const currentPage = location.pathname.split('/').pop() || 'index.html';

function getAuth() {
    try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; }
}

function requireAuth() {
    if (currentPage === 'login.html') return;
    const auth = getAuth();
    if (!auth) { location.href = 'login.html'; return; }
    // Update UI with user info
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    const roleEl = document.getElementById('user-role');
    if (nameEl) nameEl.textContent = auth.name.split(' ')[0];
    if (avatarEl) avatarEl.textContent = auth.name.charAt(0).toUpperCase();
    if (roleEl) roleEl.textContent = auth.role === 'admin' ? 'Administrador' : auth.role === 'lider' ? 'Líder' : 'Membro';
    // Hide admin-only elements for non-admins
    if (auth.role !== 'admin') {
        document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'none');
    }
}

// ===== SIDEBAR TOGGLE =====
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
};

window.toggleMobileSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
};

// Restore sidebar state
function restoreSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && localStorage.getItem('sidebar_collapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }
}

// ===== ACTIVE NAV =====
function setActiveNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage) {
            item.classList.add('active');
        }
    });
}

// ===== GREETING =====
function setGreeting() {
    const el = document.getElementById('greeting-text');
    if (!el) return;
    const h = new Date().getHours();
    el.textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// ===== MODAL =====
window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
};
window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
};
// Close on overlay click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ===== ACCESSIBILITY =====
window.toggleA11yPanel = function() {
    const panel = document.getElementById('a11y-panel');
    if (panel) panel.classList.toggle('active');
};
window.toggleHighContrast = function() { document.body.classList.toggle('high-contrast'); };
window.toggleLargeFont = function() { document.body.classList.toggle('large-font'); };

// ===== LOGOUT =====
window.doLogout = function() {
    sessionStorage.removeItem(AUTH_KEY);
    location.href = 'login.html';
};

// ===== FORMAT =====
window.formatCurrency = function(v) {
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
};
window.formatDate = function(d) {
    return new Date(d).toLocaleDateString('pt-BR');
};
window.formatDateTime = function(d) {
    return new Date(d).toLocaleString('pt-BR');
};

// ===== TOAST =====
window.showToast = function(msg, type) {
    type = type || 'info';
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999;padding:14px 24px;border-radius:12px;font-size:.85rem;font-weight:500;color:#fff;animation:fadeIn .3s ease;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.3);';
    const colors = { success:'#10b981', danger:'#ef4444', warning:'#f59e0b', info:'#7c3aed' };
    toast.style.background = colors[type] || colors.info;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function(){ toast.style.opacity = '0'; setTimeout(function(){ toast.remove(); }, 300); }, 3500);
};

// ===== MOCK DATA =====
window.MOCK = {
    members: [
        { id:1, name:'Maria Silva', email:'maria@igreja.com', phone:'(11) 98765-4321', role:'membro', status:'ativo', baptized:true, joinDate:'2023-03-15', photo:null, groups:['Louvor','Jovens'] },
        { id:2, name:'João Santos', email:'joao@igreja.com', phone:'(11) 91234-5678', role:'lider', status:'ativo', baptized:true, joinDate:'2022-01-10', photo:null, groups:['Célula Centro'] },
        { id:3, name:'Ana Oliveira', email:'ana@igreja.com', phone:'(11) 99876-5432', role:'membro', status:'ativo', baptized:false, joinDate:'2024-06-20', photo:null, groups:['Jovens'] },
        { id:4, name:'Pedro Costa', email:'pedro@igreja.com', phone:'(11) 97654-3210', role:'lider', status:'ativo', baptized:true, joinDate:'2021-11-05', photo:null, groups:['Célula Norte','Diaconia'] },
        { id:5, name:'Clara Mendes', email:'clara@igreja.com', phone:'(11) 96543-2109', role:'membro', status:'inativo', baptized:true, joinDate:'2023-09-12', photo:null, groups:[] },
        { id:6, name:'Lucas Ferreira', email:'lucas@igreja.com', phone:'(11) 95432-1098', role:'membro', status:'ativo', baptized:true, joinDate:'2024-01-08', photo:null, groups:['Louvor','Mídia'] },
        { id:7, name:'Beatriz Lima', email:'beatriz@igreja.com', phone:'(11) 94321-0987', role:'membro', status:'ativo', baptized:false, joinDate:'2025-02-14', photo:null, groups:['Infantil'] },
        { id:8, name:'Rafael Souza', email:'rafael@igreja.com', phone:'(11) 93210-9876', role:'voluntario', status:'ativo', baptized:true, joinDate:'2022-07-22', photo:null, groups:['Diaconia','Estacionamento'] }
    ],
    events: [
        { id:1, title:'Culto de Celebração', date:'2026-04-19', time:'19:00', location:'Templo Principal', category:'culto', spots:500, enrolled:342, color:'#7c3aed' },
        { id:2, title:'Encontro de Jovens', date:'2026-04-25', time:'20:00', location:'Salão Multiuso', category:'jovens', spots:80, enrolled:65, color:'#3b82f6' },
        { id:3, title:'Retiro Espiritual', date:'2026-05-10', time:'08:00', location:'Sítio Esperança', category:'retiro', spots:40, enrolled:38, color:'#10b981' },
        { id:4, title:'Conferência de Mulheres', date:'2026-05-17', time:'14:00', location:'Templo Principal', category:'conferencia', spots:200, enrolled:156, color:'#ec4899' },
        { id:5, title:'EBD — Escola Bíblica', date:'2026-04-20', time:'09:00', location:'Salas de Aula', category:'ebd', spots:150, enrolled:98, color:'#f59e0b' }
    ],
    donations: [
        { id:1, member:'Maria Silva', type:'dizimo', value:850, date:'2026-04-14', method:'PIX' },
        { id:2, member:'João Santos', type:'oferta', value:200, date:'2026-04-14', method:'Cartão' },
        { id:3, member:'Pedro Costa', type:'dizimo', value:1200, date:'2026-04-13', method:'PIX' },
        { id:4, member:'Ana Oliveira', type:'oferta', value:100, date:'2026-04-13', method:'Dinheiro' },
        { id:5, member:'Lucas Ferreira', type:'campanha', value:500, date:'2026-04-12', method:'Transferência' },
        { id:6, member:'Anônimo', type:'oferta', value:50, date:'2026-04-12', method:'PIX' },
        { id:7, member:'Rafael Souza', type:'dizimo', value:650, date:'2026-04-11', method:'PIX' },
        { id:8, member:'Clara Mendes', type:'missoes', value:300, date:'2026-04-10', method:'Cartão' }
    ],
    prayers: [
        { id:1, author:'Maria Silva', text:'Peço oração pela saúde da minha mãe que está internada.', status:'orando', intercessors:24, date:'2026-04-15' },
        { id:2, author:'João Santos', text:'Oração por um novo emprego. Estou desempregado há 3 meses.', status:'orando', intercessors:18, date:'2026-04-14' },
        { id:3, author:'Ana Oliveira', text:'Agradeço a Deus! Minha cirurgia foi um sucesso!', status:'respondido', intercessors:45, date:'2026-04-12' },
        { id:4, author:'Pedro Costa', text:'Oração pela família. Estamos passando por um momento difícil.', status:'orando', intercessors:31, date:'2026-04-13' },
        { id:5, author:'Beatriz Lima', text:'Oração pelos missionários no nordeste.', status:'orando', intercessors:12, date:'2026-04-11' }
    ],
    groups: [
        { id:1, name:'Célula Centro', type:'celula', leader:'João Santos', members:12, meeting:'Quartas 19:30', location:'Residência Líder' },
        { id:2, name:'Louvor & Adoração', type:'louvor', leader:'Lucas Ferreira', members:8, meeting:'Sábados 16:00', location:'Templo' },
        { id:3, name:'Jovens Radicais', type:'jovens', leader:'Pedro Costa', members:25, meeting:'Sextas 20:00', location:'Salão Multiuso' },
        { id:4, name:'Célula Norte', type:'celula', leader:'Pedro Costa', members:10, meeting:'Terças 19:30', location:'Residência Maria' },
        { id:5, name:'Ministério Infantil', type:'infantil', leader:'Beatriz Lima', members:15, meeting:'Domingos 09:00', location:'Salas Infantis' },
        { id:6, name:'Diaconia', type:'servico', leader:'Rafael Souza', members:6, meeting:'Quintas 18:00', location:'Sala Administrativa' }
    ],
    courses: [
        { id:1, title:'Fundamentos da Fé', category:'basico', lessons:12, completed:8, level:'Iniciante', instructor:'Pr. Roberto' },
        { id:2, title:'Liderança Cristã', category:'lideranca', lessons:8, completed:3, level:'Intermediário', instructor:'Pr. Roberto' },
        { id:3, title:'Panorama Bíblico', category:'biblia', lessons:20, completed:20, level:'Todos', instructor:'Pra. Ana' },
        { id:4, title:'Evangelismo Prático', category:'missoes', lessons:6, completed:0, level:'Todos', instructor:'Pr. Roberto' }
    ],
    finance: {
        totalReceitas: 45850,
        totalDespesas: 28300,
        saldo: 17550,
        transactions: [
            { id:1, desc:'Dízimos — Abril/2026', type:'receita', value:32000, date:'2026-04-14', category:'Dízimos' },
            { id:2, desc:'Ofertas — Culto Domingo', type:'receita', value:8500, date:'2026-04-14', category:'Ofertas' },
            { id:3, desc:'Campanha Missionária', type:'receita', value:5350, date:'2026-04-12', category:'Campanhas' },
            { id:4, desc:'Conta de Energia', type:'despesa', value:1850, date:'2026-04-10', category:'Utilidades' },
            { id:5, desc:'Salário — Equipe Pastoral', type:'despesa', value:18000, date:'2026-04-05', category:'Pessoal' },
            { id:6, desc:'Manutenção do Templo', type:'despesa', value:3200, date:'2026-04-08', category:'Manutenção' },
            { id:7, desc:'Material EBD', type:'despesa', value:800, date:'2026-04-07', category:'Educação' },
            { id:8, desc:'Aluguel — Sala Eventos', type:'despesa', value:4450, date:'2026-04-01', category:'Infraestrutura' }
        ]
    }
};

// ===== SIDEBAR NAV ITEMS =====
var SIDEBAR_ITEMS = [
    { page:'dashboard.html', icon:'fa-chart-line', title:'Dashboard' },
    { page:'membros.html', icon:'fa-users', title:'Membros' },
    { page:'oracao.html', icon:'fa-hands-praying', title:'Oração' },
    { page:'grupos.html', icon:'fa-people-group', title:'Grupos / Células' },
    { page:'eventos.html', icon:'fa-calendar-alt', title:'Eventos' },
    { page:'doacoes.html', icon:'fa-hand-holding-heart', title:'Doações' },
    { page:'cursos.html', icon:'fa-graduation-cap', title:'Cursos / EBD' },
    { page:'transmissao.html', icon:'fa-video', title:'Transmissão' },
    { divider:true },
    { page:'biblia.html', icon:'fa-book-bible', title:'Bíblia' },
    { page:'devocionais.html', icon:'fa-sun', title:'Devocionais' },
    { page:'notas.html', icon:'fa-sticky-note', title:'Notas de Culto' },
    { page:'mensagens.html', icon:'fa-microphone', title:'Pregações' },
    { page:'timeline.html', icon:'fa-stream', title:'Timeline' },
    { page:'galeria.html', icon:'fa-images', title:'Galeria' },
    { page:'testemunhos.html', icon:'fa-comment-dots', title:'Testemunhos' },
    { page:'downloads.html', icon:'fa-download', title:'Downloads' },
    { page:'presenca.html', icon:'fa-qrcode', title:'Check-in' }
];
var SIDEBAR_BOTTOM_ITEMS = [
    { page:'financeiro.html', icon:'fa-chart-pie', title:'Gestão Financeira' },
    { page:'voluntarios.html', icon:'fa-hands-helping', title:'Voluntários', admin:true },
    { page:'notificacoes.html', icon:'fa-bell', title:'Notificações', admin:true },
    { page:'configuracoes.html', icon:'fa-cog', title:'Configurações', admin:true }
];

// Build sidebar HTML dynamically
function buildSidebarHTML() {
    var html = '<a href="dashboard.html" class="sidebar-logo" title="Voltar ao Painel"><i class="fas fa-home"></i></a>';
    html += '<nav class="sidebar-nav">';
    SIDEBAR_ITEMS.forEach(function(item) {
        if (item.divider) { html += '<div class="sidebar-divider"></div>'; return; }
        var active = (currentPage === item.page) ? ' active' : '';
        html += '<button class="sidebar-btn' + active + '" title="' + item.title + '" onclick="window.location.href=\'' + item.page + '\'"><i class="fas ' + item.icon + '"></i></button>';
    });
    html += '</nav>';
    html += '<div class="sidebar-bottom">';
    var auth = getAuth();
    SIDEBAR_BOTTOM_ITEMS.forEach(function(item) {
        if (item.admin && (!auth || auth.role !== 'admin')) return;
        var active = (currentPage === item.page) ? ' active' : '';
        html += '<button class="sidebar-btn' + active + '" title="' + item.title + '" onclick="window.location.href=\'' + item.page + '\'"><i class="fas ' + item.icon + '"></i></button>';
    });
    html += '</div>';
    return html;
}

// Expose globally for sub-pages that reference SIDEBAR_HTML directly
window.SIDEBAR_HTML = buildSidebarHTML();
window.buildSidebarHTML = buildSidebarHTML;

// ===== HEADER HTML (shared) — Aluforce dual-branding =====
window.getHeaderHTML = function(title) {
    var auth = getAuth() || { name:'Usuário' };
    return '<div class="header-left">' +
        '<button class="mobile-menu-btn header-btn" onclick="toggleMobileSidebar()"><i class="fas fa-bars"></i></button>' +
        '<div class="header-brand" style="display:flex;align-items:center;gap:10px;">' +
            '<img src="/igreja/images/Zyntra - Sem Fundo.png" alt="Zyntra" style="height:22px;object-fit:contain;">' +
            '<span style="color:rgba(0,0,0,0.15);font-weight:200;font-size:16px;user-select:none;">×</span>' +
            '<img src="/igreja/images/Logo - Igreja Teste - Azul.png" alt="IGREJA TESTE" style="height:20px;object-fit:contain;">' +
            '<span style="color:rgba(0,0,0,0.18);font-weight:200;font-size:14px;user-select:none;margin:0 2px;">—</span>' +
            '<span style="font-size:13px;font-weight:500;color:var(--header-text-bold,#1e293b);letter-spacing:0.3px;">' + title + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="header-right">' +
        '<button class="header-btn" onclick="location.reload()" title="Atualizar"><i class="fas fa-sync-alt"></i></button>' +
        '<div class="user-greeting"><span id="greeting-text"></span>, <strong id="user-name">' + auth.name.split(' ')[0] + '</strong></span></div>' +
        '</div>';
};

// ===== A11Y WIDGET HTML =====
window.A11Y_HTML = `
<div class="a11y-widget">
    <button class="a11y-toggle" onclick="toggleA11yPanel()" title="Acessibilidade" aria-label="Opções de acessibilidade"><i class="fas fa-universal-access"></i></button>
    <div class="a11y-panel" id="a11y-panel">
        <h4 style="margin-bottom:12px;font-size:.9rem">♿ Acessibilidade</h4>
        <div class="a11y-option"><span>Fonte grande</span><button class="btn btn-sm btn-outline" onclick="toggleLargeFont()">Aa+</button></div>
        <div class="a11y-option"><span>Alto contraste</span><button class="btn btn-sm btn-outline" onclick="toggleHighContrast()">◐</button></div>
    </div>
</div>`;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    // Inject sidebar
    var sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) sidebarEl.innerHTML = buildSidebarHTML();
    setGreeting();
    // Close mobile sidebar on overlay click
    var overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.addEventListener('click', toggleMobileSidebar);
});

})();
