import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

def check(label, path, tests):
    with open(path, 'rb') as f:
        raw = f.read()
    print(f'\n=== {label} ===')
    for desc, needle, expect_present in tests:
        found = needle in raw
        ok = found == expect_present
        status = '✅' if ok else '❌'
        print(f'  {status} {desc}: {"found" if found else "missing"}')

# Fix 1: Vendas colunaParaStatus
check('Vendas index.html', os.path.join(BASE, 'modules', 'Vendas', 'public', 'index.html'), [
    ('analise-credito no accent (correct)', b"'an\xc3\xa1lise': 'analise-credito'", True),
    ('analise-credito accented (bug removed)', b"'an\xc3\xa1lise': 'an\xc3\xa1lise-cr\xc3\xa9dito'", False),
])

# Fix 2: Vendas routes transitions
check('routes/vendas-routes.js', os.path.join(BASE, 'routes', 'vendas-routes.js'), [
    ("orcamento has pedido-aprovado", b"'orcamento': ['analise', 'analise-credito', 'aprovado', 'pedido-aprovado', 'cancelado']", True),
    ("old orcamento (only 3 transitions)", b"'orcamento': ['analise', 'analise-credito', 'cancelado']", False),
])

# Fix 3: pcp-modals.js
check('modules/PCP/js/pcp-modals.js', os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js'), [
    ('_ensureMovimentacaoModalExists defined', b'function _ensureMovimentacaoModalExists()', True),
    ('_ensure call in abrirModalMovimentacao', b'_ensureMovimentacaoModalExists();', True),
    ('modal-movimentacao-estoque HTML in ensure', b"id='modal-movimentacao-estoque'", True),
    ('modal-mov-produto-busca present', b"id='modal-mov-produto-busca'", True),
    ('fecharModalMovimentacao onclick (no accent)', b"onclick=\"fecharModalMovimentacao()\"", True),
    ('confirmarMovimentacao onclick (no accent)', b"onclick=\"confirmarMovimentacao()\"", True),
])

# Fix 4: PCP index.html
check('modules/PCP/index.html', os.path.join(BASE, 'modules', 'PCP', 'index.html'), [
    ('fecharModalMovimentação removed', b'fecharModalMovimenta\xc3\xa7\xc3\xa3o', False),
    ('confirmarMovimentação removed', b'confirmarMovimenta\xc3\xa7\xc3\xa3o', False),
    ('fecharModalMovimentacao present', b'fecharModalMovimentacao', True),
    ('confirmarMovimentacao present', b'confirmarMovimentacao', True),
])

print('\nAll checks done!')
