import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Check auth-rbac.js GET /api/usuarios route handling - around L655
f_rbac = os.path.join(BASE, 'routes', 'auth-rbac.js')
with open(f_rbac, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
# Print around L655
print('auth-rbac.js L645-720:')
for i in range(644, min(730, len(lines))):
    print(f'L{i+1}: {lines[i]}')

# 2. Check opNúmero element in ordens-producao.html
f_op = os.path.join(BASE, 'modules', 'PCP', 'ordens-producao.html')
with open(f_op, 'rb') as f:
    raw_op = f.read()
text_op = raw_op.decode('utf-8', errors='replace')
# Search for opNúmero and opNumero
idx = text_op.find('opN\u00famero')
idx2 = text_op.find('opNumero')
print(f'\nordens-producao.html:')
print(f'  opNúmero occurrences: {text_op.count("opN\u00famero")}')
print(f'  opNumero occurrences: {text_op.count("opNumero")}')
if idx >= 0:
    print('\nFirst opNúmero context:')
    print(text_op[max(0,idx-200):idx+200])
# Also find openNovaOrdemModal function
idx3 = text_op.find('function openNovaOrdemModal')
idx4 = text_op.find('openNovaOrdemModal')
print(f'\n  openNovaOrdemModal function: idx={idx3}')
if idx3 >= 0:
    print(text_op[idx3:idx3+500])
# Also around L2499
print('\nL2495-2505:')
lines_op = text_op.split('\n')
for i in range(2493, min(2507, len(lines_op))):
    print(f'L{i+1}: {lines_op[i]}')
