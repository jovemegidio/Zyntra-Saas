path = r'G:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\bancos.html'
with open(path,'r',encoding='utf-8',errors='replace') as f:
    lines = f.readlines()
print(f'Total lines: {len(lines)}')
for i,l in enumerate(lines,1):
    if any(x in l.lower() for x in ['/api/', 'fetch(', 'banco', 'nome']):
        print(f'{i}: {l.rstrip()[:200]}')
