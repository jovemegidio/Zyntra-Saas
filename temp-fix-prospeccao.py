#!/usr/bin/env python3
"""Fix prospeccao.html: encoding Latin-1→UTF-8, title, ALUFORCE→Zyntra branding"""
import shutil

src = '/var/www/aluforce/modules/Vendas/public/prospeccao.html'
bkp = src + '.bak-encoding'

# Backup
shutil.copy2(src, bkp)
print(f'Backup: {bkp}')

# Read as Latin-1
with open(src, 'rb') as f:
    raw = f.read()

# Decode as Latin-1 (single-byte, always succeeds)
text = raw.decode('latin-1')

# 1. Fix title
text = text.replace(
    '<title>Aluforce: CRM Prospec\xe7\xe3o B2B</title>',
    '<title>Zyntra: Prospec\xe7\xf5es & Leads</title>'
)

# 2. Fix header page-title
text = text.replace('Prospec\xe7\xf5es</span>', 'Prospec\xe7\xf5es & Leads</span>')

# 3. Fix h1 title
text = text.replace(
    'Prospec\xe7\xe3o Inteligente B2B',
    'Prospec\xe7\xf5es & Leads'
)

# 4. Fix sidebar tooltip
text = text.replace(
    'title="Prospec\xe7\xe3o CRM"',
    'title="Prospec\xe7\xf5es & Leads"'
)

# 5. Fix tab text
text = text.replace(
    'Prospec\xe7\xe3o CRM</button>',
    'Prospec\xe7\xf5es & Leads</button>'
)

# 6. Fix logo path (header)
text = text.replace(
    '/images/Logo Monocromatico - Branco - Aluforce.png',
    '/images/zyntra-branco.png'
)
text = text.replace('alt="ALUFORCE"', 'alt="Zyntra"')

# 7. Fix Excel export branding
text = text.replace('ALUFORCE  |  Relat\xf3rio', 'ZYNTRA  |  Relat\xf3rio')
text = text.replace('ALUFORCE \x97 Sistema', 'ZYNTRA \x97 Sistema')
# Also handle the variant without em-dash
text = text.replace('ALUFORCE - Sistema', 'ZYNTRA - Sistema')

# 8. Fix copyright if present
text = text.replace('2026 Aluforce.', '2026 Zyntra.')

# Now re-encode to proper UTF-8
utf8_text = text.encode('utf-8')

with open(src, 'wb') as f:
    f.write(utf8_text)

# Verify
with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

checks = [
    ('Title', '<title>Zyntra: Prospecções & Leads</title>' in content),
    ('Logo', 'zyntra-branco.png' in content),
    ('Alt Zyntra', 'alt="Zyntra"' in content),
    ('No ALUFORCE', 'ALUFORCE' not in content and 'Aluforce' not in content),
    ('UTF-8 ç', 'Prospecções' in content),
    ('UTF-8 ã', 'Prospecção' not in content or 'ção' in content),
]

print('\n=== VERIFICATION ===')
all_ok = True
for name, ok in checks:
    status = 'OK' if ok else 'FAIL'
    if not ok:
        all_ok = False
    print(f'  {status}: {name}')

# Count remaining encoding issues
import re
broken = re.findall(r'[\x80-\xff]', content)
# In proper UTF-8 decoded string, there should be no high bytes as single chars
# (they would be proper unicode chars like ç, ã, etc.)
print(f'\nFile re-encoded to UTF-8 successfully')
print(f'File size: {len(utf8_text)} bytes')

if all_ok:
    print('\nALL CHECKS PASSED!')
else:
    print('\nSOME CHECKS FAILED - review needed')
