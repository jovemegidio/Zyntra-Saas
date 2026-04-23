path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\comissoes.html'
with open(path, 'rb') as f:
    raw = f.read()
# See full getAvatarFromEmail function
idx = raw.find(b'getAvatarFromEmail')
print(repr(raw[idx:idx+600]))
print('\n--- Avatar render HTML ---')
# find where avatar img is built
idx2 = raw.find(b'<img')
while idx2 >= 0:
    ctx = raw[idx2:idx2+120]
    if b'avatar' in ctx.lower() or b'foto' in ctx.lower():
        print(f"byte {idx2}: {repr(ctx)}")
    idx2 = raw.find(b'<img', idx2+1)
print('\n--- vendedor avatar render ---')
idx3 = raw.find(b'avatarHtml')
while idx3 >= 0:
    print(f"byte {idx3}: {repr(raw[idx3:idx3+200])}")
    idx3 = raw.find(b'avatarHtml', idx3+1)
