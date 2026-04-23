# Fix 3: Add _ensureMovimentacaoModalExists() to pcp-modals.js
# Fix 4: Fix accented onclick in PCP/index.html
import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# --- Fix 3: pcp-modals.js ---
f_modals = os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js')
with open(f_modals, 'rb') as f:
    raw = f.read()

# The _ensureMovimentacaoModalExists function to inject (full modal HTML)
ensure_fn = b"""
function _ensureMovimentacaoModalExists() {
    if (document.getElementById('modal-movimentacao-estoque')) return;
    const el = document.createElement('div');
    el.innerHTML = `
    <div class="modal-overlay" id="modal-movimentacao-estoque" style="z-index:10003;display:none;">
      <div style="background:white;border-radius:4px;max-width:500px;width:95%;box-shadow:0 8px 32px rgba(0,0,0,0.18);overflow:hidden;animation:slideUp 0.3s ease;max-height:92vh;overflow-y:auto;">
        <div id="modal-mov-header" style="padding:16px 20px;background:linear-gradient(135deg,#f59e0b,#d97706);border-bottom:1px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <i id="modal-mov-icon" class="fas fa-sliders-h" style="font-size:16px;color:white;"></i>
            <div>
              <h3 id="modal-mov-titulo" style="margin:0;font-size:16px;color:white;font-weight:600;">Ajuste de Estoque</h3>
              <p id="modal-mov-subtitulo" style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,0.8);">Corrigir quantidade em estoque</p>
            </div>
          </div>
          <button onclick="fecharModalMovimentacao()" style="background:rgba(255,255,255,0.2);border:none;cursor:pointer;font-size:13px;color:white;display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:4px;">Fechar <span style="font-size:16px;margin-left:2px;">\u2715</span></button>
        </div>
        <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
          <div id="modal-mov-produto-search-container" style="display:block;">
            <label style="font-size:11px;color:#666;font-weight:500;display:block;margin-bottom:4px;">Produto *</label>
            <input type="text" id="modal-mov-produto-busca" placeholder="Buscar por c\u00f3digo ou nome..." oninput="buscarProdutoMovimentacao(this.value)" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:4px;font-size:13px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#ddd'">
            <div id="modal-mov-produto-resultados" style="display:none;border:1px solid #e2e8f0;border-radius:4px;max-height:180px;overflow-y:auto;background:white;box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-top:4px;"></div>
          </div>
          <div id="modal-mov-produto-info" style="display:none;background:#f9fafb;border:1px solid #eee;border-radius:4px;padding:12px 14px;align-items:center;gap:10px;">
            <i class="fas fa-box" style="color:#999;font-size:14px;"></i>
            <div style="flex:1;min-width:0;">
              <div id="modal-mov-produto-nome" style="font-size:13px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Produto</div>
              <div id="modal-mov-produto-codigo" style="font-size:11px;color:#999;">C\u00f3digo: ---</div>
            </div>
            <div style="text-align:right;padding-left:12px;border-left:1px solid #eee;">
              <div id="modal-mov-produto-estoque" style="font-size:18px;font-weight:700;color:#333;">0</div>
              <div style="font-size:10px;color:#999;text-transform:uppercase;">Estoque Atual</div>
            </div>
            <button onclick="limparProdutoMovimentacao()" style="background:none;border:none;cursor:pointer;color:#999;font-size:18px;padding:0 4px;" title="Trocar produto">\u2715</button>
          </div>
          <fieldset style="border:1px solid #eee;border-radius:4px;padding:12px;margin:0;">
            <legend style="font-size:11px;color:#999;padding:0 6px;font-weight:500;">Varia\u00e7\u00e3o de Cor</legend>
            <input type="text" id="modal-mov-cor" list="modal-mov-cor-list" placeholder="Ex: PRETO, AZUL..." style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:4px;font-size:13px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#ddd'">
            <datalist id="modal-mov-cor-list"></datalist>
            <div id="modal-mov-cor-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;"></div>
          </fieldset>
          <fieldset style="border:1px solid #eee;border-radius:4px;padding:12px;margin:0;">
            <legend style="font-size:11px;color:#999;padding:0 6px;font-weight:500;">Quantidade *</legend>
            <input type="number" id="modal-mov-quantidade" placeholder="0" min="0.001" step="0.001" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:4px;font-size:18px;font-weight:600;text-align:center;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#ddd'">
          </fieldset>
          <fieldset style="border:1px solid #eee;border-radius:4px;padding:12px;margin:0;">
            <legend style="font-size:11px;color:#999;padding:0 6px;font-weight:500;">Local de Estoque</legend>
            <select id="modal-mov-local" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:4px;font-size:13px;outline:none;box-sizing:border-box;background:white;">
              <option value="PRINCIPAL">Estoque Principal</option>
              <option value="PRODUCAO">Produ\u00e7\u00e3o</option>
              <option value="SECUNDARIO">Estoque Secund\u00e1rio</option>
              <option value="RESERVA">Reserva</option>
            </select>
          </fieldset>
          <fieldset style="border:1px solid #eee;border-radius:4px;padding:12px;margin:0;">
            <legend style="font-size:11px;color:#999;padding:0 6px;font-weight:500;">Motivo *</legend>
            <select id="modal-mov-motivo-preset" onchange="selecionarMotivoPreset()" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:4px;font-size:13px;outline:none;box-sizing:border-box;background:white;margin-bottom:8px;">
              <option value="">Selecione um motivo...</option>
              <option value="Compra de Fornecedor">Compra de Fornecedor</option>
              <option value="Devolu\u00e7\u00e3o de Cliente">Devolu\u00e7\u00e3o de Cliente</option>
              <option value="Produ\u00e7\u00e3o">Produ\u00e7\u00e3o</option>
              <option value="Transfer\u00eancia">Transfer\u00eancia entre Locais</option>
              <option value="Ajuste de Invent\u00e1rio">Ajuste de Invent\u00e1rio</option>
              <option value="Venda">Venda</option>
              <option value="Consumo Interno">Consumo Interno</option>
              <option value="Perda/Avaria">Perda/Avaria</option>
              <option value="outro">Outro (especificar)</option>
            </select>
            <textarea id="modal-mov-observacao" placeholder="Descreva o motivo da movimenta\u00e7\u00e3o..." rows="2" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:4px;font-size:13px;resize:none;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#ddd'"></textarea>
          </fieldset>
          <fieldset style="border:1px solid #eee;border-radius:4px;padding:12px;margin:0;">
            <legend style="font-size:11px;color:#999;padding:0 6px;font-weight:500;">Documento (opcional)</legend>
            <input type="text" id="modal-mov-documento" placeholder="Ex: NF 12345, OP-0001, Pedido #123" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:4px;font-size:13px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#ddd'">
          </fieldset>
        </div>
        <div style="padding:14px 20px;background:#f9fafb;border-top:1px solid #e5e5e5;display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="fecharModalMovimentacao()" style="padding:9px 18px;background:white;border:1px solid #ddd;border-radius:4px;font-size:13px;font-weight:500;color:#666;cursor:pointer;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">Cancelar</button>
          <button onclick="confirmarMovimentacao()" id="modal-mov-btn-confirmar" style="padding:9px 22px;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;border-radius:4px;font-size:13px;font-weight:600;color:white;cursor:pointer;display:flex;align-items:center;gap:6px;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"><i class="fas fa-check"></i> Confirmar Ajuste</button>
        </div>
      </div>
    </div>`.trim();
    document.body.appendChild(el.firstElementChild);
}

"""

# Inject BEFORE abrirModalMovimentacao
anchor = b"function abrirModalMovimentacao(tipo, produto) {"
if anchor in raw:
    if b"_ensureMovimentacaoModalExists" not in raw:
        raw = raw.replace(anchor, ensure_fn + anchor)
        # Also add call at start of function
        call_anchor = b"function abrirModalMovimentacao(tipo, produto) {\n    currentMovimentacaoTipo = tipo;"
        call_new   = b"function abrirModalMovimentacao(tipo, produto) {\n    _ensureMovimentacaoModalExists();\n    currentMovimentacaoTipo = tipo;"
        if call_anchor in raw:
            raw = raw.replace(call_anchor, call_new)
            print('  ✅ Added _ensureMovimentacaoModalExists + call')
        else:
            print('  ⚠️  Call anchor not found, need manual check')
    else:
        print('  _ensure already present, only adding call...')
        call_anchor = b"function abrirModalMovimentacao(tipo, produto) {\n    currentMovimentacaoTipo = tipo;"
        call_new   = b"function abrirModalMovimentacao(tipo, produto) {\n    _ensureMovimentacaoModalExists();\n    currentMovimentacaoTipo = tipo;"
        if call_anchor in raw:
            raw = raw.replace(call_anchor, call_new)
    with open(f_modals, 'wb') as f:
        f.write(raw)
    print('  ✅ pcp-modals.js saved')
else:
    print('  ❌ anchor not found!')

# --- Fix 4: PCP index.html - fix accented onclick ---
f_pcp = os.path.join(BASE, 'modules', 'PCP', 'index.html')
with open(f_pcp, 'rb') as f:
    raw4 = f.read()

# fecharModalMovimentação (with ç=\xc3\xa7 and ã=\xc3\xa3)
old_fechar = b"fecharModalMovimenta\xc3\xa7\xc3\xa3o"
new_fechar = b"fecharModalMovimentacao"
old_confirmar = b"confirmarMovimenta\xc3\xa7\xc3\xa3o"
new_confirmar = b"confirmarMovimentacao"

count_f = raw4.count(old_fechar)
count_c = raw4.count(old_confirmar)
print(f'PCP index.html: fecharModalMovimentação occurrences = {count_f}')
print(f'PCP index.html: confirmarMovimentação occurrences = {count_c}')

if count_f > 0 or count_c > 0:
    raw4 = raw4.replace(old_fechar, new_fechar)
    raw4 = raw4.replace(old_confirmar, new_confirmar)
    with open(f_pcp, 'wb') as f:
        f.write(raw4)
    print('  ✅ Fixed accented onclick handlers in PCP/index.html')

print('All done!')
