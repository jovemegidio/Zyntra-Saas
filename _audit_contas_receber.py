import re, sys

fp = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\contas-receber.html'
with open(fp, encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

print('\n=== 1) ACCENTED VAR/LET/CONST NAMES ===')
pat = re.compile(r'\b(?:var|let|const)\s+(\w*[\u00e7\u00e3\u00e1\u00e9\u00ea\u00f3\u00fa\u00ed\u00f5\u00e2\u00f4\u00c1\u00c9\u00cd\u00d3\u00da\u00c2\u00ca\u00d4\u00c3\u00d5\u00c7]\w*)')
for i, line in enumerate(lines, 1):
    m = pat.findall(line)
    for v in m:
        print(f'  L{i}: {v}  |  {line.strip()[:120]}')

print('\n=== 2) metric-label ===')
for i, line in enumerate(lines, 1):
    if 'metric-label' in line:
        print(f'  L{i}: {line.strip()[:160]}')

print('\n=== 3) filtro-periodo / filter-periodo ===')
for i, line in enumerate(lines, 1):
    if 'filtro-periodo' in line or 'filter-periodo' in line:
        print(f'  L{i}: {line.strip()[:160]}')

print('\n=== 4) ALL uses of accented identifier-like words (not in strings) ===')
# look for word= or word. or word, or (word patterns that suggest variable usage with accents
id_pat = re.compile(r'(?:^|[\s(,;=!&|+\-*/])([a-zA-Z_]\w*[\u00e7\u00e3\u00e1\u00e9\u00ea\u00f3\u00fa\u00ed\u00f5\u00e2\u00f4]\w*)(?=[\s.,;)=!&|+\-*/\[])')
for i, line in enumerate(lines, 1):
    # Skip lines that are purely HTML content (no script context)
    stripped = line.strip()
    m = id_pat.findall(line)
    for v in m:
        # filter out things inside strings
        print(f'  L{i}: {v}  |  {stripped[:120]}')

print('\n=== DONE ===')
