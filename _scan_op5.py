import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Check routes/index.js for role handling
f_idx = os.path.join(BASE, 'routes', 'index.js')
with open(f_idx, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
# Find where role is used
for i, line in enumerate(lines, 1):
    if 'role' in line or 'usuario' in line.lower() or '/usuarios' in line:
        print(f'L{i}: {line.rstrip()[:120]}')

# 2. Confirm ordens-producao.html fix needed: gerarNúmeroOP references
f_op = os.path.join(BASE, 'modules', 'PCP', 'ordens-producao.html')
with open(f_op, 'rb') as f:
    raw_op = f.read()
text_op = raw_op.decode('utf-8', errors='replace')
# Show all gerarNúmeroOP occurrences and gerarNumeroOP
print('\n\nordens-producao.html - gerarNúmeroOP occurrences:')
for i, line in enumerate(text_op.split('\n'), 1):
    if 'gerarN' in line and 'OP' in line:
        print(f'  L{i}: {line.strip()}')
# Show the function
idx = text_op.find('function gerarN')
print('\nfunction gerarNúmeroOP:')
print(text_op[idx:idx+200])

# 3. Count opNúmero vs opNumero
print(f'\nopN\u00famero (accented) count: {text_op.count("opN\u00famero")}')
print(f'opNumero (plain) count: {text_op.count("opNumero")}')
for i, line in enumerate(text_op.split('\n'), 1):
    if 'opN\u00famero' in line or 'opNumero' in line:
        print(f'  L{i}: {line.strip()[:100]}')
