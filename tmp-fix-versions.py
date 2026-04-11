import glob, re, os
os.chdir('/var/www/aluforce/modules/Financeiro/public')
for f in glob.glob('*.html'):
    with open(f,'r') as fh:
        c = fh.read()
    c2 = re.sub(r'fin-(layout|components|header-sidebar)\.css\?v=\w+',
                lambda m: 'fin-' + m.group(1) + '.css?v=1775916179', c)
    if c != c2:
        with open(f,'w') as fh:
            fh.write(c2)
        print(f + ': updated')
    else:
        print(f + ': no change')
