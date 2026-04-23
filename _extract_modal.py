path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find exact modal bytes
start = raw.find(b'    <!-- Modal Nova NF-e -->')
end_marker = b'    <!-- Modal Editar NF-e -->'
end = raw.find(end_marker)
print(f"Modal starts at byte {start}, ends at byte {end}")
print(f"Modal length: {end - start} bytes")
print("\nModal content:")
print(repr(raw[start:end]))
