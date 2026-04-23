import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f_fin = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'index.html')
with open(f_fin, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

# Look for "nova conta a receber" button
print('=== abrirModal calls ===')
for i, line in enumerate(lines, 1):
    if 'abrirModal' in line or 'novaContaReceber' in line or 'nova-conta-receber' in line:
        print(f'L{i}: {line.strip()[:120]}')

# Find modalContaReceber
print('\n=== modal-conta-receber / modalContaReceber ===')
for i, line in enumerate(lines, 1):
    if 'conta-receber' in line.lower() or 'ContaReceber' in line or 'contaReceber' in line:
        print(f'L{i}: {line.strip()[:120]}')

# Lines 580-600 (modal start)
print('\n=== Lines 575-600 ===')
for i in range(574, 602):
    print(f'L{i+1}: {lines[i].rstrip()[:120]}')

# Find where modal-titulo gets set to "Nova Conta a Receber"
print('\n=== modal-titulo set ===')
for i, line in enumerate(lines, 1):
    if 'modal-titulo' in line.lower() or 'modal-t\u00edtulo' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')
