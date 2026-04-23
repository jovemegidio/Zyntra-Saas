#!/usr/bin/env python3
# Fix IDs acentuados em apontamentos.html e qualidade.html + tamanho botão qualidade.html
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def fix_file(rel_path, replacements):
    path = os.path.join(BASE, rel_path)
    data = open(path, 'rb').read()
    original = data
    for old, new in replacements:
        old_b = old.encode('utf-8')
        new_b = new.encode('utf-8')
        count = data.count(old_b)
        if count == 0:
            print(f'  [WARN] nao encontrado: {old!r}')
        else:
            data = data.replace(old_b, new_b)
            print(f'  [{count}x] {old!r} -> {new!r}')
    if data != original:
        open(path, 'wb').write(data)
        print(f'  SALVO: {rel_path}')
    else:
        print(f'  SEM MUDANCAS: {rel_path}')

# --- apontamentos.html ---
print('\n=== apontamentos.html ===')
fix_file('modules/PCP/apontamentos.html', [
    ("getElementById('hist\u00f3ricoLista')", "getElementById('historicoLista')"),
])

# --- qualidade.html ---
print('\n=== qualidade.html ===')
fix_file('modules/PCP/pages/qualidade.html', [
    # CSS: reduzir tamanho do botao btn-nova-premium
    ('padding: 10px 20px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 10px; font-size: 13px;',
     'padding: 7px 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 8px; font-size: 12px;'),
    # getElementById com acento titulo modal insp
    ("getElementById('modal-insp-t\u00edtulo')", "getElementById('modal-insp-titulo')"),
    # getElementById com acento titulo modal nc
    ("getElementById('modal-nc-t\u00edtulo')", "getElementById('modal-nc-titulo')"),
    # getElementById com acento titulo modal ck
    ("getElementById('modal-ck-t\u00edtulo')", "getElementById('modal-ck-titulo')"),
    # getElementById nc-descricao e nc-acao com acento
    ("getElementById('nc-descri\u00e7\u00e3o')", "getElementById('nc-descricao')"),
    ("getElementById('nc-a\u00e7\u00e3o')", "getElementById('nc-acao')"),
])

print('\nFim.')
