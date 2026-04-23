path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\prospeccao.html'
with open(path, 'rb') as f:
    raw = f.read()
idx = raw.find(b'negociacao_leads')
while idx >= 0:
    print(repr(raw[idx-30:idx+60]))
    idx = raw.find(b'negociacao_leads', idx+1)
