import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f, 'rb') as fp:
    raw = fp.read()

old = b"// Se a rota n\xc3\xa3o existir (404), tentar rota alternativa\r\n                if (response.status === 404) {"
new = b"// Se a rota n\xc3\xa3o existir (404) ou erro (500), tentar rota alternativa\r\n                if (response.status === 404 || !response.ok) {"

count = raw.count(old)
print(f'Found: {count}')
if count:
    fixed = raw.replace(old, new, 1)
    with open(f, 'wb') as fp:
        fp.write(fixed)
    print('✅ fallback atualizado')
else:
    # Try without \r
    old2 = b"// Se a rota n\xc3\xa3o existir (404), tentar rota alternativa"
    print(f'Partial: {raw.count(old2)}')
    print('Not replaced - route fix alone is sufficient')
