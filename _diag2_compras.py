#!/usr/bin/env python3
# Diagnóstico preciso: mostra todos os nós de texto HTML com palavras problemáticas
import re, os

base = '/var/www/aluforce/modules/Compras'
WORDS = ['Cotacao', 'cotacao', 'Numero', 'numero', 'Codigo', 'codigo',
         'Historico', 'historico', 'Descricao', 'descricao', 'gestao', 'Gestao',
         'Requisicao', 'requisicao', 'Solicitacao', 'solicitacao', 'Minimo', 'minimo',
         'Periodo', 'periodo', 'disponivel', 'Disponivel', 'condicoes', 'avaliacao',
         'Selecao', 'Edicao', 'movimentacao']

def get_text_nodes(html):
    """Extrai nós de texto puros entre tags HTML (fora de script/style)."""
    # Remove script e style
    clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<!--.*?-->', '', clean, flags=re.DOTALL)
    # Find text nodes (between > and <)
    return re.findall(r'>([^<]+)<', clean)

def get_visible_attrs(html):
    """Extrai valores de atributos visíveis (title, placeholder, aria-label)."""
    clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.DOTALL|re.IGNORECASE)
    results = []
    for attr in ['title', 'placeholder', 'aria-label', 'alt', 'data-title']:
        for m in re.finditer(rf'{attr}="([^"]+)"', clean, re.IGNORECASE):
            results.append((attr, m.group(1)))
    return results

for fname in sorted(os.listdir(base)):
    if not fname.endswith('.html'):
        continue
    html = open(os.path.join(base, fname), encoding='utf-8', errors='replace').read()
    
    nodes = get_text_nodes(html)
    attrs = get_visible_attrs(html)
    
    found_nodes = []
    for node in nodes:
        node_stripped = node.strip()
        if not node_stripped:
            continue
        for word in WORDS:
            pattern = r'(?<![a-zA-ZÀ-ÿ])' + re.escape(word) + r'(?![a-zA-ZÀ-ÿ])'
            if re.search(pattern, node_stripped):
                found_nodes.append((word, node_stripped[:120]))
                break  # one word per node
    
    found_attrs = []
    for attr_name, val in attrs:
        for word in WORDS:
            pattern = r'(?<![a-zA-ZÀ-ÿ])' + re.escape(word) + r'(?![a-zA-ZÀ-ÿ])'
            if re.search(pattern, val):
                found_attrs.append((attr_name, word, val[:120]))
                break
    
    if found_nodes or found_attrs:
        print(f'\n=== {fname} ===')
        if found_nodes:
            print('  NODOS DE TEXTO:')
            for word, ctx in found_nodes:
                print(f'    [{word}] "{ctx}"')
        if found_attrs:
            print('  ATRIBUTOS VISÍVEIS:')
            for attr, word, val in found_attrs:
                print(f'    [{attr}:{word}] "{val}"')
    else:
        print(f'  {fname}: OK (nenhum erro em texto visível)')
