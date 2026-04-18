#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan-spelling-errors.py - Verifica quais arquivos HTML têm palavras sem acento.
"""
import re
from pathlib import Path

BASE = Path(__file__).parent

CHECKS = [
    (r'Relgio', 'Relógio'),
    (r'Relatorio', 'Relatório'),
    (r'Funcionario', 'Funcionário'),
    (r'Historico', 'Histórico'),
    (r'Codigo', 'Código'),
    (r'Numero', 'Número'),
    (r'Botao', 'Botão'),
    (r'Acoes', 'Ações'),
    (r'Periodo', 'Período'),
    (r'Descricao', 'Descrição'),
    (r'Configuracao', 'Configuração'),
    (r'Titulo', 'Título'),
    (r'Nivel', 'Nível'),
    (r'Modulo', 'Módulo'),
    (r'Sabado', 'Sábado'),
    (r'Terca', 'Terça'),
    (r'Credito', 'Crédito'),
    (r'Debito', 'Débito'),
    (r'nao\b', 'não'),
    (r'que\b', None),  # skip - too generic
    (r'Pagamento', None),  # already correct
    (r'Producao', 'Produção'),
    (r'Producao', 'Produção'),
    (r'Operacao', 'Operação'),
    (r'Categoria', None),  # already correct
    (r'Faturamento', None),  # already correct
    (r'Fornecedor', None),  # already correct
    (r'Veiculo', 'Veículo'),
    (r'Pedido', None),  # already correct
    (r'Estoque', None),  # already correct
]

# Filtrar apenas os que têm substituição definida
CHECKS = [(p, r) for p, r in CHECKS if r is not None]

# Compilar padrões com word boundary
COMPILED = [(re.compile(r'\b' + p + r'\b', re.IGNORECASE), p) for p, _ in CHECKS]

IGNORE = ['backup', '_backup', '_old', 'node_modules', 'Financeiro_backup', 'legacy']

def should_ignore(path_str):
    path_lower = path_str.lower().replace('\\', '/')
    return any(p in path_lower for p in IGNORE)

modules = BASE / 'modules'
found = {}

for mod in modules.iterdir():
    if not mod.is_dir() or should_ignore(str(mod)):
        continue
    for sub in [mod] + [s for s in mod.iterdir() if s.is_dir() and not should_ignore(str(s))]:
        for f in sub.glob('*.html'):
            if should_ignore(str(f)):
                continue
            try:
                content = f.read_text(encoding='utf-8', errors='replace')
                hits = []
                for compiled, pattern in COMPILED:
                    m = compiled.search(content)
                    if m:
                        hits.append(f'{pattern}→{m.group()}')
                if hits:
                    rel = str(f.relative_to(BASE))
                    found[rel] = hits
            except Exception as e:
                print(f'ERRO {f}: {e}', flush=True)

for rel, hits in sorted(found.items()):
    print(f'{rel}:', flush=True)
    print(f'  {hits}', flush=True)
print(f'\nTotal: {len(found)} arquivos com erros ortográficos potenciais', flush=True)
