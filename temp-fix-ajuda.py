import os
import re
import glob

BASE = '/var/www/aluforce/ajuda'

fixes = {
    'titles': 0,
    'footer_logo': 0,
    'footer_copyright': 0,
    'emu_logo': 0,
}

# Gather all HTML files
all_files = (
    glob.glob(f'{BASE}/index.html') +
    glob.glob(f'{BASE}/artigos/*.html') +
    glob.glob(f'{BASE}/colecoes/*.html')
)

for fpath in sorted(all_files):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    orig = content

    # Fix 1: Title ALUFORCE: → Zyntra:
    content = re.sub(r'<title>ALUFORCE:', '<title>Zyntra:', content)

    # Fix 2: Footer logo zyntra-sem-fundo.png → zyntra-branco.png (only in footer)
    # Pattern: footer-logo-img uses sem-fundo (wrong), should use branco
    content = content.replace(
        'zyntra-sem-fundo.png" alt="Zyntra" class="footer-logo-img"',
        'zyntra-branco.png" alt="Zyntra" class="footer-logo-img"'
    )

    # Fix 3: Footer copyright Aluforce → Zyntra
    content = content.replace(
        '2026 Aluforce. Todos os direitos',
        '2026 Zyntra. Todos os direitos'
    )

    # Fix 4: emu-header-logo ALUFORCE → Zyntra (emulated app screen in tutorials)
    content = content.replace(
        'class="emu-header-logo">ALUFORCE<',
        'class="emu-header-logo">Zyntra<'
    )

    if content != orig:
        # Count each fix type
        if re.search(r'<title>ALUFORCE:', orig):
            fixes['titles'] += 1
        if 'zyntra-sem-fundo.png" alt="Zyntra" class="footer-logo-img"' in orig:
            fixes['footer_logo'] += 1
        if '2026 Aluforce. Todos os direitos' in orig:
            fixes['footer_copyright'] += 1
        if 'class="emu-header-logo">ALUFORCE<' in orig:
            fixes['emu_logo'] += 1

        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  FIXED: {os.path.basename(fpath)}')
    else:
        print(f'  ok: {os.path.basename(fpath)}')

print('\n=== SUMMARY ===')
print(f'Total files processed: {len(all_files)}')
for k, v in fixes.items():
    print(f'  {k}: {v} files fixed')
