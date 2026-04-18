#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-accented-urls-and-ids.py

Reverte acentos em contextos que NUNCA devem ter acento:
  1. URLs de API em fetch(), href=, src=, action=
  2. IDs de elementos HTML: id="algumId"
  3. Argumentos de funções usados como identifiers em onclick=""
  4. Nomes de variáveis/funções JS (carregarHistórico → carregarHistorico)
  5. Chaves de objeto JSON (data.notificações → data.notificacoes)

Preserva o texto visível (labels, títulos, textos de botão).
"""

import re
from pathlib import Path

BASE = Path(__file__).parent

# ─── Mapeamento palavra-acentuada → sem-acento ─────────────────────────────
# Usado para reverter em contextos de identifier/URL
WORD_MAP = [
    ('notificações', 'notificacoes'),
    ('notificação',  'notificacao'),
    ('histórico',    'historico'),
    ('históricos',   'historicos'),
    ('histórica',    'historica'),
    ('configurações','configuracoes'),
    ('configuração', 'configuracao'),
    ('condições',    'condicoes'),
    ('condição',     'condicao'),
    ('operações',    'operacoes'),
    ('operação',     'operacao'),
    ('produção',     'producao'),
    ('produções',    'producoes'),
    ('liberação',    'liberacao'),
    ('criação',      'criacao'),
    ('aprovação',    'aprovacao'),
    ('situação',     'situacao'),
    ('atualização',  'atualizacao'),
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
    ('relação',      'relacao'),
    ('relações',     'relacoes'),
    ('descrição',    'descricao'),
    ('descrições',   'descricoes'),
    ('número',       'numero'),
    ('números',      'numeros'),
    ('código',       'codigo'),
    ('códigos',      'codigos'),
    ('título',       'titulo'),
    ('títulos',      'titulos'),
    ('período',      'periodo'),
    ('períodos',     'periodos'),
    ('módulo',       'modulo'),
    ('módulos',      'modulos'),
    ('relatório',    'relatorio'),
    ('relatórios',   'relatorios'),
    ('histórico',    'historico'),
    ('funcionário',  'funcionario'),
    ('funcionários', 'funcionarios'),
    ('veículo',      'veiculo'),
    ('veículos',     'veiculos'),
    ('título',       'titulo'),
    ('ações',        'acoes'),
    ('ação',         'acao'),
    ('página',       'pagina'),
    ('páginas',      'paginas'),
    ('índice',       'indice'),
    ('índices',      'indices'),
]

IGNORE_PATHS = ['backup', '_backup', '_old', 'node_modules', 'Financeiro_backup',
                'legacy', 'screenshots', 'Base', '.git']


def should_ignore(path_str):
    p = path_str.lower().replace('\\', '/')
    return any(x in p for x in [s.lower() for s in IGNORE_PATHS])


# ─── Substituição em contextos de URL ──────────────────────────────────────

def fix_in_url(url_text):
    """Reverte acentos dentro de uma string que representa uma URL/path."""
    result = url_text
    for acc, unacc in WORD_MAP:
        result = result.replace(acc, unacc)
        # Title case variant
        result = result.replace(acc[0].upper() + acc[1:], unacc[0].upper() + unacc[1:])
    return result


# Regex para capturar URLs em contextos de código
URL_PATTERNS = [
    # fetch('/api/...', ...)
    re.compile(r'''(fetch\s*\(\s*[`'"])(/[^`'"\n]+)([`'"])'''),
    # href="/path", src="/path", action="/path", data-url="/path"
    re.compile(r'''((?:href|src|action|data-url|data-src)\s*=\s*['"])(/[^'">\n]+)(['"])'''),
    # url: '/path'
    re.compile(r'''(url\s*:\s*[`'"])([^`'"\n]+)([`'"])'''),
    # $.get('/path'), $.post('/path'), $.ajax({ url: '/path' })
    re.compile(r'''(\$\.\w+\s*\(\s*[`'"])([^`'"\n]+)([`'"])'''),
    # XMLHttpRequest, window.location
    re.compile(r'''((?:window\.location(?:\.href)?\s*=|open\s*\()\s*[`'"])([^`'"\n]+)([`'"])'''),
]


# ─── Substituição em IDs HTML ─────────────────────────────────────────────

def fix_html_ids(content):
    """Reverte acentos dentro de id="..." e name="..." (identificadores DOM)."""
    fixes = 0

    def replace_id(m):
        nonlocal fixes
        prefix = m.group(1)  # id="  or  id='
        value = m.group(2)
        suffix = m.group(3)
        fixed = fix_in_url(value)  # reuse same map
        if fixed != value:
            fixes += 1
        return prefix + fixed + suffix

    # id="value" or id='value'
    content = re.sub(r'''(\bid\s*=\s*['"])([^'"]+)(['"])''', replace_id, content)
    return content, fixes


# ─── Substituição em onclick/event handlers ──────────────────────────────

def fix_event_handlers(content):
    """Reverte acentos em argumentos string de event handlers usados como IDs."""
    fixes = 0

    def replace_handler_arg(m):
        nonlocal fixes
        whole = m.group(0)
        func_call = m.group(1)
        arg = m.group(2)
        fixed = fix_in_url(arg)
        if fixed != arg:
            fixes += 1
            return func_call + fixed + m.group(3)
        return whole

    # mudarTab('histórico') — single-quoted string arg in onclick
    content = re.sub(
        r'''((?:mudarTab|changeTab|selectTab|showTab|openTab)\s*\(\s*')([\w\u00C0-\u017E-]+)(')''',
        replace_handler_arg, content
    )
    content = re.sub(
        r'''((?:mudarTab|changeTab|selectTab|showTab|openTab)\s*\(\s*")([\w\u00C0-\u017E-]+)(")''',
        replace_handler_arg, content
    )
    return content, fixes


# ─── Substituição em nomes de funções/variáveis JS ─────────────────────

# JS identifiers that got accented - revert them
JS_IDENT_FIXES = [
    # function names
    ('carregarHistórico',    'carregarHistorico'),
    ('carregarNotificações', 'carregarNotificacoes'),
    ('carregarRelação',      'carregarRelacao'),
    ('carregarConfigurações','carregarConfiguracoes'),
    ('atualizarNotificações','atualizarNotificacoes'),
    ('carregarProdução',     'carregarProducao'),
    ('carregarOperações',    'carregarOperacoes'),
    ('carregarRelações',     'carregarRelacoes'),
    # Variable/property identifiers in data access
    # These are JS property accesses where the server returns unaccented keys
    ("data.notificações",    "data.notificacoes"),
    ("data.notificação",     "data.notificacao"),
    ("res.notificações",     "res.notificacoes"),
    # Table/element IDs in getElementById
    ("tabelaHistórico",      "tabelaHistorico"),
    ("tabHistórico",         "tabHistorico"),
    ("tabHistórica",         "tabHistorica"),
]


def fix_js_identifiers(content):
    """Reverte nomes de funções/variáveis JS que foram acentuadas."""
    fixes = 0
    for acc, unacc in JS_IDENT_FIXES:
        count = content.count(acc)
        if count > 0:
            content = content.replace(acc, unacc)
            fixes += count
    return content, fixes


# ─── Substituição em asset paths (href/src com nomes de arquivo) ─────────

def fix_asset_paths(content):
    """Reverte acentos em nomes de arquivo CSS/JS referenciados."""
    fixes = 0
    # Common broken asset patterns
    asset_fixes = [
        ('popup-confirmação', 'popup-confirmacao'),
        ('popup-confirmaÃ§Ã£o', 'popup-confirmacao'),  # mojibake variant
    ]
    for acc, unacc in asset_fixes:
        count = content.count(acc)
        if count > 0:
            content = content.replace(acc, unacc)
            fixes += count
    return content, fixes


# ─── Pipeline principal ──────────────────────────────────────────────────

def fix_file(filepath):
    """Aplica todas as correções em um arquivo."""
    try:
        content = filepath.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        try:
            content = filepath.read_text(encoding='utf-8-sig')
        except Exception as e:
            print(f"  SKIP (encoding error): {filepath.name}")
            return 0

    original = content
    total = 0

    # 1. Fix URLs in fetch/href/src/action contexts
    for pattern in URL_PATTERNS:
        def replace_url(m, p=pattern):
            prefix = m.group(1)
            url = m.group(2)
            suffix = m.group(3)
            fixed = fix_in_url(url)
            return prefix + fixed + suffix
        content = pattern.sub(replace_url, content)

    # 2. Fix HTML element IDs
    content, n = fix_html_ids(content)
    total += n

    # 3. Fix event handler arguments
    content, n = fix_event_handlers(content)
    total += n

    # 4. Fix JS function/variable identifiers
    content, n = fix_js_identifiers(content)
    total += n

    # 5. Fix asset paths
    content, n = fix_asset_paths(content)
    total += n

    if content != original:
        # Count changed characters
        n_chars = sum(1 for a, b in zip(content, original) if a != b)
        filepath.write_text(content, encoding='utf-8')
        return max(n_chars, total, 1)

    return 0


def main():
    # Collect files
    files = [f for f in BASE.glob('modules/**/*.html') if not should_ignore(str(f))]
    print(f"Arquivos HTML em modules/: {len(files)}")

    changed_files = []
    for f in sorted(files):
        n = fix_file(f)
        if n > 0:
            rel = str(f.relative_to(BASE))
            changed_files.append(rel)
            print(f"  FIXED: {rel}")

    print(f"\nTotal: {len(changed_files)} arquivos corrigidos")


if __name__ == '__main__':
    main()
