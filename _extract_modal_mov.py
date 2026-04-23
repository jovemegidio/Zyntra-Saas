path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\index.html'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')
# Find the modal-movimentacao-estoque div
start_line = None
for i, line in enumerate(lines):
    if 'modal-movimentacao-estoque' in line and 'id=' in line:
        start_line = i
        print(f'Found at L{i+1}: {line.strip()[:180]}')
        break

if start_line is not None:
    # Print context around it
    for j in range(start_line-1, min(len(lines), start_line+200)):
        print(f'L{j+1}: {lines[j].rstrip()[:180]}')
        if j > start_line and 'modal-movimentacao-estoque' in lines[j] and '</div>' in lines[j]:
            print('--- END FOUND ---')
            break
