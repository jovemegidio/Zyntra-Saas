import os
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

f = os.path.join(BASE, 'modules', 'PCP', 'pages', 'ordem-compra.html')
with open(f, 'rb') as fp:
    raw = fp.read()
text = raw.decode('utf-8', errors='replace')

# Find and fix carregarCompradoresOC to fallback on both 404 and 500
old_str = "                // Se a rota não existir (404), tentar rota alternativa\n                if (response.status === 404) {"
new_str = "                // Se a rota não existir (404) ou der erro (500), tentar rota alternativa\n                if (response.status === 404 || !response.ok) {"

print('Old found:', old_str in text)
fixed_text = text.replace(old_str, new_str, 1)
print('Fixed:', old_str not in fixed_text and new_str in fixed_text)

fixed_raw = fixed_text.encode('utf-8')
with open(f, 'wb') as fp:
    fp.write(fixed_raw)
print('✅ carregarCompradoresOC fallback updated')
