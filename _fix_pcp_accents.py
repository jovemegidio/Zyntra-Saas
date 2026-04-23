#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix accented JS function call mismatches in estoque.html, materiais.html.
Also add null-safety for modal-mov-quantidade in pcp-modals.js.
"""

BASE = r"g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP"

def patch(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        count = content.count(old)
        if count == 0:
            print(f"  MISS [{count}]: {repr(old[:60])}")
        else:
            content = content.replace(old, new)
            print(f"  OK   [{count}]: {repr(old[:60])}")
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  => WRITTEN: {path}")
    else:
        print(f"  => NO CHANGE: {path}")

# ── estoque.html ──────────────────────────────────────────────────────────────
print("=== estoque.html ===")
patch(BASE + r"\pages\estoque.html", [
    # 1. wrapper functions
    ("function abrirEntradaRapida() { abrirModalMovimentação('entrada'); }",
     "function abrirEntradaRapida() { abrirModalMovimentacao('entrada'); }"),
    ("function abrirSaidaRapida() { abrirModalMovimentação('saida'); }",
     "function abrirSaidaRapida() { abrirModalMovimentacao('saida'); }"),
    ("function abrirAjusteInventario() { abrirModalMovimentação('ajuste'); }",
     "function abrirAjusteInventario() { abrirModalMovimentacao('ajuste'); }"),
    # 2. typeof checks + calls
    ("typeof abrirModalMovimentação === 'function'",
     "typeof abrirModalMovimentacao === 'function'"),
    ("abrirModalMovimentação('entrada', produtoAtual);",
     "abrirModalMovimentacao('entrada', produtoAtual);"),
    ("abrirModalMovimentação('saida', produtoAtual);",
     "abrirModalMovimentacao('saida', produtoAtual);"),
    ("abrirModalMovimentação('ajuste', produtoAtual);",
     "abrirModalMovimentacao('ajuste', produtoAtual);"),
    # 3. generic call in abrirModalMovProduto
    ("abrirModalMovimentação(tipo, produto);",
     "abrirModalMovimentacao(tipo, produto);"),
    # 4. atualizarSaudação
    ("atualizarSaudação();",
     "atualizarSaudacao();"),
])

# ── materiais.html ────────────────────────────────────────────────────────────
print("=== materiais.html ===")
patch(BASE + r"\pages\materiais.html", [
    ("function abrirEntradaRapidaMaterial() { abrirModalMovimentaçãoMaterial('entrada'); }",
     "function abrirEntradaRapidaMaterial() { abrirModalMovimentacaoMaterial('entrada'); }"),
    ("function abrirSaidaRapidaMaterial() { abrirModalMovimentaçãoMaterial('saida'); }",
     "function abrirSaidaRapidaMaterial() { abrirModalMovimentacaoMaterial('saida'); }"),
    ("function abrirAjusteInventarioMaterial() { abrirModalMovimentaçãoMaterial('ajuste'); }",
     "function abrirAjusteInventarioMaterial() { abrirModalMovimentacaoMaterial('ajuste'); }"),
    ("atualizarSaudação();",
     "atualizarSaudacao();"),
])

# ── pcp-modals.js: null-safety for modal-mov-quantidade/observacao/documento ──
print("=== pcp-modals.js (null-safety) ===")
patch(BASE + r"\js\pcp-modals.js", [
    (
        "    document.getElementById('modal-mov-quantidade').value = '';\n"
        "    document.getElementById('modal-mov-observacao').value = '';\n"
        "    document.getElementById('modal-mov-documento').value = '';",
        "    const _qty = document.getElementById('modal-mov-quantidade'); if (_qty) _qty.value = '';\n"
        "    const _obs = document.getElementById('modal-mov-observacao'); if (_obs) _obs.value = '';\n"
        "    const _doc = document.getElementById('modal-mov-documento'); if (_doc) _doc.value = '';",
    ),
])

print("\nDone.")
