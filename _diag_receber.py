import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'contas_receber.html')
with open(f, 'rb') as fh:
    raw = fh.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
print(f'Total lines: {len(lines)}')

# Find modal nova conta receber
print('\n=== Modal structure ===')
for i, line in enumerate(lines, 1):
    if 'modal' in line.lower() and ('nova' in line.lower() or 'receber' in line.lower() or 'titulo' in line.lower() or 't\u00edtulo' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Find date inputs
print('\n=== Date inputs ===')
for i, line in enumerate(lines, 1):
    if 'type="date"' in line or 'input-icon-conta' in line or 'fa-calendar' in line:
        print(f'L{i}: {line.strip()[:120]}')

# Find categorias
print('\n=== Categoria / conta-banco / projeto ===')
for i, line in enumerate(lines, 1):
    if 'conta-categoria' in line or 'conta-banco' in line or 'conta-projeto' in line:
        print(f'L{i}: {line.strip()[:120]}')

# Find carregarBancos
print('\n=== carregarBancos / carregarCategorias ===')
for i, line in enumerate(lines, 1):
    if 'carregar' in line.lower() and ('banco' in line.lower() or 'categ' in line.lower() or 'projeto' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Show lines 1-30 (CSS version)
print('\n=== Widget version ===')
for i, line in enumerate(lines, 1):
    if 'widget.js' in line or 'widget.css' in line:
        print(f'L{i}: {line.strip()[:120]}')
