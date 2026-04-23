path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\comissoes.html'
with open(path, 'rb') as f:
    raw = f.read()
# Find gerarAvatarHtml function
idx = raw.find(b'gerarAvatarHtml')
print("=== first gerarAvatarHtml ===")
print(repr(raw[idx:idx+600]))
