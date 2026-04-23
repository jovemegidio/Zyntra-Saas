import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f1 = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f1, 'rb') as f:
    raw1 = f.read()
text1 = raw1.decode('utf-8', errors='replace')

# Show full carregarCompradoresOC
idx = text1.find('function carregarCompradoresOC')
end = text1.find('\n        }', idx + 200)
end2 = text1.find('\n            }\n        }', idx + 200)
print('carregarCompradoresOC full:')
print(text1[idx:idx+1200])

# Show buscarFornecedor function
idx2 = text1.find('function buscarFornecedor')
print('\n\nbuscarFornecedor full:')
print(text1[idx2:idx2+1500])
