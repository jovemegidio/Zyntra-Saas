path = r'G:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\server.js'
with open(path,'r',encoding='utf-8',errors='replace') as f:
    lines = f.readlines()
print(f'Total lines: {len(lines)}')
for i,l in enumerate(lines,1):
    if 'contas-bancarias' in l or 'contasBancarias' in l or 'conta_banc' in l.lower():
        print(f'{i}: {l.rstrip()[:200]}')
