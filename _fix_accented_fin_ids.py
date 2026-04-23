"""Fix mismatched accented getElementById IDs in Financeiro HTML files.
HTML elements use non-accented IDs; JS code uses accented IDs -> null errors.
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))
FIN_PUB = os.path.join(BASE, 'modules', 'Financeiro', 'public')

# Replacements: (accented_id, non_accented_id)
# These are IDs where HTML element uses non-accented but JS uses accented
COMMON_REPLACEMENTS = [
    ("getElementById('modal-título')",         "getElementById('modal-titulo')"),
    ('getElementById("modal-título")',          'getElementById("modal-titulo")'),
    ("getElementById('descrição')",             "getElementById('descricao')"),
    ('getElementById("descrição")',             'getElementById("descricao")'),
    ("getElementById('observações')",           "getElementById('observacoes')"),
    ('getElementById("observações")',           'getElementById("observacoes")'),
    ("getElementById('número-documento')",      "getElementById('numero-documento')"),
    ('getElementById("número-documento")',      'getElementById("numero-documento")'),
    ("getElementById('filtro-período')",        "getElementById('filtro-periodo')"),
    ('getElementById("filtro-período")',        'getElementById("filtro-periodo")'),
]

RECEBER_REPLACEMENTS = COMMON_REPLACEMENTS + [
    ("getElementById('pm-valor-simulação')",    "getElementById('pm-valor-simulacao')"),
    ("getElementById('pm-filtro-módulo')",      "getElementById('pm-filtro-modulo')"),
    ("getElementById('pm-títulos-aberto')",     "getElementById('pm-titulos-aberto')"),
    ("getElementById('pm-resultado-simulação')","getElementById('pm-resultado-simulacao')"),
    ("getElementById('tabela-operações-body-pub')", "getElementById('tabela-operacoes-body-pub')"),
    ("getElementById('fat-edit-observações')",  "getElementById('fat-edit-observacoes')"),
    ("getElementById('op-edit-prorrogação')",   "getElementById('op-edit-prorrogacao')"),
    ("getElementById('op-edit-taxa-período')",  "getElementById('op-edit-taxa-periodo')"),
    ("getElementById('op-edit-qtde-títulos')",  "getElementById('op-edit-qtde-titulos')"),
    ("getElementById('modalEditarOperação')",   "getElementById('modalEditarOperacao')"),
    # Also fix querySelector for modal overlay
    ("querySelector('.btn-clear-search')",      "querySelector('.btn-clear-search')"),  # no change needed
]

PAGAR_REPLACEMENTS = COMMON_REPLACEMENTS + [
    ("getElementById('view-descrição')",        "getElementById('view-descricao')"),
    ('getElementById("view-descrição")',        'getElementById("view-descricao")'),
    ("getElementById('view-observações')",      "getElementById('view-observacoes')"),
    ('getElementById("view-observações")',      'getElementById("view-observacoes")'),
]


def fix_file(filepath, replacements):
    raw = open(filepath, 'rb').read()
    content = raw.decode('utf-8')
    original = content
    count = 0
    for old, new in replacements:
        if old in content:
            n = content.count(old)
            content = content.replace(old, new)
            count += n
            print(f'  [{n}x] {old!r} -> {new!r}')
    if content != original:
        open(filepath, 'wb').write(content.encode('utf-8'))
        print(f'  => Saved {filepath} ({count} replacements)')
    else:
        print(f'  => No changes needed in {filepath}')


print('=== Fixing contas_receber.html ===')
fix_file(os.path.join(FIN_PUB, 'contas_receber.html'), RECEBER_REPLACEMENTS)

print()
print('=== Fixing contas_pagar.html ===')
fix_file(os.path.join(FIN_PUB, 'contas_pagar.html'), PAGAR_REPLACEMENTS)

print()
print('Done.')
