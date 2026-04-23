import os, re
BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'

for page in ['estoque.html', 'materiais.html']:
    p = os.path.join(BASE, 'modules', 'PCP', 'pages', page)
    with open(p, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    # find all onclick/oninput with movimentacao
    hits = re.findall(r'(?:onclick|oninput)="([^"]*[Mm]ov[^"]*)"', text)
    print(f'\n{page} - movimentação onclicks/oninputs:')
    for h in hits:
        print(f'  {h}')
    # check for buttons that open entrada/saida
    btns = re.findall(r'onclick="([^"]*(?:ntrada|aida|Entrada|Saida|movim)[^"]*)"', text, re.IGNORECASE)
    print(f'{page} - entrada/saida buttons:')
    for b in btns:
        print(f'  {b}')
