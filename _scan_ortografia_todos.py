#!/usr/bin/env python3
# Varredura ortográfica completa de todos os módulos (exceto Compras, já verificado)
# Verifica SOMENTE texto visível: nós de texto HTML + atributos visuais (title, placeholder, aria-label, alt)
# NÃO altera nada — apenas reporta

import re, os

MODULES_BASE = '/var/www/aluforce/modules'
SKIP = {'Compras', 'Financeiro_backup_20260319', '_shared', 'config', 'vendas', 'desktop.ini'}

# Palavras sem acento que deveriam ter acento em PT-BR
WORDS_TO_CHECK = [
    # Sem acento → com acento
    ('Cotacao', 'Cotação'), ('cotacao', 'cotação'),
    ('Cotacoes', 'Cotações'), ('cotacoes', 'cotações'),
    ('Requisicao', 'Requisição'), ('requisicao', 'requisição'),
    ('Requisicoes', 'Requisições'), ('requisicoes', 'requisições'),
    ('Numero', 'Número'), ('numero', 'número'),
    ('Numeros', 'Números'), ('numeros', 'números'),
    ('Codigo', 'Código'), ('codigo', 'código'),
    ('Codigos', 'Códigos'), ('codigos', 'códigos'),
    ('Historico', 'Histórico'), ('historico', 'histórico'),
    ('Historicos', 'Históricos'), ('historicos', 'históricos'),
    ('Gestao', 'Gestão'), ('gestao', 'gestão'),
    ('Selecao', 'Seleção'), ('selecao', 'seleção'),
    ('Edicao', 'Edição'), ('edicao', 'edição'),
    ('Descricao', 'Descrição'), ('descricao', 'descrição'),
    ('Observacao', 'Observação'), ('observacao', 'observação'),
    ('Observacoes', 'Observações'), ('observacoes', 'observações'),
    ('Solicitacao', 'Solicitação'), ('solicitacao', 'solicitação'),
    ('Aprovacao', 'Aprovação'), ('aprovacao', 'aprovação'),
    ('Avaliacao', 'Avaliação'), ('avaliacao', 'avaliação'),
    ('Atualizacao', 'Atualização'), ('atualizacao', 'atualização'),
    ('Cancelacao', 'Cancelação'), ('cancelacao', 'cancelamento'),
    ('Notificacao', 'Notificação'), ('notificacao', 'notificação'),
    ('Exportacao', 'Exportação'), ('exportacao', 'exportação'),
    ('Importacao', 'Importação'), ('importacao', 'importação'),
    ('Integracao', 'Integração'), ('integracao', 'integração'),
    ('Configuracao', 'Configuração'), ('configuracao', 'configuração'),
    ('Condicoes', 'Condições'), ('condicoes', 'condições'),
    ('Situacao', 'Situação'), ('situacao', 'situação'),
    ('Periodo', 'Período'), ('periodo', 'período'),
    ('Minimo', 'Mínimo'), ('minimo', 'mínimo'),
    ('Maximo', 'Máximo'), ('maximo', 'máximo'),
    ('Disponivel', 'Disponível'), ('disponivel', 'disponível'),
    ('Disponiveis', 'Disponíveis'), ('disponiveis', 'disponíveis'),
    ('Movimentacao', 'Movimentação'), ('movimentacao', 'movimentação'),
    ('Informacoes', 'Informações'), ('informacoes', 'informações'),
    ('Validacao', 'Validação'), ('validacao', 'validação'),
    ('Criacao', 'Criação'), ('criacao', 'criação'),
    ('Geracao', 'Geração'), ('geracao', 'geração'),
    ('Negociacao', 'Negociação'), ('negociacao', 'negociação'),
    ('Pendencia', 'Pendência'), ('pendencia', 'pendência'),
    ('Pendencias', 'Pendências'), ('pendencias', 'pendências'),
    ('Autorizacao', 'Autorização'), ('autorizacao', 'autorização'),
    ('Especificacao', 'Especificação'), ('especificacao', 'especificação'),
    ('Localizacao', 'Localização'), ('localizacao', 'localização'),
    ('Separacao', 'Separação'), ('separacao', 'separação'),
    ('Conclusao', 'Conclusão'), ('conclusao', 'conclusão'),
    ('Operacao', 'Operação'), ('operacao', 'operação'),
    ('Revisao', 'Revisão'), ('revisao', 'revisão'),
    ('Publicacao', 'Publicação'), ('publicacao', 'publicação'),
    ('Relacao', 'Relação'), ('relacao', 'relação'),
    ('Funcao', 'Função'), ('funcao', 'função'),
    ('Deducao', 'Dedução'), ('deducao', 'dedução'),
    ('Producao', 'Produção'), ('producao', 'produção'),
    ('Emissao', 'Emissão'), ('emissao', 'emissão'),
    ('Composicao', 'Composição'), ('composicao', 'composição'),
    ('Proporcao', 'Proporção'), ('proporcao', 'proporção'),
    ('Distribuicao', 'Distribuição'), ('distribuicao', 'distribuição'),
    ('Competencia', 'Competência'), ('competencia', 'competência'),
    ('Referencia', 'Referência'), ('referencia', 'referência'),
    ('Sequencia', 'Sequência'), ('sequencia', 'sequência'),
    ('Frequencia', 'Frequência'), ('frequencia', 'frequência'),
    ('Ocorrencia', 'Ocorrência'), ('ocorrencia', 'ocorrência'),
    ('Transferencia', 'Transferência'), ('transferencia', 'transferência'),
    ('Diferenca', 'Diferença'), ('diferenca', 'diferença'),
    ('Licenca', 'Licença'), ('licenca', 'licença'),
    ('Servico', 'Serviço'), ('servico', 'serviço'),
    ('Servicos', 'Serviços'), ('servicos', 'serviços'),
    ('Comercial', 'Comercial'),  # já correto
    ('Orcamento', 'Orçamento'), ('orcamento', 'orçamento'),
    ('Orcamentos', 'Orçamentos'), ('orcamentos', 'orçamentos'),
    ('Lancamento', 'Lançamento'), ('lancamento', 'lançamento'),
    ('Lancamentos', 'Lançamentos'), ('lancamentos', 'lançamentos'),
    ('Conciliacao', 'Conciliação'), ('conciliacao', 'conciliação'),
    ('Previsao', 'Previsão'), ('previsao', 'previsão'),
    ('Realizacao', 'Realização'), ('realizacao', 'realização'),
    ('Declaracao', 'Declaração'), ('declaracao', 'declaração'),
    ('Tributacao', 'Tributação'), ('tributacao', 'tributação'),
    ('Retencao', 'Retenção'), ('retencao', 'retenção'),
    ('Deducoes', 'Deduções'), ('deducoes', 'deduções'),
    ('Beneficios', 'Benefícios'), ('beneficios', 'benefícios'),
    ('Ferias', 'Férias'), ('ferias', 'férias'),
    ('Rescisao', 'Rescisão'), ('rescisao', 'rescisão'),
    ('Admissao', 'Admissão'), ('admissao', 'admissão'),
    ('Demissao', 'Demissão'), ('demissao', 'demissão'),
    ('Remuneracao', 'Remuneração'), ('remuneracao', 'remuneração'),
    ('Funciona rio', 'Funcionário'),  # typo com espaço
    ('Funcionario', 'Funcionário'), ('funcionario', 'funcionário'),
    ('Funcionarios', 'Funcionários'), ('funcionarios', 'funcionários'),
    ('Categoria', 'Categoria'),  # já correto
    ('Veiculo', 'Veículo'), ('veiculo', 'veículo'),
    ('Veiculos', 'Veículos'), ('veiculos', 'veículos'),
    ('Fatura', 'Fatura'),  # já correto
    ('Faturamento', 'Faturamento'),  # já correto
    ('Medicao', 'Medição'), ('medicao', 'medição'),
    ('Alocacao', 'Alocação'), ('alocacao', 'alocação'),
    ('Formacao', 'Formação'), ('formacao', 'formação'),
    ('Capacitacao', 'Capacitação'), ('capacitacao', 'capacitação'),
    ('Posicao', 'Posição'), ('posicao', 'posição'),
    ('Correcao', 'Correção'), ('correcao', 'correção'),
    ('Projeco', 'Projeção'), ('projecao', 'projeção'),
    # Typos de digitação
    ('Fornecedro', 'Fornecedor'), ('fornecedro', 'fornecedor'),
    ('Forncedor', 'Fornecedor'), ('forncedor', 'fornecedor'),
    ('Recebiemnto', 'Recebimento'), ('recebiemnto', 'recebimento'),
    ('Materais', 'Materiais'), ('materais', 'materiais'),
    ('Pediddo', 'Pedido'), ('pediddo', 'pedido'),
    ('Clinte', 'Cliente'), ('clinte', 'cliente'),
    ('Clientes', 'Clientes'),  # já correto
    ('Fornecddor', 'Fornecedor'),
    ('Reltatorio', 'Relatório'), ('reltatorio', 'relatório'),
    ('Relatorios', 'Relatórios'),  # já correto
    ('Emitir', 'Emitir'),  # já correto
    ('emissao', 'emissão'),
    ('Condicao', 'Condição'), ('condicao', 'condição'),
    ('Vencimeto', 'Vencimento'), ('vencimeto', 'vencimento'),
]

def extract_visible_texts(html):
    """Extrai nós de texto + valores de atributos visíveis (fora de script/style)."""
    clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r'<!--.*?-->', '', clean, flags=re.DOTALL)
    
    texts = []
    # Text nodes
    for node in re.findall(r'>([^<]+)<', clean):
        stripped = node.strip()
        if stripped and re.search(r'[a-zA-ZÀ-ÿ]{2,}', stripped):
            texts.append(('text', stripped))
    
    # Visible attributes
    for attr in ['title', 'placeholder', 'aria-label', 'alt', 'data-title', 'data-tooltip', 'data-content']:
        for m in re.finditer(rf'(?i){attr}="([^"]+)"', clean):
            val = m.group(1).strip()
            if re.search(r'[a-zA-ZÀ-ÿ]{2,}', val):
                texts.append((attr, val))
    
    # Option texts
    for m in re.finditer(r'<option[^>]*>([^<]+)</option>', clean, re.IGNORECASE):
        val = m.group(1).strip()
        if re.search(r'[a-zA-ZÀ-ÿ]{2,}', val):
            texts.append(('option', val))
    
    return texts

grand_total = 0
results_by_module = {}

for module in sorted(os.listdir(MODULES_BASE)):
    if module in SKIP:
        continue
    mod_path = os.path.join(MODULES_BASE, module)
    if not os.path.isdir(mod_path):
        continue
    
    html_files = sorted([f for f in os.listdir(mod_path) if f.endswith('.html')])
    if not html_files:
        continue
    
    module_issues = {}
    
    for fname in html_files:
        fpath = os.path.join(mod_path, fname)
        html = open(fpath, encoding='utf-8', errors='replace').read()
        texts = extract_visible_texts(html)
        
        file_issues = []
        for kind, text in texts:
            for wrong, correct in WORDS_TO_CHECK:
                if wrong == correct:
                    continue
                pat = r'(?<![a-zA-ZÀ-ÿ])' + re.escape(wrong) + r'(?![a-zA-ZÀ-ÿ])'
                if re.search(pat, text):
                    file_issues.append((kind, wrong, correct, text[:120]))
                    break
        
        if file_issues:
            module_issues[fname] = file_issues
    
    if module_issues:
        results_by_module[module] = module_issues

print('=' * 65)
print('VARREDURA ORTOGRÁFICA — TODOS OS MÓDULOS (texto visível)')
print('=' * 65)

if not results_by_module:
    print('\nNenhum erro encontrado em nenhum módulo! ✓')
else:
    for module, files in results_by_module.items():
        print(f'\n\n📁 MÓDULO: {module}')
        for fname, issues in files.items():
            print(f'  📄 {fname}:')
            for kind, wrong, correct, ctx in issues:
                print(f'       [{kind}] "{wrong}" → "{correct}"')
                print(f'         Contexto: ...{ctx[:80]}...')
                grand_total += 1

print(f'\n{"="*65}')
print(f'Total de erros em texto visível: {grand_total}')
