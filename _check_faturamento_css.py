import os

fat_css_path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\css\faturamento-layout.css'
if os.path.exists(fat_css_path):
    with open(fat_css_path, 'rb') as f:
        css = f.read()
    print(f"faturamento-layout.css ({len(css)} bytes)")
    for kw in [b'.orange', b'modal-small', b'btn-modal', b'f97316', b'.modal-header', b'.modal-content', b'.modal-overlay']:
        idx = css.find(kw)
        if idx >= 0:
            print(f"  {kw}: {repr(css[idx:idx+100])}")
        else:
            print(f"  NOT FOUND: {kw}")
else:
    print("NOT FOUND:", fat_css_path)
    # check what's in the css dir
    css_dir = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\css'
    if os.path.exists(css_dir):
        for f in os.listdir(css_dir):
            print("  css file:", f)
    else:
        print("css dir not found")
