// ==================== ESPELHO NF-e ====================
let espelhoNfCurrentId = null;

async function carregarListaNFesEspelho() {
    const tbody = document.getElementById('espelho-nf-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#6366f1;"><i class="fas fa-spinner fa-spin"></i> Carregando NF-es...</td></tr>';
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = { 'Authorization': 'Bearer ' + token };
        const statusFilter = document.getElementById('espelho-nf-filtro-status')?.value || '';
        let url = '/api/nfe/listar';
        if (statusFilter) url += '?status=' + encodeURIComponent(statusFilter);
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Erro ' + response.status);
        const data = await response.json();
        let nfes = Array.isArray(data) ? data : (data.notas || data.data || data.nfes || []);
        // Filtro de status client-side
        if (statusFilter) {
            nfes = nfes.filter(n => String(n.status || '').toLowerCase() === statusFilter.toLowerCase());
        }
        renderNFesEspelho(nfes);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar: ' + escapeHtmlConfig(err.message) + '</td></tr>';
    }
}

async function buscarNFesParaEspelho() {
    const busca = document.getElementById('espelho-nf-busca')?.value?.trim() || '';
    const tbody = document.getElementById('espelho-nf-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#6366f1;"><i class="fas fa-spinner fa-spin"></i> Buscando...</td></tr>';
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = { 'Authorization': 'Bearer ' + token };
        const statusFilter = document.getElementById('espelho-nf-filtro-status')?.value || '';
        let url = '/api/nfe/listar';
        const params = [];
        if (busca) params.push('busca=' + encodeURIComponent(busca));
        if (statusFilter) params.push('status=' + encodeURIComponent(statusFilter));
        if (params.length) url += '?' + params.join('&');
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Erro ' + response.status);
        const data = await response.json();
        let nfes = Array.isArray(data) ? data : (data.notas || data.data || data.nfes || []);
        if (statusFilter) {
            nfes = nfes.filter(n => String(n.status || '').toLowerCase() === statusFilter.toLowerCase());
        }
        if (busca) {
            nfes = nfes.filter(n => {
                const num = String(n.numero || n.numero_nfe || '');
                const chave = String(n.chave || n.chave_acesso || '');
                const dest = String(n.destinatario || n.cliente || n.destinatario_nome || '');
                const id = String(n.id || '');
                const term = busca.toLowerCase();
                return num.includes(term) || chave.includes(term) || dest.toLowerCase().includes(term) || id === term;
            });
        }
        renderNFesEspelho(nfes);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> ' + escapeHtmlConfig(err.message) + '</td></tr>';
    }
}

function renderNFesEspelho(nfes) {
    const tbody = document.getElementById('espelho-nf-tbody');
    if (!tbody) return;
    if (!nfes || nfes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-inbox" style="font-size:1.5rem;opacity:0.3;display:block;margin-bottom:8px;"></i>Nenhuma NF-e encontrada</td></tr>';
        return;
    }
    const statusBadge = (s) => {
        const st = String(s || 'rascunho').toLowerCase();
        const colors = {
            rascunho: '#6366f1;background:#e0e7ff',
            digitacao: '#6366f1;background:#e0e7ff',
            pendente: '#d97706;background:#fef3c7',
            emitida: '#0284c7;background:#e0f2fe',
            autorizada: '#059669;background:#d1fae5',
            cancelada: '#dc2626;background:#fee2e2',
            rejeitada: '#dc2626;background:#fee2e2'
        };
        const c = colors[st] || '#64748b;background:#f1f5f9';
        const label = st.charAt(0).toUpperCase() + st.slice(1);
        return '<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;color:#' + c + ';">' + escapeHtmlConfig(label) + '</span>';
    };
    const fmt = (v) => v ? parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
    const fmtD = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    tbody.innerHTML = nfes.slice(0, 50).map(n => {
        const id = n.id;
        const num = n.numero || n.numero_nfe || '—';
        const serie = n.serie || '1';
        const dest = n.destinatario || n.cliente || n.destinatario_nome || '—';
        const cnpj = n.destinatario_cnpj || n.cli_cnpj || '—';
        const data = fmtD(n.dataEmissao || n.data_emissao);
        const valor = fmt(n.valor || n.valor_total);
        const status = n.status || 'pendente';
        return '<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
            '<td style="padding:10px 14px;font-weight:600;">' + escapeHtmlConfig(String(num)) + '</td>' +
            '<td style="padding:10px 14px;">' + escapeHtmlConfig(String(serie)) + '</td>' +
            '<td style="padding:10px 14px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtmlConfig(dest) + '</td>' +
            '<td style="padding:10px 14px;font-family:monospace;font-size:12px;">' + escapeHtmlConfig(cnpj) + '</td>' +
            '<td style="padding:10px 14px;">' + data + '</td>' +
            '<td style="padding:10px 14px;text-align:right;font-weight:600;">R$ ' + valor + '</td>' +
            '<td style="padding:10px 14px;text-align:center;">' + statusBadge(status) + '</td>' +
            '<td style="padding:10px 14px;text-align:center;">' +
                '<button onclick="visualizarEspelhoNF(' + id + ')" style="background:#1e40af;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background=\'#1d4ed8\'" onmouseout="this.style.background=\'#1e40af\'">' +
                    '<i class="fas fa-eye"></i> Espelho' +
                '</button>' +
            '</td></tr>';
    }).join('');
}

function visualizarEspelhoNF(id) {
    espelhoNfCurrentId = id;
    const viewer = document.getElementById('espelho-nf-viewer');
    const iframe = document.getElementById('espelho-nf-iframe');
    if (!viewer || !iframe) return;
    viewer.style.display = 'block';
    iframe.src = '/api/nfe/' + encodeURIComponent(id) + '/espelho';
    viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharEspelhoViewer() {
    const viewer = document.getElementById('espelho-nf-viewer');
    const iframe = document.getElementById('espelho-nf-iframe');
    if (viewer) viewer.style.display = 'none';
    if (iframe) iframe.src = 'about:blank';
    espelhoNfCurrentId = null;
}

function imprimirEspelhoNF() {
    const iframe = document.getElementById('espelho-nf-iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
    }
}

function abrirEspelhoNovaAba() {
    if (espelhoNfCurrentId) {
        window.open('/api/nfe/' + encodeURIComponent(espelhoNfCurrentId) + '/espelho', '_blank');
    }
}

function escapeHtmlConfig(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// Enter key para busca
document.addEventListener('DOMContentLoaded', function() {
    const buscaInput = document.getElementById('espelho-nf-busca');
    if (buscaInput) {
        buscaInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') buscarNFesParaEspelho();
        });
    }
});
