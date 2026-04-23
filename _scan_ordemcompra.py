import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Diagnose ordem-compra.html - fornecedor + comprador
f1 = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f1, 'rb') as f:
    raw1 = f.read()
text1 = raw1.decode('utf-8', errors='replace')

# Find fornecedor section
hits_forn = re.findall(r'(?:fornecedor|Fornecedor)[^\n]{0,200}', text1)
print('=== Fornecedor occurrences (sample) ===')
for h in hits_forn[:8]:
    print(' ', h[:150])

# Find comprador section
hits_comp = re.findall(r'(?:comprador|Comprador|role=comprador)[^\n]{0,200}', text1)
print('\n=== Comprador occurrences (sample) ===')
for h in hits_comp[:8]:
    print(' ', h[:150])

# Find the carregarCompradores / fetch usuários
hits_api = re.findall(r'(?:api/usuario|role=|comprador)[^\n]{0,200}', text1)
print('\n=== API usuario calls ===')
for h in hits_api[:10]:
    print(' ', h[:150])

print('\nSize:', len(raw1))
