#!/usr/bin/env python3
"""Fix encoding issues (missing Portuguese accents) across all module HTML files."""
import os, re, glob

BASE = r'G:\Outros computadores\Meu laptop (2)\Zyntra'

# Word replacements: ASCII -> proper Portuguese
# Only whole-word replacements to avoid partial matches
REPLACEMENTS = [
    # -ção/-ções endings
    (r'\bAvaliacoes\b', 'Avaliações'),
    (r'\bavaliacoes\b', 'avaliações'),
    (r'\bAvaliacao\b', 'Avaliação'),
    (r'\bavaliacao\b', 'avaliação'),
    (r'\bIntegracao\b', 'Integração'),
    (r'\bintegracao\b', 'integração'),
    (r'\bOperacao\b', 'Operação'),
    (r'\boperacao\b', 'operação'),
    (r'\bSelecao\b', 'Seleção'),
    (r'\bselecao\b', 'seleção'),
    (r'\bProducao\b', 'Produção'),
    (r'\bproducao\b', 'produção'),
    (r'\bAplicacao\b', 'Aplicação'),
    (r'\baplicacao\b', 'aplicação'),
    (r'\bConclusao\b', 'Conclusão'),
    (r'\bconclusao\b', 'conclusão'),
    (r'\bManutencao\b', 'Manutenção'),
    (r'\bmanutencao\b', 'manutenção'),
    (r'\bAdministracao\b', 'Administração'),
    (r'\badministracao\b', 'administração'),
    (r'\bExcecao\b', 'Exceção'),
    (r'\bexcecao\b', 'exceção'),
    (r'\bInformacoes\b', 'Informações'),
    (r'\binformacoes\b', 'informações'),
    (r'\bconfusao\b', 'confusão'),
    (r'\bConciliacao\b', 'Conciliação'),
    (r'\bconciliacao\b', 'conciliação'),
    (r'\bMovimentacao\b', 'Movimentação'),
    (r'\bmovimentacao\b', 'movimentação'),
    (r'\bClassificacao\b', 'Classificação'),
    (r'\bclassificacao\b', 'classificação'),
    (r'\bDescricao\b', 'Descrição'),
    (r'\bdescricao\b', 'descrição'),
    (r'\bObservacao\b', 'Observação'),
    (r'\bobservacao\b', 'observação'),
    (r'\bSituacao\b', 'Situação'),
    (r'\bsituacao\b', 'situação'),
    (r'\bCotacao\b', 'Cotação'),
    (r'\bcotacao\b', 'cotação'),
    (r'\bCotacoes\b', 'Cotações'),
    (r'\bcotacoes\b', 'cotações'),
    (r'\bRequisicao\b', 'Requisição'),
    (r'\brequisicao\b', 'requisição'),
    (r'\bRequisicoes\b', 'Requisições'),
    (r'\brequisicoes\b', 'requisições'),
    (r'\bInutilizacao\b', 'Inutilização'),
    (r'\binutilizacao\b', 'inutilização'),
    (r'\bEdicao\b', 'Edição'),
    (r'\bedicao\b', 'edição'),
    (r'\bEmissao\b', 'Emissão'),
    (r'\bemissao\b', 'emissão'),
    (r'\bCancelacao\b', 'Cancelação'),
    (r'\bcancelacao\b', 'cancelação'),
    (r'\bLiquidacao\b', 'Liquidação'),
    (r'\bliquidacao\b', 'liquidação'),
    (r'\bfaturacao\b', 'faturação'),
    (r'\bFaturacao\b', 'Faturação'),
    (r'\bRenegociacao\b', 'Renegociação'),
    (r'\brenegociacao\b', 'renegociação'),
    (r'\bRepeticao\b', 'Repetição'),
    (r'\brepeticao\b', 'repetição'),
    (r'\bDistribuicao\b', 'Distribuição'),
    (r'\bdistribuicao\b', 'distribuição'),
    # -ário/-ário endings
    (r'\bFuncionario\b', 'Funcionário'),
    (r'\bfuncionario\b', 'funcionário'),
    (r'\bFuncionarios\b', 'Funcionários'),
    (r'\bfuncionarios\b', 'funcionários'),
    # -íodo endings
    (r'\bPeriodo\b', 'Período'),
    (r'\bperiodo\b', 'período'),
    # -ítulo
    (r'\bTitulo\b', 'Título'),
    (r'\btitulo\b', 'título'),
    (r'\bTitulos\b', 'Títulos'),
    (r'\btitulos\b', 'títulos'),
    # Others
    (r'\bNumero\b', 'Número'),
    (r'\bnumero\b', 'número'),
    (r'\bNumeros\b', 'Números'),
    (r'\bRelatorio\b', 'Relatório'),
    (r'\brelatorio\b', 'relatório'),
    (r'\bRelatorios\b', 'Relatórios'),
    (r'\brelatorios\b', 'relatórios'),
    (r'\bHorario\b', 'Horário'),
    (r'\bhorario\b', 'horário'),
    (r'\bSalario\b', 'Salário'),
    (r'\bsalario\b', 'salário'),
    (r'\bNecessario\b', 'Necessário'),
    (r'\bnecessario\b', 'necessário'),
    (r'\bObrigatorio\b', 'Obrigatório'),
    (r'\bobrigatorio\b', 'obrigatório'),
    (r'\bValido\b', 'Válido'),
    (r'\bvalido\b', 'válido'),
    (r'\bCodigo\b', 'Código'),
    (r'\bcodigo\b', 'código'),
    (r'\bUnico\b', 'Único'),
    (r'\bunico\b', 'único'),
    (r'\bPublico\b', 'Público'),
    (r'\bpublico\b', 'público'),
    (r'\bUltimo\b', 'Último'),
    (r'\bultimo\b', 'último'),
    (r'\bProximo\b', 'Próximo'),
    (r'\bproximo\b', 'próximo'),
    (r'\bMinimo\b', 'Mínimo'),
    (r'\bminimo\b', 'mínimo'),
    (r'\bMaximo\b', 'Máximo'),
    (r'\bmaximo\b', 'máximo'),
    (r'\bAtencao\b', 'Atenção'),
    (r'\batencao\b', 'atenção'),
    (r'\bAcao\b', 'Ação'),
    (r'\bacao\b', 'ação'),
    (r'\bAcoes\b', 'Ações'),
    (r'\bacoes\b', 'ações'),
]

def is_protected_context(content, match_start, match_end):
    """Check if a match is inside a protected context (href, src, id, class, name, onclick, function name, variable)."""
    # Look backwards for attribute context
    before = content[max(0, match_start-200):match_start]
    
    # Check if inside href="...", src="...", or URL path
    for attr in ['href=', 'src=', 'action=']:
        idx = before.rfind(attr)
        if idx >= 0:
            # Find the opening quote after the attr
            after_attr = before[idx+len(attr):]
            if '"' in after_attr:
                quote_pos = after_attr.index('"')
                rest = after_attr[quote_pos+1:]
                # If no closing quote found, we're inside the attribute
                if '"' not in rest:
                    return True
    
    # Check if we're inside a URL pattern like /api/... or .html
    line_start = content.rfind('\n', 0, match_start) + 1
    line = content[line_start:content.find('\n', match_end)]
    
    # Don't replace in href values
    if re.search(r'href\s*=\s*["\'][^"\']*$', content[line_start:match_start]):
        return True
    if re.search(r'src\s*=\s*["\'][^"\']*$', content[line_start:match_start]):
        return True
        
    # Don't replace if it looks like a file path or URL segment
    char_before = content[match_start-1] if match_start > 0 else ' '
    char_after = content[match_end] if match_end < len(content) else ' '
    if char_before in '/.':
        return True
    if char_after in '/.':
        return True
        
    return False

def fix_file(filepath):
    """Fix encoding in a single file."""
    # Try reading as UTF-8 first, then Latin-1
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        try:
            with open(filepath, 'r', encoding='latin-1') as f:
                content = f.read()
        except:
            return 0
    
    original = content
    changes = 0
    
    # Split into script and non-script sections
    # We'll be more careful in script sections
    parts = re.split(r'(<script[^>]*>)(.*?)(</script>)', content, flags=re.DOTALL | re.IGNORECASE)
    
    result = []
    for i, part in enumerate(parts):
        # Check if this is a script content section (index 2 in each group of 4)
        is_script = (i % 4 == 2)
        
        if is_script:
            # In script sections, only replace inside string literals
            # Replace in single-quoted and double-quoted strings
            def replace_in_strings(script_content):
                nonlocal changes
                new_content = script_content
                for pattern, replacement in REPLACEMENTS:
                    # Find matches and check if they're in string literals
                    def string_replacer(m):
                        nonlocal changes
                        pos = m.start()
                        # Check if inside a string literal
                        before = new_content[:pos]
                        # Count unescaped quotes
                        in_single = before.count("'") % 2 == 1
                        in_double = before.count('"') % 2 == 1
                        in_template = before.count('`') % 2 == 1
                        if in_single or in_double or in_template:
                            changes += 1
                            return replacement
                        return m.group(0)
                    new_content = re.sub(pattern, string_replacer, new_content)
                return new_content
            
            part = replace_in_strings(part)
        else:
            # In HTML sections, apply all replacements but protect URLs
            for pattern, replacement in REPLACEMENTS:
                def html_replacer(m):
                    nonlocal changes
                    if is_protected_context(part, m.start(), m.end()):
                        return m.group(0)
                    changes += 1
                    return replacement
                part = re.sub(pattern, html_replacer, part)
        
        result.append(part)
    
    content = ''.join(result)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        return changes
    return 0

# Collect all HTML files
patterns = [
    'modules/RH/public/pages/*.html',
    'modules/Financeiro/*.html', 
    'modules/Vendas/public/*.html',
    'modules/PCP/pages/*.html',
    'modules/Compras/*.html',
    'modules/Faturamento/public/*.html',
    'modules/NFe/*.html',
    'modules/Logistica/*.html',
]

total_files = 0
total_changes = 0
fixed_files = []

for pat in patterns:
    for filepath in glob.glob(os.path.join(BASE, pat)):
        fname = os.path.relpath(filepath, BASE)
        # Skip backup files
        if '_backup' in fname or '.bak' in fname or '.removed' in fname or 'pre-excel' in fname:
            continue
        try:
            changes = fix_file(filepath)
            total_files += 1
            if changes > 0:
                fixed_files.append((fname, changes))
                total_changes += changes
        except Exception as e:
            print(f'ERROR {fname}: {e}')

print(f'\nProcessed {total_files} files')
print(f'Fixed {len(fixed_files)} files with {total_changes} total replacements')
print(f'\nFixed files:')
for f, c in sorted(fixed_files):
    print(f'  {f}: {c} changes')
