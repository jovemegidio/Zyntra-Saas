import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Check widget.js for initTheme and toggle button
f_widget = os.path.join(BASE, 'public', 'chat', 'widget.js')
with open(f_widget, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

print('=== initTheme in widget.js ===')
for i, line in enumerate(lines, 1):
    if 'initTheme' in line or 'init(' in line or 'function init' in line:
        print(f'L{i}: {line.strip()[:120]}')

# Find the toggle theme area (around 984-990)
print('\n=== Lines 970-995 (toggle theme) ===')
for i in range(970, min(996, len(lines))):
    print(f'L{i+1}: {lines[i].rstrip()[:140]}')

# Check Financeiro/public/index.html for modal structure
f_fin = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'index.html')
with open(f_fin, 'rb') as f:
    raw_fin = f.read()
text_fin = raw_fin.decode('utf-8', errors='replace')
lines_fin = text_fin.split('\n')
print(f'\nFinanceiro/index.html total lines: {len(lines_fin)}')

# Find modal-nova-conta-receber structure
print('\n=== Nova Conta a Receber modal - Categoria, Conta Corrente, Projeto ===')
for i, line in enumerate(lines_fin, 1):
    if any(k in line.lower() for k in ['categoria', 'conta-corrente', 'conta corrente', 'projeto', 'datepicker', 'flatpickr', 'date-picker']):
        print(f'L{i}: {line.strip()[:120]}')
