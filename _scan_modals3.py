path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')
# Find key functions
print('--- KEY FUNCTIONS IN pcp-modals.js ---')
for i, line in enumerate(lines):
    if 'function abrirSaidaRapida' in line or 'function registrarSaidaView' in line or 'function abrirEntradaRapida' in line or 'function registrarEntradaView' in line or 'function abrirModalMovProduto' in line:
        print(f'L{i+1}: {line.strip()}')

# Also check what the modal HTML string looks like around buscarProdutoMovimentacao
print('\n--- HTML around buscarProdutoMovimentacao ---')
for i, line in enumerate(lines):
    if 'buscarProdutoMovimentacao' in line:
        start = max(0, i-2)
        end = min(len(lines), i+3)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()[:150]}')
        print('---')
