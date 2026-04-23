f = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\index.html'
with open(f, 'rb') as fh:
    raw = fh.read()

fixes = [
    (b'id="edit-observacoes"', 'id="edit-observa\u00e7\u00f5es"'.encode('utf-8')),
    (b'id="edit-observacoes-cliente"', 'id="edit-observa\u00e7\u00f5es-cliente"'.encode('utf-8')),
]

for old, new in fixes:
    count = raw.count(old)
    print(f'{old}: {count} ocorrencias')
    raw = raw.replace(old, new)

with open(f, 'wb') as fh:
    fh.write(raw)
print('OK')
