import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Check buscarFornecedores function in pcp-modals or other files
f_modals = os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js')
with open(f_modals, 'rb') as f:
    raw_m = f.read()
text_m = raw_m.decode('utf-8', errors='replace')
idx = text_m.find('function buscarFornecedores')
print('buscarFornecedores in pcp-modals.js:', idx)

# In ordem-compra.html
f1 = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f1, 'rb') as f:
    raw1 = f.read()
text1 = raw1.decode('utf-8', errors='replace')
idx2 = text1.find('function buscarFornecedores')
print('buscarFornecedores in ordem-compra.html:', idx2)
if idx2 >= 0:
    print(text1[idx2:idx2+600])

# 2. Check api/usuarios?role=comprador backend route
# Search routes
for fname in ['routes/auth-routes.js', 'routes/usuarios-routes.js', 'server.js']:
    fp = os.path.join(BASE, fname)
    if os.path.exists(fp):
        with open(fp, 'rb') as f:
            raw = f.read()
        text = raw.decode('utf-8', errors='replace')
        if 'role' in text and 'usuarios' in text.lower():
            # Find the route
            hits = re.findall(r'(?:router\.|app\.)get\([^\)]*usuario[^\)]*\)', text, re.IGNORECASE)
            print(f'\n{fname} usuario routes:')
            for h in hits[:5]:
                print(' ', h[:150])
            # Also check if role query param handled
            if 'role' in text:
                for line in text.split('\n'):
                    if 'role' in line and ('usuario' in line.lower() or 'query' in line.lower()):
                        print(' ', line.strip()[:120])

# 3. Check ordens-producao.html gerarNumeroOP function
f_op = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordens-producao.html')
with open(f_op, 'rb') as f:
    raw_op = f.read()
text_op = raw_op.decode('utf-8', errors='replace')
# gerarN\u00fameroOP
idx3 = text_op.find('gerarN\u00fameroOP')
idx3b = text_op.find('gerarNumeroOP')
print(f'\nordens-producao.html:')
print(f'  gerarNúmeroOP idx: {idx3}')
print(f'  gerarNumeroOP idx: {idx3b}')
if idx3 >= 0:
    print(text_op[idx3:idx3+400])
if idx3b >= 0:
    print(text_op[idx3b:idx3b+400])
