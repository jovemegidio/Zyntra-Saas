import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

pages = [
    os.path.join(BASE, 'modules', 'PCP', 'pages', 'estoque.html'),
    os.path.join(BASE, 'modules', 'PCP', 'pages', 'materiais.html'),
    os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js'),
]

for p in pages:
    with open(p, 'rb') as f:
        raw = f.read()
    name = os.path.basename(p)
    print(f'\n=== {name} ===')
    print(f'  modal-movimentacao-estoque: {raw.count(b"modal-movimentacao-estoque")}')
    # accented onclick
    acc1 = b'fecharModalMovimenta\xc3\xa7\xc3\xa3o'
    acc2 = b'confirmarMovimenta\xc3\xa7\xc3\xa3o'
    acc3 = b'buscarProdutoMovimenta\xc3\xa7\xc3\xa3o'
    print(f'  fecharModalMovimentação (accented): {raw.count(acc1)}')
    print(f'  confirmarMovimentação (accented): {raw.count(acc2)}')
    print(f'  buscarProdutoMovimentação (accented): {raw.count(acc3)}')
    # correct onclick
    print(f'  fecharModalMovimentacao (correct): {raw.count(b"fecharModalMovimentacao")}')
    print(f'  confirmarMovimentacao (correct): {raw.count(b"confirmarMovimentacao")}')
    print(f'  buscarProdutoMovimentacao (correct): {raw.count(b"buscarProdutoMovimentacao")}')
    # also check for pcp-modals.js load
    if name.endswith('.html'):
        print(f'  pcp-modals.js script tag: {raw.count(b"pcp-modals.js")}')
        # show context of modal if found
        idx = raw.find(b'modal-movimentacao-estoque')
        if idx >= 0:
            print(f'  First occurrence context: {raw[max(0,idx-100):idx+100]}')
