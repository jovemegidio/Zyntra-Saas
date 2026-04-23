data = open('modules/PCP/apontamentos.html','rb').read().decode('utf-8','replace')
lines = data.split('\n')
print("=== getElementById calls ===")
for i,l in enumerate(lines,1):
    if 'getElementById' in l or 'innerText' in l:
        print(f'{i}: {l.rstrip()[:130]}')
