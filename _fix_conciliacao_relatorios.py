#!/usr/bin/env python3
# Fix Round 5: accented API URLs + getElementById IDs in conciliacao.html + relatorios.html

import sys

# === conciliacao.html ===
path = '/var/www/aluforce/modules/Financeiro/conciliacao.html'
data = open(path, 'rb').read()
before = len(data)

# API URLs - contas-bancarias
data = data.replace(b'/contas-banc\xc3\xa1rias', b'/contas-bancarias')

# API URLs - /conciliacao (covers all: ?tipo=extrato, ?tipo=conciliacoes, /automatica, /importar-ofx, /${id}`, etc.)
data = data.replace(b'/concilia\xc3\xa7\xc3\xa3o', b'/conciliacao')

# API URL - tipo=conciliacoes
data = data.replace(b'tipo=concilia\xc3\xa7\xc3\xb5es', b'tipo=conciliacoes')

# getElementById IDs - paginacaoSistema
data = data.replace(b"'pagina\xc3\xa7\xc3\xa3oSistema'", b"'paginacaoSistema'")

# getElementById IDs - paginacaoExtrato
data = data.replace(b"'pagina\xc3\xa7\xc3\xa3oExtrato'", b"'paginacaoExtrato'")

# getElementById IDs - historicoConciliacoes
data = data.replace(b"'hist\xc3\xb3ricoConcilia\xc3\xa7\xc3\xb5es'", b"'historicoConciliacoes'")

after = len(data)
open(path, 'wb').write(data)
print(f'conciliacao.html: fixed (size {before} -> {after})')

# Verify key replacements
data2 = open(path, 'rb').read()
checks = [
    b'contas-banc\xc3\xa1rias',
    b'/concilia\xc3\xa7\xc3\xa3o',
    b"'pagina\xc3\xa7\xc3\xa3oSistema'",
    b"'pagina\xc3\xa7\xc3\xa3oExtrato'",
    b"'hist\xc3\xb3ricoConcilia\xc3\xa7\xc3\xb5es'",
]
for c in checks:
    if c in data2:
        print(f'  WARNING: still found: {c}')
    else:
        print(f'  OK: removed {c}')

# === relatorios.html ===
path2 = '/var/www/aluforce/modules/Financeiro/relatorios.html'
data = open(path2, 'rb').read()
before = len(data)

# API URLs - contas-bancarias
data = data.replace(b'/contas-banc\xc3\xa1rias', b'/contas-bancarias')

# getElementById: agendTipoRelatorio
data = data.replace(b"'agendTipoRelat\xc3\xb3rio'", b"'agendTipoRelatorio'")

# getElementById: modalRelatorio (no Titulo suffix, standalone)
data = data.replace(b"'modalRelat\xc3\xb3rio'", b"'modalRelatorio'")

# getElementById: modalRelatorioTitulo
data = data.replace(b"'modalRelat\xc3\xb3rioT\xc3\xadtulo'", b"'modalRelatorioTitulo'")

# getElementById: loading-relatorio
data = data.replace(b"'loading-relat\xc3\xb3rio'", b"'loading-relatorio'")

# getElementById: conteudo-relatorio
data = data.replace(b"'conteudo-relat\xc3\xb3rio'", b"'conteudo-relatorio'")

# getElementById: modalRelatorioBody
data = data.replace(b"'modalRelat\xc3\xb3rioBody'", b"'modalRelatorioBody'")

# getElementById: filtroPeriodo
# "filtroPeríodo": filtroPer + í(\xc3\xad) + odo
data = data.replace(b"'filtroPer\xc3\xadodo'", b"'filtroPeriodo'")

# getElementById: periodoResumo
# "períodoResumo": p-e-r-\xc3\xad-o-d-o-R-e-s-u-m-o
data = data.replace(b'per\xc3\xadodoResumo', b'periodoResumo')

# getElementById: desconto-numero
# "desconto-número": d-e-s-c-o-n-t-o---n-\xc3\xba-m-e-r-o
data = data.replace(b'desconto-n\xc3\xbamero', b'desconto-numero')

after = len(data)
open(path2, 'wb').write(data)
print(f'relatorios.html: fixed (size {before} -> {after})')

# Verify
data2 = open(path2, 'rb').read()
checks2 = [
    b'contas-banc\xc3\xa1rias',
    b"'agendTipoRelat\xc3\xb3rio'",
    b"'modalRelat\xc3\xb3rio'",
    b"'modalRelat\xc3\xb3rioT\xc3\xadtulo'",
    b"'loading-relat\xc3\xb3rio'",
    b"'conteudo-relat\xc3\xb3rio'",
    b"'modalRelat\xc3\xb3rioBody'",
    b'filtroPer\xc3\xadodo',
    b'per\xc3\xadodoResumo',
    b'desconto-n\xc3\xbamero',
]
for c in checks2:
    if c in data2:
        print(f'  WARNING: still found: {c}')
    else:
        print(f'  OK: removed {c}')

print('Done.')
