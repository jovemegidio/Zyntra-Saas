import glob, os

# Check if modal HTML exists in any PCP file
search_dirs = [
    r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP',
]
for d in search_dirs:
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.endswith('.html') or f.endswith('.js'):
                fp = os.path.join(root, f)
                try:
                    with open(fp, 'rb') as fh:
                        content = fh.read().decode('utf-8', errors='replace')
                    if 'modal-movimentacao-estoque' in content or 'modal-mov-header' in content:
                        print(f'FOUND in: {fp}')
                        # show count
                        print(f'  modal-movimentacao-estoque: {content.count("modal-movimentacao-estoque")}')
                        print(f'  modal-mov-header: {content.count("modal-mov-header")}')
                except: pass
