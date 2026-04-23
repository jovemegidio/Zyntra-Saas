path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find all exp- element IDs
import re
matches = re.findall(rb'id=["\']exp-[^"\']+["\']', raw)
for m in matches:
    print(repr(m))

print("\n---")
# Show the salvarExpedicao body construction
idx = raw.find(b'JSON.stringify')
while idx >= 0:
    print(f"\nbyte {idx}: {repr(raw[idx:idx+400])}")
    idx = raw.find(b'JSON.stringify', idx+1)
