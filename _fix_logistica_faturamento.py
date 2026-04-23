#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix: inutilizacao 404 links + Logistica TypeError + alerts"""
import os

BASE = r"g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra"

def fix_file(path, replacements):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(path, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"FIXED: {os.path.basename(path)}")
    else:
        print(f"SKIP (no match): {os.path.basename(path)}")

# ── 1. Fix inutilização.html links in Faturamento public files ──────────────
fat_pub = os.path.join(BASE, "modules", "Faturamento", "public")
faturamento_files = [
    "consultar.html", "index.html", "relatorios.html",
    "inutilizacao.html", "eventos.html", "dashboard.html",
    "emitir.html", "danfe.html", "nfse.html", "logistica.html",
]
for fname in faturamento_files:
    p = os.path.join(fat_pub, fname)
    if os.path.exists(p):
        fix_file(p, [("inutilização.html", "inutilizacao.html")])

# ── 2. Fix Logistica/public/index.html ──────────────────────────────────────
logistica_index = os.path.join(BASE, "modules", "Logistica", "public", "index.html")

SHOW_TOAST_FN = """        function showToast(msg, type) {
            type = type || 'info';
            var colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
            var t = document.createElement('div');
            t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:' + (colors[type] || colors.info) + ';color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:99999;max-width:360px;animation:_toast-in .3s ease';
            t.textContent = msg;
            if (!document.getElementById('_toast-kf')) {
                var s = document.createElement('style'); s.id = '_toast-kf';
                s.textContent = '@keyframes _toast-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
                document.head.appendChild(s);
            }
            document.body.appendChild(t);
            setTimeout(function(){ t.remove(); }, 3500);
        }
"""

logistica_replacements = [
    # --- insert showToast before first function ---
    (
        "        function toggleMobileSidebar()",
        SHOW_TOAST_FN + "        function toggleMobileSidebar()"
    ),
    # --- fix ID mismatch (TypeError) ---
    ("document.getElementById('count-separação')", "document.getElementById('count-separacao')"),
    # --- replace all alert() with showToast() ---
    ("alert('Erro ao atualizar status')",              "showToast('Erro ao atualizar status', 'error')"),
    ("alert('Erro de conexão')",                       "showToast('Erro de conexão', 'error')"),
    ("alert('Pedido não encontrado')",                 "showToast('Pedido não encontrado', 'error')"),
    ("alert('Nenhum pedido para exportar')",           "showToast('Nenhum pedido para exportar', 'warning')"),
    ("alert('Erro ao salvar expedição')",              "showToast('Erro ao salvar expedição', 'error')"),
    ("alert('Razão Social é obrigatória')",            "showToast('Razão Social é obrigatória', 'warning')"),
    ("alert(data.error || 'Erro ao salvar transportadora')", "showToast(data.error || 'Erro ao salvar transportadora', 'error')"),
    ("alert(d.error || 'Erro ao excluir')",            "showToast(d.error || 'Erro ao excluir', 'error')"),
    ("alert('Selecione uma transportadora')",          "showToast('Selecione uma transportadora', 'warning')"),
    ("alert('Erro ao atribuir transportadora')",       "showToast('Erro ao atribuir transportadora', 'error')"),
    ("alert('Transportadora não encontrada')",         "showToast('Transportadora não encontrada', 'error')"),
    ("alert('Selecione a UF de destino')",             "showToast('Selecione a UF de destino', 'warning')"),
    ("alert('Informe o ID do pedido')",                "showToast('Informe o ID do pedido', 'warning')"),
    ("alert('Descrição é obrigatória')",               "showToast('Descrição é obrigatória', 'warning')"),
    ("alert(d.error || 'Erro ao salvar')",             "showToast(d.error || 'Erro ao salvar', 'error')"),
    ("alert('Transportadora e valor do frete são obrigatórios')", "showToast('Transportadora e valor do frete são obrigatórios', 'warning')"),
    ("alert(data.error || 'Erro ao salvar CT-e')",     "showToast(data.error || 'Erro ao salvar CT-e', 'error')"),
    ("alert(d.error || 'Erro')",                       "showToast(d.error || 'Erro', 'error')"),
    ("alert('Chave de acesso deve ter 44 dígitos')",   "showToast('Chave de acesso deve ter 44 dígitos', 'warning')"),
    ("alert('UF deve ter 2 caracteres')",              "showToast('UF deve ter 2 caracteres', 'warning')"),
    ("alert('Transportadora, UF início e UF fim são obrigatórios')", "showToast('Transportadora, UF início e UF fim são obrigatórios', 'warning')"),
    ("alert(data.error || 'Erro ao salvar MDF-e')",    "showToast(data.error || 'Erro ao salvar MDF-e', 'error')"),
]

fix_file(logistica_index, logistica_replacements)

# verify no alert() left
with open(logistica_index, 'r', encoding='utf-8') as f:
    lines = f.readlines()
remaining = [(i+1, l.rstrip()) for i, l in enumerate(lines) if "alert(" in l and "showToast" not in l]
if remaining:
    print("REMAINING alert() in logistica/index.html:")
    for ln, txt in remaining:
        print(f"  L{ln}: {txt[:100]}")
else:
    print("OK: no raw alert() remaining in logistica/index.html")

print("Done.")
