import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f, 'rb') as fp:
    raw = fp.read()
text = raw.decode('utf-8', errors='replace')

idx = text.find('function carregarCompradoresOC')
print(repr(text[idx:idx+800]))
