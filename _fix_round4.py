import os

# Fix 1: orcamentos.html - modal-titulo accent + widget version
path = '/var/www/aluforce/modules/Financeiro/orcamentos.html'
data = open(path, 'rb').read()
old1 = "getElementById('modal-t\u00edtulo')".encode('utf-8')
new1 = b"getElementById('modal-titulo')"
old2 = b'/chat/widget.js?v=20260418'
new2 = b'/chat/widget.js?v=20260419'
data2 = data.replace(old1, new1).replace(old2, new2)
n1 = data.count(old1)
n2 = data.count(old2)
open(path, 'wb').write(data2)
print(f'orcamentos.html: {n1}x modal-titulo fix, {n2}x widget version fix')

# Fix 2: conciliacao.html - CSS accent + widget version
path = '/var/www/aluforce/modules/Financeiro/conciliacao.html'
data = open(path, 'rb').read()
old3 = 'css/concilia\u00e7\u00e3o-mobile.css'.encode('utf-8')
new3 = b'css/conciliacao-mobile.css'
data2 = data.replace(old3, new3).replace(old2, new2)
n3 = data.count(old3)
n4 = data.count(old2)
open(path, 'wb').write(data2)
print(f'conciliacao.html: {n3}x css fix, {n4}x widget version fix')

# Fix 3: plano-contas.html - widget version only
path = '/var/www/aluforce/modules/Financeiro/plano-contas.html'
data = open(path, 'rb').read()
old5 = b'/chat/widget.js?v=20260218'
data2 = data.replace(old5, new2)
n5 = data.count(old5)
open(path, 'wb').write(data2)
print(f'plano-contas.html: {n5}x widget version fix')

print('ALL DONE')
