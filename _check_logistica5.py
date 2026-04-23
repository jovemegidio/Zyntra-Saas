path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find alert calls - using bytes
print("=== alert calls ===")
for kw in [b'alert(', b'window.alert', b'confirm(']:
    idx = raw.find(kw)
    while idx >= 0:
        print(f"byte {idx}: {repr(raw[idx:idx+150])}")
        idx = raw.find(kw, idx+1)

# Find confirmarStatus / exp-pedido
print("\n=== exp-pedido ===")
idx = raw.find(b'exp-pedido')
while idx >= 0:
    print(f"byte {idx}: {repr(raw[idx-80:idx+100])}")
    idx = raw.find(b'exp-pedido', idx+1)
