#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix remaining negociação JS references in prospeccao.html"""

path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\prospeccao.html'

with open(path, 'rb') as f:
    raw = f.read()

original = raw

# Fix select option value
raw = raw.replace(
    '<option value="negociação">Em Negociação</option>'.encode('utf-8'),
    b'<option value="negociacao">Em Negocia\xc3\xa7\xc3\xa3o</option>'
)

# Fix score threshold map key
raw = raw.replace(
    "'negociação': 20".encode('utf-8'),
    b"'negociacao': 20"
)

# Fix export filter
raw = raw.replace(
    "l.status === 'negociação'".encode('utf-8'),
    b"l.status === 'negociacao'"
)

# Fix class mapping
raw = raw.replace(
    "negociação: 'statusNegociação'".encode('utf-8'),
    "negociacao: 'statusNegociação'".encode('utf-8')
)

if raw == original:
    print("AVISO: Nenhuma substituicao!")
else:
    with open(path, 'wb') as f:
        f.write(raw)
    print("OK: corrigido remaining negociacao refs")

with open(path, 'rb') as f:
    v = f.read()
neg_acc = 'negociação'.encode('utf-8')
count = v.count(neg_acc)
print(f"negociacao com acento restantes: {count}")
for i in range(count):
    idx = v.find(neg_acc)
    # show context briefly
    print(f"  byte {v.find(neg_acc, idx if i>0 else 0)}: {repr(v[v.find(neg_acc):v.find(neg_acc)+40])}")
