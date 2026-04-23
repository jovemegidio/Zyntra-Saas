import re

path = r"g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\PCP\pages\ordem-compra.html"

with open(path, 'rb') as f:
    content = f.read()
text = content.decode('utf-8')

NL = '\r\n'

fixes = [
    # Fix 1: atualizarSaudação → atualizarSaudacao no DOMContentLoaded
    (
        "            atualizarSauda\u00e7\u00e3o();" + NL + "            carregarOrdensCompra();",
        "            atualizarSaudacao();" + NL + "            carregarOrdensCompra();"
    ),
    # Fix 2: buscarFornecedor - adicionar guard Array.isArray
    (
        "            buscarFornecedores(termo).then(fornecedores => {" + NL + "                if (fornecedores.length === 0) {",
        "            buscarFornecedores(termo).then(fornecedores => {" + NL + "                if (!Array.isArray(fornecedores) || fornecedores.length === 0) {"
    ),
    # Fix 3: buscarFornecedores - extrair array do response (API pode retornar {data:[...]} ou array direto)
    (
        "                if (response.ok) {" + NL + "                    return await response.json();" + NL + "                }",
        "                if (response.ok) {" + NL + "                    const data = await response.json();" + NL + "                    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);" + NL + "                }"
    ),
    # Fix 4: carregarCompradoresOC - remover filtro estrito que elimina todos os usuarios
    (
        "                    if (Array.isArray(usuarios)) {" + NL + "                        usuarios = usuarios.filter(u =>" + NL + "                            u.role === 'comprador' ||" + NL + "                            u.cargo?.toLowerCase().includes('compra') ||" + NL + "                            u.departamento?.toLowerCase().includes('compra')" + NL + "                        );" + NL + "                    }",
        "                    // Mostrar todos os usuarios como possiveis compradores"
    ),
]

count = 0
for old, new in fixes:
    if old in text:
        text = text.replace(old, new, 1)
        print("  OK: " + repr(old[:70]))
        count += 1
    else:
        print("  MISS: " + repr(old[:70]))

if count == len(fixes):
    with open(path, 'wb') as f:
        f.write(text.encode('utf-8'))
    print("\n=> WRITTEN (" + str(count) + "/" + str(len(fixes)) + " fixes)")
else:
    print("\n=> ABORTED (" + str(count) + "/" + str(len(fixes)) + " fixes found)")
