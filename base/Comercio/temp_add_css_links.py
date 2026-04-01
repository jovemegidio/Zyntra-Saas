"""Add CSS links to all module HTML files that need them."""
import os, re

BASE = r"G:\Outros computadores\Meu laptop (2)\Zyntra"

MODAL_CSS = '    <link rel="stylesheet" href="/css/modal-standard-compat.css?v=20260324">\n'
COUNTER_CSS = '    <link rel="stylesheet" href="/css/counter-global-standard.css?v=20260324">\n'

files_to_update = [
    "modules/Vendas/public/pedidos.html",
    "modules/Vendas/public/clientes.html",
    "modules/Vendas/public/comissoes.html",
    "modules/Vendas/public/estoque.html",
    "modules/Vendas/public/prospeccao.html",
    "modules/Vendas/public/dashboard.html",
    "modules/Vendas/public/index.html",
    "modules/Financeiro/contas-receber.html",
    "modules/Financeiro/contas-pagar.html",
    "modules/Financeiro/index.html",
    "modules/Financeiro/boletos.html",
    "modules/Financeiro/fluxo-caixa.html",
    "modules/Financeiro/relatorios.html",
    "modules/Financeiro/conciliacao.html",
    "modules/Financeiro/centros-custo.html",
    "modules/Financeiro/recorrencias.html",
    "modules/Financeiro/bancos.html",
    "modules/Financeiro/orcamentos.html",
    "modules/Financeiro/impostos.html",
    "modules/Financeiro/nfse.html",
    "modules/Financeiro/dashboard-contas-pagar.html",
    "modules/Financeiro/dashboard-contas-receber.html",
    "modules/RH/public/pages/dashboard.html",
    "modules/RH/public/pages/requisicoes-compra.html",
    "modules/RH/public/pages/funcionarios.html",
    "modules/RH/public/pages/folha.html",
    "modules/RH/public/pages/ferias.html",
    "modules/RH/public/pages/beneficios.html",
    "modules/RH/public/pages/calendario-rh.html",
    "modules/RH/public/pages/avaliacoes.html",
    "modules/PCP/index.html",
    "modules/PCP/ordens-producao.html",
    "modules/PCP/apontamentos.html",
    "modules/NFe/index.html",
    "modules/NFe/nfse.html",
    "modules/NFe/emitir.html",
    "modules/Faturamento/public/index.html",
    "modules/Faturamento/public/dashboard.html",
]

results = []

for relpath in files_to_update:
    filepath = os.path.join(BASE, relpath.replace('/', os.sep))
    if not os.path.exists(filepath):
        results.append(f"SKIP (not found): {relpath}")
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        results.append(f"ERROR reading {relpath}: {e}")
        continue
    
    modified = False
    
    # Add modal-standard-compat.css if not present
    if 'modal-standard-compat' not in content:
        head_end = content.find('</head>')
        if head_end > 0:
            content = content[:head_end] + MODAL_CSS + content[head_end:]
            modified = True
    
    # Add counter-global-standard.css if needed
    has_counters = bool(re.search(r'stat-card|kpi-card|kpi-grid|stats-grid', content))
    if has_counters and 'counter-global-standard' not in content:
        head_end = content.find('</head>')
        if head_end > 0:
            content = content[:head_end] + COUNTER_CSS + content[head_end:]
            modified = True
    
    if modified:
        try:
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
            results.append(f"UPDATED: {relpath}")
        except Exception as e:
            results.append(f"ERROR writing {relpath}: {e}")
    else:
        results.append(f"OK (already has links): {relpath}")

# Write results
report = os.path.join(BASE, "temp_css_links_report.txt")
with open(report, 'w', encoding='utf-8') as f:
    for r in results:
        f.write(r + '\n')
    f.write(f"\nTotal: {len(results)} files processed")

print("Done. Results:")
for r in results:
    print(f"  {r}")
