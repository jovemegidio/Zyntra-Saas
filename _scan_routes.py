import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Find ordens-producao.html
for root, dirs, files in os.walk(os.path.join(BASE, 'modules', 'PCP')):
    for f in files:
        if 'producao' in f.lower() or 'producao' in root.lower():
            print(os.path.join(root, f))

# Also check api/usuarios route with role=comprador in server.js
f_server = os.path.join(BASE, 'server.js')
with open(f_server, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
# Find router for usuarios
for i, line in enumerate(text.split('\n'), 1):
    if 'usuario' in line.lower() and ('route' in line.lower() or 'require' in line.lower() or 'use' in line.lower()):
        print(f'server.js L{i}: {line.strip()[:120]}')
