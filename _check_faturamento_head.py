path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# See head section
print(raw[:3000].decode('utf-8', 'replace'))
