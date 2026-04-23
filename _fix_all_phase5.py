#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 5 fixes for Aluforce VPS
Run on VPS: python3 /tmp/fix_all_phase5.py
"""
import re, os

results = []

def report(name, ok, msg=''):
    results.append((name, ok, msg))
    print(f"{'OK' if ok else 'FAIL'}: {name} {msg}")

# =============================================================
# FIX 1: controlid.js - add headersSent guard on catch block
# =============================================================
f1 = '/var/www/aluforce/routes/controlid.js'
try:
    with open(f1, 'r', encoding='utf-8', errors='replace') as fh:
        c = fh.read()
    # Find the catch block for /rhid/ultimasmarcacoes
    old = "    } catch (error) {\n        console.error('[RHiD] Erro ao buscar"
    new = "    } catch (error) {\n        if (res.headersSent) return;\n        console.error('[RHiD] Erro ao buscar"
    if old in c:
        c = c.replace(old, new, 1)
        with open(f1, 'w', encoding='utf-8') as fh:
            fh.write(c)
        report('controlid.js headersSent guard', True)
    else:
        report('controlid.js headersSent guard', False, '- pattern not found')
except Exception as e:
    report('controlid.js', False, str(e))

# =============================================================
# FIX 2: Vendas index.html - payment condition
#   2a: Set hidden input synchronously before async call
#   2b: Fix early returns in carregarCondicoesPagamentoDB
# =============================================================
f2 = '/var/www/aluforce/modules/Vendas/public/index.html'
try:
    with open(f2, 'r', encoding='utf-8', errors='replace') as fh:
        c = fh.read()
    
    # 2a: Set hidden input right before calling the async function
    old2a = "            // Carregar condi\u00e7\u00f5es de pagamento do banco (usar parcelas como fallback)\n            carregarCondicoesPagamentoDB(pedido.condicao_pagamento || pedido.parcelas);"
    new2a = "            // Carregar condi\u00e7\u00f5es de pagamento do banco (usar parcelas como fallback)\n            // Definir valor imediatamente para n\u00e3o perder o dado se API demorar\n            const _condEl = document.getElementById('edit-condicao-pagamento');\n            if (_condEl && (pedido.condicao_pagamento || pedido.parcelas)) {\n                _condEl.value = pedido.condicao_pagamento || pedido.parcelas || 'a vista';\n            }\n            carregarCondicoesPagamentoDB(pedido.condicao_pagamento || pedido.parcelas);"
    if old2a in c:
        c = c.replace(old2a, new2a, 1)
        report('index.html sync hidden input', True)
    else:
        report('index.html sync hidden input', False, '- pattern not found')
    
    # 2b: Fix early returns in carregarCondicoesPagamentoDB
    # Change "if (!resp.ok) return;" to not return early, but skip rebuild
    old2b = """        async function carregarCondicoesPagamentoDB(condicaoSelecionada) {
            try {
                const resp = await fetch('/api/vendas/condicoes-pagamento', { credentials: 'include' });
                if (!resp.ok) return;
                const condi\u00e7\u00f5es = await resp.json();
                if (!Array.isArray(condi\u00e7\u00f5es) || condi\u00e7\u00f5es.length === 0) return;"""
    new2b = """        async function carregarCondicoesPagamentoDB(condicaoSelecionada) {
            try {
                const resp = await fetch('/api/vendas/condicoes-pagamento', { credentials: 'include' });
                if (!resp.ok) throw new Error('API error ' + resp.status);
                const condi\u00e7\u00f5es = await resp.json();
                if (!Array.isArray(condi\u00e7\u00f5es) || condi\u00e7\u00f5es.length === 0) throw new Error('Sem dados');"""
    if old2b in c:
        c = c.replace(old2b, new2b, 1)
        report('index.html fix early returns', True)
    else:
        report('index.html fix early returns', False, '- pattern not found')
    
    with open(f2, 'w', encoding='utf-8') as fh:
        fh.write(c)

except Exception as e:
    report('index.html payment fix', False, str(e))

# =============================================================
# FIX 3: Vendas index.html - DANFE/Recibo for recibo-status
# =============================================================
try:
    with open(f2, 'r', encoding='utf-8', errors='replace') as fh:
        c = fh.read()
    
    # Fix mostrarRecibo to show for all recibo-status orders (not just meia nota)
    old3a = "                    const mostrarRecibo = pedidoMeiaNota && (\n                        statusAtual === 'faturado' ||\n                        statusAtual === 'recibo' ||\n                        statusAtual === 'entregue'\n                    );"
    new3a = "                    // Recibo: sempre visivel para status 'recibo', ou meia nota faturada/entregue\n                    const mostrarRecibo = statusAtual === 'recibo' || (pedidoMeiaNota && (\n                        statusAtual === 'faturado' ||\n                        statusAtual === 'entregue'\n                    ));"
    if old3a in c:
        c = c.replace(old3a, new3a, 1)
        report('index.html mostrarRecibo fix', True)
    else:
        report('index.html mostrarRecibo fix', False, '- pattern not found')
    
    # Fix verRecibo function guard - allow for recibo status
    old3b = "            if (!pedidoEhMeiaNotaF9(pedidoAtual)) {\n                showNotification('Recibo dispon\u00edvel apenas para pedidos meia nota (F9)', 'warning');\n                return;\n            }"
    new3b = "            if (!pedidoEhMeiaNotaF9(pedidoAtual) && pedidoAtual._statusOriginal !== 'recibo') {\n                showNotification('Recibo dispon\u00edvel apenas para pedidos meia nota (F9) ou em status Recibo', 'warning');\n                return;\n            }"
    if old3b in c:
        c = c.replace(old3b, new3b, 1)
        report('index.html verRecibo guard fix', True)
    else:
        report('index.html verRecibo guard fix', False, '- pattern not found')
    
    with open(f2, 'w', encoding='utf-8') as fh:
        fh.write(c)

except Exception as e:
    report('index.html danfe/recibo fix', False, str(e))

# =============================================================
# FIX 4: relatorios.html - Top 5 Estados emoji -> FA icons
# =============================================================
f3 = '/var/www/aluforce/modules/Vendas/public/relatorios.html'
try:
    with open(f3, 'r', encoding='utf-8', errors='replace') as fh:
        c = fh.read()
    
    old4 = "            const medalhas = ['\U0001f947', '\U0001f948', '\U0001f949', '', ''];"
    new4 = "            const medalhas = [\n                '<i class=\"fas fa-trophy\" style=\"color:#f59e0b;font-size:18px;\"></i>',\n                '<i class=\"fas fa-medal\" style=\"color:#94a3b8;font-size:18px;\"></i>',\n                '<i class=\"fas fa-award\" style=\"color:#b45309;font-size:18px;\"></i>',\n                '', ''\n            ];"
    if old4 in c:
        c = c.replace(old4, new4, 1)
        report('relatorios.html emoji->icons', True)
    else:
        # Try alternate encoding
        old4b = "            const medalhas = ['\\ud83e\\udfc7', '\\ud83e\\udfc8', '\\ud83e\\udfc9', '', ''];"
        if old4b in c:
            c = c.replace(old4b, new4, 1)
            report('relatorios.html emoji->icons', True, '(alt)')
        else:
            # Search more loosely
            idx = c.find("const medalhas = [")
            if idx >= 0:
                end = c.find('];', idx) + 2
                old_seg = c[idx:end]
                c = c.replace(old_seg, new4.lstrip(), 1)
                report('relatorios.html emoji->icons', True, '(loose)')
            else:
                report('relatorios.html emoji->icons', False, '- pattern not found')
    
    # Fix the medal rendering to use innerHTML for FA icons
    old4c = "                ${medalhas[i] ? `<span style=\"font-size:20px;\">${medalhas[i]}</span>` : `<span style=\"display:inline-flex;width:24px;height:24px;background:${cores[i]};border-radius:7px;color:white;font-size:11px;font-weight:700;align-items:center;justify-content:center;\">${i+1}</span>`}"
    new4c = "                ${medalhas[i] ? `<span style=\"display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center;\">${medalhas[i]}</span>` : `<span style=\"display:inline-flex;width:24px;height:24px;background:${cores[i]};border-radius:7px;color:white;font-size:11px;font-weight:700;align-items:center;justify-content:center;\">${i+1}</span>`}"
    if old4c in c:
        c = c.replace(old4c, new4c, 1)
        report('relatorios.html medal span fix', True)
    else:
        report('relatorios.html medal span fix', False, '- ok or pattern changed')
    
    with open(f3, 'w', encoding='utf-8') as fh:
        fh.write(c)

except Exception as e:
    report('relatorios.html estados fix', False, str(e))

# =============================================================
# FIX 5: vendas-extended.js - Top Vendedores filter by role
# =============================================================
f4 = '/var/www/aluforce/routes/vendas-extended.js'
try:
    with open(f4, 'r', encoding='utf-8', errors='replace') as fh:
        c = fh.read()
    
    old5 = "                 WHERE JSON_CONTAINS(COALESCE(u.areas, '[]'), '\"vendas\"') OR u.role = 'vendedor'"
    new5 = "                 WHERE u.role IN ('comercial', 'vendedor') OR JSON_CONTAINS(COALESCE(u.areas, '[]'), '\"vendas\"')"
    if old5 in c:
        c = c.replace(old5, new5, 1)
        with open(f4, 'w', encoding='utf-8') as fh:
            fh.write(c)
        report('vendas-extended.js top vendedores filter', True)
    else:
        report('vendas-extended.js top vendedores filter', False, '- pattern not found')

except Exception as e:
    report('vendas-extended.js', False, str(e))

# =============================================================
# FIX 6: relatorios.html - vendor dropdown short names
# =============================================================
try:
    with open(f3, 'r', encoding='utf-8', errors='replace') as fh:
        c = fh.read()
    
    # Find where vendedores are added to selects and shorten names
    # Pattern: vendedores.forEach(v => { ... option ... v.nome ...
    old6 = "                        select.innerHTML = '<option value=\"\">Todos os vendedores</option>';\n                        vendedores.forEach(v => {"
    new6 = "                        select.innerHTML = '<option value=\"\">Todos os vendedores</option>';\n                        vendedores.forEach(v => {\n                            // Exibir apenas primeiro + ultimo nome\n                            const partes = (v.nome || '').trim().split(' ').filter(Boolean);\n                            v._nomeExibicao = partes.length > 1 ? partes[0] + ' ' + partes[partes.length-1] : v.nome;"
    if old6 in c:
        c = c.replace(old6, new6, 1)
        report('relatorios.html vendedores short name inject', True)
    else:
        report('relatorios.html vendedores short name inject', False, '- pattern not found')
    
    # Find the option text that uses v.nome and replace with v._nomeExibicao || v.nome
    # This is context-specific - let's look for the option creation near the vendedores loop
    old6b = "                            opt.textContent = v.nome;"
    new6b = "                            opt.textContent = v._nomeExibicao || v.nome;"
    count6b = c.count(old6b)
    if count6b > 0:
        c = c.replace(old6b, new6b)
        report('relatorios.html vendedor nome display', True, f'({count6b} occurrences)')
    else:
        report('relatorios.html vendedor nome display', False, '- pattern not found')
    
    with open(f3, 'w', encoding='utf-8') as fh:
        fh.write(c)

except Exception as e:
    report('relatorios.html vendor names', False, str(e))

# =============================================================
# FIX 7: dashboard-admin.html - Remove ligacoes section
# =============================================================
f5 = '/var/www/aluforce/modules/Vendas/public/dashboard-admin.html'
try:
    with open(f5, 'r', encoding='utf-8', errors='replace') as fh:
        c = fh.read()
    
    # Hide the ligacoes section (don't delete to be safe)
    old7 = 'id="ligacoesContent"'
    if old7 in c:
        # Find the parent container and add display:none
        # Look for the section div wrapping ligacoes
        idx = c.find('class="section-content" id="ligacoesContent"')
        if idx >= 0:
            # Find the parent section and add style="display:none"
            section_start = c.rfind('<div class="dashboard-section"', 0, idx)
            if section_start >= 0:
                c = c[:section_start] + '<!-- LIGACOES_HIDDEN --><div class="dashboard-section" style="display:none"' + c[section_start+len('<div class="dashboard-section"'):]
                with open(f5, 'w', encoding='utf-8') as fh:
                    fh.write(c)
                report('dashboard-admin.html hide ligacoes', True)
            else:
                report('dashboard-admin.html hide ligacoes', False, '- parent section not found')
        else:
            report('dashboard-admin.html hide ligacoes', False, '- id not found')
    else:
        report('dashboard-admin.html hide ligacoes', False, '- ligacoesContent not found')

except Exception as e:
    report('dashboard-admin.html', False, str(e))

# =============================================================
# SUMMARY
# =============================================================
print('\n=== SUMMARY ===')
for name, ok, msg in results:
    print(f"  {'[OK]' if ok else '[FAIL]'} {name} {msg}")
print(f'\nTotal: {sum(1 for _,ok,_ in results if ok)}/{len(results)} OK')
