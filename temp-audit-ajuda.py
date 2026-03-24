#!/usr/bin/env python3
import os, re, glob

BASE = '/var/www/aluforce/ajuda'

# All existing article files (excluding desktop.ini)
artigo_files = set()
for f in os.listdir(f'{BASE}/artigos/'):
    if f.endswith('.html'):
        artigo_files.add(f)

# Parse what each collection links to
colecoes = {}
for f in sorted(glob.glob(f'{BASE}/colecoes/*.html')):
    name = os.path.basename(f).replace('.html', '')
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    links = re.findall(r'artigos/([^"]+\.html)', content)
    colecoes[name] = links

# Print current state
for name, links in sorted(colecoes.items()):
    print(f'\n=== {name.upper()} ({len(links)} artigos) ===')
    for l in links:
        exists = '  OK' if l in artigo_files else ' MISS'
        print(f'  {exists}: {l}')

# Check which articles are NOT linked from ANY collection
all_linked = set()
for links in colecoes.values():
    all_linked.update(links)

orphans = artigo_files - all_linked
if orphans:
    print(f'\n=== ARTIGOS ORFAOS (nao linkados em nenhuma colecao) ===')
    for o in sorted(orphans):
        print(f'  {o}')

# Check broken links (linked but file doesn't exist)
all_missing = all_linked - artigo_files
if all_missing:
    print(f'\n=== LINKS QUEBRADOS (linkados mas arquivo nao existe) ===')
    for m in sorted(all_missing):
        print(f'  {m}')

print('\n=== RESUMO ===')
print(f'Total artigos: {len(artigo_files)}')
print(f'Total linkados: {len(all_linked)}')
print(f'Orfaos: {len(orphans)}')
print(f'Links quebrados: {len(all_missing)}')
