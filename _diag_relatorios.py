import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Find all relatórios links in PCP modules
print('=== Todas referências a relat em PCP HTMLs ===')
for root, dirs, files in os.walk(os.path.join(BASE, 'modules', 'PCP')):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
    for fname in files:
        if fname.endswith('.html'):
            fp = os.path.join(root, fname)
            try:
                with open(fp, 'rb') as f:
                    raw = f.read()
                txt = raw.decode('utf-8', errors='replace')
                for i, line in enumerate(txt.split('\n'), 1):
                    if 'relat' in line.lower() and ('href' in line.lower() or 'src=' in line.lower() or 'link' in line.lower()):
                        rel_path = os.path.relpath(fp, BASE)
                        print(f'{rel_path} L{i}: {line.strip()[:120]}')
            except: pass

# Also check for sidebar or nav component files
print('\n=== Sidebar / nav references ===')
for root, dirs, files in os.walk(os.path.join(BASE, 'modules', 'PCP')):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
    for fname in files:
        if 'sidebar' in fname.lower() or 'nav' in fname.lower():
            fp = os.path.join(root, fname)
            print(f'Nav file: {fp}')
            with open(fp, 'rb') as f:
                raw = f.read()
            txt = raw.decode('utf-8', errors='replace')
            for i, line in enumerate(txt.split('\n'), 1):
                if 'relat' in line.lower():
                    print(f'  L{i}: {line.strip()[:120]}')

# Check PCP index.html for relatórios links
f_idx = os.path.join(BASE, 'modules', 'PCP', 'index.html')
with open(f_idx, 'rb') as f:
    raw = f.read()
txt = raw.decode('utf-8', errors='replace')
print('\n=== PCP/index.html relatórios links ===')
for i, line in enumerate(txt.split('\n'), 1):
    if 'relat' in line.lower() and 'href' in line.lower():
        print(f'L{i}: {line.strip()[:120]}')
