#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Debug - check exact bytes in prospeccao.html"""

path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\prospeccao.html'

with open(path, 'rb') as f:
    raw = f.read()

# Check line endings
crlf = raw.count(b'\r\n')
lf = raw.count(b'\n') - crlf
print(f"CRLF count: {crlf}, LF-only count: {lf}")

# Find renderizarKanban
idx = raw.find('renderizarKanban'.encode('utf-8'))
if idx >= 0:
    print("renderizarKanban context (300 bytes):")
    print(repr(raw[idx:idx+300]))

# Find formatarStatus
idx2 = raw.find(b'formatarStatus(status)')
if idx2 >= 0:
    print("\nformatarStatus context (200 bytes):")
    print(repr(raw[idx2:idx2+200]))

# All negociacao with accent
neg = 'negociação'.encode('utf-8')
pos = 0
count = 0
while True:
    idx3 = raw.find(neg, pos)
    if idx3 < 0:
        break
    count += 1
    context = raw[idx3-30:idx3+50]
    print(f"\nnegociação at byte {idx3}: {repr(context)}")
    pos = idx3 + 1

print(f"\nTotal negociação (accent): {count}")
