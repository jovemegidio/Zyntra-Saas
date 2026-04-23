#!/usr/bin/env python3
# Fix título vazio "período" em relatorios.html
path = '/var/www/aluforce/modules/Financeiro/relatorios.html'
data = open(path, 'rb').read()
before = len(data)

# Line 963: Relatório por Período "" Receber
# \xe2\x80\x9d = U+201D RIGHT DOUBLE QUOTATION MARK
old1 = b'Relat\xc3\xb3rio por Per\xc3\xadodo "\xe2\x80\x9d Receber'
new1 = b'Relat\xc3\xb3rio de Contas a Receber por Per\xc3\xadodo'

# Line 968: Relatório por Período "" Pagar
old2 = b'Relat\xc3\xb3rio por Per\xc3\xadodo "\xe2\x80\x9d Pagar'
new2 = b'Relat\xc3\xb3rio de Contas a Pagar por Per\xc3\xadodo'

if old1 in data:
    data = data.replace(old1, new1)
    print('Fixed: titulo Receber')
else:
    print('NOT FOUND: titulo Receber')

if old2 in data:
    data = data.replace(old2, new2)
    print('Fixed: titulo Pagar')
else:
    print('NOT FOUND: titulo Pagar')

open(path, 'wb').write(data)
print(f'Saved: {len(data)} bytes (was {before})')
print('Done.')
