#!/usr/bin/env python3
"""Extract KPI card data from all pages."""
import re, os

base = r'G:\Outros computadores\Meu laptop (2)\Zyntra'
files = [
    'modules/RH/public/pages/ferias.html',
    'modules/RH/public/pages/avaliacoes.html',
    'modules/RH/public/pages/dashboard.html',
    'modules/RH/public/pages/funcionarios.html',
    'modules/RH/public/pages/folha.html',
    'modules/RH/public/pages/gestao-ponto.html',
    'modules/RH/public/pages/holerites.html',
    'modules/Financeiro/nfse.html',
    'modules/Vendas/public/estoque.html',
    'modules/Vendas/public/comissoes.html',
]
for f in files:
    fp = os.path.join(base, f)
    try:
        with open(fp, 'r', encoding='utf-8') as fh:
            content = fh.read()
        ids = re.findall(r'id="((?:kpi|stat)-[^"]+)"', content)
        labels1 = re.findall(r'class="stat-label"[^>]*>([^<]+)', content)
        labels2 = re.findall(r'<span>([^<]{3,50})</span>\s*<strong', content)
        labels3 = re.findall(r'class="kpi-label"[^>]*>([^<]+)', content)
        labels4 = re.findall(r'class="stat-card-label"[^>]*>([^<]+)', content)
        labels5 = re.findall(r'class="kpi-content"[^>]*>\s*<h3>([^<]+)', content)
        all_labels = labels1 or labels2 or labels3 or labels4 or labels5
        print(f'\n{f}:')
        print(f'  IDs: {ids[:10]}')
        print(f'  Labels: {all_labels[:10]}')
    except Exception as e:
        print(f'{f}: ERROR {e}')
