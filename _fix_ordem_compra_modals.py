#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Replace native prompt() calls in ordem-compra.html with Zyntra-styled modals."""
import os, sys

FILE = r"g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\ordem-compra.html"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ─── 1. Replace adicionarItemOC ──────────────────────────────────────────────
OLD_ADD = """        function adicionarItemOC() {
            const código = prompt('Código do produto:');
            if (!código) return;

            const descrição = prompt('Descrição do produto:');
            if (!descrição) return;

            const quantidade = parseFloat(prompt('Quantidade:', '1')) || 1;
            const precoUnit = parseFloat(prompt('Preço unitário:', '0')) || 0;

            itensOC.push({
                id: itensOC.length + 1,
                código,
                descrição,
                quantidade,
                precoUnit,
                total: quantidade * precoUnit
            });

            renderizarItensOC();
            calcularTotaisOC();
        }"""

NEW_ADD = """        function adicionarItemOC() {
            const modal = document.getElementById('modal-add-item-oc');
            modal.querySelector('#add-item-codigo').value = '';
            modal.querySelector('#add-item-descricao').value = '';
            modal.querySelector('#add-item-quantidade').value = '1';
            modal.querySelector('#add-item-preco').value = '0';
            modal.classList.add('active');
            setTimeout(() => modal.querySelector('#add-item-codigo').focus(), 100);
        }

        function fecharModalAddItem() {
            document.getElementById('modal-add-item-oc').classList.remove('active');
        }

        function confirmarAddItem() {
            const codigo = document.getElementById('add-item-codigo').value.trim();
            const descricao = document.getElementById('add-item-descricao').value.trim();
            const quantidade = parseFloat(document.getElementById('add-item-quantidade').value) || 1;
            const precoUnit = parseFloat(document.getElementById('add-item-preco').value) || 0;
            if (!codigo) { showToast('Informe o código do produto', 'warning'); return; }
            if (!descricao) { showToast('Informe a descrição do produto', 'warning'); return; }
            itensOC.push({
                id: itensOC.length + 1,
                codigo,
                descricao,
                quantidade,
                precoUnit,
                total: quantidade * precoUnit
            });
            fecharModalAddItem();
            renderizarItensOC();
            calcularTotaisOC();
            showToast('Item adicionado', 'success');
        }"""

# ─── 2. Replace editarItemOC ─────────────────────────────────────────────────
OLD_EDIT = """        function editarItemOC() {
            if (itensOC.length === 0) {
                showToast('Nenhum item para editar', 'warning');
                return;
            }
            const id = parseInt(prompt('Digite o número do item a editar:'));
            const item = itensOC.find(i => i.id === id);
            if (!item) {
                showToast('Item não encontrado', 'error');
                return;
            }

            item.quantidade = parseFloat(prompt('Nova quantidade:', item.quantidade)) || item.quantidade;
            item.precoUnit = parseFloat(prompt('Novo preço unitário:', item.precoUnit)) || item.precoUnit;
            item.total = item.quantidade * item.precoUnit;

            renderizarItensOC();
            calcularTotaisOC();
        }"""

NEW_EDIT = """        function editarItemOC() {
            if (itensOC.length === 0) {
                showToast('Nenhum item para editar', 'warning');
                return;
            }
            const sel = document.getElementById('edit-item-select');
            sel.innerHTML = itensOC.map(i =>
                `<option value="${i.id}">#${i.id} - ${i.codigo} - ${i.descricao}</option>`
            ).join('');
            const first = itensOC[0];
            document.getElementById('edit-item-quantidade').value = first.quantidade;
            document.getElementById('edit-item-preco').value = first.precoUnit;
            sel.onchange = function() {
                const item = itensOC.find(i => i.id === parseInt(this.value));
                if (item) {
                    document.getElementById('edit-item-quantidade').value = item.quantidade;
                    document.getElementById('edit-item-preco').value = item.precoUnit;
                }
            };
            document.getElementById('modal-edit-item-oc').classList.add('active');
        }

        function fecharModalEditItem() {
            document.getElementById('modal-edit-item-oc').classList.remove('active');
        }

        function confirmarEditItem() {
            const id = parseInt(document.getElementById('edit-item-select').value);
            const item = itensOC.find(i => i.id === id);
            if (!item) { showToast('Item não encontrado', 'error'); return; }
            item.quantidade = parseFloat(document.getElementById('edit-item-quantidade').value) || item.quantidade;
            item.precoUnit = parseFloat(document.getElementById('edit-item-preco').value) || item.precoUnit;
            item.total = item.quantidade * item.precoUnit;
            fecharModalEditItem();
            renderizarItensOC();
            calcularTotaisOC();
            showToast('Item atualizado', 'success');
        }"""

# ─── 3. Replace excluirItemOC ────────────────────────────────────────────────
OLD_DEL = """        function excluirItemOC() {
            if (itensOC.length === 0) {
                showToast('Nenhum item para excluir', 'warning');
                return;
            }
            const id = parseInt(prompt('Digite o número do item a excluir:'));
            const idx = itensOC.findIndex(i => i.id === id);
            if (idx === -1) {
                showToast('Item não encontrado', 'error');
                return;
            }

            itensOC.splice(idx, 1);
            renderizarItensOC();
            calcularTotaisOC();
            showToast('Item excluído', 'success');
        }"""

NEW_DEL = """        function excluirItemOC() {
            if (itensOC.length === 0) {
                showToast('Nenhum item para excluir', 'warning');
                return;
            }
            const sel = document.getElementById('del-item-select');
            sel.innerHTML = itensOC.map(i =>
                `<option value="${i.id}">#${i.id} - ${i.codigo} - ${i.descricao}</option>`
            ).join('');
            document.getElementById('modal-del-item-oc').classList.add('active');
        }

        function fecharModalDelItem() {
            document.getElementById('modal-del-item-oc').classList.remove('active');
        }

        function confirmarDelItem() {
            const id = parseInt(document.getElementById('del-item-select').value);
            const idx = itensOC.findIndex(i => i.id === id);
            if (idx === -1) { showToast('Item não encontrado', 'error'); return; }
            itensOC.splice(idx, 1);
            fecharModalDelItem();
            renderizarItensOC();
            calcularTotaisOC();
            showToast('Item excluído', 'success');
        }"""

# ─── 4. Modal HTML to inject before </body> ──────────────────────────────────
MODAL_HTML = """
    <!-- Modal: Adicionar Item OC -->
    <div class="modal-overlay" id="modal-add-item-oc" onclick="if(event.target===this)fecharModalAddItem()">
        <div style="background:white;border-radius:12px;width:100%;max-width:480px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp .3s ease;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:linear-gradient(135deg,#334155 0%,#475569 100%);color:white;border-bottom:3px solid #0f766e;">
                <h2 style="margin:0;font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;"><i class="fas fa-plus-circle" style="color:#5eead4;"></i> Adicionar Item</h2>
                <button onclick="fecharModalAddItem()" style="background:rgba(255,255,255,.15);border:none;color:white;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <div style="padding:24px;">
                <div class="form-group-oc">
                    <label><i class="fas fa-barcode"></i> Código <span class="required">*</span></label>
                    <input type="text" class="form-control-oc" id="add-item-codigo" placeholder="Ex: MAT-001" onkeydown="if(event.key==='Enter')document.getElementById('add-item-descricao').focus()">
                </div>
                <div class="form-group-oc">
                    <label><i class="fas fa-tag"></i> Descrição <span class="required">*</span></label>
                    <input type="text" class="form-control-oc" id="add-item-descricao" placeholder="Descrição do produto/material">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group-oc">
                        <label><i class="fas fa-hashtag"></i> Quantidade <span class="required">*</span></label>
                        <input type="number" class="form-control-oc" id="add-item-quantidade" value="1" min="0.001" step="0.001">
                    </div>
                    <div class="form-group-oc">
                        <label><i class="fas fa-dollar-sign"></i> Preço Unitário</label>
                        <input type="number" class="form-control-oc" id="add-item-preco" value="0" min="0" step="0.01">
                    </div>
                </div>
            </div>
            <div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;background:#f8fafc;">
                <button onclick="fecharModalAddItem()" style="padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
                <button onclick="confirmarAddItem()" style="padding:10px 20px;background:linear-gradient(135deg,#0f766e,#0d9488);color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-plus"></i> Adicionar</button>
            </div>
        </div>
    </div>

    <!-- Modal: Editar Item OC -->
    <div class="modal-overlay" id="modal-edit-item-oc" onclick="if(event.target===this)fecharModalEditItem()">
        <div style="background:white;border-radius:12px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp .3s ease;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:linear-gradient(135deg,#334155 0%,#475569 100%);color:white;border-bottom:3px solid #0f766e;">
                <h2 style="margin:0;font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;"><i class="fas fa-edit" style="color:#5eead4;"></i> Editar Item</h2>
                <button onclick="fecharModalEditItem()" style="background:rgba(255,255,255,.15);border:none;color:white;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <div style="padding:24px;">
                <div class="form-group-oc">
                    <label><i class="fas fa-list"></i> Selecionar Item <span class="required">*</span></label>
                    <select class="form-control-oc" id="edit-item-select"></select>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group-oc">
                        <label><i class="fas fa-hashtag"></i> Nova Quantidade</label>
                        <input type="number" class="form-control-oc" id="edit-item-quantidade" min="0.001" step="0.001">
                    </div>
                    <div class="form-group-oc">
                        <label><i class="fas fa-dollar-sign"></i> Novo Preço Unit.</label>
                        <input type="number" class="form-control-oc" id="edit-item-preco" min="0" step="0.01">
                    </div>
                </div>
            </div>
            <div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;background:#f8fafc;">
                <button onclick="fecharModalEditItem()" style="padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
                <button onclick="confirmarEditItem()" style="padding:10px 20px;background:linear-gradient(135deg,#334155,#475569);color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-save"></i> Salvar</button>
            </div>
        </div>
    </div>

    <!-- Modal: Excluir Item OC -->
    <div class="modal-overlay" id="modal-del-item-oc" onclick="if(event.target===this)fecharModalDelItem()">
        <div style="background:white;border-radius:12px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp .3s ease;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:linear-gradient(135deg,#7f1d1d,#991b1b);color:white;border-bottom:3px solid #ef4444;">
                <h2 style="margin:0;font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;"><i class="fas fa-trash" style="color:#fca5a5;"></i> Excluir Item</h2>
                <button onclick="fecharModalDelItem()" style="background:rgba(255,255,255,.15);border:none;color:white;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <div style="padding:24px;">
                <div class="form-group-oc">
                    <label><i class="fas fa-list"></i> Selecionar Item a Excluir</label>
                    <select class="form-control-oc" id="del-item-select"></select>
                </div>
                <p style="margin:16px 0 0;font-size:13px;color:#6b7280;display:flex;align-items:center;gap:6px;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> Esta ação não pode ser desfeita.</p>
            </div>
            <div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;background:#f8fafc;">
                <button onclick="fecharModalDelItem()" style="padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
                <button onclick="confirmarDelItem()" style="padding:10px 20px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-trash"></i> Excluir</button>
            </div>
        </div>
    </div>
"""

# Apply replacements
assert OLD_ADD in content, "adicionarItemOC not found"
assert OLD_EDIT in content, "editarItemOC not found"
assert OLD_DEL in content, "excluirItemOC not found"
assert '</body>' in content, "</body> not found"

content = content.replace(OLD_ADD, NEW_ADD, 1)
content = content.replace(OLD_EDIT, NEW_EDIT, 1)
content = content.replace(OLD_DEL, NEW_DEL, 1)
content = content.replace('</body>', MODAL_HTML + '</body>', 1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: ordem-compra.html patched — prompt() replaced with Zyntra modals")
