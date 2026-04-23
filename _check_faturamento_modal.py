path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find the modal for gerar-nfe
needle = 'modal-gerar-nfe'.encode('utf-8')
idx = raw.find(needle)
while idx >= 0:
    print(f"byte {idx}: {repr(raw[idx-5:idx+20])}")
    idx = raw.find(needle, idx+1)

# Find gerar-nfe from pedido
needle2 = 'partir de Pedido'.encode('utf-8')
idx2 = raw.find(needle2)
if idx2 >= 0:
    print(f"\nModal title context at {idx2}:")
    print(repr(raw[idx2-300:idx2+100]))
