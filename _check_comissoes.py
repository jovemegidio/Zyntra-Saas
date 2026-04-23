path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\comissoes.html'
with open(path, 'rb') as f:
    raw = f.read()
# Find avatar-related code
for kw in [b'avatar', b'fabiola', b'Fabiola', b'vendedorAvatar', b'getAvatar']:
    idx = raw.find(kw)
    if idx >= 0:
        print(f"\n=== {kw} at byte {idx} ===")
        print(repr(raw[idx:idx+200]))
