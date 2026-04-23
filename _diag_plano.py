import re

f = open(r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\public\plano_contas.html', 'rb')
raw = f.read(); f.close()
t = raw.decode('utf-8', errors='replace')

ids_js = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", t))
ids_html = set(re.findall(r'id=["\']([^"\']+)["\']', t))

print('IDs no JS nao encontrados no HTML:')
for x in sorted(ids_js - ids_html):
    print(' MISSING:', x)

print('\nIDs no HTML:')
for x in sorted(ids_html):
    print(' ', x)
