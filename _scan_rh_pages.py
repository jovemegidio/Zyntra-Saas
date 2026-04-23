import re

ACCENT_CHARS = set('àáâãäéêíóôõúçÀÁÂÃÄÉÊÍÓÔÕÚÇ')

def has_accent(s):
    return any(c in ACCENT_CHARS for c in s)

files = [
    r'modules/RH/public/pages/folha.html',
    r'modules/RH/public/pages/gestao-ponto.html',
]

for fpath in files:
    print(f'\n=== {fpath} ===')
    content = open(fpath, 'rb').read().decode('utf-8', 'replace')
    
    html_ids = [m for m in re.findall(r'id=["\']([^"\']+)["\']', content) if has_accent(m)]
    js_ids = [m for m in re.findall(r'getElementById\(["\']([^"\']+)["\']\)', content) if has_accent(m)]
    api_urls = [m for m in re.findall(r'/api/[^\s\'"]+', content) if has_accent(m)]
    
    print('  HTML ids com acento:', sorted(set(html_ids)))
    print('  JS getElementById com acento:', sorted(set(js_ids)))
    if api_urls:
        print('  API URLs com acento:', sorted(set(api_urls)))
