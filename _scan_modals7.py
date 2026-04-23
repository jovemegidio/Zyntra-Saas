path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')

# Find DOMContentLoaded or init or document.body.insertAdjacentHTML
print('--- DOMContentLoaded / init / inject ---')
for i, line in enumerate(lines):
    ll = line.lower()
    if 'domcontentloaded' in ll or 'insertadjacenthtml' in ll or 'document.body' in ll or 'inject' in ll or '_initModais' in line or 'inicializar' in ll:
        print(f'L{i+1}: {line.strip()[:200]}')
