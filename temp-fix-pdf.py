with open('/var/www/aluforce/ajuda/artigos/tutorial-exportar-pedido-pdf.html', 'r', encoding='utf-8') as f:
    c = f.read()
c2 = c.replace('>ALUFORCE \u2192 Pedido de Venda', '>Zyntra \u2192 Pedido de Venda')
if c2 == c:
    # Try broader replace
    import re
    c2 = re.sub(r'>ALUFORCE([^<]*Pedido)', r'>Zyntra\1', c)
if c2 != c:
    with open('/var/www/aluforce/ajuda/artigos/tutorial-exportar-pedido-pdf.html', 'w', encoding='utf-8') as f:
        f.write(c2)
    print('FIXED')
else:
    print('NOT CHANGED - dumping context:')
    idx = c.find('emu-pdf-header')
    print(repr(c[idx:idx+80]))
