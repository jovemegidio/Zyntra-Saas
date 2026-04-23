import os
p = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\index.html'
with open(p,'rb') as f:
    raw = f.read()

start = 309092  # modal start
chunk = raw[start:start+12000]
text = chunk.decode('utf-8', errors='replace')
# Find the end of the modal
end_idx = text.find('\n\n    <!-- ', 100)
if end_idx < 0:
    end_idx = 8000
print(text[:end_idx])
