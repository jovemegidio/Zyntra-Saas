path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\comissoes.html'
with open(path, 'rb') as f:
    raw = f.read()
# Show full vendedor-avatar CSS block
idx = raw.find(b'.vendedor-avatar {')
print(repr(raw[idx:idx+300]))
