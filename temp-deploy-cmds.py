#!/usr/bin/env python3
"""Generate the deploy commands for all modified files."""

files = [
    # KPI standardization (10 files)
    ('modules/RH/public/pages/ferias.html', '/root/aluforce-dashboard/modules/RH/public/pages/ferias.html'),
    ('modules/RH/public/pages/avaliacoes.html', '/root/aluforce-dashboard/modules/RH/public/pages/avaliacoes.html'),
    ('modules/RH/public/pages/funcionarios.html', '/root/aluforce-dashboard/modules/RH/public/pages/funcionarios.html'),
    ('modules/RH/public/pages/gestao-ponto.html', '/root/aluforce-dashboard/modules/RH/public/pages/gestao-ponto.html'),
    ('modules/RH/public/pages/folha.html', '/root/aluforce-dashboard/modules/RH/public/pages/folha.html'),
    ('modules/RH/public/pages/holerites.html', '/root/aluforce-dashboard/modules/RH/public/pages/holerites.html'),
    ('modules/RH/public/pages/dashboard.html', '/root/aluforce-dashboard/modules/RH/public/pages/dashboard.html'),
    ('modules/Financeiro/nfse.html', '/root/aluforce-dashboard/modules/Financeiro/nfse.html'),
    ('modules/Vendas/public/estoque.html', '/root/aluforce-dashboard/modules/Vendas/public/estoque.html'),
    ('modules/Vendas/public/comissoes.html', '/root/aluforce-dashboard/modules/Vendas/public/comissoes.html'),
    # Header fixes (already deployed previously but including for safety)
    ('modules/RH/public/pages/aplicar-avaliacoes.html', '/root/aluforce-dashboard/modules/RH/public/pages/aplicar-avaliacoes.html'),
    # Contas a pagar stubs
    ('modules/Financeiro/contas-pagar.html', '/root/aluforce-dashboard/modules/Financeiro/contas-pagar.html'),
]

BASE = r'G:\Outros computadores\Meu laptop (2)\Zyntra'
VPS = 'root@31.97.64.102'
PW = 'Aluforce@2026#Vps'

for local, remote in files:
    local_path = f'{BASE}\\{local}'.replace('/', '\\')
    print(f'& "C:\\Program Files\\PuTTY\\pscp.exe" -batch -pw "{PW}" "{local_path}" {VPS}:{remote}')

print()
print('# Restart PM2')
print(f'& "C:\\Program Files\\PuTTY\\plink.exe" -batch -pw "{PW}" {VPS} "pm2 restart 10 && pm2 restart 11"')
