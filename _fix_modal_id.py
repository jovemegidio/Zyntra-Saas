#!/usr/bin/env python3
# Fix modal-confirmacao ID mismatch
path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# ID with accent (UTF-8): modal-confirm + ação + -custom
# ação = \xc3\xa7\xc3\xa3o
old_id = b"getElementById('modal-confirma\xc3\xa7\xc3\xa3o-custom')"
new_id = b"getElementById('modal-confirmacao-custom')"
count = raw.count(old_id)
print(f'modal id found: {count}')
raw = raw.replace(old_id, new_id)

# Also fix: modal.classList.add/remove calls that use the accented ID  
old_cls1 = b"getElementById('modal-confirma\xc3\xa7\xc3\xa3o-custom').classList"
new_cls1 = b"getElementById('modal-confirmacao-custom').classList"
count2 = raw.count(old_cls1)
print(f'classList calls found: {count2}')
raw = raw.replace(old_cls1, new_cls1)

with open(path, 'wb') as f:
    f.write(raw)
print('Saved.')
