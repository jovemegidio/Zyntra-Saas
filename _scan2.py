import re

# Scan apontamentos.html
data = open('modules/PCP/apontamentos.html','rb').read().decode('utf-8','replace')
lines = data.split('\n')
print("=== getElementById / innerText em apontamentos.html ===")
for i,l in enumerate(lines,1):
    if 'getElementById' in l or 'innerText' in l:
        print(f'{i}: {l.rstrip()[:130]}')

# Scan qualidade.html
print("\n=== getElementById / textContent com acento em qualidade.html ===")
data2 = open('modules/PCP/pages/qualidade.html','rb').read().decode('utf-8','replace')
lines2 = data2.split('\n')
for i,l in enumerate(lines2,1):
    if 'getElementById' in l and any(c in l for c in 'áéíóúàãõâêîôûü'):
        print(f'{i}: {l.rstrip()[:130]}')

# Scan qualidade.html - button style
print("\n=== btn-nova-premium em qualidade.html ===")
for i,l in enumerate(lines2,1):
    if 'btn-nova' in l or 'Nova Insp' in l:
        print(f'{i}: {l.rstrip()[:130]}')
