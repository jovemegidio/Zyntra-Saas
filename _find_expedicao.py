import os

base = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'backup']]
    for fn in files:
        if fn.endswith('.js') and not fn.startswith('_'):
            fpath = os.path.join(root, fn)
            try:
                with open(fpath, 'rb') as f:
                    content = f.read()
                if b'/expedicao' in content or b'expedicoes' in content:
                    print(f"FOUND: {fpath}")
                    for i, line in enumerate(content.split(b'\n')):
                        if b'expedicao' in line or b'expedicoes' in line:
                            print(f"  L{i+1}: {line[:120].decode('utf-8','replace')}")
            except Exception as e:
                print(f"ERR: {fpath}: {e}")
