import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f_fin = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'index.html')
with open(f_fin, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

# Find Nova Conta a Receber modal
print('=== Nova Conta a Receber modal ===')
for i, line in enumerate(lines, 1):
    if 'receber' in line.lower() and ('modal' in line.lower() or 'function' in line.lower() or 'abrir' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Find conta-receber modal HTML
print('\n=== contas receber modal HTML ===')
for i, line in enumerate(lines, 1):
    if 'receber' in line.lower() and ('input' in line.lower() or 'select' in line.lower() or 'form-group' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Find categories for receber
print('\n=== categorias receber ===')
for i, line in enumerate(lines, 1):
    if 'receber' in line.lower() and 'categ' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')

# Find the modal containing "receber" form fields
# Look for id="conta-receber-categoria" or similar
print('\n=== conta-receber field IDs ===')
for i, line in enumerate(lines, 1):
    if 'receber' in line and ('id=' in line or 'categoria' in line.lower() or 'projeto' in line.lower() or 'banco' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# Look for the modal titulo  
print('\n=== modal-titulo area ===')
for i, line in enumerate(lines, 1):
    if 'modal-t' in line.lower():
        start = max(0, i-2)
        end = min(len(lines), i+5)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].strip()[:120]}')
        break
