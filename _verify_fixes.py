import os

# Check 1: Logística - observacoes fix
path1 = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path1, 'rb') as f:
    r1 = f.read()
print("=== LOGISTICA ===")
print("exp-observacoes (correct):", b"getElementById('exp-observacoes')" in r1)
print("exp-observações (bug):", "getElementById('exp-observações')".encode('utf-8') in r1)
print("observacoes: key (correct):", b'observacoes: document' in r1)
print("observações: key (bug):", 'observações: document'.encode('utf-8') in r1)

# Check 2: Faturamento backend
path2 = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\api\faturamento.js'
with open(path2, 'rb') as f:
    r2 = f.read()
print("\n=== FATURAMENTO BACKEND ===")
print("VALIDACAO_ERRO 400:", b'VALIDACAO_ERRO' in r2)
print("não encontrado check:", 'não encontrado'.encode('utf-8') in r2)

# Check 3: Faturamento HTML modal
path3 = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path3, 'rb') as f:
    r3 = f.read()
print("\n=== FATURAMENTO HTML ===")
print("modal-content modal-small:", b'modal-content modal-small' in r3)
print("modal-header orange:", b'modal-header orange' in r3)
print("btn-modal-save:", b'btn-modal-save' in r3)
print("btn-modal-cancel:", b'btn-modal-cancel' in r3)
print("CSS f97316:", b'f97316' in r3)
print("Old dark modal:", b'<div class="modal" style="max-width:600px;">' in r3)
