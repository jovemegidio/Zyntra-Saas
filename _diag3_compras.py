#!/usr/bin/env python3
# Verifica strings JS visíveis (toast, modal titles, innerHTML templates)
import re, os

base = '/var/www/aluforce/modules/Compras'
WORDS = ['Cotacao', 'cotacao', 'Numero', 'numero', 'Codigo', 'codigo',
         'Historico', 'historico', 'Descricao', 'descricao', 'gestao', 'Gestao',
         'Requisicao', 'Solicitacao', 'Minimo', 'minimo', 'Periodo', 'periodo',
         'disponivel', 'condicoes', 'avaliacao', 'Selecao', 'Edicao', 'movimentacao',
         'Aprovacao', 'aprovacao', 'Cancelacao', 'cancelacao', 'Notificacao']

def extract_js_visible_strings(script_block):
    """Extrai strings JS que parecem texto visível para o usuário."""
    results = []
    
    # Swal.fire / SweetAlert - title, text, html
    for m in re.finditer(r'''(?:title|text|html|confirmButtonText|cancelButtonText)\s*:\s*['"`]([^'"`\n]+)['"`]''', script_block):
        results.append(('Swal', m.group(1)))
    
    # toastr
    for m in re.finditer(r'''toastr\.\w+\s*\(\s*['"`]([^'"`\n]+)['"`]''', script_block):
        results.append(('toastr', m.group(1)))
    
    # innerHTML / innerText assignments
    for m in re.finditer(r'''\.(?:innerHTML|innerText|textContent)\s*=\s*['"`]([^'"`\n]{5,80})['"`]''', script_block):
        results.append(('innerHTML', m.group(1)))
    
    # HTML tags inside template strings (option labels, th, td, label, h2-h6, span)
    for m in re.finditer(r'''(?:<th>|<td>|<label[^>]*>|<h[2-6][^>]*>|<span[^>]*>|<option[^>]*>|<p[^>]*>|<button[^>]*>)\s*([^<\n]{2,60})\s*(?:</th>|</td>|</label>|</h[2-6]>|</span>|</option>|</p>|</button>)''', script_block, re.IGNORECASE):
        results.append(('html_template', m.group(1)))
    
    # Alert/console with text
    for m in re.finditer(r'''alert\s*\(\s*['"`]([^'"`\n]+)['"`]''', script_block):
        results.append(('alert', m.group(1)))
    
    return results

for fname in sorted(os.listdir(base)):
    if not fname.endswith('.html'):
        continue
    html = open(os.path.join(base, fname), encoding='utf-8', errors='replace').read()
    
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL|re.IGNORECASE)
    all_script = '\n'.join(scripts)
    
    visible_strings = extract_js_visible_strings(all_script)
    
    found = []
    for source, text in visible_strings:
        for word in WORDS:
            pattern = r'(?<![a-zA-ZÀ-ÿ])' + re.escape(word) + r'(?![a-zA-ZÀ-ÿ])'
            if re.search(pattern, text):
                found.append((source, word, text[:100]))
                break
    
    if found:
        print(f'\n=== {fname} ===')
        for source, word, text in found:
            print(f'  [{source}:{word}] "{text}"')
    else:
        print(f'  {fname}: JS strings OK')
