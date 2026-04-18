#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-spelling-revert-compound.py
Reverte as palavras acentuadas de volta ao original quando aparecem dentro de
identificadores compostos com _ ou como propriedades de objetos com .

Problema: str.replace substituiu 'numero' → 'número' em TODOS os lugares,
incluindo nomes de campos de API como numero_pedido → número_pedido.
O servidor retorna JSON com numero_pedido (sem acento), causando undefined no frontend.

Este script reverte somente os padrões de identificador composto.
"""
from pathlib import Path

BASE = Path(__file__).parent

# Padrões: reverter quando a palavra ACENTUADA aparece
# adjacente a _ (antes ou depois) ou após . (property access)
REVERT_PATTERNS = []

# Pares (acentuado, sem_acento) para reverter em contextos de identificador
WORD_PAIRS = [
    ('número',      'numero'),
    ('código',      'codigo'),
    ('descrição',   'descricao'),
    ('título',      'titulo'),
    ('produção',    'producao'),
    ('veículo',     'veiculo'),
    ('veículos',    'veiculos'),
    ('configuração','configuracao'),
    ('histórico',   'historico'),
    ('funcionário', 'funcionario'),
    ('funcionários','funcionarios'),
    ('relatório',   'relatorio'),
    ('relatórios',  'relatorios'),
    ('período',     'periodo'),
    ('módulo',      'modulo'),
    ('módulos',     'modulos'),
    ('ação',        'acao'),
    ('ações',       'acoes'),
    ('operação',    'operacao'),
    ('operações',   'operacoes'),
    ('Número',      'Numero'),
    ('Código',      'Codigo'),
    ('Descrição',   'Descricao'),
    ('Título',      'Titulo'),
    ('Produção',    'Producao'),
    ('Veículo',     'Veiculo'),
    ('Configuração','Configuracao'),
    ('Histórico',   'Historico'),
    ('Funcionário', 'Funcionario'),
    ('Relatório',   'Relatorio'),
    ('Período',     'Periodo'),
    ('Módulo',      'Modulo'),
    ('Ação',        'Acao'),
    ('Operação',    'Operacao'),
]

# Para cada par, criar 3 padrões de contexto:
# 1. _ACCENTUADO (compound identifier: underscore before)
# 2. ACCENTUADO_ (compound identifier: underscore after)
# 3. .ACCENTUADO (object property access)
for accented, plain in WORD_PAIRS:
    REVERT_PATTERNS.append(('_' + accented, '_' + plain))      # _número → _numero
    REVERT_PATTERNS.append((accented + '_', plain + '_'))      # número_ → numero_
    REVERT_PATTERNS.append(('.' + accented, '.' + plain))      # .número → .numero

IGNORE = ['backup', '_backup', '_old', 'node_modules', 'Financeiro_backup', 'legacy', 'screenshots']

def should_ignore(path_str):
    path_lower = path_str.lower().replace('\\', '/')
    return any(p in path_lower for p in IGNORE)

def collect_files():
    files = []
    seen = set()

    def add(f):
        k = str(f).lower()
        if k not in seen:
            seen.add(k)
            files.append(f)

    modules = BASE / 'modules'
    for mod in modules.iterdir():
        if not mod.is_dir() or should_ignore(str(mod)):
            continue
        for f in mod.glob('*.html'):
            if not should_ignore(str(f)):
                add(f)
        for sub1 in mod.iterdir():
            if not sub1.is_dir() or should_ignore(str(sub1)):
                continue
            for f in sub1.glob('*.html'):
                if not should_ignore(str(f)):
                    add(f)
            for sub2 in sub1.iterdir():
                if not sub2.is_dir() or should_ignore(str(sub2)):
                    continue
                for f in sub2.glob('*.html'):
                    if not should_ignore(str(f)):
                        add(f)
    return files

def fix_file(path):
    try:
        content = path.read_text(encoding='utf-8', errors='replace')
        original = content
        count = 0
        for wrong, right in REVERT_PATTERNS:
            if wrong in content:
                n = content.count(wrong)
                count += n
                content = content.replace(wrong, right)
        if count > 0 and content != original:
            path.write_text(content, encoding='utf-8')
            return count
        return 0
    except Exception as e:
        print(f'  ERRO {path.name}: {e}', flush=True)
        return 0

def main():
    print('=== fix-spelling-revert-compound.py ===', flush=True)
    files = collect_files()
    print(f'Arquivos: {len(files)}', flush=True)
    modified = 0
    total = 0
    for f in sorted(files):
        n = fix_file(f)
        if n > 0:
            modified += 1
            total += n
            rel = str(f.relative_to(BASE))
            print(f'  🔧 {rel} [{n} reversões]', flush=True)
    print(f'\nRESULTADO: {modified} arquivos ajustados, {total} reversões total', flush=True)

if __name__ == '__main__':
    main()
