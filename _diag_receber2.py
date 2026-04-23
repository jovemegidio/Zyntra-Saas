import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'contas_receber.html')
with open(f, 'rb') as fh:
    raw = fh.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

# Find conta-corrente population
print('=== cr-conta-corrente population ===')
for i, line in enumerate(lines, 1):
    if 'cr-conta-corrente' in line:
        print(f'L{i}: {line.strip()[:120]}')

# Find carregarContasBancarias or similar
print('\n=== carregarContasBancarias / contas-bancarias ===')
for i, line in enumerate(lines, 1):
    if 'contasbancarias' in line.lower() or 'contas-bancarias' in line.lower() or 'conta_corrente' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')

# Find init function
print('\n=== init / Promise.all ===')
for i, line in enumerate(lines, 1):
    if 'Promise.all' in line or ('function init' in line and '()' in line):
        print(f'L{i}: {line.strip()[:120]}')

# Find carregarProjetos
print('\n=== carregar / projetos ===')
for i, line in enumerate(lines, 1):
    if 'project' in line.lower() or 'projeto' in line.lower() and 'carregar' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')

# Find where .input-icon-conta CSS is defined
print('\n=== input-icon-conta CSS area (L260-275) ===')
for i in range(259, 280):
    print(f'L{i+1}: {lines[i].rstrip()[:120]}')

# CSS webkit calendar
print('\n=== webkit-calendar existing ===')
for i, line in enumerate(lines, 1):
    if 'webkit-calendar' in line.lower() or 'picker-indicator' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')
