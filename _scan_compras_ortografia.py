#!/usr/bin/env python3
# Varredura de ortografia em todos os HTMLs do módulo Compras
# Foca em texto visível (não IDs, não URLs, não CSS, não JS)

import os
import re

COMPRAS_DIR = '/var/www/aluforce/modules/Compras'

# Lista de erros comuns em PT-BR (padrão: (errado, correto))
SPELLING_FIXES = [
    # Erros de digitação comuns
    ('fornecedro', 'fornecedor'),
    ('forncedor', 'fornecedor'),
    ('Fornecedro', 'Fornecedor'),
    ('Forncedor', 'Fornecedor'),
    ('pediddo', 'pedido'),
    ('requisiçao', 'requisição'),
    ('requisiçãoo', 'requisição'),
    ('cotaçao', 'cotação'),
    ('recebiemnto', 'recebimento'),
    ('recebimeto', 'recebimento'),
    ('materais', 'materiais'),
    ('materiais', 'materiais'),  # já correto
    ('quantiddade', 'quantidade'),
    ('quantdade', 'quantidade'),
    ('forneceddor', 'fornecedor'),
    ('estoquee', 'estoque'),
    ('gesatão', 'gestão'),
    ('gesatao', 'gestão'),
    ('coataçao', 'cotação'),
    ('prazo de entrega', 'prazo de entrega'),  # já correto
    ('Prazo de Entrgea', 'Prazo de Entrega'),
    ('Prazo de Entrgea', 'Prazo de Entrega'),
    ('Soliciataçao', 'Solicitação'),
    ('solicitçao', 'solicitação'),
    ('Solicitçao', 'Solicitação'),
    ('aprovçao', 'aprovação'),
    ('Aprovçao', 'Aprovação'),
    ('Aprovaçao', 'Aprovação'),
    ('aprovaçao', 'aprovação'),
    ('categoira', 'categoria'),
    ('Categoira', 'Categoria'),
    ('uniddade', 'unidade'),
    ('Uniddade', 'Unidade'),
    ('refernecia', 'referência'),
    ('Refernecia', 'Referência'),
    ('observaçao', 'observação'),
    ('Observaçao', 'Observação'),
    ('notificçao', 'notificação'),
    ('Notificçao', 'Notificação'),
    ('notificaçao', 'notificação'),
    ('Notificaçao', 'Notificação'),
    ('itesn', 'itens'),
    ('Itesn', 'Itens'),
    ('valorr', 'valor'),
    ('Valorr', 'Valor'),
    ('descriçao', 'descrição'),
    ('Descriçao', 'Descrição'),
    ('condiçoes', 'condições'),
    ('Condiçoes', 'Condições'),
    ('dataas', 'datas'),
    ('Dataas', 'Datas'),
    ('fornecedor\xad', 'fornecedor'),  # soft hyphen
    # Palavras com acentos errados visíveis
    ('cotaçao', 'cotação'),
    ('ediçao', 'edição'),
    ('gestaõ', 'gestão'),
    ('requisiçaõ', 'requisição'),
    # Ortografia
    ('Nenhun', 'Nenhum'),
    ('nenhun', 'nenhum'),
    ('disponiveis', 'disponíveis'),
    ('Disponiveis', 'Disponíveis'),
    ('disponivél', 'disponível'),
    ('Disponivél', 'Disponível'),
    ('ativo', 'ativo'),  # já correto
    ('Historico', 'Histórico'),
    ('historico', 'histórico'),
    ('Numero', 'Número'),
    ('numero', 'número'),
    ('Codigo', 'Código'),
    ('codigo', 'código'),
    ('Categoria', 'Categoria'),  # já correto
    ('Orcamento', 'Orçamento'),
    ('orcamento', 'orçamento'),
    ('Pesquisa', 'Pesquisa'),  # já correto
    ('Pesquisa', 'Pesquisa'),  # já correto
    ('Orgao', 'Órgão'),
    ('orgao', 'órgão'),
    ('nao', 'não'),  # pode ser parte de palavras, cuidado
    ('Nao ', 'Não '),
    ('nao ', 'não '),
    ('Nao\n', 'Não\n'),
    ('Sem condiçoes', 'Sem condições'),
    ('Condiçoes de Pagamento', 'Condições de Pagamento'),
    ('Informaçoes', 'Informações'),
    ('informaçoes', 'informações'),
    ('Situaçao', 'Situação'),
    ('situaçao', 'situação'),
    ('Avaliaçao', 'Avaliação'),
    ('avaliaçao', 'avaliação'),
    ('Visualizaçao', 'Visualização'),
    ('visualizaçao', 'visualização'),
    ('Integraçao', 'Integração'),
    ('integraçao', 'integração'),
    ('Configuraçao', 'Configuração'),
    ('configuraçao', 'configuração'),
    ('Importaçao', 'Importação'),
    ('importaçao', 'importação'),
    ('Exportaçao', 'Exportação'),
    ('exportaçao', 'exportação'),
    ('Cancelaçao', 'Cancelação'),
    ('cancelaçao', 'cancelamento'),
    ('Geraçao', 'Geração'),
    ('geraçao', 'geração'),
    ('Atualizaçao', 'Atualização'),
    ('atualizaçao', 'atualização'),
    ('Concluzao', 'Conclusão'),
    ('concluzao', 'conclusão'),
    ('Conclusao', 'Conclusão'),
    ('conclusao', 'conclusão'),
    ('Salvaçao', 'Salvamento'),
    ('Seleçao', 'Seleção'),
    ('seleçao', 'seleção'),
    ('Ediçao', 'Edição'),
    ('ediçao', 'edição'),
    ('Operaçao', 'Operação'),
    ('operaçao', 'operação'),
    ('Permissao', 'Permissão'),
    ('permissao', 'permissão'),
    ('Funçao', 'Função'),
    ('funçao', 'função'),
    ('Relaçao', 'Relação'),
    ('relaçao', 'relação'),
    ('Exceçao', 'Exceção'),
    ('exceçao', 'exceção'),
]

html_files = [f for f in os.listdir(COMPRAS_DIR) if f.endswith('.html')]
html_files.sort()

total_fixes = 0
report = []

for fname in html_files:
    fpath = os.path.join(COMPRAS_DIR, fname)
    data = open(fpath, 'rb').read()
    text = data.decode('utf-8', errors='replace')
    
    fixes_in_file = []
    for wrong, correct in SPELLING_FIXES:
        if wrong == correct:
            continue
        if wrong in text:
            count = text.count(wrong)
            fixes_in_file.append((wrong, correct, count))
            text = text.replace(wrong, correct)
    
    if fixes_in_file:
        report.append(f'\n{fname}:')
        for wrong, correct, count in fixes_in_file:
            report.append(f'  {count}x: "{wrong}" → "{correct}"')
            total_fixes += count
        open(fpath, 'wb').write(text.encode('utf-8'))

print('\n'.join(report) if report else 'Nenhum erro encontrado na lista de fixes.')
print(f'\nTotal de substituições: {total_fixes}')
print('\nNow scanning for remaining accented-but-visible words (not IDs) in HTML text...')

# Scan remaining visible text with wrong cedillas/tildes (missing accent)
# These would be in tag content, not inside id="" or class="" or style=""
accent_pattern = re.compile(r'(?<![a-zA-Z-_"])([a-z]+(?:cao|çao|coes|çoes|ceo|aco)[a-z]*)', re.IGNORECASE)
for fname in html_files:
    fpath = os.path.join(COMPRAS_DIR, fname)
    text = open(fpath, encoding='utf-8', errors='replace').read()
    lines = text.split('\n')
    for i, line in enumerate(lines, 1):
        # Only check visible text (inside tags), skip JS/CSS/attribute values
        if re.search(r'(?:cao|coes)\b', line, re.IGNORECASE):
            stripped = line.strip()
            # Skip if it's inside a comment, script, style block mostly
            if any(stripped.startswith(x) for x in ['var ', 'const ', 'let ', 'function ', '//', '/*', '*', 'if ', 'return ', 'case ']):
                continue
            if 'getElementById' in stripped or 'fetch(' in stripped or 'querySelector' in stripped:
                continue
            if 'className' in stripped or '.css' in stripped or 'href=' in stripped:
                continue
            print(f'  {fname}:{i}: {stripped[:100]}')
