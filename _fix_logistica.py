path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Logistica\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Bug 1: getElementById('exp-observações') -> getElementById('exp-observacoes')
# 'exp-observações' in UTF-8 = b'exp-observa\xc3\xa7\xc3\xb5es'
old_id = "getElementById('exp-observa\u00e7\u00f5es')".encode('utf-8')
new_id = b"getElementById('exp-observacoes')"

count = raw.count(old_id)
print(f"getElementById accented: {count} occurrences")
raw = raw.replace(old_id, new_id)

# Bug 2: observações: -> observacoes: (in JSON.stringify key)
# 'observações: ' in UTF-8
old_key = "observa\u00e7\u00f5es: document".encode('utf-8')
new_key = b"observacoes: document"

count2 = raw.count(old_key)
print(f"observações key: {count2} occurrences")
raw = raw.replace(old_key, new_key)

with open(path, 'wb') as f:
    f.write(raw)

print("Done!")
