#!/usr/bin/env python3
# Diagnose exact bytes at title lines and fix
path = '/var/www/aluforce/modules/Financeiro/relatorios.html'
data = open(path, 'rb').read()
lines = data.split(b'\n')

# Print bytes of lines around 963 and 968 (0-indexed: 962 and 967)
for idx in [962, 967]:
    line = lines[idx]
    if b'Relat' in line or b'Per' in line or b'Pagar' in line or b'Receber' in line:
        print(f'Line {idx+1}: {repr(line[:200])}')
    else:
        print(f'Line {idx+1}: {repr(line[:100])}')

# Also search for the h2 with "por Per" in it
print('\n=== Searching for h2 with Period title ===')
for i, line in enumerate(lines):
    if b'<h2>' in line and (b'Per' in line or b'per' in line) and (b'Receber' in line or b'Pagar' in line):
        print(f'Line {i+1}: {repr(line[:200])}')
