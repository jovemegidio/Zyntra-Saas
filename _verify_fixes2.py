import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'contas_receber.html')

with open(f, 'rb') as fh:
    raw = fh.read()
text = raw.decode('utf-8', errors='replace')

print('=== Fix 1: calendar-picker-indicator CSS ===')
print('OK' if 'calendar-picker-indicator' in text else 'MISSING')

print('\n=== Fix 2: carregarCategorias fallback ===')
print('OK' if 'var fallback = [' in text and 'Outras Receitas' in text else 'MISSING')

print('\n=== Fix 3a: datalist lista-projetos ===')
print('OK' if 'lista-projetos' in text and '<datalist id="lista-projetos">' in text else 'MISSING')

print('\n=== Fix 3b: carregarProjetos function ===')
print('OK' if 'async function carregarProjetos' in text else 'MISSING')

print('\n=== Fix 3c: carregarProjetos in Promise.all ===')
lines = text.split('\n')
for l in lines:
    if 'Promise.all' in l and 'carregarProjetos' in l:
        print(f'OK: {l.strip()[:120]}')
        break
else:
    print('NOT found')
