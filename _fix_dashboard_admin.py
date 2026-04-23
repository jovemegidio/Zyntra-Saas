#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix bugs in dashboard-admin.html:
1. periodoAtual (acento) vs periodoAtual (sem acento) - declaracoes vs usos
2. ligacoesContent / ligacoesTableBody etc. (acento vs sem acento no getElementById)
3. periodo (key no body do POST) - acento vs sem acento
"""

path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\dashboard-admin.html'

with open(path, 'rb') as f:
    raw = f.read()

original = raw

# ── FIX 1: periodoAtual - remover acento das declaracoes para ficar consistente
# Linha 1635: const períodoAtual = agora.toISOString().substring(0, 7);
raw = raw.replace(
    'const períodoAtual = agora.toISOString().substring(0, 7);'.encode('utf-8'),
    b'const periodoAtual = agora.toISOString().substring(0, 7);'
)
# Linha 1731 (com comentario // YYYY-MM)
raw = raw.replace(
    'const períodoAtual = agora.toISOString().substring(0, 7); // YYYY-MM'.encode('utf-8'),
    b'const periodoAtual = agora.toISOString().substring(0, 7); // YYYY-MM'
)
# Linha 2018: mesma declaracao sem comentario (terceira ocorrencia)
# Already covered by first replacement above

# Fix usage on line 1684 (dentro de exportarRelatorio): ${períodoAtual} -> ${periodoAtual}
raw = raw.replace(
    '`relat\u00f3rio-vendas-${per\u00edodoAtual}.csv`'.encode('utf-8'),
    '`relat\u00f3rio-vendas-${periodoAtual}.csv`'.encode('utf-8')
)

# ── FIX 2: periodoStr - remover acento
raw = raw.replace(
    'const períodoStr = mesMeta;'.encode('utf-8'),
    b'const periodoStr = mesMeta;'
)
# Fix body keys: período: → periodo:
raw = raw.replace(
    'período: períodoStr,'.encode('utf-8'),
    b'periodo: periodoStr,'
)

# ── FIX 3: ligaçõesContent → ligacoesContent (no getElementById calls)
raw = raw.replace(
    "document.getElementById('ligaçõesContent')".encode('utf-8'),
    b"document.getElementById('ligacoesContent')"
)
raw = raw.replace(
    "document.getElementById('ligaçõesTableBody')".encode('utf-8'),
    b"document.getElementById('ligacoesTableBody')"
)
raw = raw.replace(
    "document.getElementById('ligaçõesRamaisChart')".encode('utf-8'),
    b"document.getElementById('ligacoesRamaisChart')"
)
raw = raw.replace(
    "document.getElementById('ligaçõesPagination')".encode('utf-8'),
    b"document.getElementById('ligacoesPagination')"
)
raw = raw.replace(
    "document.getElementById('ligaçõesOnlineBadge')".encode('utf-8'),
    b"document.getElementById('ligacoesOnlineBadge')"
)
raw = raw.replace(
    "document.getElementById('ligaçõesOnlineCount')".encode('utf-8'),
    b"document.getElementById('ligacoesOnlineCount')"
)

if raw == original:
    print("AVISO: nenhuma substituicao!")
else:
    with open(path, 'wb') as f:
        f.write(raw)
    print("OK: dashboard-admin.html atualizado")

# Verify
with open(path, 'rb') as f:
    v = f.read()

print(f"periodoAtual (sem acento) in file: {b'const periodoAtual' in v}")
print(f"periodoAtual com acento restante: {v.count('const períodoAtual'.encode('utf-8'))}")
print(f"periodoStr (sem acento): {b'const periodoStr' in v}")
print(f"periodo (sem acento no body): {b'periodo: periodoStr,' in v}")
lig1 = b"getElementById('ligacoesContent')"
lig2 = b"getElementById('ligacoesTableBody')"
print(f"ligacoesContent (sem acento): {lig1 in v}")
print(f"ligacoesTableBody (sem acento): {lig2 in v}")
