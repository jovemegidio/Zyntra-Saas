"""Scan PCP module for encoding issues (mojibake, missing charset, Content-Type)."""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

# Mojibake: UTF-8 bytes misread as latin-1 then stored
# e.g. ã (U+00E3) → C3 A3 → Ã£ in latin-1
MOJIBAKE_RE = re.compile(
    r'\xc3[\xa0-\xbf]'  # Ã followed by second byte range
    r'|\xc2[\x80-\xbf]' # Â followed by second byte range  
    r'|Ã£|Ã§|Ã©|Ã³|Ã¡|Ã­|Ãª|Ã´|Ã¢|Ãº|Â°|Â·|Âª|Âº'
    r'|├|┬'             # cp437/cp850 mojibake variants
)

HTML_FILES = [
    'modules/PCP/index.html',
    'modules/PCP/apontamentos.html',
    'modules/PCP/gerar_ordem_excel.html',
    'modules/PCP/templates/pcp-modals.html',
    'modules/PCP/relatorios-apontamentos.html',
    'modules/PCP/login.html',
    'modules/PCP/ordens-producao.html',
    'modules/PCP/modal-produto-enriquecido.html',
    'modules/PCP/modal-produto-rico.html',
    'modules/PCP/modal_nova_ordem_saas.html',
    'modules/PCP/sistema_funcional.html',
    'modules/PCP/sistema_corrigido_final.html',
    'modules/PCP/catalogo_produtos_gtin_2025_10_06.html',
    'modules/PCP/diagnostico_sistema.html',
    'modules/PCP/demonstracao_completa.html',
    'modules/PCP/pcp_module_reference.html',
    'modules/PCP/PATCH_INDEX_HTML.html',
    'modules/PCP/INSTRUCOES_MODAL_NOVO.html',
    'modules/PCP/limpar_cache.html',
    'modules/PCP/index_new.html',
]

JS_FILES = [
    'modules/PCP/server.js',
    'routes/pcp-routes.js',
    'routes/pcp/configuracoes-routes.js',
    'routes/pcp/clientes-routes.js',
    'routes/pcp/print-routes.js',
    'routes/pcp/templates-routes.js',
    'routes/pcp/diario-producao-routes.js',
    'routes/pcp/relatorios.js',
]

XSL_FILES = [
    'modules/PCP/ordem-producao-fo.xsl',
]

ALL_FILES = HTML_FILES + JS_FILES + XSL_FILES

print("=" * 70)
print("  ENCODING AUDIT - PCP MODULE")
print("=" * 70)

# 1) MOJIBAKE SCAN
print("\n[1] MOJIBAKE SCAN (broken encoding)")
print("-" * 50)
mojibake_found = {}
for rel in ALL_FILES:
    fp = os.path.join(BASE, rel)
    if not os.path.exists(fp):
        continue
    try:
        # Read as raw bytes first, then try latin-1 to see mojibake
        with open(fp, 'rb') as f:
            raw = f.read()
        # Also read as utf-8 for proper check
        text_utf8 = raw.decode('utf-8', errors='replace')
        text_latin1 = raw.decode('latin-1', errors='replace')
        
        for i, line in enumerate(text_utf8.split('\n'), 1):
            if MOJIBAKE_RE.search(line):
                if rel not in mojibake_found:
                    mojibake_found[rel] = []
                # Extract the specific broken chars
                matches = MOJIBAKE_RE.findall(line)
                mojibake_found[rel].append((i, matches, line.strip()[:150]))
    except Exception as e:
        print(f"  ERROR: {rel}: {e}")

if mojibake_found:
    for f, entries in mojibake_found.items():
        print(f"\n  FILE: {f}")
        for lineno, matches, snippet in entries[:10]:  # limit
            print(f"    L{lineno}: chars={matches}")
            print(f"           {snippet[:120]}")
        if len(entries) > 10:
            print(f"    ... and {len(entries)-10} more occurrences")
else:
    print("  OK - No mojibake found in scanned files.")

# 2) CHARSET CHECK for HTML files
print("\n[2] HTML CHARSET DECLARATION CHECK")
print("-" * 50)
charset_re = re.compile(r'<meta\s+charset\s*=\s*["\']?UTF-8["\']?\s*/?\s*>', re.IGNORECASE)
missing_charset = []
for rel in HTML_FILES:
    fp = os.path.join(BASE, rel)
    if not os.path.exists(fp):
        print(f"  SKIP (not found): {rel}")
        continue
    try:
        with open(fp, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        # Check first 2000 chars (should be in <head>)
        head_section = content[:3000]
        if not charset_re.search(head_section):
            # Also check for http-equiv content-type
            http_equiv = re.search(r'<meta\s+http-equiv\s*=\s*["\']?Content-Type["\']?\s+content\s*=\s*["\']?text/html;\s*charset=utf-8', head_section, re.IGNORECASE)
            if not http_equiv:
                missing_charset.append(rel)
                print(f"  MISSING: {rel}")
            else:
                print(f"  OK (http-equiv): {rel}")
        else:
            print(f"  OK: {rel}")
    except Exception as e:
        print(f"  ERROR: {rel}: {e}")

# 3) Content-Type CHECK for JS route files
print("\n[3] CONTENT-TYPE CHARSET CHECK (route handlers)")
print("-" * 50)
ct_re = re.compile(r"Content-Type['\"]?\s*,\s*['\"]text/(html|plain|csv)['\"]", re.IGNORECASE)
ct_utf8_re = re.compile(r"Content-Type['\"]?\s*,\s*['\"]text/(html|plain|csv);\s*charset=utf-?8['\"]", re.IGNORECASE)
for rel in JS_FILES:
    fp = os.path.join(BASE, rel)
    if not os.path.exists(fp):
        continue
    try:
        with open(fp, 'r', encoding='utf-8', errors='replace') as f:
            for i, line in enumerate(f, 1):
                if 'Content-Type' in line and ('text/html' in line or 'text/plain' in line or 'text/csv' in line):
                    has_charset = 'charset' in line.lower()
                    status = "OK" if has_charset else "MISSING charset"
                    print(f"  {status}: {rel}:{i}")
                    print(f"    {line.strip()[:120]}")
    except Exception as e:
        print(f"  ERROR: {rel}: {e}")

# 4) XSL encoding check
print("\n[4] XSL-FO TEMPLATE ENCODING CHECK")
print("-" * 50)
for rel in XSL_FILES:
    fp = os.path.join(BASE, rel)
    if not os.path.exists(fp):
        print(f"  SKIP (not found): {rel}")
        continue
    try:
        with open(fp, 'rb') as f:
            first_bytes = f.read(200)
        has_xml_utf8 = b'encoding="UTF-8"' in first_bytes or b"encoding='UTF-8'" in first_bytes
        print(f"  {'OK' if has_xml_utf8 else 'MISSING'}: XML declaration encoding=UTF-8 in {rel}")
        
        with open(fp, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        # Check for mojibake in XSL content
        moji_lines = []
        for i, line in enumerate(content.split('\n'), 1):
            if MOJIBAKE_RE.search(line):
                moji_lines.append((i, line.strip()[:120]))
        if moji_lines:
            print(f"  MOJIBAKE in {rel}:")
            for ln, snip in moji_lines[:5]:
                print(f"    L{ln}: {snip}")
        else:
            print(f"  OK: No mojibake in {rel}")
    except Exception as e:
        print(f"  ERROR: {rel}: {e}")

# 5) Summary
print("\n" + "=" * 70)
print("  SUMMARY")
print("=" * 70)
total_mojibake = sum(len(v) for v in mojibake_found.values())
print(f"  Mojibake occurrences: {total_mojibake} across {len(mojibake_found)} files")
print(f"  HTML files missing charset: {len(missing_charset)}")
if missing_charset:
    for f in missing_charset:
        print(f"    - {f}")
print(f"  Total files scanned: {len([f for f in ALL_FILES if os.path.exists(os.path.join(BASE, f))])}")
