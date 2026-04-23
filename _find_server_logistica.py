import os

base = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# Find all server/router files 
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'backup', 'Base', 'tests']]
    for fn in files:
        if fn.endswith('.js'):
            fpath = os.path.join(root, fn)
            try:
                sz = os.path.getsize(fpath)
                if sz > 50000:  # big files likely have routes
                    with open(fpath, 'rb') as f:
                        content = f.read()
                    if b'logistica' in content.lower():
                        print(f"MATCH: {fpath} ({sz//1024}KB)")
                        for i, line in enumerate(content.split(b'\n')):
                            ll = line.lower()
                            if b'logistica' in ll:
                                print(f"  L{i+1}: {line[:150].decode('utf-8','replace')}")
            except Exception as e:
                pass
