#!/usr/bin/env python3
# Round 5b: Fix remaining issues in relatorios.html
# 1. Empty "" titles (lines 963, 968)
# 2. Any remaining accented getElementById/fetch calls

path = '/var/www/aluforce/modules/Financeiro/relatorios.html'
data = open(path, 'rb').read()
text = data.decode('utf-8')

# --- Diagnose remaining accented getElementById/fetch lines ---
print('=== REMAINING ACCENTED ISSUES ===')
accented = 'áàâãéèêíìîóòôõúùûçõÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÕ'
lines = text.split('\n')
found = []
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    has_accent = any(c in stripped for c in accented)
    if has_accent and any(x in stripped for x in ['getElementById', 'fetch(', 'fetchAPI(']):
        print(f'{i}: {stripped[:120]}')
        found.append(i)
if not found:
    print('  None found!')

# --- Fix 1: Empty "" titles ---
print('\n=== FIXING TITLES ===')
old1 = '<h2>Relatório por Período "" Receber</h2>'
new1 = '<h2>Relatório de Contas a Receber por Período</h2>'
old2 = '<h2>Relatório por Período "" Pagar</h2>'
new2 = '<h2>Relatório de Contas a Pagar por Período</h2>'

if old1 in text:
    text = text.replace(old1, new1)
    print(f'  Fixed: {old1[:60]} -> {new1[:60]}')
else:
    print(f'  Not found: {old1[:60]}')

if old2 in text:
    text = text.replace(old2, new2)
    print(f'  Fixed: {old2[:60]} -> {new2[:60]}')
else:
    print(f'  Not found: {old2[:60]}')

# --- Fix 2: Any remaining accented getElementById calls ---
# Check for valorTitulo (títulos variable name - safe, not a DOM ID)
# Check for desconto-obs (has ç - wait, let me check)
# desconto-obs doesn't have accent - skip
# observacoes check
import re

# Fix: getElementById('desconto-obs') - check if obs has accent
replacements = [
    # desconto-número was done before, but let's be safe (bytes approach was used before)
    # These are text replacements using decoded text
    ("getElementById('desconto-número')", "getElementById('desconto-numero')"),
    ("getElementById('filtroPeríodo')", "getElementById('filtroPeriodo')"),
    ("getElementById('períodoResumo')", "getElementById('periodoResumo')"),
    ("getElementById('agendTipoRelatório')", "getElementById('agendTipoRelatorio')"),
    ("getElementById('modalRelatório')", "getElementById('modalRelatorio')"),
    ("getElementById('modalRelatórioTítulo')", "getElementById('modalRelatorioTitulo')"),
    ("getElementById('loading-relatório')", "getElementById('loading-relatorio')"),
    ("getElementById('conteudo-relatório')", "getElementById('conteudo-relatorio')"),
    ("getElementById('modalRelatórioBody')", "getElementById('modalRelatorioBody')"),
    # Also fix API URL if any missed
    ("'/api/financeiro/contas-bancárias'", "'/api/financeiro/contas-bancarias'"),
    ("'/api/financeiro/contas-bancárias'", "'/api/financeiro/contas-bancarias'"),
    ("/api/financeiro/contas-bancárias", "/api/financeiro/contas-bancarias"),
]

print('\n=== APPLYING SAFETY REPLACEMENTS ===')
for old, new in replacements:
    if old in text:
        count = text.count(old)
        text = text.replace(old, new)
        print(f'  Fixed ({count}x): {old[:60]}')

# Write back
data_new = text.encode('utf-8')
open(path, 'wb').write(data_new)
print(f'\nSaved: {len(data_new)} bytes (was {len(data)})')
print('Done.')
