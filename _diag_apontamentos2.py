import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Find the mcvs route in pcp-routes.js
f_pcp = os.path.join(BASE, 'routes', 'pcp-routes.js')
with open(f_pcp, 'rb') as f:
    raw = f.read()
text = raw.decode('utf-8', errors='replace')
lines = text.split('\n')
print('=== mcvs route in pcp-routes.js ===')
for i, line in enumerate(lines, 1):
    if 'mcvs' in line.lower():
        print(f'L{i}: {line.rstrip()[:120]}')
        # print surrounding 5 lines
        for j in range(max(0,i-3), min(len(lines), i+20)):
            print(f'  L{j+1}: {lines[j].rstrip()[:120]}')
        break

# 2. Check in all routes for mcvs
print('\n=== mcvs in all route files ===')
for fname in os.listdir(os.path.join(BASE, 'routes')):
    fp = os.path.join(BASE, 'routes', fname)
    if not os.path.isfile(fp): continue
    try:
        with open(fp, 'rb') as f:
            txt = f.read().decode('utf-8', errors='replace')
        if 'mcvs' in txt.lower():
            for i, line in enumerate(txt.split('\n'), 1):
                if 'mcvs' in line.lower():
                    print(f'{fname} L{i}: {line.strip()[:120]}')
    except: pass

# 3. Check apontamentos.html for mcvs calls
f_ap = os.path.join(BASE, 'modules', 'PCP', 'apontamentos.html')
with open(f_ap, 'rb') as f:
    raw_ap = f.read()
text_ap = raw_ap.decode('utf-8', errors='replace')
print('\n=== mcvs in apontamentos.html ===')
for i, line in enumerate(text_ap.split('\n'), 1):
    if 'mcvs' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')
