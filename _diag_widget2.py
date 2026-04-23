import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f_widget = os.path.join(BASE, 'public', 'chat', 'widget.js')

with open(f_widget, 'rb') as fh:
    raw = fh.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

print(f'Total lines: {len(lines)}')
print('\n=== applyTheme function ===')
for i, line in enumerate(lines, 1):
    if 'applyTheme' in line or 'initTheme' in line:
        print(f'L{i}: {line.rstrip()[:120]}')

print('\n=== direct .classList calls without null guard ===')
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    # Direct classList access patterns: $('something').classList or getElementById('').classList  
    if '.classList' in stripped and ('$(\'afw-' in stripped or "$('afw-" in stripped):
        print(f'L{i}: {stripped[:120]}')

print('\n=== L985-1015 (applyTheme area) ===')
for i in range(984, 1016):
    if i < len(lines):
        print(f'L{i+1}: {lines[i].rstrip()[:100]}')
