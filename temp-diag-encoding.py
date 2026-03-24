#!/usr/bin/env python3
"""Diagnose encoding corruption in RH HTML files."""
import os

f = r'G:\Outros computadores\Meu laptop (2)\Zyntra\modules\RH\public\pages\avaliacoes.html'
with open(f, 'rb') as fh:
    raw = fh.read()

# Find patterns
for pattern in [b'Funcion', b'confus', b'Avalia', b'valiac']:
    idx = raw.find(pattern)
    while idx >= 0:
        chunk = raw[idx:idx+25]
        hex_str = ' '.join(f'{b:02x}' for b in chunk)
        try:
            text = chunk.decode('utf-8', errors='replace')
        except:
            text = '?'
        print(f'Pattern {pattern}: offset {idx}: hex=[{hex_str}] text=[{text}]')
        idx = raw.find(pattern, idx + 1)
