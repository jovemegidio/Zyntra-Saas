import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = open(os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js'), 'rb').read()
print('modal-id:', b'id="modal-movimentacao-estoque"' in f)
print('busca-id:', b'id="modal-mov-produto-busca"' in f)
print('_ensure call:', b'_ensureMovimentacaoModalExists();' in f)
# Also verify that the double-quoted IDs are inside the _ensure function
idx = f.find(b'function _ensureMovimentacaoModalExists')
end = f.find(b'\nfunction ', idx+10)
chunk = f[idx:end]
print('_ensure block size:', len(chunk), 'bytes')
print('modal in block:', b'modal-movimentacao-estoque' in chunk)
print('busca in block:', b'modal-mov-produto-busca' in chunk)
