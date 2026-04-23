import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'public', 'chat', 'widget.js')

with open(f, 'rb') as fh:
    raw = fh.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')

print(f'Total lines: {len(lines)}')
print('\n=== Remaining direct .classList without guard ===')
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    # Check for direct $(id).classList calls (not preceded by null guard)
    if '.classList' in stripped and ("$('afw-" in stripped or '$("afw-' in stripped):
        # Check it's not in a pattern like "const x = $(...); if (x) x.classList..."
        # i.e., look for $('afw-').classList directly
        import re
        pattern = r"\$\(['\"]afw-[^)]+['\"\)]\s*\)\.classList"
        if re.search(pattern, stripped):
            print(f'L{i}: {stripped[:120]}')
