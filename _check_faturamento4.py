path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Check if gerarNFe is async
print("=== bytes 25395-25440 ===")
print(repr(raw[25395:25440]))

# Check modal-standard-compat.css exists and has orange class
import os
compat_path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\public\css\modal-standard-compat.css'
if os.path.exists(compat_path):
    with open(compat_path, 'rb') as f:
        css = f.read()
    print(f"\nmodal-standard-compat.css ({len(css)} bytes)")
    # Find orange header
    for kw in [b'.orange', b'modal-small', b'btn-modal', b'f97316']:
        idx = css.find(kw)
        if idx >= 0:
            print(f"  Found {kw}: {repr(css[idx:idx+80])}")
        else:
            print(f"  NOT FOUND: {kw}")
else:
    print("CSS NOT FOUND at", compat_path)
