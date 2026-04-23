#!/usr/bin/env python3
# Dump completo de todos os textos visíveis nos HTMLs do Compras
# Para revisão manual de ortografia
import re, os

base = '/var/www/aluforce/modules/Compras'

def extract_all_visible_text(html):
    """Extrai todo texto visível: nós de texto + atributos visíveis."""
    # Remove scripts, styles, comments
    clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<!--.*?-->', '', clean, flags=re.DOTALL)
    
    texts = set()
    
    # Text nodes
    for node in re.findall(r'>([^<]+)<', clean):
        stripped = node.strip()
        # Only meaningful text (not just whitespace, numbers, symbols)
        if stripped and re.search(r'[a-zA-ZÀ-ÿ]{3,}', stripped):
            texts.add(('text', stripped[:200]))
    
    # Visible attributes
    for attr in ['title', 'placeholder', 'aria-label', 'alt', 'data-title', 'data-tooltip', 'data-content']:
        for m in re.finditer(rf'(?i){attr}="([^"]+)"', clean):
            val = m.group(1).strip()
            if re.search(r'[a-zA-ZÀ-ÿ]{3,}', val):
                texts.add((attr, val[:200]))
    
    # Option values that are text labels
    for m in re.finditer(r'<option[^>]*>([^<]+)</option>', clean, re.IGNORECASE):
        val = m.group(1).strip()
        if re.search(r'[a-zA-ZÀ-ÿ]{3,}', val):
            texts.add(('option', val[:200]))
    
    return sorted(texts)

for fname in sorted(os.listdir(base)):
    if not fname.endswith('.html'):
        continue
    html = open(os.path.join(base, fname), encoding='utf-8', errors='replace').read()
    texts = extract_all_visible_text(html)
    
    print(f'\n{"="*70}')
    print(f'ARQUIVO: {fname}')
    print(f'{"="*70}')
    for kind, text in texts:
        # Flag potential issues: words with 5+ letters all lowercase without accent
        # that could be missing accents
        words_lower = re.findall(r'\b[a-z]{5,}\b', text)
        suspicious = [w for w in words_lower if re.match(r'^[a-z]+$', w) and len(w) >= 5]
        flag = ' ⚠' if suspicious else ''
        print(f'  [{kind}]{flag} {text}')
