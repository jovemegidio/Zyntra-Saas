import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js')
with open(f, 'rb') as fh:
    raw = fh.read()

# Extract _ensure function
idx = raw.find(b'function _ensureMovimentacaoModalExists')
end = raw.find(b'\nfunction abrirModalMovimentacao', idx)
chunk = raw[idx:end]
print(chunk.decode('utf-8', errors='replace'))
