#!/usr/bin/env python3
# Fix: IDs com acento em mostrarConfirmação não batem com IDs sem acento no HTML
import sys

path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

replacements = [
    # Fix ID: 'modal-confirmação-custom' → 'modal-confirmacao-custom'
    (
        "getElementById('modal-confirm\u00e3\u00e7\u00e3o-custom')".encode('utf-8'),
        b"getElementById('modal-confirmacao-custom')"
    ),
    # Fix ID: 'confirm-título' → 'confirm-titulo'
    (
        "getElementById('confirm-t\u00edtulo')".encode('utf-8'),
        b"getElementById('confirm-titulo')"
    ),
    # Fix property: opcoes.titulo should also read opcoes.título (caller uses accented key)
    # Change: título.textContent = opcoes.titulo || 'Confirmar Ação';
    # To:     título.textContent = opcoes['t\u00edtulo'] || opcoes.titulo || 'Confirmar Ação';
    (
        "titulo\n                    if".encode('utf-8'),
        "titulo\n                    if".encode('utf-8')  # no change to this
    ),
]

changed = 0
for old_bytes, new_bytes in replacements:
    count = raw.count(old_bytes)
    if count > 0:
        print(f'[OK] Found {count}x: {old_bytes[:60]}')
        raw = raw.replace(old_bytes, new_bytes)
        changed += count
    else:
        print(f'[MISS] Not found: {old_bytes[:60]}')

# Also add null guard around título.textContent assignment
# Before: título.textContent = opcoes.titulo || 'Confirmar Ação';
# After:  if (título) título.textContent = opcoes['título'] || opcoes.titulo || 'Confirmar Ação';
old_guard = "            // Configurar textos\n            t\u00edtulo.textContent = opcoes.titulo || 'Confirmar A\u00e7\u00e3o';".encode('utf-8')
new_guard = "            // Configurar textos\n            if (!t\u00edtulo || !modal) { console.warn('[modal-confirmacao] Elementos do modal n\u00e3o encontrados'); return; }\n            t\u00edtulo.textContent = opcoes['\u0074\u00edtulo'] || opcoes.titulo || 'Confirmar A\u00e7\u00e3o';".encode('utf-8')
if old_guard in raw:
    print(f'[OK] Guard: found title assignment')
    raw = raw.replace(old_guard, new_guard)
    changed += 1
else:
    print(f'[MISS] Guard: title assignment not found as expected')
    # try simpler
    old_simple = "t\u00edtulo.textContent = opcoes.titulo".encode('utf-8')
    if old_simple in raw:
        print(f'[OK] Simple guard found')
        raw = raw.replace(
            old_simple,
            "if (t\u00edtulo) t\u00edtulo.textContent = opcoes['t\u00edtulo'] || opcoes.titulo".encode('utf-8')
        )
        changed += 1

print(f'\nTotal changes: {changed}')
with open(path, 'wb') as f:
    f.write(raw)
print('Saved.')
