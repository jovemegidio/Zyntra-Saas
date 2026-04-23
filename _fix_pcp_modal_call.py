# Fix: add _ensureMovimentacaoModalExists() call at start of abrirModalMovimentacao
# File uses CRLF line endings, so use \r\n in anchors
import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f_modals = os.path.join(BASE, 'modules', 'PCP', 'js', 'pcp-modals.js')

with open(f_modals, 'rb') as f:
    raw = f.read()

# Check if call already added
if b'_ensureMovimentacaoModalExists();' in raw:
    print('Call already present - OK')
else:
    # Try CRLF version of the anchor
    anchor_crlf = b"function abrirModalMovimentacao(tipo, produto) {\r\n    currentMovimentacaoTipo = tipo;"
    anchor_lf   = b"function abrirModalMovimentacao(tipo, produto) {\n    currentMovimentacaoTipo = tipo;"

    if anchor_crlf in raw:
        new = b"function abrirModalMovimentacao(tipo, produto) {\r\n    _ensureMovimentacaoModalExists();\r\n    currentMovimentacaoTipo = tipo;"
        raw = raw.replace(anchor_crlf, new)
        print('  Added call (CRLF)')
    elif anchor_lf in raw:
        new = b"function abrirModalMovimentacao(tipo, produto) {\n    _ensureMovimentacaoModalExists();\n    currentMovimentacaoTipo = tipo;"
        raw = raw.replace(anchor_lf, new)
        print('  Added call (LF)')
    else:
        # Find the function and show context
        idx = raw.find(b'function abrirModalMovimentacao')
        if idx >= 0:
            print('  Function found but anchor mismatch. Context:')
            print(repr(raw[idx:idx+80]))
        else:
            print('  ❌ function not found!')

    with open(f_modals, 'wb') as f:
        f.write(raw)

# Verify
with open(f_modals, 'rb') as f:
    verify = f.read()

if b'_ensureMovimentacaoModalExists' in verify:
    print('  ✅ _ensure function present')
if b'_ensureMovimentacaoModalExists();' in verify:
    print('  ✅ call present at start of abrirModalMovimentacao')
    
print('Done!')
