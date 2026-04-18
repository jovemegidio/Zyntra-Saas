#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan-acao-broken.py - Encontra compostos com "ação" que precisam ser revertidos.
Compara modules/ com Base/Sistema/modules/ para identificar o que mudou.
"""
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent
MODULES_DIR = BASE_DIR / 'modules'
BASE_SISTEMA_DIR = BASE_DIR / 'Base' / 'Sistema' / 'modules'

IGNORE = ['backup', '_backup', '_old', 'node_modules', 'screenshots']

def should_ignore(path_str):
    p = path_str.lower().replace('\\', '/')
    return any(x in p for x in IGNORE)

# Pattern: identificadores compostos que contem palavras com ação/ções
# Ex: data_liberação, data_criação, op-data-liberação, etc.
# Pegar qualquer token com acento num contexto de identifier
# (dentro de strings JS, atributos HTML id/name, obj.prop, etc.)
COMPOUND_ACCENTED = re.compile(
    r'[a-zA-Z0-9][_\-][a-zA-Z]*[àáâãäçèéêëìíîïòóôõöùúûü][a-zA-Z]*'
    r'|[a-zA-Z]*[àáâãäçèéêëìíîïòóôõöùúûü][a-zA-Z]*[_\-][a-zA-Z0-9]',
    re.IGNORECASE
)

def find_compound_accented_tokens(content):
    """Retorna set de tokens como data_liberação, op-data-liberação, etc."""
    tokens = set()
    for m in COMPOUND_ACCENTED.finditer(content):
        tok = m.group(0)
        # só se tiver letra acentuada
        if re.search(r'[àáâãäçèéêëìíîïòóôõöùúûü]', tok, re.IGNORECASE):
            tokens.add(tok)
    return tokens

def collect_files(base):
    files = []
    if not base.exists():
        return files
    for mod in base.iterdir():
        if not mod.is_dir() or should_ignore(str(mod)):
            continue
        for f in mod.rglob('*.html'):
            if not should_ignore(str(f)):
                files.append(f)
    return files

print("=== scan-acao-broken.py ===")
print(f"Escaneando {MODULES_DIR}...")

prod_files = collect_files(MODULES_DIR)
print(f"Arquivos de produção: {len(prod_files)}")

# Coletar tokens acentuados em identificadores de produção
all_tokens = {}
for pf in prod_files:
    try:
        content = pf.read_text(encoding='utf-8', errors='replace')
        tokens = find_compound_accented_tokens(content)
        if tokens:
            rel = str(pf.relative_to(BASE_DIR))
            all_tokens[rel] = tokens
    except Exception as e:
        print(f"  ERRO {pf}: {e}", flush=True)

print(f"\nArquivos com identificadores acentuados: {len(all_tokens)}")
print("\n=== Tokens acentuados encontrados ===")

# Coletar todos os tokens únicos
unique_tokens = set()
for tokens in all_tokens.values():
    unique_tokens.update(tokens)

# Ordenar e mostrar
sorted_tokens = sorted(unique_tokens)
print(f"Total de tokens únicos: {len(sorted_tokens)}")
for tok in sorted_tokens:
    print(f"  {tok}")

# Agora comparar com Base/Sistema para identificar quais eram originalmente sem acento
print("\n=== Comparação com Base/Sistema ===")
base_files = collect_files(BASE_SISTEMA_DIR)
base_content = {}
for bf in base_files:
    try:
        content = bf.read_text(encoding='utf-8', errors='replace')
        rel = str(bf.relative_to(BASE_SISTEMA_DIR))
        base_content[rel] = content
    except:
        pass

print(f"Arquivos base carregados: {len(base_content)}")

# Para cada token acentuado, verificar se o base tem o equivalente sem acento
import unicodedata
def remove_accents(text):
    """Normaliza e remove acentos."""
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))

needs_revert = set()
pre_existing = set()

for tok in sorted_tokens:
    tok_unaccented = remove_accents(tok)
    if tok == tok_unaccented:
        continue  # sem acento, skip
    
    # Verificar se o token acentuado existe no base
    found_in_base_accented = False
    found_in_base_unaccented = False
    
    for bc in base_content.values():
        if tok in bc:
            found_in_base_accented = True
        if tok_unaccented in bc:
            found_in_base_unaccented = True
    
    if found_in_base_accented:
        pre_existing.add(tok)
    elif found_in_base_unaccented:
        needs_revert.add(tok)
    # Se não encontrou em nenhum, pode ser novo no arquivo

print(f"\n[PRÉ-EXISTENTE - acentuado no Base] ({len(pre_existing)}):")
for tok in sorted(pre_existing):
    print(f"  OK  {tok}")

print(f"\n[PRECISA REVERTER - estava sem acento no Base] ({len(needs_revert)}):")
for tok in sorted(needs_revert):
    unaccented = remove_accents(tok)
    print(f"  !!  '{tok}' -> '{unaccented}'")

print("\nDone.")
