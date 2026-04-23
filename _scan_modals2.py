path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')
# Find occurrences of key functions and show context
for i, line in enumerate(lines):
    if 'buscarProdutoMovimentacao' in line or 'confirmarMovimentacao' in line or 'fecharModalMovimentacao' in line:
        print(f'L{i+1}: {line.rstrip()}')
# Also check how the file starts - is it wrapped in a closure?
print('\n--- FIRST 15 LINES ---')
for i, l in enumerate(lines[:15]):
    print(f'L{i+1}: {l}')
print('\n--- LAST 5 LINES ---')
for i, l in enumerate(lines[-5:]):
    print(f'L{len(lines)-5+i}: {l}')
