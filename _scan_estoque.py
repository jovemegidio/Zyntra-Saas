import sys
path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\estoque.html'
with open(path, 'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
terms = ['buscarProdutoMovimentacao', 'confirmarMovimentacao', 'fecharModalMovimentacao', 'pcp-modals', 'estoque-movimentacao', 'script src', 'oninput', 'onclick']
for t in terms:
    count = d.count(t)
    print(f'{t}: {count}')
print('Total bytes:', len(d))
# Show script tags
lines = d.split('\n')
for i, line in enumerate(lines):
    if 'script' in line.lower() and 'src' in line.lower():
        print(f'L{i+1}: {line.strip()}')
