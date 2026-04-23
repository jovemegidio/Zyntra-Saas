import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'public', 'chat-teams', 'chat-widget.js')

with open(f, 'rb') as fh:
    raw = fh.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

print(f'Total lines: {len(lines)}')

# Find applyTheme function
print('\n=== applyTheme function ===')
for i, line in enumerate(lines, 1):
    if 'applyTheme' in line or 'initTheme' in line:
        print(f'L{i}: {line.rstrip()[:120]}')

# Find direct classList calls without null guard
print('\n=== .classList calls ===')
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if '.classList' in stripped and ('$(\'afw-' in stripped or "$('afw-" in stripped or '$(\'aluforce' in stripped or "$('aluforce" in stripped):
        print(f'L{i}: {stripped[:120]}')

# Show applyTheme area
print('\n=== applyTheme content (15 lines around) ===')
for i, line in enumerate(lines, 1):
    if 'function applyTheme' in line:
        start = max(0, i-2)
        end = min(len(lines), i+20)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()[:100]}')
        break
