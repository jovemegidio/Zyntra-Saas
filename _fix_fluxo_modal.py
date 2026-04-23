#!/usr/bin/env python3
# coding: utf-8
import os, sys

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'fluxo_caixa.html')

with open(f, 'rb') as fh:
    raw = fh.read()

NL = b'\r\n'

# ===========================================================================
# FIX 1: Adicionar CSS da modal antes de </style>
# ===========================================================================
CSS_ANCHOR = b'        @media (max-width: 1024px) { .kpi-cards { grid-template-columns: repeat(2, 1fr); } }'
CSS_ADD = (
    b'        /* ===== MODAL NOVA MOVIMENTACAO ===== */' + NL +
    b'        .modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:9000; justify-content:center; align-items:flex-start; padding:40px 16px; overflow-y:auto; }' + NL +
    b'        .modal-box { background:white; border-radius:16px; width:100%; max-width:700px; box-shadow:0 20px 60px rgba(0,0,0,0.18); animation:fadeInUp .25s ease; }' + NL +
    b'        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }' + NL +
    b'        .modal-header { display:flex; justify-content:space-between; align-items:center; padding:18px 24px; border-bottom:1px solid var(--gray-100); font-size:16px; font-weight:700; color:var(--gray-800); }' + NL +
    b'        .modal-header .btn-fechar { background:none; border:1px solid var(--gray-200); padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; color:var(--gray-600); }' + NL +
    b'        .modal-header .btn-fechar:hover { background:var(--gray-50); }' + NL +
    b'        .modal-body { padding:24px; display:flex; flex-direction:column; gap:16px; }' + NL +
    b'        .modal-footer { padding:16px 24px; border-top:1px solid var(--gray-100); display:flex; justify-content:flex-end; }' + NL +
    b'        .form-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }' + NL +
    b'        .form-row-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }' + NL +
    b'        .modal-body .form-group { display:flex; flex-direction:column; gap:6px; }' + NL +
    b'        .modal-body label { font-size:12px; font-weight:600; color:var(--gray-700); }' + NL +
    b'        .modal-body input, .modal-body select, .modal-body textarea { width:100%; padding:10px 12px; border:1px solid var(--gray-200); border-radius:8px; font-size:13px; font-family:inherit; color:var(--gray-800); box-sizing:border-box; }' + NL +
    b'        .modal-body input:focus, .modal-body select:focus, .modal-body textarea:focus { outline:none; border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,0.1); }' + NL +
    b'        .modal-body textarea { resize:vertical; }' + NL +
    b'        .btn-registrar { background:#10b981; color:white; border:none; padding:11px 24px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:8px; }' + NL +
    b'        .btn-registrar:hover { background:#059669; }' + NL +
    b'        .btn-nova-movimentacao { background:#10b981; color:white; border:none; padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }' + NL +
    b'        .btn-nova-movimentacao:hover { background:#059669; }' + NL +
    b'        @media (max-width: 640px) { .form-row-2, .form-row-3 { grid-template-columns:1fr; } }' + NL +
    NL
)
assert CSS_ANCHOR in raw, 'ERRO: CSS anchor not found'
raw = raw.replace(CSS_ANCHOR, CSS_ADD + CSS_ANCHOR, 1)
print('FIX 1 CSS: OK')

# ===========================================================================
# FIX 2: Adicionar botao "Nova Movimentação" no table-actions
# ===========================================================================
BTN_ANCHOR = (
    b'                            <button class="btn-export success" onclick="exportarFluxoPDF()"><i class="fas fa-print"></i> Imprimir</button>' + NL +
    b'                        </div>'
)
BTN_ADD = (
    b'                            <button class="btn-export success" onclick="exportarFluxoPDF()"><i class="fas fa-print"></i> Imprimir</button>' + NL +
    b'                            <button class="btn-nova-movimentacao" onclick="abrirModalMovimentacao()"><i class="fas fa-plus"></i> Nova Movimenta\xc3\xa7\xc3\xa3o</button>' + NL +
    b'                        </div>'
)
assert BTN_ANCHOR in raw, 'ERRO: BTN anchor not found'
raw = raw.replace(BTN_ANCHOR, BTN_ADD, 1)
print('FIX 2 botao: OK')

# ===========================================================================
# FIX 3: Adicionar HTML da modal antes de </main>
# ===========================================================================
MODAL_ANCHOR = (
    b'            </div>' + NL +
    b'        </main>' + NL +
    b'    </div>'
)
MODAL_HTML = (
    b'            </div>' + NL +
    b'        </main>' + NL +
    b'    </div>' + NL +
    NL +
    b'    <!-- Modal Nova Movimenta\xc3\xa7\xc3\xa3o -->' + NL +
    b'    <div id="modal-nova-movimentacao" class="modal-overlay" style="display:none;" onclick="if(event.target===this)fecharModalMovimentacao()">' + NL +
    b'        <div class="modal-box">' + NL +
    b'            <div class="modal-header">' + NL +
    b'                <span><i class="fas fa-plus-circle" style="color:#10b981;margin-right:8px;"></i> Nova Movimenta\xc3\xa7\xc3\xa3o</span>' + NL +
    b'                <button class="btn-fechar" onclick="fecharModalMovimentacao()">Fechar \xc3\x97</button>' + NL +
    b'            </div>' + NL +
    b'            <div class="modal-body">' + NL +
    b'                <div class="form-row-2">' + NL +
    b'                    <div class="form-group">' + NL +
    b'                        <label>Conta Banc\xc3\xa1ria</label>' + NL +
    b'                        <select id="mov-conta-id"><option value="">Selecione...</option></select>' + NL +
    b'                    </div>' + NL +
    b'                    <div class="form-group">' + NL +
    b'                        <label>Tipo de Movimenta\xc3\xa7\xc3\xa3o</label>' + NL +
    b'                        <select id="mov-tipo"><option value="entrada">Entrada</option><option value="saida">Sa\xc3\xadda</option></select>' + NL +
    b'                    </div>' + NL +
    b'                </div>' + NL +
    b'                <div class="form-row-3">' + NL +
    b'                    <div class="form-group">' + NL +
    b'                        <label>Valor</label>' + NL +
    b'                        <input type="number" id="mov-valor" step="0.01" min="0" placeholder="0,00">' + NL +
    b'                    </div>' + NL +
    b'                    <div class="form-group">' + NL +
    b'                        <label>Data</label>' + NL +
    b'                        <input type="date" id="mov-data">' + NL +
    b'                    </div>' + NL +
    b'                    <div class="form-group">' + NL +
    b'                        <label>Categoria</label>' + NL +
    b'                        <select id="mov-categoria"><option value="">Selecione...</option></select>' + NL +
    b'                    </div>' + NL +
    b'                </div>' + NL +
    b'                <div class="form-group">' + NL +
    b'                    <label>Descri\xc3\xa7\xc3\xa3o <span style="color:#ef4444">*</span></label>' + NL +
    b'                    <input type="text" id="mov-descricao" placeholder="Ex: Recebimento de vendas, Pagamento de fornecedor...">' + NL +
    b'                </div>' + NL +
    b'                <div class="form-group">' + NL +
    b'                    <label>Observa\xc3\xa7\xc3\xb5es</label>' + NL +
    b'                    <textarea id="mov-obs" rows="3" placeholder="Anota\xc3\xa7\xc3\xb5es adicionais sobre esta movimenta\xc3\xa7\xc3\xa3o..."></textarea>' + NL +
    b'                </div>' + NL +
    b'            </div>' + NL +
    b'            <div class="modal-footer">' + NL +
    b'                <button class="btn-registrar" onclick="registrarMovimentacao()"><i class="fas fa-save"></i> Registrar Movimenta\xc3\xa7\xc3\xa3o</button>' + NL +
    b'            </div>' + NL +
    b'        </div>' + NL +
    b'    </div>'
)
assert MODAL_ANCHOR in raw, 'ERRO: MODAL anchor not found'
raw = raw.replace(MODAL_ANCHOR, MODAL_HTML, 1)
print('FIX 3 modal HTML: OK')

# ===========================================================================
# FIX 4: Adicionar funções JS antes do DOMContentLoaded
# ===========================================================================
JS_ANCHOR = b"        document.addEventListener('DOMContentLoaded', () => { init().catch(e => console.error(e)); });"
JS_ADD = (
    b'        // ===== MODAL NOVA MOVIMENTACAO =====' + NL +
    b'        async function carregarContasBancariasModal() {' + NL +
    b'            try {' + NL +
    b'                const r = await fetch(\'/api/financeiro/contas-bancarias\', { credentials: \'include\' });' + NL +
    b'                if (!r.ok) return;' + NL +
    b'                const data = await r.json();' + NL +
    b'                const contas = Array.isArray(data) ? data : (data.data || []);' + NL +
    b'                const sel = document.getElementById(\'mov-conta-id\');' + NL +
    b'                if (!sel) return;' + NL +
    b'                sel.innerHTML = \'<option value="">Selecione...</option>\';' + NL +
    b'                contas.forEach(c => {' + NL +
    b'                    const opt = document.createElement(\'option\');' + NL +
    b'                    opt.value = c.id;' + NL +
    b'                    const banco = c.nome_banco || c.banco || c.nome || \'\';' + NL +
    b'                    const ag = c.agencia ? \' \xe2\x80\x94 Ag. \' + c.agencia : \'\';' + NL +
    b'                    const cc = c.numero_conta || c.conta || \'\';' + NL +
    b'                    opt.textContent = banco + (cc ? \' \xe2\x80\x94 Cc. \' + cc : \'\') + ag;' + NL +
    b'                    sel.appendChild(opt);' + NL +
    b'                });' + NL +
    b'            } catch(e) { console.error(\'carregarContasBancariasModal:\', e); }' + NL +
    b'        }' + NL +
    NL +
    b'        async function carregarCategoriasModal() {' + NL +
    b'            const sel = document.getElementById(\'mov-categoria\');' + NL +
    b'            if (!sel) return;' + NL +
    b'            // Fallback est\xc3\xa1tico com optgroups' + NL +
    b'            sel.innerHTML = `' + NL +
    b'                <option value="">Selecione...</option>' + NL +
    b'                <optgroup label="Receitas">' + NL +
    b'                    <option value="Vendas">Vendas</option>' + NL +
    b'                    <option value="Servi\xc3\xa7os Prestados">Servi\xc3\xa7os Prestados</option>' + NL +
    b'                    <option value="Comiss\xc3\xb5es">Comiss\xc3\xb5es</option>' + NL +
    b'                    <option value="Juros / Rendimentos">Juros / Rendimentos</option>' + NL +
    b'                    <option value="Outras Receitas">Outras Receitas</option>' + NL +
    b'                </optgroup>' + NL +
    b'                <optgroup label="Despesas">' + NL +
    b'                    <option value="Fornecedores">Fornecedores</option>' + NL +
    b'                    <option value="Pessoal / RH">Pessoal / RH</option>' + NL +
    b'                    <option value="Impostos">Impostos</option>' + NL +
    b'                    <option value="Utilidades">Utilidades (Luz, \xc3\x81gua, Internet)</option>' + NL +
    b'                    <option value="Aluguel">Aluguel</option>' + NL +
    b'                    <option value="Outras Despesas">Outras Despesas</option>' + NL +
    b'                </optgroup>' + NL +
    b'                <optgroup label="Outros">' + NL +
    b'                    <option value="Transfer\xc3\xaancia">Transfer\xc3\xaancia</option>' + NL +
    b'                    <option value="Investimento">Investimento</option>' + NL +
    b'                    <option value="Outros">Outros</option>' + NL +
    b'                </optgroup>`;' + NL +
    b'            // Tentar carregar do servidor' + NL +
    b'            try {' + NL +
    b'                const r = await fetch(\'/api/financeiro/categorias\', { credentials: \'include\' });' + NL +
    b'                if (!r.ok) return;' + NL +
    b'                const data = await r.json();' + NL +
    b'                const cats = Array.isArray(data) ? data : (data.data || []);' + NL +
    b'                if (cats.length === 0) return;' + NL +
    b'                sel.innerHTML = \'<option value="">Selecione...</option>\';' + NL +
    b'                const grupos = {};' + NL +
    b'                cats.forEach(c => {' + NL +
    b'                    const g = (c.tipo || c.grupo || \'outros\').toLowerCase();' + NL +
    b'                    if (!grupos[g]) grupos[g] = [];' + NL +
    b'                    grupos[g].push(c);' + NL +
    b'                });' + NL +
    b'                const ordemGrupos = [\'receita\', \'despesa\', \'outros\'];' + NL +
    b'                const labelGrupos = { receita: \'Receitas\', despesa: \'Despesas\', outros: \'Outros\' };' + NL +
    b'                const ordemFinal = [...ordemGrupos, ...Object.keys(grupos).filter(k => !ordemGrupos.includes(k))];' + NL +
    b'                ordemFinal.forEach(g => {' + NL +
    b'                    if (!grupos[g] || grupos[g].length === 0) return;' + NL +
    b'                    const og = document.createElement(\'optgroup\');' + NL +
    b'                    og.label = labelGrupos[g] || g.charAt(0).toUpperCase() + g.slice(1);' + NL +
    b'                    grupos[g].forEach(c => {' + NL +
    b'                        const opt = document.createElement(\'option\');' + NL +
    b'                        opt.value = c.id || c.nome;' + NL +
    b'                        opt.textContent = c.nome || c.descricao;' + NL +
    b'                        og.appendChild(opt);' + NL +
    b'                    });' + NL +
    b'                    sel.appendChild(og);' + NL +
    b'                });' + NL +
    b'            } catch(e) { /* mant\xc3\xa9m fallback est\xc3\xa1tico */ }' + NL +
    b'        }' + NL +
    NL +
    b'        async function abrirModalMovimentacao() {' + NL +
    b'            const modal = document.getElementById(\'modal-nova-movimentacao\');' + NL +
    b'            if (!modal) return;' + NL +
    b'            modal.style.display = \'flex\';' + NL +
    b'            const dataEl = document.getElementById(\'mov-data\');' + NL +
    b'            if (dataEl && !dataEl.value) dataEl.value = new Date().toISOString().split(\'T\')[0];' + NL +
    b'            await Promise.all([carregarContasBancariasModal(), carregarCategoriasModal()]);' + NL +
    b'        }' + NL +
    NL +
    b'        function fecharModalMovimentacao() {' + NL +
    b'            const modal = document.getElementById(\'modal-nova-movimentacao\');' + NL +
    b'            if (modal) modal.style.display = \'none\';' + NL +
    b'            [\'mov-valor\', \'mov-descricao\', \'mov-obs\'].forEach(id => { const el = document.getElementById(id); if (el) el.value = \'\'; });' + NL +
    b'            const selConta = document.getElementById(\'mov-conta-id\'); if (selConta) selConta.selectedIndex = 0;' + NL +
    b'            const selTipo = document.getElementById(\'mov-tipo\'); if (selTipo) selTipo.value = \'entrada\';' + NL +
    b'            const selCat = document.getElementById(\'mov-categoria\'); if (selCat) selCat.selectedIndex = 0;' + NL +
    b'        }' + NL +
    NL +
    b'        async function registrarMovimentacao() {' + NL +
    b'            const contaId = document.getElementById(\'mov-conta-id\').value;' + NL +
    b'            const tipo = document.getElementById(\'mov-tipo\').value;' + NL +
    b'            const valor = parseFloat(document.getElementById(\'mov-valor\').value);' + NL +
    b'            const data = document.getElementById(\'mov-data\').value;' + NL +
    b'            const descricao = document.getElementById(\'mov-descricao\').value.trim();' + NL +
    b'            const categoria = document.getElementById(\'mov-categoria\').value;' + NL +
    b'            const observacoes = document.getElementById(\'mov-obs\').value.trim();' + NL +
    b'            if (!contaId) { alert(\'Selecione a Conta Banc\xc3\xa1ria.\'); return; }' + NL +
    b'            if (!valor || valor <= 0) { alert(\'Informe um valor v\xc3\xa1lido.\'); return; }' + NL +
    b'            if (!data) { alert(\'Informe a data.\'); return; }' + NL +
    b'            if (!descricao) { alert(\'Informe a descri\xc3\xa7\xc3\xa3o.\'); return; }' + NL +
    b'            try {' + NL +
    b'                const r = await fetch(\'/api/financeiro/movimentacoes\', {' + NL +
    b'                    method: \'POST\', credentials: \'include\',' + NL +
    b'                    headers: { \'Content-Type\': \'application/json\' },' + NL +
    b'                    body: JSON.stringify({ conta_id: contaId, tipo, valor, data, descricao, categoria, observacoes })' + NL +
    b'                });' + NL +
    b'                if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.message || `Erro ao registrar (HTTP ${r.status})`); return; }' + NL +
    b'                fecharModalMovimentacao();' + NL +
    b'                await carregarFluxo();' + NL +
    b'            } catch(e) { alert(\'Erro de conex\xc3\xa3o ao registrar movimenta\xc3\xa7\xc3\xa3o.\'); }' + NL +
    b'        }' + NL +
    NL +
    b"        document.addEventListener('DOMContentLoaded', () => { init().catch(e => console.error(e)); });"
)
assert JS_ANCHOR in raw, 'ERRO: JS anchor not found'
raw = raw.replace(JS_ANCHOR, JS_ADD, 1)
print('FIX 4 JS: OK')

with open(f, 'wb') as fh:
    fh.write(raw)

print(f'\nAll fixes saved. Total size: {len(raw)} bytes')
