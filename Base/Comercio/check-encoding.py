#!/usr/bin/env python3
"""Check Unicode encoding of accented chars in index.html"""
import unicodedata

fpath = '/var/www/aluforce/modules/Vendas/public/index.html'
with open(fpath, 'r', encoding='utf-8') as f:
    text = f.read()

# Find all occurrences of "código" and check their Unicode form
import re
matches = list(re.finditer(r'item\.c.digo', text))
print(f"Found {len(matches)} matches of item.c*digo")
for m in matches[:10]:
    snippet = text[m.start():m.end()]
    forms = []
    for ch in snippet:
        forms.append(f"{ch}=U+{ord(ch):04X}({unicodedata.name(ch, '?')})")
    print(f"  pos={m.start()}: {snippet}")
    # Check specifically the ó character
    for i, ch in enumerate(snippet):
        if ord(ch) > 127:
            print(f"    char[{i}]: U+{ord(ch):04X} name={unicodedata.name(ch, '?')} NFC={ch == unicodedata.normalize('NFC', ch)}")

# Check the mapping line
map_idx = text.find('código: it.código')
if map_idx > 0:
    chunk = text[map_idx:map_idx+50]
    print(f"\nMapping line: {repr(chunk)}")
    for i, ch in enumerate(chunk):
        if ord(ch) > 127:
            print(f"  [{i}]: U+{ord(ch):04X} ({unicodedata.name(ch, '?')}) NFC={unicodedata.normalize('NFC', ch) == ch}")

# Check the render line
render_idx = text.find('escaparHTML(item.código')
if render_idx > 0:
    chunk = text[render_idx:render_idx+60]
    print(f"\nRender line: {repr(chunk)}")
    for i, ch in enumerate(chunk):
        if ord(ch) > 127:
            print(f"  [{i}]: U+{ord(ch):04X} ({unicodedata.name(ch, '?')}) NFC={unicodedata.normalize('NFC', ch) == ch}")
