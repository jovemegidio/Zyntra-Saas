import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Fix ordens-producao.html: replace all 'opNúmero' (accented ú) with 'opNumero' in JS code
# But NOT the HTML id attribute (which is already correct 'opNumero')
f_op = os.path.join(BASE, 'modules', 'PCP', 'ordens-producao.html')
with open(f_op, 'rb') as f:
    raw = f.read()

# accented: opN\xc3\xbamero (UTF-8: ú = 0xC3 0xBA)
old = b"opN\xc3\xbamero"
new = b"opNumero"

count = raw.count(old)
print(f'opNúmero (accented) count: {count}')

# Show all occurrences with context
text = raw.decode('utf-8', errors='replace')
for i, line in enumerate(text.split('\n'), 1):
    if 'opN\u00famero' in line:
        print(f'  L{i}: {line.strip()[:120]}')

fixed = raw.replace(old, new)
with open(f_op, 'wb') as f:
    f.write(fixed)

print(f'\n✅ Replaced {count} occurrences of opNúmero → opNumero')

# Verify
with open(f_op, 'rb') as f:
    verify = f.read()
remaining = verify.count(old)
print(f'Remaining accented: {remaining}')
print(f'Plain opNumero: {verify.count(b"opNumero")}')
