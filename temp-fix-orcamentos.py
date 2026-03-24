with open('/var/www/aluforce/modules/Financeiro/orcamentos.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add null checks for user-name and user-initials
old1 = "document.getElementById('user-name').textContent = primeiroNome;\n                    document.getElementById('user-initials').textContent = primeiroNome.charAt(0).toUpperCase();"
new1 = "const _unEl = document.getElementById('user-name');\n                    if (_unEl) _unEl.textContent = primeiroNome;\n                    const _uiEl = document.getElementById('user-initials');\n                    if (_uiEl) _uiEl.textContent = primeiroNome.charAt(0).toUpperCase();"

if old1 in content:
    content = content.replace(old1, new1, 1)
    print('Fix 1 applied: null checks added for user-name/user-initials')
else:
    print('Fix 1 NOT found - trying alternate search')
    idx = content.find("getElementById('user-name').textContent")
    print(f'  user-name pos: {idx}')
    if idx > 0:
        print(repr(content[idx-5:idx+150]))

# Fix 2: Add !important to display:none on .modal-overlay-padrao
old2 = 'display: none; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(8px); }'
new2 = 'display: none !important; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(8px); }'

if old2 in content:
    content = content.replace(old2, new2, 1)
    print('Fix 2 applied: display none !important on .modal-overlay-padrao')
else:
    print('Fix 2 NOT found - trying alternate')
    idx2 = content.find('display: none; align-items: center')
    print(f'  display:none pos: {idx2}')
    if idx2 > 0:
        print(repr(content[idx2-30:idx2+80]))

with open('/var/www/aluforce/modules/Financeiro/orcamentos.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('File saved.')
