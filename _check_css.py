path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\dashboard-admin.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find start of our CSS block
start = raw.find(b'/* ==================== MODAL DEFINIR META ====================')
end = raw.find(b'.modal-box .modal-footer button {', start)
# find end of that rule 
end2 = raw.find(b'}', end)
print(f"start: {start}, end of last rule: {end2}")
print("=== START 50 bytes before comment ===")
print(repr(raw[start-5:start+80]))
print("=== END (last rule + closing) ===")
print(repr(raw[end2-10:end2+20]))
print("=== LAST 10 bytes of block ===")
end3 = end2 + raw[end2:].index(b'}') + 1  # two closing braces?
print(repr(raw[end2:end2+5]))
