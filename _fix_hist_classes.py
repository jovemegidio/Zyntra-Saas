import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f = os.path.join(BASE, 'modules', 'PCP', 'apontamentos.html')
with open(f, 'rb') as fp:
    raw = fp.read()

# UTF-8: ó = 0xC3 0xB3 → "hist\xc3\xb3rico-" → "historico-"
old = b'hist\xc3\xb3rico-'
new = b'historico-'

count = raw.count(old)
print(f'hist\u00f3rico- (accented) occurrences: {count}')

# Show all occurrences
text = raw.decode('utf-8', errors='replace')
for i, line in enumerate(text.split('\n'), 1):
    if 'hist\u00f3rico-' in line:
        print(f'  L{i}: {line.strip()[:120]}')

# Apply fix
fixed = raw.replace(old, new)
remaining = fixed.count(old)
print(f'\nAfter fix - remaining: {remaining}')
print(f'historico- (plain) count: {fixed.count(b"historico-")}')

with open(f, 'wb') as fp:
    fp.write(fixed)
print('✅ apontamentos.html classes corrigidas')
