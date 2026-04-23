import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f_ap = os.path.join(BASE, 'modules', 'PCP', 'apontamentos.html')
with open(f_ap, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

# Find all API fetch calls
print('=== All API fetch calls ===')
for i, line in enumerate(lines, 1):
    if ('fetch(' in line or 'fetch(`' in line) and '/api/' in line:
        print(f'L{i}: {line.strip()[:140]}')

# Find relatórios references
print('\n=== relatórios references in apontamentos ===')
for i, line in enumerate(lines, 1):
    if 'relat' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')

# Find histórico section
print('\n=== Histórico de Hoje section ===')
for i, line in enumerate(lines, 1):
    if 'hist' in line.lower() and ('hoje' in line.lower() or 'hist\u00f3' in line.lower() or 'hist-' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')
        # Show surrounding
        start = max(0, i-2)
        end = min(len(lines), i+30)
        for j in range(start, end):
            print(f'  [{j+1}] {lines[j].rstrip()[:120]}')
        break

# Total line count
print(f'\nTotal lines: {len(lines)}')
