path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find gerarNFe function
idx = raw.find(b'function gerarNFe')
if idx < 0:
    idx = raw.find(b'async function gerarNFe')
print(f"gerarNFe at {idx}:")
print(repr(raw[idx:idx+1500]))

# Check for alert() calls
print("\n=== alert() calls ===")
import re
for m in re.finditer(rb'alert\s*\(', raw):
    print(f"byte {m.start()}: {repr(raw[m.start():m.start()+150])}")

# Check CSS links
print("\n=== CSS links ===")
for m in re.finditer(rb'<link[^>]+\.css[^>]*>', raw):
    print(repr(m.group()))
