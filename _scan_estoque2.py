path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\estoque.html'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')
# Find onclick containing modal/movimentacao/saida/entrada
print('--- onclick events ---')
for i, line in enumerate(lines):
    ll = line.lower()
    if 'onclick' in ll and ('modal' in ll or 'moviment' in ll or 'saida' in ll or 'entrada' in ll or 'registrar' in ll):
        print(f'L{i+1}: {line.strip()}')
# Find any modal div
print('\n--- modal divs ---')
for i, line in enumerate(lines):
    ll = line.lower()
    if 'modal' in ll and ('<div' in ll or 'id=' in ll):
        print(f'L{i+1}: {line.strip()[:120]}')
