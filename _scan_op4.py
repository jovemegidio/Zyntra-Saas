import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Find /api/usuarios route in server.js
f_server = os.path.join(BASE, 'server.js')
with open(f_server, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
print('server.js - /api/usuarios mount points:')
for i, line in enumerate(lines, 1):
    if 'usuarios' in line.lower() and ('use(' in line or 'app.' in line or 'route' in line.lower()):
        print(f'  L{i}: {line.strip()[:120]}')

# 2. Search all routes files for GET /usuarios or /api/usuarios
for fname in os.listdir(os.path.join(BASE, 'routes')):
    fp = os.path.join(BASE, 'routes', fname)
    if not os.path.isfile(fp) or fname.startswith('.'): continue
    try:
        with open(fp, 'rb') as f:
            raw2 = f.read()
        text2 = raw2.decode('utf-8', errors='replace')
        # Look for router.get('/') or GET / that is mounted as /api/usuarios
        if 'role' in text2 and ('router.get' in text2 or 'app.get' in text2):
            for line in text2.split('\n'):
                if ('role' in line and 'query' in line) or ('role=comprador' in line) or ("req.query.role" in line):
                    print(f'  {fname}: {line.strip()[:120]}')
    except:
        pass

# 3. Check opNúmero HTML in ordens-producao.html
f_op = os.path.join(BASE, 'modules', 'PCP', 'ordens-producao.html')
with open(f_op, 'rb') as f:
    raw_op = f.read()
text_op = raw_op.decode('utf-8', errors='replace')
idx = text_op.find('id="opN\u00famero"')
idx2 = text_op.find("id='opN\u00famero'")
print(f'\nopNúmero element in ordens-producao.html: {idx} / {idx2}')
if idx >= 0:
    print(text_op[max(0,idx-100):idx+200])
# Also find where the modal HTML is
idx3 = text_op.find('modalNovaOrdem')
print(f'\nmodalNovaOrdem occurrences: {text_op.count("modalNovaOrdem")}')
# Find the id= of the input
for hit in re.findall(r'id="op[^"]*"', text_op):
    print(f'  input id: {hit}')
