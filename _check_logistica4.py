path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Check exact bytes around function definition  
print("=== bytes 82010-82050 ===")
print(repr(raw[82010:82060]))

# Also search for alert calls
idx = raw.find(b'alert(')
while idx >= 0:
    print(f"\nalert at byte {idx}: {repr(raw[idx:idx+100])}")
    idx = raw.find(b'alert(', idx+1)

# Find gerar-nfe references
idx = raw.find(b'gerar-nfe')
while idx >= 0:
    print(f"\ngerar-nfe at byte {idx}: {repr(raw[idx-30:idx+80])}")
    idx = raw.find(b'gerar-nfe', idx+1)
