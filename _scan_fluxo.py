f = open(r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\public\fluxo_caixa.html', 'rb')
raw = f.read(); f.close()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
print('Total lines:', len(lines))

kws = ['conta', 'modal', 'carrega', 'select', 'option', 'categoria', 'textContent', 'carregarDados']
hits = []
for i,l in enumerate(lines,1):
    ll = l.lower()
    if any(k in ll for k in kws):
        hits.append(f'L{i}: {l.rstrip()[:130]}')

for h in hits[:120]:
    print(h)
