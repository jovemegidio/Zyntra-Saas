import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'contas_receber.html')

with open(f, 'rb') as fh:
    raw = fh.read()

# Check what's around the input-icon-conta CSS
idx = raw.find(b'input-icon-conta i')
print(f'Found at offset {idx}')
print(repr(raw[idx-10:idx+300]))
