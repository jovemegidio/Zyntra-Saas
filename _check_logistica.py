path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find error messages
for kw in [b'Erro ao gerar', b'Erro de conex', b'nfe\|NF-e', b'salvar', b'expedic', b'Nova Expedi']:
    idx = raw.find(kw)
    if idx >= 0:
        print(f"\n=== {kw} at byte {idx} ===")
        print(repr(raw[idx:idx+200]))
