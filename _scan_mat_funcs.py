import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Check pcp-modals.js for material entry functions
f_modals = os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js')
with open(f_modals, 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='replace')

import re
# Find all function definitions
funcs = re.findall(r'function (\w+)\(', text)
mat_funcs = [fn for fn in funcs if 'aterial' in fn or 'apida' in fn or 'ntrada' in fn or 'aida' in fn]
print('Material/Rapida/Entrada/Saida functions in pcp-modals.js:')
for fn in mat_funcs:
    print(f'  {fn}')

# Check materiais.html for undefined functions
f_mat = os.path.join(BASE, 'modules', 'PCP', 'pages', 'materiais.html')
with open(f_mat, 'rb') as f:
    raw_mat = f.read()
text_mat = raw_mat.decode('utf-8', errors='replace')

# Find abrirEntradaRapidaMaterial definition
idx = text_mat.find('function abrirEntradaRapidaMaterial')
print(f'\nabrirEntradaRapidaMaterial defined in materiais.html: {idx >= 0}')
idx2 = text_mat.find('function abrirSaidaRapidaMaterial')
print(f'abrirSaidaRapidaMaterial defined in materiais.html: {idx2 >= 0}')

# Also check window exports in pcp-modals.js
print('\nwindow.abrirEntradaRapida exports in pcp-modals.js:')
for line in text.split('\n'):
    if 'window.' in line and ('Rapida' in line or 'Material' in line or 'rapida' in line):
        print(f'  {line.strip()}')
