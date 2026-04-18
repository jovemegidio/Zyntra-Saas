#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-spelling-revert-acao-suffix.py
Reverte palavras compostas onde 'acao' era sufixo mas foi acidentalmente
acentuado pela substituição global 'acao' -> 'ação'.

Exemplos:
  data_liberação -> data_liberacao  (campo API)
  data_criação   -> data_criacao    (campo API)
  data_aprovação -> data_aprovacao  (campo API)
  situação_cadastral -> situacao_cadastral (campo API)

NÃO reverte:
  em_cotação, aguardando_cotação (originalmente acentuados no Base)
  standalone: "Data de Liberação" (texto visível)
"""
from pathlib import Path

BASE = Path(__file__).parent
MODULES = BASE / 'modules'

IGNORE = ['backup', '_backup', '_old', 'node_modules', 'screenshots']

def should_ignore(path_str):
    p = path_str.lower().replace('\\', '/')
    return any(x in p for x in IGNORE)

# Pares de revert para padrões compostos (prefixo/sufixo com _ ou -)
# Cada entrada: (acentuado_errado, correto)
REVERT = []

# Gera padrões para cada palavra que era sufixo 'acao'
# Padrão: palavra_acentuada em contexto de identificador (com _ ou -)
ACAO_WORDS = [
    ('liberação',    'liberacao'),
    ('criação',      'criacao'),
    ('aprovação',    'aprovacao'),
    ('situação',     'situacao'),    # cuidado: só quando em compound id
    ('atualização',  'atualizacao'),
    ('cancelação',   'cancelacao'),
    ('localização',  'localizacao'),
    ('geração',      'geracao'),
    ('programação',  'programacao'),
    ('homologação',  'homologacao'),
    ('habilitação',  'habilitacao'),
    ('solicitação',  'solicitacao'),
    ('compensação',  'compensacao'),
    ('movimentação', 'movimentacao'),
    ('alocação',     'alocacao'),
    ('autorização',  'autorizacao'),
    ('contratação',  'contratacao'),
    ('negociação',   'negociacao'),
    ('validação',    'validacao'),
    ('integração',   'integracao'),
    ('importação',   'importacao'),
    ('exportação',   'exportacao'),
    ('ocupação',     'ocupacao'),
    ('aplicação',    'aplicacao'),
    ('destinação',   'destinacao'),
    ('classificação','classificacao'),
    ('vinculação',   'vinculacao'),
    ('avaliação',    'avaliacao'),
    ('captação',     'captacao'),
    ('digitação',    'digitacao'),
    ('configuração', 'configuracao'),  # já tratado no revert principal, mas seguro repetir
    ('operação',     'operacao'),      # idem
    ('produção',     'producao'),      # idem
]

for acc, orig in ACAO_WORDS:
    # Prefixo com underscore: _liberação
    REVERT.append((f'_{acc}', f'_{orig}'))
    # Sufixo com underscore: liberação_
    REVERT.append((f'{acc}_', f'{orig}_'))
    # Prefixo com hífen: -liberação
    REVERT.append((f'-{acc}', f'-{orig}'))
    # Sufixo com hífen: liberação-
    REVERT.append((f'{acc}-', f'{orig}-'))

# CamelCase específico encontrado no código
REVERT.extend([
    ('dataCriação',  'dataCriacao'),
    ('dataCriaç',    'dataCriacao'),  # partial match fallback
])

# Para situação em compound específicos (situacao_cadastral etc.)
# Já coberto por ('situação_', 'situacao_') acima
# Mas também handle .situação e .aprovação
for acc, orig in ACAO_WORDS:
    REVERT.append((f'.{acc}', f'.{orig}'))

print("=== fix-spelling-revert-acao-suffix.py ===", flush=True)
print(f"Padrões de revert: {len(REVERT)}", flush=True)

def collect_files():
    files = []
    seen = set()
    def add(f):
        k = str(f).lower()
        if k not in seen:
            seen.add(k)
            files.append(f)
    for mod in MODULES.iterdir():
        if not mod.is_dir() or should_ignore(str(mod)):
            continue
        for f in mod.glob('*.html'):
            if not should_ignore(str(f)):
                add(f)
        for sub in mod.iterdir():
            if not sub.is_dir() or should_ignore(str(sub)):
                continue
            for f in sub.glob('*.html'):
                if not should_ignore(str(f)):
                    add(f)
            for sub2 in sub.iterdir():
                if not sub2.is_dir() or should_ignore(str(sub2)):
                    continue
                for f in sub2.glob('*.html'):
                    if not should_ignore(str(f)):
                        add(f)
    return files

files = collect_files()
print(f"Arquivos: {len(files)}", flush=True)

total_rev = 0
modified = 0

for f in files:
    try:
        original = f.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        print(f"  ERRO lendo {f}: {e}", flush=True)
        continue

    content = original
    rev_count = 0
    for acc, orig in REVERT:
        if acc in content:
            count = content.count(acc)
            content = content.replace(acc, orig)
            rev_count += count

    if rev_count > 0:
        try:
            f.write_text(content, encoding='utf-8')
            modified += 1
            total_rev += rev_count
            rel = str(f.relative_to(BASE))
            print(f"  🔧 {rel} [{rev_count} reversões]", flush=True)
        except Exception as e:
            print(f"  ERRO escrevendo {f}: {e}", flush=True)

print(f"\nRESULTADO: {modified} arquivos ajustados, {total_rev} reversões total", flush=True)
