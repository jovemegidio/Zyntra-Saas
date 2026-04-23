#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix remaining textContent assignments for negociacao_leads"""

path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\prospeccao.html'

with open(path, 'rb') as f:
    raw = f.read()

original = raw

# Fix metric-negociacao textContent (variable has accent in original)
raw = raw.replace(
    "document.getElementById('metric-negociacao').textContent = negociação;".encode('utf-8'),
    b"document.getElementById('metric-negociacao').textContent = negociacao_leads;"
)
raw = raw.replace(
    "document.getElementById('count-negociacao').textContent = negociação;".encode('utf-8'),
    b"document.getElementById('count-negociacao').textContent = negociacao_leads;"
)

if raw == original:
    print("AVISO: Nenhuma substituicao foi feita!")
else:
    with open(path, 'wb') as f:
        f.write(raw)
    print("OK: corrigido textContent negociacao")

with open(path, 'rb') as f:
    v = f.read()
neg_acc = 'negociação'.encode('utf-8')
count = v.count(neg_acc)
print(f"negociacao com acento restantes: {count}")
# Show remaining occurrences
idx = 0
while True:
    i = v.find(neg_acc, idx)
    if i < 0: break
    print(f"  byte {i}: {repr(v[i-40:i+60])}")
    idx = i + 1
