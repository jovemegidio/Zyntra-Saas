path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find the salvarExpedicao function
idx = raw.find(b'salvarExpedicao')
while idx >= 0:
    print(f"\nbyte {idx}: {repr(raw[idx:idx+20])}")
    idx = raw.find(b'salvarExpedicao', idx+1)

# Find full function
idx = raw.find(b'function salvarExpedicao')
if idx < 0:
    idx = raw.find(b'async function salvarExpedicao')
print(f"\n=== function start at {idx} ===")
print(repr(raw[idx:idx+1500]))
