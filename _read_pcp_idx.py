import os
p = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\index.html'
print('Size:', os.path.getsize(p))
with open(p,'rb') as f:
    raw = f.read()
idx = raw.find(b'modal-movimentacao-estoque')
print('idx=', idx)
if idx >= 0:
    print(raw[max(0,idx-200):idx+300])
