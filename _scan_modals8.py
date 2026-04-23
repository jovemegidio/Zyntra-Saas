path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')

# Find the modal-movimentacao-estoque HTML generation
for i, line in enumerate(lines):
    if 'modal-movimentacao-estoque' in line:
        start = max(0, i-2)
        end = min(len(lines), i+5)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()[:180]}')
        print('---')
# Find where document.body.appendChild for line 1734 and 1833
for linenum in [1730, 1831]:
    start = max(0, linenum-10)
    end = min(len(lines), linenum+5)
    print(f'\n--- around L{linenum} ---')
    for j in range(start, end):
        print(f'L{j+1}: {lines[j].rstrip()[:180]}')
