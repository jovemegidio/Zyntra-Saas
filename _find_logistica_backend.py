import os, re

base = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
results = []
for root, dirs, files in os.walk(base):
    # skip node_modules
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'backup']]
    for fn in files:
        if fn.endswith('.js') and not fn.startswith('_'):
            fpath = os.path.join(root, fn)
            try:
                with open(fpath, 'rb') as f:
                    content = f.read()
                if b'logistica/expedicao' in content or b'Erro ao gerar NF' in content or (b'logistica' in content.lower() and b'expedicao' in content.lower()):
                    results.append(fpath)
                    # print relevant lines
                    for i, line in enumerate(content.split(b'\n')):
                        if b'expedicao' in line.lower() or b'Erro ao gerar NF' in line:
                            print(f"{fpath}:{i+1}: {line[:150].decode('utf-8','replace')}")
            except:
                pass
print("\nFiles found:", results)
