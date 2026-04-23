path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')

# Find _ensure or inject for movimentacao modal
print('--- _ensure / inject for movimentacao ---')
for i, line in enumerate(lines):
    ll = line.lower()
    if '_ensure' in ll or ('inject' in ll and 'mov' in ll):
        print(f'L{i+1}: {line.strip()[:180]}')

# Find where modal-movimentacao-estoque HTML is built
print('\n--- modal-movimentacao HTML creation ---')
for i, line in enumerate(lines):
    if 'modal-mov-header' in line and ('innerHTML' in line or '`' in line or 'id=' in line):
        start = max(0, i-3)
        end = min(len(lines), i+4)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()[:180]}')
        print('---')

# Look at context around line 1912 (abrirModalMovimentacao) - what's just before it?
print('\n--- context before abrirModalMovimentacao (L1905-1915) ---')
for j in range(1900, 1918):
    print(f'L{j+1}: {lines[j].rstrip()[:180]}')
