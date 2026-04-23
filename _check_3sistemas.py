#!/usr/bin/env python3
# Diagnóstico dos 3 sistemas
import re, os

WORDS = ['Cotacao', 'cotacao', 'Numero', 'numero', 'Codigo', 'codigo',
         'Historico', 'historico', 'Descricao', 'descricao', 'gestao', 'Gestao',
         'Requisicao', 'Solicitacao', 'Minimo', 'minimo', 'Periodo', 'periodo',
         'disponivel', 'condicoes', 'avaliacao', 'Selecao', 'Edicao',
         'movimentacao', 'Aprovacao', 'cancelacao', 'Notificacao',
         'Fornecedro', 'forncedor', 'materais', 'quantiddade']

def extract_text_nodes(html):
    clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<!--.*?-->', '', clean, flags=re.DOTALL)
    nodes = re.findall(r'>([^<]+)<', clean)
    attrs = []
    for attr in ['title', 'placeholder', 'aria-label', 'alt', 'data-title']:
        for m in re.finditer(rf'(?i){attr}="([^"]+)"', clean):
            attrs.append(m.group(1))
    return nodes + attrs

targets = [
    ('/var/www/aluforce/modules/Compras', 'ZYNTRA/ALUFORCE'),
    ('/var/www/labor-energy/modules/Compras', 'LABOR ENERGY'),
    ('/var/www/labor-eletric/modules/Compras', 'LABOR ELETRIC'),
]

total_errors = 0

for base_dir, label in targets:
    if not os.path.isdir(base_dir):
        print(f'\n{label}: diretório não encontrado')
        continue
    
    print(f'\n{"="*50}\n{label}\n{"="*50}')
    system_clean = True
    
    for fname in sorted(os.listdir(base_dir)):
        if not fname.endswith('.html'):
            continue
        html = open(os.path.join(base_dir, fname), encoding='utf-8', errors='replace').read()
        texts = extract_text_nodes(html)
        
        found = []
        for text in texts:
            stripped = text.strip()
            if not stripped:
                continue
            for word in WORDS:
                pat = r'(?<![a-zA-ZÀ-ÿ])' + re.escape(word) + r'(?![a-zA-ZÀ-ÿ])'
                if re.search(pat, stripped):
                    found.append((word, stripped[:100]))
                    break
        
        if found:
            print(f'\n  {fname}:')
            for word, ctx in found:
                print(f'    [{word}] "{ctx}"')
            total_errors += len(found)
            system_clean = False
        else:
            pass  # silêncio para arquivos OK
    
    if system_clean:
        print(f'  Todos os 9 arquivos: TEXTO VISÍVEL CORRETO ✓')

print(f'\n{"="*50}')
print(f'Total de problemas: {total_errors}')
