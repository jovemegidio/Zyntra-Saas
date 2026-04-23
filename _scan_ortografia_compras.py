#!/usr/bin/env python3
# Varredura completa de ortografia nos HTMLs do módulo Compras
# Identifica erros de acentuação e digitação em texto visível

import re
import os

def extract_visible_text_blocks(html):
    """Extrai blocos de texto visível, preservando contexto de linha."""
    # Remove scripts, styles, comments
    html = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<!--.*?-->', ' ', html, flags=re.DOTALL)
    # Extract text between tags
    texts = re.findall(r'>([^<]+)<', html)
    return ' '.join(t.strip() for t in texts if t.strip())

# Dicionário de correções PT-BR: texto_errado -> texto_correto
# Chave: padrão (case-sensitive), Valor: substituto
CORRECTIONS = {
    # Palavras sem acento que deveriam ter (em contexto de interface)
    'Cotacao': 'Cotação',
    'cotacao': 'cotação',
    'Cotações': 'Cotações',  # já correto
    'Requisicao': 'Requisição',
    'requisicao': 'requisição',
    'Requisições': 'Requisições',  # já correto
    'Recebimento': 'Recebimento',  # já correto
    'Historico': 'Histórico',
    'historico': 'histórico',
    'Historicos': 'Históricos',
    'historicos': 'históricos',
    'Numero': 'Número',
    'numero': 'número',
    'Numeros': 'Números',
    'Codigo': 'Código',
    'codigo': 'código',
    'Codigos': 'Códigos',
    'Informacoes': 'Informações',
    'informacoes': 'informações',
    'Condicoes': 'Condições',
    'condicoes': 'condições',
    'Situacao': 'Situação',
    'situacao': 'situação',
    'Atualizacao': 'Atualização',
    'atualizacao': 'atualização',
    'Cancelacao': 'Cancelação',
    'cancelacao': 'cancelação',
    'Notificacao': 'Notificação',
    'notificacao': 'notificação',
    'Exportacao': 'Exportação',
    'exportacao': 'exportação',
    'Importacao': 'Importação',
    'importacao': 'importação',
    'Integracao': 'Integração',
    'integracao': 'integração',
    'Configuracao': 'Configuração',
    'configuracao': 'configuração',
    'Gestao': 'Gestão',
    'gestao': 'gestão',
    'Selecao': 'Seleção',
    'selecao': 'seleção',
    'Geracao': 'Geração',
    'geracao': 'geração',
    'Edicao': 'Edição',
    'edicao': 'edição',
    'Avaliacao': 'Avaliação',
    'avaliacao': 'avaliação',
    'Aprovacao': 'Aprovação',
    'aprovacao': 'aprovação',
    'Conclusao': 'Conclusão',
    'conclusao': 'conclusão',
    'Operacao': 'Operação',
    'operacao': 'operação',
    'Funcao': 'Função',
    'funcao': 'função',
    'Relacao': 'Relação',
    'relacao': 'relação',
    'Descricao': 'Descrição',
    'descricao': 'descrição',
    'Observacao': 'Observação',
    'observacao': 'observação',
    'Solicitacao': 'Solicitação',
    'solicitacao': 'solicitação',
    'Separacao': 'Separação',
    'separacao': 'separação',
    'Localizacao': 'Localização',
    'localizacao': 'localização',
    'Movimentacao': 'Movimentação',
    'movimentacao': 'movimentação',
    'Especificacao': 'Especificação',
    'especificacao': 'especificação',
    'Autorizacao': 'Autorização',
    'autorizacao': 'autorização',
    'Negociacao': 'Negociação',
    'negociacao': 'negociação',
    'Ocorrencia': 'Ocorrência',
    'ocorrencia': 'ocorrência',
    'Pendencia': 'Pendência',
    'pendencia': 'pendência',
    'Pendencias': 'Pendências',
    'pendencias': 'pendências',
    'Categoria': 'Categoria',  # já correto
    'Unidade': 'Unidade',  # já correto
    'Pagamento': 'Pagamento',  # já correto
    'Fornecedor': 'Fornecedor',  # já correto
    'Expiracao': 'Expiração',
    'expiracao': 'expiração',
    'Validacao': 'Validação',
    'validacao': 'validação',
    'Listagem': 'Listagem',  # já correto
    'Estoque': 'Estoque',  # já correto
    'Disponivel': 'Disponível',
    'disponivel': 'disponível',
    'Disponiveis': 'Disponíveis',
    'disponiveis': 'disponíveis',
    'Minimo': 'Mínimo',
    'minimo': 'mínimo',
    'Maximo': 'Máximo',
    'maximo': 'máximo',
    'Periodo': 'Período',
    'periodo': 'período',
    'Criacao': 'Criação',
    'criacao': 'criação',
    'Publicacao': 'Publicação',
    'publicacao': 'publicação',
    'Envio': 'Envio',  # já correto
    'Revisao': 'Revisão',
    'revisao': 'revisão',
    # Typos comuns
    'Fornecedro': 'Fornecedor',
    'fornecedro': 'fornecedor',
    'forncedor': 'fornecedor',
    'Forncedor': 'Fornecedor',
    'pediddo': 'pedido',
    'Pediddo': 'Pedido',
    'recebiemnto': 'recebimento',
    'Recebiemnto': 'Recebimento',
    'materais': 'materiais',
    'Materais': 'Materiais',
    'quantiddade': 'quantidade',
    'Quantiddade': 'Quantidade',
    # Pronomes sem acento
    ' nao ': ' não ',
    ' Nao ': ' Não ',
    '>Nao<': '>Não<',
    '>nao<': '>não<',
}

# Padrões a buscar em atributos visíveis (title=, placeholder=, alt=, aria-label=)
ATTR_PATTERNS = [
    (r'\btitle="([^"]*(?:cao|coes|Cao|Coes|Historico|Codigo|Numero|Minimo|Maximo|Periodo|Disponivel|Descricao|Observacao|Solicitacao|Aprovacao)[^"]*)"', 'title attribute'),
    (r'\bplaceholder="([^"]*(?:cao|coes|Historico|Codigo|Numero|Periodo|Descricao|Observacao)[^"]*)"', 'placeholder attribute'),
    (r'\baria-label="([^"]*(?:cao|coes|Historico|Codigo|Numero|Minimo|Maximo|Periodo|Descricao|Observacao)[^"]*)"', 'aria-label attribute'),
    (r'\balt="([^"]*(?:cao|coes|Historico|Codigo|Numero|Periodo)[^"]*)"', 'alt attribute'),
]

base = '/var/www/aluforce/modules/Compras'
html_files = sorted([f for f in os.listdir(base) if f.endswith('.html')])

all_results = {}

for fname in html_files:
    fpath = os.path.join(base, fname)
    text = open(fpath, encoding='utf-8', errors='replace').read()
    
    results = []
    
    # Check each correction in visible text
    for wrong, correct in CORRECTIONS.items():
        if wrong == correct:
            continue
        if wrong in text:
            count = text.count(wrong)
            results.append((wrong, correct, count))
    
    # Check attribute patterns
    for pat, attr_name in ATTR_PATTERNS:
        matches = re.findall(pat, text, re.IGNORECASE)
        for m in matches:
            results.append((f'[{attr_name}] {m}', '(needs manual check)', 1))
    
    if results:
        all_results[fname] = results
    
print('=== VARREDURA DE ORTOGRAFIA - MÓDULO COMPRAS ===\n')
total = 0
for fname, issues in all_results.items():
    print(f'\n📄 {fname}:')
    for wrong, correct, count in issues:
        if correct == '(needs manual check)':
            print(f'  ⚠ {wrong}')
        else:
            print(f'  ✗ {count}x "{wrong}" → "{correct}"')
            total += count

if not all_results:
    print('Nenhum erro de ortografia encontrado!')
else:
    print(f'\nTotal de erros encontrados: {total}')
