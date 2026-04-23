path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

import re
# Find all id= attributes in the form
matches = re.findall(rb'id=["\']exp-[^"\']*["\']', raw)
print("=== All exp- IDs ===")
for m in sorted(set(matches)):
    print(repr(m))

# Also find observ* in JS
print("\n=== observ references in JS ===")
for m in re.finditer(rb'observa[^\s\'"`,)]{0,20}', raw):
    ctx = raw[m.start()-20:m.end()+50]
    print(repr(ctx))

# Also find confirmarStatus function
idx = raw.find(b'function confirmarStatus')
if idx < 0:
    idx = raw.find(b'async function confirmarStatus')
print(f"\n=== confirmarStatus at {idx} ===")
print(repr(raw[idx:idx+800]))
