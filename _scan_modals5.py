import os

path_common = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-common.js'
with open(path_common,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')

terms = ['abrirSaidaRapida', 'abrirEntradaRapida', 'buscarProdutoMovimentacao', 'confirmarMovimentacao', 'fecharModalMovimentacao', 'abrirModalMovimentacao']
for t in terms:
    c = d.count(t)
    print(f'{t}: {c}')
print('Total bytes pcp-common.js:', len(d))
print()
# Also check estoque.html for the function defs
path_estoque = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\estoque.html'
with open(path_estoque,'rb') as f:
    de = f.read().decode('utf-8', errors='replace')
lines = de.split('\n')
print('--- abrirSaidaRapida/abrirEntradaRapida in estoque.html ---')
for i, line in enumerate(lines):
    if 'function abrirSaidaRapida' in line or 'function abrirEntradaRapida' in line or 'function abrirModalMovProduto' in line:
        start = max(0, i-1)
        end = min(len(lines), i+8)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()[:150]}')
        print('---')
