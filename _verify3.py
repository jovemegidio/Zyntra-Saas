BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public'

# 1. dashboard-admin.html
with open(BASE + r'\dashboard-admin.html', 'rb') as f: d = f.read()
print("=== dashboard-admin.html ===")
print("modal-header orange CSS:", b'.modal-header.orange {' in d)
print("btn-modal-save CSS:", b'.btn-modal-save {' in d)
print("modal-content CSS:", b'.modal-content {' in d)
print("orange gradient:", b'linear-gradient(135deg, #f97316, #ea580c)' in d)

# 2. relatorios.html  
with open(BASE + r'\relatorios.html', 'rb') as f: r = f.read()
print("\n=== relatorios.html ===")
old = '/api/vendas/relat\u00f3rio/mapa-brasil'.encode('utf-8')
print("relatório URL removido:", old not in r)
print("relatorio URL OK:", b'/api/vendas/relatorio/mapa-brasil' in r)

# 3. comissoes.html
with open(BASE + r'\comissoes.html', 'rb') as f: c = f.read()
print("\n=== comissoes.html ===")
print("Fabiola.webp removido:", b"Fabiola.webp'" not in c)
print("Fabiola.jpg OK:", b"Fabiola.jpg'" in c)
