import re
path = r'G:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\contas-receber.html'
with open(path,'r',encoding='utf-8',errors='replace') as f:
    lines = f.readlines()
print(f'Total lines: {len(lines)}')
keywords = ['banco','conta corrente','contabancaria','conta_bancaria','selecione']
for i,l in enumerate(lines,1):
    ll = l.lower()
    if any(x in ll for x in keywords):
        print(f'{i}: {l.rstrip()[:220]}')
