#!/usr/bin/env python3
from pathlib import Path

f = Path(r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\relatorios.html')
print('exists:', f.exists())

raw = f.read_bytes()
print('size bytes:', len(raw))
print('BOM UTF-8:', raw[:3].hex() == 'efbbbf')
print()

# Check for UTF-8 validity
try:
    content_utf8 = raw.decode('utf-8')
    # Count mojibake Ã³ as UTF-8 string
    n2 = content_utf8.count('Ã³')
    print('Ã³ count (utf-8 decode, str):', n2)
    # Raw bytes for double-encoded Ã³: C3 83 C2 B3
    n4 = raw.count(bytes([0xC3, 0x83, 0xC2, 0xB3]))
    print('C3 83 C2 B3 bytes (double-encoded Ã³):', n4)
    # Raw bytes for single-encoded ó: C3 B3
    n3 = raw.count(bytes([0xC3, 0xB3]))
    print('C3 B3 bytes (correct ó in utf-8):', n3)
    # Find first occurrence
    idx = content_utf8.find('RelatÃ')
    if idx >= 0:
        print('RelatÃ found at char:', idx, '| context:', repr(content_utf8[idx:idx+30]))
    else:
        print('RelatÃ NOT found in utf-8 string')
    # Try finding in latin-1
    content_latin = raw.decode('latin-1')
    idx2 = content_latin.find('RelatÃ')
    if idx2 >= 0:
        print('RelatÃ found in latin-1 at char:', idx2, '| context:', repr(content_latin[idx2:idx2+30]))
except Exception as e:
    print('Error:', e)
    # Read as latin-1
    content_latin = raw.decode('latin-1')
    n = content_latin.count('Ã³')
    print('Ã³ count (latin-1 decode):', n)
