path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\comissoes.html'
with open(path, 'rb') as f:
    raw = f.read()
# Find vendedor-avatar CSS
idx = raw.find(b'vendedor-avatar')
while idx >= 0:
    print(f"byte {idx}: {repr(raw[idx:idx+120])}")
    idx = raw.find(b'vendedor-avatar', idx+1)
