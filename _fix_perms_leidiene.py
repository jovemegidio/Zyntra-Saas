f = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\src\permissions-server.js'
with open(f, 'rb') as fh:
    raw = fh.read()

old = b"    'leidiane': { areas: ['vendas', 'rh'], rhType: 'area', isAdmin: false, profile: 'vendedor' },"
new = old + b"\n    'leidiene': { areas: ['vendas', 'rh'], rhType: 'area', isAdmin: false, profile: 'vendedor' },"

if old in raw:
    raw = raw.replace(old, new, 1)
    with open(f, 'wb') as fh:
        fh.write(raw)
    print('OK - leidiene adicionado')
else:
    print('NOT FOUND - verifique o texto exato')
