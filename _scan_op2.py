import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Find gerarNumeroOP in ordens-producao.html (correct path)
f_op = os.path.join(BASE, 'modules', 'PCP', 'ordens-producao.html')
with open(f_op, 'rb') as f:
    raw_op = f.read()
text_op = raw_op.decode('utf-8', errors='replace')
print('Size:', len(raw_op))

# Search for the function (accented ú = \u00fa)
idx3 = text_op.find('gerarN\u00fameroOP')
idx3b = text_op.find('gerarNumeroOP')
print(f'gerarNúmeroOP idx: {idx3}')
print(f'gerarNumeroOP idx: {idx3b}')

# The error says line 7033 sets value on null element
lines = text_op.split('\n')
if len(lines) > 7030:
    for i in range(7028, min(7040, len(lines))):
        print(f'L{i+1}: {lines[i]}')

# Also search for function around line 7033
if idx3 >= 0:
    # find function start
    fn_start = text_op.rfind('function', 0, idx3)
    print('\ngerarNúmeroOP function context:')
    print(text_op[idx3:idx3+600])

# 2. Check api/usuarios?role=comprador route
f_routes = os.path.join(BASE, 'routes')
for fname in os.listdir(f_routes):
    if 'usuario' in fname.lower() or 'auth' in fname.lower() or 'user' in fname.lower():
        fp = os.path.join(f_routes, fname)
        with open(fp, 'rb') as f:
            raw = f.read()
        text = raw.decode('utf-8', errors='replace')
        if 'role' in text:
            print(f'\n\n=== {fname} - role handling ===')
            for i, line in enumerate(text.split('\n'), 1):
                if 'role' in line and ('query' in line or 'where' in line.lower() or 'req.query' in line):
                    print(f'  L{i}: {line.strip()[:120]}')
