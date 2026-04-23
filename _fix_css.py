import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'contas_receber.html')

with open(f, 'rb') as fh:
    raw = fh.read()

# Check if calendar-picker exists anywhere
if b'calendar-picker' in raw:
    idx = raw.find(b'calendar-picker')
    print('FOUND at offset', idx)
    print(repr(raw[idx-5:idx+150]))
else:
    print('NOT FOUND - need to add')
    # Add it now
    # The old line (with CRLF)
    old = b'        .input-icon-conta i, .input-search-conta i { position:absolute; right:14px; top:50%; transform:translateY(-50%); color:#9ca3af; font-size:14px; pointer-events:none; }\r\n'
    new = old + b'        .input-icon-conta input[type="date"]::-webkit-calendar-picker-indicator { opacity:0; position:absolute; right:0; width:100%; height:100%; cursor:pointer; }\r\n'
    assert old in raw, f'Anchor not found - first 200 bytes around i: {repr(raw[21535:21735])}'
    raw = raw.replace(old, new, 1)
    with open(f, 'wb') as fh:
        fh.write(raw)
    print('CSS added and saved!')
