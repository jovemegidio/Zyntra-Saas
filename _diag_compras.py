#!/usr/bin/env python3
# Diagnóstico: onde aparecem as palavras nos HTMLs (script vs. HTML)
import re, os

base = '/var/www/aluforce/modules/Compras'
check_words = ['Cotacao', 'cotacao', 'Numero', 'numero', 'Codigo', 'codigo',
               'Historico', 'historico', 'Descricao', 'descricao', 'Gestao', 'gestao',
               'Requisicao', 'Solicitacao', 'Minimo', 'minimo', 'descricao', 'Periodo']

for fname in ['cotacoes.html', 'relatorios.html', 'requisicoes.html']:
    fpath = os.path.join(base, fname)
    html = open(fpath, encoding='utf-8', errors='replace').read()
    
    # Separate script content
    scripts = re.findall(r'<script[^>]*>.*?</script>', html, re.DOTALL | re.IGNORECASE)
    script_content = '\n'.join(scripts)
    
    # Remove scripts to get HTML-only
    html_only = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    print(f'\n=== {fname} ===')
    for word in check_words:
        total = html.count(word)
        in_script = script_content.count(word)
        in_html = html_only.count(word)
        if total > 0:
            print(f'  "{word}": total={total}, in_script={in_script}, in_html={in_html}')
    
    # Show first 5 contexts for most common word
    top_word = 'cotacao' if fname == 'cotacoes.html' else ('Requisicao' if fname == 'requisicoes.html' else 'descricao')
    print(f'\n  Contextos de "{top_word}" no HTML (fora de script):')
    for m in re.finditer(re.escape(top_word), html_only):
        start = max(0, m.start()-60)
        end = min(len(html_only), m.end()+60)
        print(f'    ...{repr(html_only[start:end])}...')
        if m.start() > 0:  # show first 3 only
            break
