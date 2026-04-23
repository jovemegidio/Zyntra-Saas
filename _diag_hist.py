import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f_ap = os.path.join(BASE, 'modules', 'PCP', 'apontamentos.html')
with open(f_ap, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

# Find renderizarHistórico function
idx = text.find('function renderizar')
print('=== renderizarHistórico ===')
# Find all related functions
for i, line in enumerate(lines, 1):
    if 'renderizar' in line.lower() and 'hist' in line.lower() and 'function' in line.lower():
        # Print 60 lines from here
        for j in range(i-1, min(len(lines), i+70)):
            print(f'L{j+1}: {lines[j].rstrip()[:140]}')
        print('...')
        break

# Also show the HTML classes used in histórico section
print('\n=== Classes usadas no HTML histórico ===')
for i, line in enumerate(lines, 1):
    if 'hist\u00f3' in line.lower() or 'hist\xf3' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')
