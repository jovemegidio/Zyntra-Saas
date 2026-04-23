#!/usr/bin/env python3
# Corrige erros ortográficos em contas-receber.html
# Aplica nas 3 instâncias: aluforce, labor-energy, labor-eletric

import os

TARGETS = [
    '/var/www/aluforce/modules/Financeiro/contas-receber.html',
    '/var/www/labor-energy/modules/Financeiro/contas-receber.html',
    '/var/www/labor-eletric/modules/Financeiro/contas-receber.html',
]

# Substituições exatas (string exata → string correta)
# Preserva value="transferencia" (atributo de dado), muda só texto visível
REPLACEMENTS = [
    # placeholder: Servico → Serviço
    (
        'placeholder="Ex: Venda de produtos, Servico prestado..."',
        'placeholder="Ex: Venda de produtos, Serviço prestado..."'
    ),
    # option text: Transferencia → Transferência (linha 1078)
    (
        '>Transferencia</option>',
        '>Transferência</option>'
    ),
    # JS map de exibição: 'transferencia':'Transferencia' → 'Transferência'
    (
        "'transferencia':'Transferencia'",
        "'transferencia':'Transferência'"
    ),
]

for fpath in TARGETS:
    if not os.path.isfile(fpath):
        print(f'  SKIP (não encontrado): {fpath}')
        continue
    
    html = open(fpath, encoding='utf-8', errors='replace').read()
    original = html
    fixes = 0
    
    for wrong, correct in REPLACEMENTS:
        count = html.count(wrong)
        if count > 0:
            html = html.replace(wrong, correct)
            fixes += count
            print(f'  ✓ {count}x "{wrong[:50]}" → "{correct[:50]}"')
    
    if fixes > 0:
        open(fpath, 'w', encoding='utf-8').write(html)
        print(f'  Salvo: {fpath} ({fixes} correção/ões)\n')
    else:
        print(f'  Sem alterações: {fpath}\n')
