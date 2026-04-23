path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\index.html'
with open(path,'rb') as f:
    raw = f.read()
d = raw.decode('utf-8', errors='replace')

# Find modal-movimentacao-estoque
idx = d.find('id="modal-movimentacao-estoque"')
if idx < 0:
    idx = d.find("id='modal-movimentacao-estoque'")
print(f'Found at byte: {idx}')
if idx >= 0:
    # Print surrounding context
    start = max(0, idx - 50)
    print('Context:', repr(d[start:idx+200]))
