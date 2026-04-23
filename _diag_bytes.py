import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'contas_receber.html')

with open(f, 'rb') as fh:
    raw = fh.read()

# Find carregarCategorias function and print exact bytes
idx = raw.find(b'async function carregarCategorias')
if idx >= 0:
    chunk = raw[idx:idx+600]
    print('FOUND at offset', idx)
    print(repr(chunk))
else:
    print('NOT FOUND')
