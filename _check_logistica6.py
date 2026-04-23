path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

needle = 'Erro ao gerar NF'.encode('utf-8')
idx = raw.find(needle)
print('found at', idx)
if idx >= 0:
    print(repr(raw[idx-100:idx+300]))
else:
    print("NOT FOUND in logistica/index.html")
    # search confirmarStatus
    idx2 = raw.find(b'confirmarStatus')
    while idx2 >= 0:
        print(f"\nconfirmarStatus at {idx2}: {repr(raw[idx2:idx2+500])}")
        idx2 = raw.find(b'confirmarStatus', idx2+1)
