import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f, 'rb') as fp:
    raw = fp.read()
text = raw.decode('utf-8', errors='replace')

# Find carregarCompradoresOC function
print('carregarCompradoresOC occurrences:', text.count('carregarCompradoresOC'))
idx_def = text.find('function carregarCompradoresOC')
print('Function definition:')
print(text[idx_def:idx_def+700])

# Also check buscarFornecedor
print('\n--- buscarFornecedor ---')
idx_bf = text.find('function buscarFornecedor(')
print(text[idx_bf:idx_bf+400])

print('\n--- buscarFornecedores ---')
idx_bfs = text.find('function buscarFornecedores(')
print(text[idx_bfs:idx_bfs+500])
