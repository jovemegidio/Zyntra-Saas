# -*- coding: utf-8 -*-
"""
Fix PCP accent errors in JS getElementById calls and sidebar href 404 links.
Uses binary read/write to preserve CRLF and UTF-8 exactly.
"""

import os

def fix_file(path, replacements):
    if not os.path.exists(path):
        print(f"  [SKIP] not found: {path}")
        return
    data = open(path, 'rb').read()
    original = data
    for old, new in replacements:
        old_b = old.encode('utf-8')
        new_b = new.encode('utf-8')
        count = data.count(old_b)
        if count == 0:
            print(f"  [WARN] not found: {repr(old)}")
        else:
            data = data.replace(old_b, new_b)
            print(f"  [OK]  {count}x  {repr(old)[:60]} -> {repr(new)[:40]}")
    if data != original:
        open(path, 'wb').write(data)
        print(f"  => SAVED {path}")
    else:
        print(f"  => no changes in {path}")

# =====================================================================
# 1. apontamentos.html
# =====================================================================
print("\n=== modules/PCP/apontamentos.html ===")
fix_file('modules/PCP/apontamentos.html', [
    # Sidebar 404 fix
    ("href=\"pages/Gestão-producao.html\"", "href=\"pages/gestao-producao.html\""),
    # getElementById ID mismatch fixes
    ("getElementById('saudação')",       "getElementById('saudacao')"),
    ("getElementById('açõesTimer')",     "getElementById('acoesTimer')"),
    ("getElementById('inputPedidoNúmero')",      "getElementById('inputPedidoNumero')"),
    ("getElementById('inputProdutoDescrição')",  "getElementById('inputProdutoDescricao')"),
    ("getElementById('inputObservações')",       "getElementById('inputObservacoes')"),
])

# =====================================================================
# 2. faturamento.html
# =====================================================================
print("\n=== modules/PCP/pages/faturamento.html ===")
fix_file('modules/PCP/pages/faturamento.html', [
    # Sidebar 404 fix (if present)
    ("href=\"../Gestão-producao.html\"",  "href=\"../gestao-producao.html\""),
    ("href=\"Gestão-producao.html\"",     "href=\"gestao-producao.html\""),
    # DOMContentLoaded function name fix
    ("atualizarSaudação()",              "atualizarSaudacao()"),
    # getElementById ID mismatch fixes
    ("getElementById('fat-pedido-número')",  "getElementById('fat-pedido-numero')"),
    ("getElementById('fat-observações')",    "getElementById('fat-observacoes')"),
    ("getElementById('info-pedido-número')", "getElementById('info-pedido-numero')"),
])

# =====================================================================
# 3. gestao-producao.html (self-link 404)
# =====================================================================
print("\n=== modules/PCP/pages/gestao-producao.html ===")
fix_file('modules/PCP/pages/gestao-producao.html', [
    ("href=\"Gestão-producao.html\"", "href=\"gestao-producao.html\""),
])

# =====================================================================
# 4. ordens-producao.html (sidebar link)
# =====================================================================
print("\n=== modules/PCP/ordens-producao.html ===")
fix_file('modules/PCP/ordens-producao.html', [
    ("href=\"pages/Gestão-producao.html\"", "href=\"pages/gestao-producao.html\""),
])

# =====================================================================
# 5. relatorios-apontamentos.html (sidebar link)
# =====================================================================
print("\n=== modules/PCP/relatorios-apontamentos.html ===")
fix_file('modules/PCP/relatorios-apontamentos.html', [
    ("href=\"pages/Gestão-producao.html\"", "href=\"pages/gestao-producao.html\""),
])

# =====================================================================
# 6. index.html (navigateTo pageMap 404)
# =====================================================================
print("\n=== modules/PCP/index.html ===")
fix_file('modules/PCP/index.html', [
    ("'pages/Gestão-producao.html'", "'pages/gestao-producao.html'"),
])

print("\nDone.")
