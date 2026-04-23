import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Read widget.js and find applyTheme / classList around line 998
f_widget = os.path.join(BASE, 'public', 'chat', 'widget.js')
with open(f_widget, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
print(f'Total lines: {len(lines)}')

print('\n=== Lines 990-1005 ===')
for i in range(990, min(1010, len(lines))):
    print(f'L{i+1}: {lines[i].rstrip()[:140]}')

# Find applyTheme
print('\n=== applyTheme function ===')
for i, line in enumerate(lines, 1):
    if 'applyTheme' in line or 'classList' in line:
        print(f'L{i}: {line.strip()[:140]}')
        if i > 1010:
            break

# Lines 568-575 (initTheme)
print('\n=== Lines 565-580 (initTheme) ===')
for i in range(565, min(580, len(lines))):
    print(f'L{i+1}: {lines[i].rstrip()[:140]}')

# Lines 1059-1068 (init)
print('\n=== Lines 1058-1068 (init) ===')
for i in range(1058, min(1070, len(lines))):
    print(f'L{i+1}: {lines[i].rstrip()[:140]}')
