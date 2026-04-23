path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
terms = ['buscarProdutoMovimentacao', 'confirmarMovimentacao', 'fecharModalMovimentacao', 'Movimentacao', 'movimentacao', 'Registrar', 'saida', 'modalSaida']
for t in terms:
    c = d.count(t)
    print(f'{t}: {c}')
print('Total bytes:', len(d))
