path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\comissoes.html'
with open(path, 'rb') as f:
    raw = f.read()
idx = raw.find(b'avatarHtml = gerarAvatarHtml')
print(repr(raw[idx-100:idx+800]))
