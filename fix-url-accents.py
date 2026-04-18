#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-url-accents.py - Reverte acentos introduzidos erroneamente em URLs de API
e caminhos de assets (href, src, fetch, import) nos arquivos HTML de modules/.

Problemas confirmados:
  - /api/vendas/condições-pagamento  → /api/vendas/condicoes-pagamento
  - /css/popup-confirmação.css       → /css/popup-confirmacao.css
  - /js/popup-confirmação.js         → /js/popup-confirmacao.js
  - Outros padrões de URL com acento detectados dinamicamente.

Estratégia: usa regex para identificar contextos de URL (fetch, href, src,
action, import) e dentro dessas strings verifica/reverte acentos específicos.
"""

import re
import glob
from pathlib import Path

BASE = Path(__file__).parent

# Substituições diretas em contextos de URL/path.
# Pares (texto_com_acento → texto_sem_acento) para aplicar DENTRO de URLs.
URL_FIXES = [
    # API routes
    ('condições-pagamento',   'condicoes-pagamento'),
    ('configurações-',        'configuracoes-'),
    ('operações-',            'operacoes-'),
    # Asset paths (css/js filenames)
    ('popup-confirmação',     'popup-confirmacao'),
    ('confirmação.css',       'confirmacao.css'),
    ('confirmação.js',        'confirmacao.js'),
    # Other common route patterns that could be broken
    ('módulos/',              'modulos/'),
    ('módulo/',               'modulo/'),
    ('número/',               'numero/'),
    ('código/',               'codigo/'),
    ('período/',              'periodo/'),
    ('histórico/',            'historico/'),
    ('relatório/',            'relatorio/'),
    ('produção/',             'producao/'),
    ('configuração/',         'configuracao/'),
    ('operação/',             'operacao/'),
    ('descrição/',            'descricao/'),
    ('título/',               'titulo/'),
    ('funcionário/',          'funcionario/'),
    ('veículo/',              'veiculo/'),
]

# Regex para capturar conteúdo dentro de strings de URL:
# fetch('...'), fetch("..."), href="...", src="...", href='...', src='...',
# action="...", action='...', url: '...', url: "..."
URL_CONTEXT_PATTERNS = [
    # fetch('/api/...')  fetch("/api/...")
    re.compile(r'''(fetch\s*\(\s*['"`])([^'"`\n]+)(['"`])'''),
    # href="/path", src="/path", action="/path"
    re.compile(r'''((?:href|src|action|data-src)\s*=\s*['"])([^'">\n]+)(['"])'''),
    # url: '/path', url: "/path"
    re.compile(r'''(url\s*:\s*['"`])([^'"`\n]+)(['"`])'''),
    # XMLHttpRequest.open(method, url), $.get('/path'), $.post('/path')
    re.compile(r'''(\$\.(?:get|post|ajax)\s*\(\s*['"])([^'">\n]+)(['"])'''),
    # new URL('/path')
    re.compile(r'''(new\s+URL\s*\(\s*['"])([^'">\n]+)(['"])'''),
    # window.location = '/path'
    re.compile(r'''(window\.location(?:\.href)?\s*=\s*['"])([^'">\n]+)(['"])'''),
]

IGNORE = ['backup', '_backup', '_old', 'node_modules', 'Financeiro_backup',
          'legacy', 'screenshots', 'Base', '.git']


def should_ignore(path_str):
    path_lower = path_str.lower().replace('\\', '/')
    return any(p.lower() in path_lower for p in IGNORE)


def fix_url_value(url_text):
    """Aplica os URL_FIXES em um trecho de URL."""
    result = url_text
    for accented, unaccented in URL_FIXES:
        result = result.replace(accented, unaccented)
    return result


def fix_file(filepath):
    """Processa um arquivo HTML, revertendo acentos em URLs."""
    try:
        content = filepath.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        try:
            content = filepath.read_text(encoding='utf-8-sig')
        except Exception:
            return 0

    original = content
    total_replacements = 0

    # Aplica cada padrão de URL
    for pattern in URL_CONTEXT_PATTERNS:
        def replace_url(m):
            nonlocal total_replacements
            prefix = m.group(1)
            url = m.group(2)
            suffix = m.group(3)
            fixed = fix_url_value(url)
            if fixed != url:
                total_replacements += url.count('') - 1  # count changes
                # Count actual differences
                return prefix + fixed + suffix
            return m.group(0)

        content = pattern.sub(replace_url, content)

    if content != original:
        # Count actual chars changed (approximate)
        changes = sum(1 for a, b in zip(original, content) if a != b)
        filepath.write_text(content, encoding='utf-8')
        return max(changes, 1)

    return 0


def main():
    files = []
    for pattern in ['modules/**/*.html']:
        for f in BASE.glob(pattern):
            if not should_ignore(str(f)):
                files.append(f)

    print(f"Arquivos para processar: {len(files)}")

    changed = 0
    total_changes = 0

    for f in sorted(files):
        n = fix_file(f)
        if n > 0:
            rel = str(f.relative_to(BASE))
            print(f"  FIXED: {rel}")
            changed += 1
            total_changes += n

    print(f"\nResultado: {changed} arquivos corrigidos")
    print("Padrões aplicados:")
    for accented, unaccented in URL_FIXES:
        print(f"  '{accented}' → '{unaccented}'")


if __name__ == '__main__':
    main()
