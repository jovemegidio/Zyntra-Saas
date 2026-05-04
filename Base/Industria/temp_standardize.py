"""
STANDARDIZATION SCRIPT — Zyntra ERP
Padroniza modais e contadores para o padrão visual Compras.
- Cria counter-global-standard.css (cópia de fin-counter-standard.css em public/css/)
- Adiciona link do CSS de contadores e modais em arquivos que não tem
- Adiciona cores extras: .indigo, .teal, .cyan, .red para contadores em módulos que usam
- NÃO altera funcionalidade, regras de negócio, ou estrutura HTML
"""
import os, re, shutil

BASE = r"G:\Outros computadores\Meu laptop (2)\Zyntra"

changes = []  # Track all changes for report

# ============================================================
# 1. CREATE counter-global-standard.css in public/css/
# ============================================================
src = os.path.join(BASE, "modules", "Financeiro", "css", "fin-counter-standard.css")
dst = os.path.join(BASE, "public", "css", "counter-global-standard.css")

with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

# Update comment header 
content = content.replace(
    "/* Shared counter standard for the Finance module — Compras-style left bar */",
    "/* Shared counter standard for ALL modules — Compras-style (global) */\n/* Auto-generated from fin-counter-standard.css */"
)

# Add extra color variants needed by Vendas, RH, PCP, etc.
extra_colors = """
/* === Extended color variants for all modules === */

.stat-card.indigo, .kpi-card.indigo {
    --counter-bar-start: #6366f1;
    --counter-bar-end: #818cf8;
    --counter-accent: #4f46e5;
    --counter-soft-start: #e0e7ff;
    --counter-soft-end: #c7d2fe;
    --counter-bg-start: #eef2ff;
}

.stat-card.teal, .kpi-card.teal {
    --counter-bar-start: #14b8a6;
    --counter-bar-end: #2dd4bf;
    --counter-accent: #0d9488;
    --counter-soft-start: #ccfbf1;
    --counter-soft-end: #99f6e4;
    --counter-bg-start: #f0fdfa;
}

.stat-card.cyan, .kpi-card.cyan {
    --counter-bar-start: #06b6d4;
    --counter-bar-end: #22d3ee;
    --counter-accent: #0891b2;
    --counter-soft-start: #cffafe;
    --counter-soft-end: #a5f3fc;
    --counter-bg-start: #ecfeff;
}

.stat-card.rose, .kpi-card.rose {
    --counter-bar-start: #f43f5e;
    --counter-bar-end: #fb7185;
    --counter-accent: #e11d48;
    --counter-soft-start: #ffe4e6;
    --counter-soft-end: #fecdd3;
    --counter-bg-start: #fff1f2;
}

/* 5-column grid support for pages with more stat-cards */
@media (min-width: 1400px) {
    .stats-grid.cols-5 {
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    }
}
"""

content += extra_colors

with open(dst, 'w', encoding='utf-8') as f:
    f.write(content)
changes.append(f"CREATED: public/css/counter-global-standard.css")
print(f"[OK] Created {dst}")

# ============================================================
# 2. EXTEND modal-standard-compat.css with Vendas modal families
# ============================================================
modal_compat = os.path.join(BASE, "public", "css", "modal-standard-compat.css")
with open(modal_compat, 'r', encoding='utf-8') as f:
    modal_css = f.read()

# Check if we need to add Vendas modal-content-omie coverage
if 'modal-content-omie' not in modal_css:
    vendas_patch = """

/* ============================================================
   8. FAMÍLIA: .modal-content-omie (Vendas pedidos/clientes)
   Padroniza headers/footers para visual escuro Compras.
   ============================================================ */
.modal-content-omie {
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.modal-content-omie .modal-header-omie {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-bottom: none;
    color: #ffffff;
    padding: 16px 24px;
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.modal-content-omie .modal-header-omie h2,
.modal-content-omie .modal-header-omie h3 {
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    margin: 0;
}

.modal-content-omie .modal-header-omie .close-btn,
.modal-content-omie .modal-header-omie .modal-close,
.modal-content-omie .modal-header-omie button[class*="close"] {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.85);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.modal-content-omie .modal-header-omie .close-btn:hover,
.modal-content-omie .modal-header-omie .modal-close:hover,
.modal-content-omie .modal-header-omie button[class*="close"]:hover {
    background: rgba(255, 255, 255, 0.22);
    color: #ffffff;
}

.modal-content-omie .modal-body-omie,
.modal-content-omie .modal-body {
    background: #f8fafc;
    padding: 24px;
}

.modal-content-omie .modal-footer,
.modal-content-omie .modal-footer-omie {
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
    padding: 16px 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

/* ============================================================
   9. FAMÍLIA: .modal-container (Vendas faturamento parcial)
   ============================================================ */
.modal-container {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(0, 0, 0, 0.05);
}

.modal-container .modal-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-bottom: none;
    color: #ffffff;
}

.modal-container .modal-header h2,
.modal-container .modal-header h3 {
    color: #ffffff;
}

/* ============================================================
   10. GLOBAL: Override inline gradient styles on .modal-header
   Ensures ALL modal headers use the dark Compras gradient
   ============================================================ */
.modal-header[style*="background"] {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
    color: #ffffff !important;
}

.modal-header[style*="background"] h2,
.modal-header[style*="background"] h3 {
    color: #ffffff !important;
}

/* ============================================================
   11. GLOBAL: Standardize modal footer buttons
   ============================================================ */
.modal-footer .btn-primary,
.modal-footer-omie .btn-primary,
.modal-footer .btn.btn-primary {
    background: linear-gradient(135deg, #10b981, #059669);
    border: none;
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-footer .btn-primary:hover,
.modal-footer-omie .btn-primary:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.modal-footer .btn-secondary,
.modal-footer-omie .btn-secondary,
.modal-footer .btn.btn-secondary {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-footer .btn-secondary:hover,
.modal-footer-omie .btn-secondary:hover {
    background: #e2e8f0;
}

/* ============================================================
   12. GLOBAL: Form controls inside modals
   ============================================================ */
.modal-body .form-control,
.modal-body-omie .form-control,
.modal-body input[type="text"],
.modal-body input[type="number"],
.modal-body input[type="email"],
.modal-body input[type="date"],
.modal-body select,
.modal-body textarea,
.modal-body-omie input[type="text"],
.modal-body-omie input[type="number"],
.modal-body-omie input[type="email"],
.modal-body-omie input[type="date"],
.modal-body-omie select,
.modal-body-omie textarea {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: #ffffff;
}

.modal-body .form-control:focus,
.modal-body-omie .form-control:focus,
.modal-body input:focus,
.modal-body select:focus,
.modal-body textarea:focus,
.modal-body-omie input:focus,
.modal-body-omie select:focus,
.modal-body-omie textarea:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

/* ============================================================
   13. ANIMATION: Unified modal animation
   ============================================================ */
@keyframes aluforceModalSlideUp {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal-overlay.active > *:first-child,
.modal-overlay.active .modal,
.modal-overlay.active .modal-content,
.modal-overlay.active .modal-content-omie,
.modal-overlay.active .modal-omie,
.modal-overlay.active .modal-container {
    animation: aluforceModalSlideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
"""
    with open(modal_compat, 'a', encoding='utf-8') as f:
        f.write(vendas_patch)
    changes.append("UPDATED: public/css/modal-standard-compat.css (+Vendas families, +global overrides)")
    print(f"[OK] Extended modal-standard-compat.css")
else:
    print("[SKIP] modal-standard-compat.css already has modal-content-omie coverage")

# ============================================================
# 3. ADD CSS LINKS to module HTML files that need them
# ============================================================
# Files that need counter-global-standard.css AND modal-standard-compat.css

files_need_modal_css = [
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
    "modules/RH/public/pages/dashboard.html",
    "modules/RH/public/pages/requisicoes-compra.html",
    "modules/RH/public/pages/funcionarios.html",
    "modules/PCP/index.html",
    "modules/PCP/ordens-producao.html",
    "modules/PCP/apontamentos.html",
    "modules/NFe/index.html",
    "modules/NFe/nfse.html",
    "modules/NFe/emitir.html",
    "modules/Faturamento/public/index.html",
    "modules/Faturamento/public/dashboard.html",
]

MODAL_CSS_LINK = '    <link rel="stylesheet" href="/css/modal-standard-compat.css?v=20260324">'
COUNTER_CSS_LINK = '    <link rel="stylesheet" href="/css/counter-global-standard.css?v=20260324">'

added_files = []

for relpath in files_need_modal_css:
    filepath = os.path.join(BASE, relpath.replace('/', os.sep))
    if not os.path.exists(filepath):
        print(f"[SKIP] {relpath} - file not found")
        continue
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    modified = False
    
    # Add modal-standard-compat.css if not present
    if 'modal-standard-compat' not in content:
        # Find </head> or last <link> to inject before
        head_end = content.find('</head>')
        if head_end > 0:
            content = content[:head_end] + MODAL_CSS_LINK + '\n' + content[head_end:]
            modified = True
            print(f"  [+] Added modal-standard-compat.css to {relpath}")
    
    # Add counter-global-standard.css if not present AND file has counters
    has_counters = bool(re.search(r'stat-card|kpi-card|kpi-grid|stats-grid', content))
    if has_counters and 'counter-global-standard' not in content:
        head_end = content.find('</head>')
        if head_end > 0:
            content = content[:head_end] + COUNTER_CSS_LINK + '\n' + content[head_end:]
            modified = True
            print(f"  [+] Added counter-global-standard.css to {relpath}")
    
    if modified:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        added_files.append(relpath)
        changes.append(f"UPDATED: {relpath} (+CSS links)")

print(f"\n[OK] Added CSS links to {len(added_files)} files")

# ============================================================
# 4. FIX INLINE GRADIENT STYLES on modal headers in Vendas
# ============================================================
# Remove inline background styles from modal-header elements
# The CSS overrides in modal-standard-compat.css will apply instead

vendas_files_fix = [
    "modules/Vendas/public/pedidos.html",
    "modules/Vendas/public/comissoes.html",
    "modules/Vendas/public/clientes.html",
]

for relpath in vendas_files_fix:
    filepath = os.path.join(BASE, relpath.replace('/', os.sep))
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    
    # Remove inline background gradient styles from modal-header elements
    # Pattern: style="...background: linear-gradient(...)..." on modal-header divs
    content = re.sub(
        r'(<div\s+class="modal-header[^"]*")\s+style="[^"]*background:\s*linear-gradient\([^)]+\)[^"]*"',
        r'\1',
        content
    )
    
    # Also fix modal-header-omie that have wrong inline gradients
    content = re.sub(
        r'(<div\s+class="modal-header-omie[^"]*")\s+style="[^"]*background:\s*linear-gradient\([^)]+\)[^"]*"',
        r'\1',
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        changes.append(f"FIXED: {relpath} (removed inline gradient styles from modal headers)")
        print(f"[OK] Removed inline gradients from {relpath}")

# ============================================================
# 5. FIX STAT-CARD ICON CLASS NAMES (stat-card-icon → stat-icon)
# ============================================================
files_icon_fix = [
    "modules/Vendas/public/comissoes.html",
]

for relpath in files_icon_fix:
    filepath = os.path.join(BASE, relpath.replace('/', os.sep))
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    if 'stat-card-icon' in content:
        content = content.replace('stat-card-icon', 'stat-icon')
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        changes.append(f"FIXED: {relpath} (stat-card-icon → stat-icon)")
        print(f"[OK] Fixed icon class in {relpath}")

# ============================================================
# 6. STANDARDIZE GRID COLUMNS
# Add cols-5 class to stats-grids with 5 items instead of forcing 5 columns in CSS
# ============================================================
files_grid_fix = [
    "modules/Vendas/public/estoque.html",
    "modules/Vendas/public/prospeccao.html",
]

for relpath in files_grid_fix:
    filepath = os.path.join(BASE, relpath.replace('/', os.sep))
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    
    # Count stat-cards inside stats-grid sections
    # If a stats-grid has 5 items, add class="stats-grid cols-5"
    content = re.sub(
        r'class="stats-grid"',
        'class="stats-grid cols-5"',
        content,
        count=0  # Replace all - the CSS will handle responsively
    )
    
    # Only replace if this file has 5+ stat-cards
    stat_count = len(re.findall(r'class="stat-card', content))
    if stat_count < 5:
        content = original  # Revert - not 5 cards
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        changes.append(f"FIXED: {relpath} (stats-grid → stats-grid cols-5)")
        print(f"[OK] Added cols-5 to stats-grid in {relpath}")

# ============================================================
# REPORT
# ============================================================
print("\n" + "=" * 60)
print("STANDARDIZATION COMPLETE")
print("=" * 60)
for c in changes:
    print(f"  • {c}")
print(f"\nTotal changes: {len(changes)}")

# Write report
report_path = os.path.join(BASE, "temp_standardization_report.txt")
with open(report_path, 'w', encoding='utf-8') as f:
    f.write("STANDARDIZATION REPORT — " + "2026-03-24\n")
    f.write("=" * 60 + "\n\n")
    for c in changes:
        f.write(f"• {c}\n")
    f.write(f"\nTotal: {len(changes)} changes\n")
print(f"\nReport saved to: {report_path}")
