path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\prospeccao.html'
with open(path, 'rb') as f:
    raw = f.read()
idx = raw.find(b'metric-negociacao')
if idx >= 0:
    print(repr(raw[idx:idx+120]))
else:
    print("not found")
# Also check negociacao_leads
idx2 = raw.find(b'negociacao_leads')
print("negociacao_leads found:", idx2)
# Check original variable 
neg_var = 'negociação'.encode('utf-8')
idx3 = raw.find(b'metric-negociacao')
context = raw[idx3-10:idx3+100]
print(repr(context))
