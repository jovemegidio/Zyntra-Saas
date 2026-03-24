#!/usr/bin/env python3
"""Second pass: fix garbled/corrupted text and compound words in RH pages and remaining files."""
import os, re, glob

BASE = r'G:\Outros computadores\Meu laptop (2)\Zyntra'

# Garbled patterns (bytes stripped, not just missing accents)
GARBLED_FIXES = [
    # Missing accent bytes completely
    ('Funcionrios', 'Funcionários'),
    ('Funcionrio', 'Funcionário'),
    ('funcionrios', 'funcionários'),
    ('funcionrio', 'funcionário'),
    ('Avaliaes', 'Avaliações'),
    ('avaliaes', 'avaliações'),
    ('Avalia\xe7\xf5es', 'Avaliações'),  # possible Latin-1 remnant
    # Compound words (no word boundary between prefix and root)
    ('Autoavaliacao', 'Autoavaliação'),
    ('autoavaliacao', 'autoavaliação'),
    ('Autoavaliação', 'Autoavaliação'),  # already correct, skip
    # Additional text context fixes
    ('>avaliacao<', '>avaliação<'),
    ('>avaliacao.', '>avaliação.'),
    ('>Avaliacao<', '>Avaliação<'),
    (' avaliacao ', ' avaliação '),
    (' avaliacao.', ' avaliação.'),
    (' avaliacao,', ' avaliação,'),
    (' avaliacao<', ' avaliação<'),
    ('>Avaliacao ', '>Avaliação '),
    (' periodo ', ' período '),
    ('>periodo<', '>período<'),
    ('>Periodo<', '>Período<'),
    (' periodo<', ' período<'),
    (' periodo,', ' período,'),
    (' periodo.', ' período.'),
]

# These are regex-based for remaining text (not in href/src/id/script var names)
TEXT_FIXES = [
    # Fix remaining text instances - match only in display text contexts
    # title="..." attributes
    (r'title="([^"]*?)(?:Funcionario)([^"]*?)"', r'title="\1Funcionário\2"'),
    (r'title="([^"]*?)(?:funcionario)([^"]*?)"', r'title="\1funcionário\2"'),
    (r'title="([^"]*?)(?:Avaliacoes)([^"]*?)"', r'title="\1Avaliações\2"'),
    (r'title="([^"]*?)(?:avaliacao)([^"]*?)"', r'title="\1avaliação\2"'),
    (r'title="([^"]*?)(?:Periodo)([^"]*?)"', r'title="\1Período\2"'),
    (r'title="([^"]*?)(?:periodo)([^"]*?)"', r'title="\1período\2"'),
    (r'title="([^"]*?)(?:Titulo)([^"]*?)"', r'title="\1Título\2"'),
    # placeholder="..." attributes
    (r'placeholder="([^"]*?)(?:funcionario)([^"]*?)"', r'placeholder="\1funcionário\2"'),
    (r'placeholder="([^"]*?)(?:periodo)([^"]*?)"', r'placeholder="\1período\2"'),
    # Text between tags: >text<
    (r'>([^<]*?)Autoavaliacao([^<]*?)<', r'>\1Autoavaliação\2<'),
    (r'>([^<]*?)autoavaliacao([^<]*?)<', r'>\1autoavaliação\2<'),
    (r'>([^<]*?)(?<!\/)avaliacao([^<]*?)<', r'>\1avaliação\2<'),
    (r'>([^<]*?)(?<!\/)Avaliacao([^<]*?)<', r'>\1Avaliação\2<'),
    (r'>([^<]*?)(?<!\/)Funcionario([^<]*?)<', r'>\1Funcionário\2<'),
    (r'>([^<]*?)(?<!\/)funcionario([^<]*?)<', r'>\1funcionário\2<'),
    (r'>([^<]*?)(?<!\/)Funcionarios([^<]*?)<', r'>\1Funcionários\2<'),
    (r'>([^<]*?)(?<!\/)funcionarios([^<]*?)<', r'>\1funcionários\2<'),
    (r'>([^<]*?)(?<!\/)Periodo([^<]*?)<', r'>\1Período\2<'),
    (r'>([^<]*?)(?<!\/)periodo([^<]*?)<', r'>\1período\2<'),
    (r'>([^<]*?)(?<!\/)Titulo([^<]*?)<', r'>\1Título\2<'),
    (r'>([^<]*?)(?<!\/)titulo([^<]*?)<', r'>\1título\2<'),
    (r'>([^<]*?)Concluidas([^<]*?)<', r'>\1Concluídas\2<'),
    (r'>([^<]*?)concluidas([^<]*?)<', r'>\1concluídas\2<'),
    (r'>([^<]*?) pagina ([^<]*?)<', r'>\1 página \2<'),
    (r'>([^<]*?)informacao([^<]*?)<', r'>\1informação\2<'),
]

patterns = [
    'modules/RH/public/pages/*.html',
    'modules/Financeiro/*.html',
    'modules/Vendas/public/*.html',
    'modules/PCP/pages/*.html',
    'modules/Compras/*.html',
    'modules/Faturamento/public/*.html',
    'modules/NFe/*.html',
]

total_fixed = 0
for pat in patterns:
    for filepath in glob.glob(os.path.join(BASE, pat)):
        fname = os.path.relpath(filepath, BASE)
        if '_backup' in fname or '.bak' in fname or '.removed' in fname or 'pre-excel' in fname:
            continue
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(filepath, 'r', encoding='latin-1') as f:
                    content = f.read()
            except:
                continue
        
        original = content
        
        # Apply garbled fixes (simple string replacement)
        for old, new in GARBLED_FIXES:
            if old in content:
                content = content.replace(old, new)
        
        # Apply regex text fixes
        for pattern, replacement in TEXT_FIXES:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            changes = sum(1 for a, b in zip(original, content) if a != b)
            print(f'Fixed: {fname}')
            total_fixed += 1

print(f'\nTotal files fixed in pass 2: {total_fixed}')
