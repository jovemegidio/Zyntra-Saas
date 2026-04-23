path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\js\pcp-modals.js'
with open(path,'rb') as f:
    d = f.read().decode('utf-8', errors='replace')
lines = d.split('\n')
# Find abrirModalMovimentacao function
print('--- abrirModalMovimentacao ---')
for i, line in enumerate(lines):
    if 'function abrirModalMovimentacao' in line or 'abrirSaidaRapida' in line or 'abrirEntradaRapida' in line:
        start = max(0, i-1)
        end = min(len(lines), i+5)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()[:150]}')
        print('---')

# Find what fecharModalMovimentacao is assigned to window
print('\n--- window.fecharModalMovimentacao ---')
for i, line in enumerate(lines):
    if 'window.fecharModalMovimentacao' in line or 'window.abrirModalMovimentacao' in line or 'window.abrirSaidaRapida' in line or 'window.abrirEntradaRapida' in line or 'window.registrarSaidaView' in line:
        print(f'L{i+1}: {line.strip()}')

# Also check what functions are missing from window exports
print('\n--- all window. exports ---')
for i, line in enumerate(lines):
    if line.strip().startswith('window.'):
        print(f'L{i+1}: {line.strip()}')
