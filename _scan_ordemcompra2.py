import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f1 = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f1, 'rb') as f:
    raw1 = f.read()
text1 = raw1.decode('utf-8', errors='replace')

# Find carregarCompradoresOC function
idx = text1.find('function carregarCompradoresOC')
if idx >= 0:
    print('carregarCompradoresOC:')
    print(text1[idx:idx+600])

# Find carregarFornecedor  
idx2 = text1.find('function carregarFornecedor')
idx3 = text1.find('buscarFornecedor')
print('\n\ncarregarFornecedor idx:', idx2)
print('buscarFornecedor idx:', idx3)
if idx3 >= 0:
    print(text1[idx3:idx3+400])

# Find the fornecedor INPUT element
idx4 = text1.find('id="oc-fornecedor"')
if idx4 >= 0:
    print('\nfornecedor input context:')
    print(text1[max(0,idx4-300):idx4+300])
