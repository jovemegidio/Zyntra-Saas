path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\estoque.html'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')
# Find all div id= containing modal
print('--- all modal id= in estoque.html ---')
for i, line in enumerate(lines):
    if 'id=' in line and ('modal' in line.lower() or 'mov' in line.lower() or 'registrar' in line.lower()):
        print(f'L{i+1}: {line.strip()[:180]}')
