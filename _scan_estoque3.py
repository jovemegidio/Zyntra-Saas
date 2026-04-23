path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\estoque.html'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')
print('--- modal-movimentacao-estoque in estoque.html ---')
for i, line in enumerate(lines):
    if 'modal-movimentacao-estoque' in line or 'modal-mov-' in line:
        print(f'L{i+1}: {line.strip()[:180]}')
