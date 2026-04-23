import sys
f = open(r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\RH\public\gestao-holerites.html', 'rb').read().decode('utf-8')
lines = f.split('\n')
print('Total lines:', len(lines))
for i, l in enumerate(lines, 1):
    if 'confirm' in l or 'fecharFolha' in l or 'filtro-funcionar' in l or 'modal-t' in l or 'relat' in l.lower():
        print(f'{i}: {l.strip()[:140]}')
