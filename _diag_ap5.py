import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Find offline-sync-manager.js
print('=== offline-sync-manager.js locations ===')
for root, dirs, files in os.walk(BASE):
    # skip node_modules and .git
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '.venvv', '__pycache__')]
    for fname in files:
        if 'offline-sync' in fname.lower():
            fp = os.path.join(root, fname)
            print(f'Found: {fp}')
            with open(fp, 'rb') as f:
                txt = f.read().decode('utf-8', errors='replace')
            for i, line in enumerate(txt.split('\n'), 1):
                if 'mcvs' in line.lower():
                    print(f'  L{i}: {line.strip()[:120]}')
            # Also search for apontamentos
            for i, line in enumerate(txt.split('\n'), 1):
                if 'apontamentos' in line.lower() and ('fetch' in line.lower() or 'api/' in line.lower()):
                    print(f'  L{i}: {line.strip()[:120]}')

# Find relatórios link with accent in PCP files
print('\n=== relatórios.html accent links in PCP ===')
for root, dirs, files in os.walk(os.path.join(BASE, 'modules', 'PCP')):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
    for fname in files:
        if fname.endswith('.html') or fname.endswith('.js'):
            fp = os.path.join(root, fname)
            try:
                with open(fp, 'rb') as f:
                    raw = f.read()
                txt = raw.decode('utf-8', errors='replace')
                if 'relat\u00f3rios' in txt.lower() or 'relat%' in txt.lower():
                    for i, line in enumerate(txt.split('\n'), 1):
                        if 'relat\u00f3' in line.lower() or 'relat%' in line.lower():
                            print(f'{fname} L{i}: {line.strip()[:120]}')
            except: pass
