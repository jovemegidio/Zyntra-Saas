path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')

# Find showModal and modal-movimentacao-estoque
print('--- showModal function ---')
for i, line in enumerate(lines):
    if 'function showModal' in line or 'function hideModal' in line:
        start = max(0, i)
        end = min(len(lines), i+20)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()[:150]}')
        print('---')
        break

print('\n--- modal-movimentacao-estoque references ---')
for i, line in enumerate(lines):
    if 'modal-movimentacao-estoque' in line:
        print(f'L{i+1}: {line.strip()[:180]}')

print('\n--- innerHTML with modal-mov ---')
for i, line in enumerate(lines):
    if 'modal-mov-header' in line and 'innerHTML' in line:
        print(f'L{i+1}: {line.strip()[:180]}')
    if 'createModal' in line or 'MODAL_HTML' in line or 'modalHtml' in line:
        print(f'L{i+1}: {line.strip()[:180]}')
