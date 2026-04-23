import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# 1. Check offline-sync-manager.js for mcvs
f_osm = os.path.join(BASE, 'public', 'js', 'offline-sync-manager.js')
if not os.path.isfile(f_osm):
    # Search for it
    for root, dirs, files in os.walk(os.path.join(BASE, 'public')):
        for fname in files:
            if 'offline' in fname.lower() or 'sync' in fname.lower():
                print(f'Found: {os.path.join(root, fname)}')
    for root, dirs, files in os.walk(BASE):
        for fname in files:
            if 'offline-sync' in fname.lower():
                print(f'Found: {os.path.join(root, fname)}')
else:
    with open(f_osm, 'rb') as f:
        txt = f.read().decode('utf-8', errors='replace')
    print('offline-sync-manager.js mcvs:')
    for i, line in enumerate(txt.split('\n'), 1):
        if 'mcvs' in line.lower():
            print(f'L{i}: {line.strip()[:120]}')

# 2. Check pcp-routes.js for apontamentos routes
f_pcp = os.path.join(BASE, 'routes', 'pcp-routes.js')
with open(f_pcp, 'rb') as f:
    txt_pcp = f.read().decode('utf-8', errors='replace')
print('\n=== pcp-routes.js apontamentos routes ===')
for i, line in enumerate(txt_pcp.split('\n'), 1):
    if 'apontamento' in line.lower() and ('get(' in line.lower() or 'post(' in line.lower() or 'router.' in line.lower()):
        print(f'L{i}: {line.strip()[:120]}')

# 3. Check relatórios file existence
f_rel1 = os.path.join(BASE, 'modules', 'PCP', 'pages', 'relatorios.html')
f_rel2 = os.path.join(BASE, 'modules', 'PCP', 'pages', 'relat\u00f3rios.html')
print(f'\nrelatorios.html (no accent) exists: {os.path.isfile(f_rel1)}')
print(f'relatórios.html (accent) exists: {os.path.isfile(f_rel2)}')
# List PCP pages
print('\nPCP/pages files:')
pcp_pages = os.path.join(BASE, 'modules', 'PCP', 'pages')
for f in sorted(os.listdir(pcp_pages)):
    print(f'  {f}')
