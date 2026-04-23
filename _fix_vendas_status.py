# Fix 1: Vendas colunaParaStatus - 'análise-crédito' (accented) → 'analise-credito'
import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# --- Vendas public/index.html ---
f1 = os.path.join(BASE, 'modules', 'Vendas', 'public', 'index.html')
with open(f1, 'rb') as f:
    raw = f.read()

old = "'an\xc3\xa1lise': 'an\xc3\xa1lise-cr\xc3\xa9dito'".encode('latin-1').replace(b'\\x', b'')
# Build bytes directly
old = b"'an\xc3\xa1lise': 'an\xc3\xa1lise-cr\xc3\xa9dito'"
new = b"'an\xc3\xa1lise': 'analise-credito'"

count = raw.count(old)
print(f'Vendas index.html: found {count} occurrence(s) of accented analise-credito')
if count == 1:
    fixed = raw.replace(old, new)
    with open(f1, 'wb') as f:
        f.write(fixed)
    print('  ✅ Fixed colunaParaStatus')
else:
    # Try with search
    idx = raw.find(b"analise-cr")
    print(f'  Search for analise-cr: idx={idx}')
    if idx >= 0:
        print(f'  Context: {raw[idx-20:idx+40]}')

print('Done!')
