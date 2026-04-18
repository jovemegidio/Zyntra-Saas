#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-mojibake-fast.py - Corrige apenas mojibake (Á³→ó, Á£→ã, etc.) nos HTMLs do Financeiro e outros módulos.
Script focado e rápido, sem SPELLING_FIXES.
"""
import sys
from pathlib import Path

BASE = Path(__file__).parent

# Padrão A: C3 81 C2 XX → C3 XX  (Á + Latin char → accentuated char)
MOJIBAKE_MAP = [
    ('\u00c1\u00a3', '\u00e3'),   # Á£ → ã
    ('\u00c1\u00a7', '\u00e7'),   # Á§ → ç
    ('\u00c1\u00b3', '\u00f3'),   # Á³ → ó
    ('\u00c1\u00ba', '\u00fa'),   # Áº → ú
    ('\u00c1\u00aa', '\u00ea'),   # Áª → ê
    ('\u00c1\u00b4', '\u00f4'),   # Á´ → ô
    ('\u00c1\u00b5', '\u00f5'),   # Áµ → õ
    ('\u00c1\u00a1', '\u00e1'),   # Á¡ → á
    ('\u00c1\u00a2', '\u00e2'),   # Á¢ → â
    ('\u00c1\u00a9', '\u00e9'),   # Á© → é
    ('\u00c1\u00ad', '\u00ed'),   # Á­ → í
    ('\u00c1\u00a0', '\u00e0'),   # Á  → à
    ('\u00c1\u00a8', '\u00e8'),   # Á¨ → è
    ('\u00c1\u00ac', '\u00ec'),   # Á¬ → ì
    ('\u00c1\u00ae', '\u00ee'),   # Á® → î
    ('\u00c1\u00b9', '\u00f9'),   # Á¹ → ù
    ('\u00c1\u00bb', '\u00fb'),   # Á» → û
    ('\u00c1\u00bc', '\u00fc'),   # Á¼ → ü
    ('\u00c1\u00b1', '\u00f1'),   # Á± → ñ
    # Maiúsculas — segundo char é C1 control:
    ('\u00c1\x87', '\u00c7'),     # Á\x87 → Ç
    ('\u00c1\x89', '\u00c9'),     # Á\x89 → É
    ('\u00c1\x8a', '\u00ca'),     # Á\x8a → Ê
    ('\u00c1\x93', '\u00d3'),     # Á\x93 → Ó
    ('\u00c1\x94', '\u00d4'),     # Á\x94 → Ô
    ('\u00c1\x95', '\u00d5'),     # Á\x95 → Õ
    ('\u00c1\x9a', '\u00da'),     # Á\x9a → Ú
    ('\u00c1\x82', '\u00c2'),     # Á\x82 → Â
    ('\u00c1\x83', '\u00c3'),     # Á\x83 → Ã
    ('\u00c1\x81', '\u00c1'),     # Á\x81 → Á  (auto-ref, ÚLTIMO)
    # Padrão B: Ã+char clássico (double-encoding, precaução):
    ('\u00c3\u00a3', '\u00e3'),   # Ã£ → ã
    ('\u00c3\u00a7', '\u00e7'),   # Ã§ → ç
    ('\u00c3\u00b3', '\u00f3'),   # Ã³ → ó
    ('\u00c3\u00ba', '\u00fa'),   # Ãº → ú
    ('\u00c3\u00aa', '\u00ea'),   # Ãª → ê
    ('\u00c3\u00b4', '\u00f4'),   # Ã´ → ô
    ('\u00c3\u00b5', '\u00f5'),   # Ãµ → õ
    ('\u00c3\u00a1', '\u00e1'),   # Ã¡ → á
    ('\u00c3\u00a2', '\u00e2'),   # Ã¢ → â
    ('\u00c3\u00a9', '\u00e9'),   # Ã© → é
    ('\u00c3\u00ad', '\u00ed'),   # Ã­ → í
]

IGNORE_PATTERNS = [
    'node_modules', 'backup', '_backup', 'public_backup',
    '.bak', '_old', '_legacy', '-old', 'legacy',
    'screenshots', 'lcov-report', 'Financeiro_backup',
]

def should_ignore(path_str):
    path_lower = path_str.lower().replace('\\', '/')
    return any(p in path_lower for p in IGNORE_PATTERNS)

def fix_file(path):
    try:
        content = path.read_text(encoding='utf-8', errors='replace')
        original = content
        count = 0
        for wrong, right in MOJIBAKE_MAP:
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

def collect_html_files():
    files = []
    modules_dir = BASE / 'modules'
    if not modules_dir.exists():
        return files
    for mod in modules_dir.iterdir():
        if not mod.is_dir():
            continue
        if should_ignore(str(mod)):
            continue
        # 1-level HTMLs in module root
        for f in mod.glob('*.html'):
            if not should_ignore(str(f)):
                files.append(f)
        # HTMLs in direct subdirs (public, pages, etc.) — not recursive
        for sub in mod.iterdir():
            if not sub.is_dir() or should_ignore(str(sub)):
                continue
            for f in sub.glob('*.html'):
                if not should_ignore(str(f)):
                    files.append(f)
    # Also public/ at root
    public = BASE / 'public'
    if public.exists():
        for f in public.glob('*.html'):
            if not should_ignore(str(f)):
                files.append(f)
    # Deduplicate
    seen = set()
    result = []
    for f in files:
        k = str(f).lower()
        if k not in seen:
            seen.add(k)
            result.append(f)
    return result

def main():
    print('=== fix-mojibake-fast.py ===', flush=True)
    files = collect_html_files()
    print(f'Arquivos: {len(files)}', flush=True)
    
    modified = 0
    total_fixes = 0
    for f in files:
        n = fix_file(f)
        if n > 0:
            modified += 1
            total_fixes += n
            rel = str(f.relative_to(BASE))
            print(f'  ✅ {rel} [{n} correções]', flush=True)
    
    print(f'\nRESULTADO: {modified} arquivos corrigidos, {total_fixes} substituições total', flush=True)

if __name__ == '__main__':
    main()
