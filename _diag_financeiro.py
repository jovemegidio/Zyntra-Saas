import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Find widget.js
print('=== widget.js location ===')
for root, dirs, files in os.walk(os.path.join(BASE, 'public')):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
    for fname in files:
        if 'widget' in fname.lower():
            print(f'  {os.path.join(root, fname)}')

# 2. Check Financeiro/index.html for widget.js reference
f_fin = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'index.html')
with open(f_fin, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
print('\n=== Financeiro/index.html widget references ===')
for i, line in enumerate(lines, 1):
    if 'widget' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')

# 3. Check for applyTheme calls
print('\n=== applyTheme references ===')
for i, line in enumerate(lines, 1):
    if 'theme' in line.lower() or 'applyTheme' in line:
        print(f'L{i}: {line.strip()[:120]}')
