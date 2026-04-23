path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\dashboard-admin.html'
with open(path, 'rb') as f: v = f.read()
print('periodoAtual sem acento:', b'const periodoAtual' in v)
print('periodoStr sem acento:', b'const periodoStr' in v)
print('periodo: periodoStr:', b'periodo: periodoStr,' in v)
lig1 = b"getElementById('ligacoesContent')"
lig2 = b"getElementById('ligacoesTableBody')"
print('ligacoesContent:', lig1 in v)
print('ligacoesTableBody:', lig2 in v)
print('modal-content modal-small:', b'modal-content modal-small' in v)
print('modal-header orange:', b'modal-header orange' in v)
print('btn-modal-save:', b'btn-modal-save' in v)
print('modal-box css gone:', b'.modal-box' not in v)
