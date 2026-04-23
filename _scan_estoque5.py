path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\estoque.html'
with open(path,'rb') as f:
    raw = f.read()
d = raw.decode('utf-8', errors='replace')

# Check for modal mov HTML anywhere
search_terms = [
    'modal-movimentacao-estoque',
    'modal-mov-header',
    'modal-mov-quantidade',
    'modal-mov-produto-busca',
    'buscarProdutoMovimentacao',
    'confirmarMovimentacao',
    'fecharModalMovimentacao',
    'Registrar Saída',
    'Registrar Entrada',
    'Confirmar Saída',
    'Confirmar Entrada',
]
print(f'Total bytes: {len(raw)}, chars: {len(d)}')
for t in search_terms:
    count = d.count(t)
    print(f'"{t}": {count}')
