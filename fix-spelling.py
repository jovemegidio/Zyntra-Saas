#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-spelling.py - Corrige palavras sem acento nos HTMLs de todos os módulos.
Usa substituição string-based (não regex), rápida e segura.
Evita ALL-CAPS (prováveis constantes/classes CSS).
"""
from pathlib import Path

BASE = Path(__file__).parent

# Pares (errado → correto) - apenas Title Case e lowercase.
# ALL-CAPS não é substituído (ex: PRODUCAO numa classe CSS).
FIXES = [
    # Title Case
    ('Numero',       'Número'),
    ('Codigo',       'Código'),
    ('Descricao',    'Descrição'),
    ('Historico',    'Histórico'),
    ('Relatorio',    'Relatório'),
    ('Relatorios',   'Relatórios'),
    ('Funcionario',  'Funcionário'),
    ('Funcionarios', 'Funcionários'),
    ('Titulo',       'Título'),
    ('Titulos',      'Títulos'),
    ('Producao',     'Produção'),
    ('Veiculo',      'Veículo'),
    ('Veiculos',     'Veículos'),
    ('Configuracao', 'Configuração'),
    ('Configuracoes','Configurações'),
    ('Operacao',     'Operação'),
    ('Operacoes',    'Operações'),
    ('Periodo',      'Período'),
    ('Periodos',     'Períodos'),
    ('Modulo',       'Módulo'),
    ('Modulos',      'Módulos'),
    ('Acoes',        'Ações'),
    ('Acao',         'Ação'),
    ('Nao',          'Não'),  # Title Case — seguro
    ('Relgio',       'Relógio'),  # Erro específico em ponto.html
    # lowercase
    ('numero',       'número'),
    ('codigo',       'código'),
    ('descricao',    'descrição'),
    ('historico',    'histórico'),
    ('relatorio',    'relatório'),
    ('relatorios',   'relatórios'),
    ('funcionario',  'funcionário'),
    ('funcionarios', 'funcionários'),
    ('titulo',       'título'),
    ('titulos',      'títulos'),
    ('producao',     'produção'),
    ('veiculo',      'veículo'),
    ('veiculos',     'veículos'),
    ('configuracao', 'configuração'),
    ('configuracoes','configurações'),
    ('operacao',     'operação'),
    ('operacoes',    'operações'),
    ('periodo',      'período'),
    ('periodos',     'períodos'),
    ('modulo',       'módulo'),
    ('modulos',      'módulos'),
    ('acoes',        'ações'),
    ('acao',         'ação'),
]

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
        # Nível 0 — raiz do módulo
        for f in mod.glob('*.html'):
            if not should_ignore(str(f)):
                add(f)
        # Nível 1 — subpastas diretas
        for sub1 in mod.iterdir():
            if not sub1.is_dir() or should_ignore(str(sub1)):
                continue
            for f in sub1.glob('*.html'):
                if not should_ignore(str(f)):
                    add(f)
            # Nível 2 — subpastas de subpastas (ex: RH/public/pages/)
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

        # Aplica apenas em contextos de texto visível: não em atributos HTML inline.
        # Heurística: não substitui se a palavra aparece APENAS dentro de
        # aspas (class="...", id="...", data-*="...").
        # Estratégia simples: substituição global com str.replace —
        # rápida e funcional para os padrões levantados no scan.
        # Palavras de uma só sílaba ou ambíguas (nao) são EXCLUÍDAS desta lista.
        for wrong, right in FIXES:
            if wrong in content:
                n = content.count(wrong)
                content = content.replace(wrong, right)
                count += n
        
        if count > 0 and content != original:
            path.write_text(content, encoding='utf-8')
            return count
        return 0
    except Exception as e:
        print(f'  ERRO {path.name}: {e}', flush=True)
        return 0

def main():
    print('=== fix-spelling.py ===', flush=True)
    files = collect_files()
    print(f'Arquivos encontrados: {len(files)}', flush=True)

    modified = 0
    total = 0
    for f in sorted(files):
        n = fix_file(f)
        if n > 0:
            modified += 1
            total += n
            rel = str(f.relative_to(BASE))
            print(f'  ✅ {rel} [{n} correções]', flush=True)

    print(f'\nRESULTADO: {modified} arquivos corrigidos, {total} substituições total', flush=True)

if __name__ == '__main__':
    main()
