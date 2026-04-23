import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f_fin = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'index.html')
with open(f_fin, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

# Find modal nova conta
print('=== Modal nova conta receber - structure ===')
for i, line in enumerate(lines, 1):
    if 'modal-nova-conta' in line.lower() or 'nova-conta' in line.lower() or ('nova' in line.lower() and 'conta' in line.lower() and 'modal' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Find input-icon-conta CSS
print('\n=== .input-icon-conta CSS ===')
in_style = False
for i, line in enumerate(lines, 1):
    if '<style' in line:
        in_style = True
    if '</style>' in line:
        in_style = False
    if in_style and ('input-icon-conta' in line or 'input[type' in line.lower() and 'date' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Find conta-banco load function
print('\n=== carregarBancos / conta-banco ===')
for i, line in enumerate(lines, 1):
    if 'banco' in line.lower() and ('fetch' in line.lower() or 'carregar' in line.lower() or 'select' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Find conta-projeto load function  
print('\n=== Projeto autocomplete function ===')
for i, line in enumerate(lines, 1):
    if 'projeto' in line.lower() and ('fetch' in line.lower() or 'autocomple' in line.lower() or 'function' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Find the modal header
print('\n=== Modal header lines ===')
for i, line in enumerate(lines, 1):
    if 'nova conta' in line.lower() or 'titulo-modal' in line.lower() or 'modal-title' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')
