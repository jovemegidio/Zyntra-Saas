import re, os

base = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

# ============================================================
# Fix 1: public/chat/widget.js — already done via replace_string
# ============================================================

# ============================================================
# Fix 2: fluxo_caixa.html
# ============================================================
fc_path = os.path.join(base, 'modules', 'Financeiro', 'public', 'fluxo_caixa.html')
fc_data = open(fc_path, 'rb').read().decode('utf-8')

fc_replacements = [
    ("getElementById('tabela-movimenta\u00e7\u00f5es')", "getElementById('tabela-movimentacoes')"),
    ("getElementById('saldo-per\u00edodo')",              "getElementById('saldo-periodo')"),
]

fc_count = 0
for old, new in fc_replacements:
    n = fc_data.count(old)
    fc_data = fc_data.replace(old, new)
    print(f'fluxo_caixa: {n}x {repr(old)} -> {repr(new)}')
    fc_count += n

open(fc_path, 'wb').write(fc_data.encode('utf-8'))
print(f'fluxo_caixa.html saved ({fc_count} replacements)')

# ============================================================
# Fix 3: bancos.html
# ============================================================
bn_path = os.path.join(base, 'modules', 'Financeiro', 'bancos.html')
bn_data = open(bn_path, 'rb').read().decode('utf-8')

bn_replacements = [
    # JS accented ID         -> HTML non-accented ID
    ("'movimenta\u00e7\u00f5esBody'",            "'movimentacoesBody'"),
    ("'extratoT\u00edtulo'",                     "'extratoTitulo'"),
    ("'extratoC\u00f3digo'",                     "'extratoCodigo'"),
    ("'extratoMovimenta\u00e7\u00f5es'",         "'extratoMovimentacoes'"),
    ("'modalBancoT\u00edtulo'",                  "'modalBancoTitulo'"),
    ("'bancoC\u00f3digo'",                       "'bancoCodigo'"),
    ("'observa\u00e7\u00f5es'",                  "'observacoes'"),
    ("'\u00fameroAgencia'",                      "'numeroAgencia'"),
    ("'n\u00fameroAgencia'",                     "'numeroAgencia'"),
    ("'descri\u00e7\u00e3oTransferencia'",       "'descricaoTransferencia'"),
    ("'descri\u00e7\u00e3oMovimento'",           "'descricaoMovimento'"),
    ("'integra\u00e7\u00e3oProvedor'",           "'integracaoProvedor'"),
    ("'integra\u00e7\u00e3oUrlBase'",            "'integracaoUrlBase'"),
    ("'integra\u00e7\u00e3oUrlAuth'",            "'integracaoUrlAuth'"),
    ("'btnTestarIntegra\u00e7\u00e3o'",          "'btnTestarIntegracao'"),
    ("'integra\u00e7\u00e3oStatusCard'",         "'integracaoStatusCard'"),
    ("'integra\u00e7\u00e3oStatusIcon'",         "'integracaoStatusIcon'"),
    ("'integra\u00e7\u00e3oStatusT\u00edtulo'",  "'integracaoStatusTitulo'"),
    ("'integra\u00e7\u00e3oStatusDesc'",         "'integracaoStatusDesc'"),
    ("'integra\u00e7\u00e3oClientId'",           "'integracaoClientId'"),
    ("'integra\u00e7\u00e3oClientSecret'",       "'integracaoClientSecret'"),
    ("'integra\u00e7\u00e3oAmbiente'",           "'integracaoAmbiente'"),
    ("'integra\u00e7\u00e3oSyncAuto'",           "'integracaoSyncAuto'"),
    ("'integra\u00e7\u00e3oWebhookAtivo'",       "'integracaoWebhookAtivo'"),
    ("'boletoVaria\u00e7\u00e3o'",               "'boletoVariacao'"),
    ("'boletoNossoN\u00fameroInicio'",           "'boletoNossoNumeroInicio'"),
    ("'boletoNossoN\u00fameroProximo'",          "'boletoNossoNumeroProximo'"),
]

bn_count = 0
for old, new in bn_replacements:
    n = bn_data.count(old)
    bn_data = bn_data.replace(old, new)
    if n > 0:
        print(f'bancos: {n}x {repr(old)} -> {repr(new)}')
    bn_count += n

open(bn_path, 'wb').write(bn_data.encode('utf-8'))
print(f'bancos.html saved ({bn_count} replacements total)')

# Verify no accented IDs remain in JS
remaining = re.findall(r"getElementById\('[^']*[áàâãéèêíìîóòôõúùûç]", bn_data)
if remaining:
    print('WARNING - remaining accented IDs:', remaining[:10])
else:
    print('OK - no accented IDs remain in bancos.html JS')

remaining_fc = re.findall(r"getElementById\('[^']*[áàâãéèêíìîóòôõúùûç]", fc_data)
if remaining_fc:
    print('WARNING - remaining accented IDs in fluxo_caixa:', remaining_fc)
else:
    print('OK - no accented IDs remain in fluxo_caixa.html JS')
