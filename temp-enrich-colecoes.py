#!/usr/bin/env python3
"""
Enrich thin collection pages by adding missing tutorial article links.
Each module collection should also include its relevant tutorials.
"""
import re, os

BASE = '/var/www/aluforce/ajuda/colecoes'

# Define what each collection SHOULD have (existing + new tutorials)
ADDITIONS = {
    'vendas.html': [
        ('tutorial-novo-pedido-venda.html', 'Tutorial: Criar Pedido de Venda', 'Passo a passo completo', 'fas fa-cart-plus'),
        ('tutorial-duplicar-pedido.html', 'Tutorial: Duplicar Pedido', 'Clone pedidos rapidamente', 'fas fa-copy'),
        ('tutorial-gerar-orcamento.html', 'Tutorial: Gerar Orçamento', 'Crie orçamentos para clientes', 'fas fa-file-invoice'),
        ('tutorial-acompanhar-comissoes.html', 'Tutorial: Acompanhar Comissões', 'Controle comissões de vendedores', 'fas fa-hand-holding-usd'),
        ('tutorial-exportar-pedido-pdf.html', 'Tutorial: Exportar Pedido PDF', 'Exporte pedidos em PDF', 'fas fa-file-pdf'),
        ('tutorial-prospeccao-b2b.html', 'Tutorial: Prospecção B2B', 'Busca inteligente de empresas', 'fas fa-search-dollar'),
        ('tutorial-dashboard-vendas.html', 'Tutorial: Dashboard de Vendas', 'Indicadores e métricas', 'fas fa-chart-pie'),
        ('tutorial-relatorios-vendas.html', 'Tutorial: Relatórios de Vendas', 'Análise de performance', 'fas fa-chart-bar'),
        ('tutorial-cadastrar-cliente.html', 'Tutorial: Cadastrar Cliente', 'Como cadastrar clientes', 'fas fa-user-plus'),
    ],
    'compras.html': [
        ('tutorial-novo-pedido-compra.html', 'Tutorial: Criar Pedido de Compra', 'Passo a passo completo', 'fas fa-shopping-basket'),
        ('tutorial-cotacao-fornecedores.html', 'Tutorial: Cotação de Fornecedores', 'Compare preços e condições', 'fas fa-balance-scale'),
        ('tutorial-entrada-nota-compra.html', 'Tutorial: Entrada de Nota', 'Dê entrada em notas de compra', 'fas fa-file-import'),
        ('tutorial-cadastrar-fornecedor.html', 'Tutorial: Cadastrar Fornecedor', 'Cadastre novos fornecedores', 'fas fa-user-plus'),
        ('tutorial-requisicao-compra.html', 'Tutorial: Requisição de Compra', 'Solicite compras internas', 'fas fa-clipboard-list'),
        ('tutorial-gestao-materia-prima.html', 'Tutorial: Gestão de Matéria-Prima', 'Controle matérias-primas', 'fas fa-cubes'),
        ('tutorial-relatorios-compras.html', 'Tutorial: Relatórios de Compras', 'Análise e relatórios', 'fas fa-chart-bar'),
    ],
    'notas-fiscais.html': [
        ('tutorial-emitir-nfe.html', 'Tutorial: Emitir NF-e', 'Passo a passo para emissão', 'fas fa-file-invoice'),
        ('tutorial-cancelar-nfe.html', 'Tutorial: Cancelar NF-e', 'Como cancelar notas emitidas', 'fas fa-ban'),
        ('tutorial-carta-correcao.html', 'Tutorial: Carta de Correção', 'Emita CC-e para correções', 'fas fa-pen'),
        ('tutorial-consultar-nfe.html', 'Tutorial: Consultar NF-e', 'Pesquise notas emitidas', 'fas fa-search'),
        ('tutorial-nfse.html', 'Tutorial: Emitir NFS-e', 'Nota Fiscal de Serviço', 'fas fa-file-alt'),
        ('tutorial-inutilizar-numeracao.html', 'Tutorial: Inutilizar Numeração', 'Inutilize faixas de numeração', 'fas fa-times-circle'),
    ],
    'financas.html': [
        ('tutorial-contas-pagar.html', 'Tutorial: Contas a Pagar', 'Como lançar pagamentos', 'fas fa-money-bill-wave'),
        ('tutorial-contas-receber.html', 'Tutorial: Contas a Receber', 'Como registrar recebimentos', 'fas fa-hand-holding-usd'),
        ('tutorial-fluxo-caixa.html', 'Tutorial: Fluxo de Caixa', 'Visualize entradas e saídas', 'fas fa-exchange-alt'),
        ('tutorial-conciliacao-bancaria.html', 'Tutorial: Conciliação Bancária', 'Concilie extratos bancários', 'fas fa-check-double'),
        ('tutorial-gestao-contas-bancarias.html', 'Tutorial: Contas Bancárias', 'Gerencie suas contas', 'fas fa-university'),
        ('tutorial-boletos.html', 'Tutorial: Boletos Bancários', 'Geração e gestão de boletos', 'fas fa-barcode'),
        ('tutorial-recorrencias.html', 'Tutorial: Recorrências', 'Automatize lançamentos periódicos', 'fas fa-sync-alt'),
        ('tutorial-impostos.html', 'Tutorial: Configurar Impostos', 'Parametrize tributos', 'fas fa-percentage'),
        ('tutorial-centros-custo.html', 'Tutorial: Centros de Custo', 'Organize por centro de custo', 'fas fa-sitemap'),
        ('tutorial-orcamentos.html', 'Tutorial: Orçamentos Financeiros', 'Crie e gerencie orçamentos', 'fas fa-calculator'),
        ('tutorial-relatorios-financeiros.html', 'Tutorial: Relatórios Financeiros', 'Análise financeira completa', 'fas fa-chart-line'),
    ],
    'contabilidade.html': [
        ('centros-custo.html', 'Centros de Custo', 'Organização contábil por centros', 'fas fa-sitemap'),
        ('impostos-configuracao.html', 'Configuração de Impostos', 'Parametrize impostos e tributos', 'fas fa-percentage'),
        ('dashboard-financeiro.html', 'Dashboard Financeiro', 'Visão consolidada das finanças', 'fas fa-chart-line'),
    ],
}

# Article card HTML template
def make_article_card(href, title, meta, icon):
    return f'''
                <a href="../artigos/{href}" class="article-card">
                    <div class="article-icon">
                        <i class="{icon}"></i>
                    </div>
                    <div class="article-content">
                        <h3 class="article-title">{title}</h3>
                        <p class="article-meta">{meta}</p>
                    </div>
                    <i class="fas fa-chevron-right article-arrow"></i>
                </a>'''

total_added = 0

for filename, additions in ADDITIONS.items():
    fpath = os.path.join(BASE, filename)
    if not os.path.exists(fpath):
        print(f'SKIP: {filename} not found')
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find which articles are already linked
    existing = set(re.findall(r'artigos/([^"]+\.html)', content))

    # Filter only new ones
    new_articles = [(h, t, m, i) for h, t, m, i in additions if h not in existing]

    if not new_articles:
        print(f'  OK: {filename} - all articles already present')
        continue

    # Build the HTML to insert
    new_html = ''
    for href, title, meta, icon in new_articles:
        new_html += make_article_card(href, title, meta, icon)

    # Insert BEFORE the first subcollection-card (related modules section) or before </div> closing articles-list
    # Try to find subcollection-card first
    insert_point = content.find('subcollection-card')
    if insert_point > 0:
        # Go back to the <a that starts the subcollection
        line_start = content.rfind('<a ', 0, insert_point)
        if line_start > 0:
            # Find proper indentation
            nl = content.rfind('\n', 0, line_start)
            indent = content[nl+1:line_start] if nl >= 0 else '                '
            content = content[:line_start] + '\n                <!-- Tutoriais Passo a Passo -->' + new_html + '\n\n' + indent + content[line_start:]
        else:
            content = content[:insert_point] + new_html + '\n' + content[insert_point:]
    else:
        # No subcollection, insert before </div> that closes articles-list
        close_point = content.rfind('</div>', 0, content.find('<!-- Footer'))
        if close_point > 0:
            content = content[:close_point] + '\n                <!-- Tutoriais Passo a Passo -->' + new_html + '\n            ' + content[close_point:]

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    total_added += len(new_articles)
    print(f'  ADDED {len(new_articles)} articles to {filename}: {", ".join(h for h,_,_,_ in new_articles)}')

print(f'\n=== TOTAL: {total_added} article links added across {len(ADDITIONS)} collection pages ===')
