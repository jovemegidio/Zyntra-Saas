import re, os

BASE = r"g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra"

# ---- faturamento.html ----
fat_path = BASE + r"\modules\PCP\pages\faturamento.html"
with open(fat_path, 'rb') as f:
    fat = f.read().decode('utf-8')

print("=== FATURAMENTO atualizarSaud ===")
for m in re.finditer(r'atualizarSaud[^\(]*\(\)', fat):
    print("  ", repr(fat[m.start():m.end()]))

print("\n=== FATURAMENTO getElementById IDs ===")
ids = set(re.findall(r"getElementById\('([^']+)'\)", fat))
print("  ", sorted(ids))

# Check which IDs exist as HTML element ids
html_ids = set(re.findall(r'\bid="([^"]+)"', fat))
print("\n=== HTML ids defined ===")
print("  ", sorted(html_ids))

missing = ids - html_ids
print("\n=== getElementById IDs NOT in HTML ===")
for mid in sorted(missing):
    print("  MISSING:", mid)

# ---- apontamentos.html ----
apon_path = BASE + r"\modules\PCP\apontamentos.html"
with open(apon_path, 'rb') as f:
    apon = f.read().decode('utf-8')

print("\n=== APONTAMENTOS style null errors - iniciarAtividade ===")
for m in re.finditer(r'iniciarAtividade[^{]*\{[^}]{0,300}\.style', apon):
    print("  ", repr(apon[m.start():m.start()+200]))
    break

# Find line with .style
lines = apon.split('\n')
for i, line in enumerate(lines, 1):
    if 'iniciarAtividade' in line or ('\.style' in line and 'null' not in line.lower()):
        if 'function iniciarAtividade' in line:
            print("\nFUNCTION AT LINE", i)
            print('\n'.join(lines[i-1:i+30]))
            break

print("\n=== APONTAMENTOS atualizarSaud ===")
for m in re.finditer(r'atualizarSaud[^\(]*\(\)', apon):
    print("  ", repr(apon[m.start():m.end()]))
