import os
p = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\index.html'
with open(p,'rb') as f:
    raw = f.read()

# Find modal start
start = raw.rfind(b'\n    <!-- Modal de Movimenta', 0, raw.find(b'modal-movimentacao-estoque'))
if start < 0:
    start = raw.find(b'<!-- Modal de Movimenta')
print('start at', start)

# Find modal end - look for the closing of the outer modal-overlay div
# We know it starts with <div class="modal-overlay" id="modal-movimentacao-estoque"
# Find closing after
chunk = raw[start:start+10000]
# decode
text = chunk.decode('utf-8', errors='replace')
print(text[:5000])
