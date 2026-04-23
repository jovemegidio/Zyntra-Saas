path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\dashboard-admin.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find start of our CSS block  
start = raw.find(b'/* ==================== MODAL DEFINIR META ====================')
# Go back to include the newline + spaces before it
start = raw.rfind(b'\r\n', 0, start) + 2  # start after \r\n

# Find end: closing brace of last rule ".modal-box .modal-footer button { ... }"
marker = b'.modal-box .modal-footer button {'
pos = raw.find(marker, start)
close = raw.find(b'}', pos)
end = close + 1  # include the }

print(f"Removing bytes {start} to {end}")
print(f"=== BLOCK START: {repr(raw[start:start+80])}")
print(f"=== BLOCK END: {repr(raw[end-20:end+10])}")

new_raw = raw[:start] + raw[end:]
with open(path, 'wb') as f:
    f.write(new_raw)
print("OK: CSS block removido")

with open(path, 'rb') as f:
    v = f.read()
print(f"modal-box restante: {b'.modal-box' in v}")
print(f"MODAL DEFINIR META comment restante: {b'MODAL DEFINIR META' in v}")
