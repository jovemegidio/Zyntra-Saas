f = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\index.html'
with open(f, 'rb') as fh:
    raw = fh.read()

old = b'id="tab-observacoes"'
new = 'id="tab-observa\u00e7\u00f5es"'.encode('utf-8')

count = raw.count(old)
print('Ocorrencias:', count)
fixed = raw.replace(old, new)

with open(f, 'wb') as fh:
    fh.write(fixed)
print('OK')
