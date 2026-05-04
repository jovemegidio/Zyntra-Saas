# Catálogo Completo de Relatórios — Zyntra ERP

> Levantamento exaustivo de **todos** os relatórios disponíveis em cada módulo do sistema.
> Gerado em: 27/03/2026

---

## 1. MÓDULO VENDAS

**Página principal:** `modules/Vendas/public/relatorios.html`
**Título:** Central de Relatórios — Análises e métricas de desempenho comercial

### 1.1 Painel Principal (Dashboard Inline)

| # | Relatório / Seção | Descrição | Conteúdo |
|---|---|---|---|
| 1 | **Total de Pedidos** (KPI) | Cartão com total de pedidos no período filtrado | KPI numérico |
| 2 | **Faturamento Total** (KPI) | Valor total faturado (R$) | KPI monetário |
| 3 | **Ticket Médio** (KPI) | Valor médio por pedido | KPI monetário |
| 4 | **Vendedores Ativos** (KPI) | Nº de vendedores com pedidos no período | KPI numérico |
| 5 | **Evolução das Vendas** | Gráfico de área/linha: vendas ao longo do tempo (por valor ou quantidade) | Chart.js — alternável valor/quantidade |
| 6 | **Pedidos por Status** | Gráfico pizza com distribuição de pedidos por status | Chart.js Pie |
| 7 | **Top Vendedores** | Tabela rankeada: #, Vendedor, Vendas, Valor Total | Tabela |
| 8 | **Produto + Tabela Detalhada** | Grid de tabelas complementares | Tabela |

**Exportação:** PDF (botão `Exportar PDF`), Excel (via `exportarExcel()`)

### 1.2 Relatórios PDF (Modais dedicados)

| # | Relatório | Endpoint Backend | Filtros | Descrição |
|---|---|---|---|---|
| 1 | **Vendas por Período** | `GET /api/vendas/relatorios/vendas-periodo/pdf` | Data início, Data fim, Vendedor, Status do Pedido | Listagem completa de pedidos no período, formato A4 paisagem. |
| 2 | **Comissões por Categoria** | `GET /api/vendas/relatorios/comissoes/pdf` | Data início, Data fim, Vendedor | Comissões calculadas por categoria de produto (Power 2%, Multiplexados 1%, Outros 1%). |
| 3 | **Análise de Clientes** | `GET /api/vendas/relatorios/clientes/pdf` | Cliente, Status (Ativo/Inativo/Prospecto), Cidade, Estado, Ordenação | Relatório de clientes com dados de faturamento e quantidade de pedidos. |
| 4 | **Performance de Produtos** | `GET /api/vendas/relatorios/produtos/pdf` | Data início, Data fim, Ordenação (valor/quantidade/pedidos) | Ranking dos produtos com maior performance de vendas. |

**Exportação:** Todos geram PDF. Cada modal tem: Gerar PDF, Pré-visualizar, Limpar Filtros.

---

## 2. MÓDULO FINANCEIRO

**Página principal:** `modules/Financeiro/relatorios.html`
**Título:** Relatórios Financeiros

### 2.1 KPIs Resumo

| # | KPI | Descrição |
|---|---|---|
| 1 | **Total a Receber** | Soma de títulos a receber no período |
| 2 | **Total a Pagar** | Soma de títulos a pagar no período |
| 3 | **Saldo Projetado** | Diferença entre receber e pagar |
| 4 | **Saldo em Contas** | Saldo bancário atual |

### 2.2 Aba: Contas a Receber (CR)

| # | Relatório | Descrição | Exportação |
|---|---|---|---|
| 1 | **Nova Operação de Desconto** | Antecipação de recebíveis com cálculo automático de taxas e IOF | Ação (modal) |
| 2 | **Títulos Liquidados** | Títulos pagos/recebidos no período selecionado | PDF, Excel, Visualizar |
| 3 | **Títulos Vencidos** | Títulos com vencimento ultrapassado e não liquidados | PDF, Excel, Visualizar |
| 4 | **Títulos a Vencer** | Títulos com vencimento futuro, organizados por data | PDF, Excel, Visualizar |
| 5 | **Por Cliente** | Títulos a receber agrupados por cliente, com totais | PDF, Excel, Visualizar |
| 6 | **Contas a Receber por Período** | Relatório detalhado com filtros por período, cliente e banco sacado | PDF, Excel, Filtrar |
| 7 | **Portador "Carteira"** | Títulos em carteira (não enviados para cobrança bancária) | PDF, Excel, Visualizar |
| 8 | **Descontos** | Histórico de operações de desconto de títulos realizadas | PDF, Excel, Visualizar |

### 2.3 Aba: Contas a Pagar (CP)

| # | Relatório | Descrição | Exportação |
|---|---|---|---|
| 1 | **Por Fornecedor** | Títulos a pagar agrupados por fornecedor, com totais | PDF, Excel, Visualizar |
| 2 | **Contas a Pagar por Período** | Relatório detalhado com filtros por período, fornecedor e banco | PDF, Excel, Filtrar |

### 2.4 Relatórios Analíticos (ambas as abas)

| # | Relatório | Descrição | Exportação |
|---|---|---|---|
| 1 | **Resumo do Período** | Cards com Receita Bruta, Despesas Totais, Resultado Líquido, Margem Líquida | Tela |
| 2 | **Receitas vs Despesas** | Gráfico de barras comparando receitas e despesas mensais | Chart.js |
| 3 | **Despesas por Categoria** | Gráfico pizza de categorias de despesa | Chart.js |
| 4 | **DRE Simplificado** | Demonstração de Resultado do Exercício completa (Receita Bruta → Resultado Líquido) | Excel (botão Exportar) |

### 2.5 Endpoints Backend Financeiro

| Endpoint | Descrição |
|---|---|
| `GET /api/financeiro/relatorios/dre` | DRE — Demonstração do Resultado do Exercício |
| `GET /api/financeiro/relatorios/lucratividade` | Relatório de lucratividade |
| `POST /api/financeiro/relatorios/personalizar` | Salvar relatório personalizado |
| `GET /api/financeiro/relatorios/personalizar` | Carregar relatórios personalizados |

**Funcionalidades extras:** Botão Baixar Templates, Botão Agendar (relatórios programados), Botão Imprimir.

---

## 3. MÓDULO PCP — CENTRAL DE RELATÓRIOS

**Página principal:** `modules/PCP/pages/relatorios.html`
**Título:** Central de Relatórios

### 3.1 Relatórios por Abas

| # | Aba/Tab | Subtítulo | Endpoint Backend | KPIs | Gráficos | Tabelas |
|---|---|---|---|---|---|---|
| 1 | **Cabos Mais Vendidos** | Ranking por quantidade e valor | `GET /api/pcp/relatorios/cabos-mais-vendidos` | Produtos Diferentes, Qtd Total Vendida, Valor Total em Vendas, Total de Pedidos | Barras: Top Cabos por Quantidade | Ranking Completo (Código, Descrição, Qtd, Unid., Valor, Pedidos, Preço Médio) |
| 2 | **Ranking de Vendas** | Por vendedor e cliente | `GET /api/pcp/relatorios/ranking-vendas` | Total de Pedidos, Faturamento Total, Ticket Médio, Vendedores Ativos | Linha: Evolução Mensal de Vendas | Ranking por Vendedor + Ranking por Cliente (2 tabelas) |
| 3 | **Metros Produzidos** | Produção diária detalhada | `GET /api/pcp/relatorios/metros-produzidos` | Total Produzido, Média Diária, Melhor Dia (Recorde), Dias com Produção | Área: Produção Diária por Apontamentos + Barras: Metragem por OPs | Detalhamento Diário (Data, Qtd, Apontamentos, Tempo, Máquinas, Operadores) |
| 4 | **Faturamento Mensal** | Análise financeira anual | `GET /api/pcp/relatorios/faturamento-mensal` | Faturamento do Ano, Total Pedidos Faturados, Ticket Médio, Faturamento Ano Anterior | Colunas: Faturamento Mensal – Visão Anual | Faturamento por Mês + Top Clientes do Ano (2 tabelas) |

**Exportação:** CSV (botão `Exportar CSV`), Imprimir/PDF (botão `Imprimir` → window.print com @media print)
**Filtros por tab:** Data início/fim, presets (7 dias, 30 dias, Este Ano, 90 dias), Top N (10/20/50), Ano de referência.

---

## 4. MÓDULO PCP — RELATÓRIOS DE APONTAMENTOS

**Página principal:** `modules/PCP/relatorios-apontamentos.html`
**Título:** Relatórios de Produção

### 4.1 KPIs

| # | KPI | Descrição |
|---|---|---|
| 1 | **Funcionários Ativos** | Nº de funcionários com apontamentos |
| 2 | **Horas Trabalhadas** | Total de horas registradas |
| 3 | **Horas em Produção** | Total de horas efetivas de produção |
| 4 | **Total Apontamentos** | Nº de registros de apontamento |
| 5 | **Eficiência Geral** | Percentual de eficiência produtiva |

### 4.2 Conteúdo

| # | Seção | Descrição |
|---|---|---|
| 1 | **Apontamentos Detalhados** | Tabela completa: Funcionário, Atividade, Data, Início, Fim, Duração, OP, Pedido, Observações |
| 2 | **Sidebar — Funcionários** | Cards de funcionários com foto, cargo, stats |
| 3 | **Sidebar — Eficiência** | Grid de eficiência (4 métricas) |
| 4 | **Sidebar — Atividades** | Barra de distribuição de atividades + legenda |

**Filtros:** Data início/fim, Funcionário, Atividade (Setup, Produção, Parada Refeição, Manutenção, Falta MP, etc.), Pedido.
**Exportação:** CSV (botão `Exportar CSV`), Download (botão header).
**Endpoint:** `GET /api/pcp/apontamentos/relatorio`

---

## 5. MÓDULO NFe (NOTAS FISCAIS)

**Página principal:** `modules/NFe/relatorios.html`
**Título:** Relatórios Faturamento

### 5.1 Seção: Ordens de Serviço

| # | Relatório | Descrição |
|---|---|---|
| 1 | **OS Abertas** | Ordens de serviço em aberto |
| 2 | **OS por Período** | Filtrar por data de abertura |
| 3 | **OS por Técnico** | Agrupado por técnico responsável |
| 4 | **OS por Status** | Distribuição por status atual |

### 5.2 Seção: Contratos de Serviço

| # | Relatório | Descrição |
|---|---|---|
| 1 | **Contratos Ativos** | Contratos vigentes |
| 2 | **Contratos por Vencimento** | Próximos a vencer |
| 3 | **Contratos por Valor** | Ordenados por valor mensal |
| 4 | **Contratos por Cliente** | Agrupado por cliente |
| 5 | **Renovações Pendentes** | Contratos para renovação |
| 6 | **Contratos Cancelados** | Histórico de cancelamentos |
| 7 | **Receita Recorrente** | MRR e evolução mensal |

### 5.3 Seção: Faturamento

| # | Relatório | Descrição |
|---|---|---|
| 1 | **Faturamento Mensal** | Total faturado por mês |
| 2 | **NFe por Status** | Autorizadas, canceladas, pendentes |
| 3 | **Top Clientes** | Maiores compradores |
| 4 | **Produtos Mais Vendidos** | Ranking de produtos |
| 5 | **Impostos Recolhidos** | ICMS, IPI, PIS, COFINS |
| 6 | **Comparativo Anual** | Ano atual vs anterior |

**Exportação:** PDF (modal preview com `Exportar PDF`), Imprimir. 
**Endpoint:** `GET /api/nfe/relatorios/faturamento`

---

## 6. MÓDULO FATURAMENTO

**Página principal:** `modules/Faturamento/public/relatorios.html`
**Título:** Relatórios Gerenciais — Geração de relatórios de NF-e, faturamento, OS, contratos e logística

### 6.1 Seção: Ordens de Serviço

| # | Relatório | Descrição |
|---|---|---|
| 1 | **OS Abertas** | Listagem de ordens em andamento |
| 2 | **OS Concluídas** | Ordens finalizadas no período |
| 3 | **OS Pendentes** | Aguardando aprovação ou peças |
| 4 | **OS por Técnico** | Distribuição por responsável |
| 5 | **Faturamento OS** | Receita gerada pelas OS |

### 6.2 Seção: Contratos

| # | Relatório | Descrição |
|---|---|---|
| 1 | **Contratos Ativos** | Contratos em vigência |
| 2 | **A Vencer** | Próximos vencimentos |
| 3 | **Vencidos** | Contratos já vencidos |
| 4 | **Receita Contratos** | Receita mensal recorrente |
| 5 | **Contratos por Cliente** | Agrupamento por cliente |

### 6.3 Seção: Faturamento & NF-e

| # | Relatório | Descrição |
|---|---|---|
| 1 | **NF-e Emitidas** | Todas notas emitidas no período |
| 2 | **NF-e Canceladas** | Notas canceladas |
| 3 | **Faturamento Mensal** | Evolução do faturamento |
| 4 | **Impostos** | Resumo de impostos retidos |
| 5 | **Por Cliente** | Faturamento por cliente |
| 6 | **Logística** | Entregas e expedição |
| 7 | **Inadimplência** | Títulos em atraso |

**Exportação:** PDF (modal com `Exportar PDF`), Imprimir, Excel (via SheetJS/xlsx).
**Filtros globais:** Data início, Data fim, Status (Autorizada/Cancelada/Pendente).

---

## 7. MÓDULO COMPRAS

**Página principal:** `modules/Compras/relatorios.html`
**Título:** Relatórios de Compras — Geração e exportação de relatórios do módulo de compras

### 7.1 KPIs

| # | KPI | Descrição |
|---|---|---|
| 1 | **Total de Pedidos** | Nº de pedidos de compra |
| 2 | **Valor Total** | Soma dos valores de pedidos (R$) |
| 3 | **Fornecedores Ativos** | Nº de fornecedores com movimentação |
| 4 | **Materiais Críticos** | Nº de materiais abaixo do estoque mínimo |

### 7.2 Relatórios PDF (Cards)

| # | Relatório | Classe CSS | Descrição | Exportação |
|---|---|---|---|---|
| 1 | **Relatório de Pedidos** | `rc-pedidos` | Histórico completo de pedidos de compra com valores, fornecedores e status | PDF |
| 2 | **Relatório de Fornecedores** | `rc-fornecedores` | Cadastro de fornecedores, avaliações, categorias e dados de contato | PDF |
| 3 | **Relatório de Estoque** | `rc-estoque` | Posição de estoque, materiais críticos, custos e níveis de reposição | PDF |
| 4 | **Movimentações** | `rc-movimentacoes` | Entradas, saídas e ajustes de estoque por período com rastreabilidade | PDF |
| 5 | **Materiais Críticos** | `rc-criticos` | Materiais abaixo do estoque mínimo que necessitam de reposição urgente | PDF |
| 6 | **Relatório de Cotações** | `rc-cotacoes` | Análise comparativa de cotações, economia obtida e fornecedores selecionados | PDF |

### 7.3 Tabelas Complementares

| # | Tabela | Descrição |
|---|---|---|
| 1 | **Últimos Pedidos** | Nº, Fornecedor, Valor, Status (últimos 10) |
| 2 | **Materiais Críticos** | Material, Atual, Mínimo, Status (Crítico/Baixo) |

**Exportação:** Todos os 6 relatórios geram PDF via modal com filtros Data Início/Fim.
**Endpoint:** `GET /api/compras/relatorios/gastos-periodo`

---

## 8. MÓDULO RH (RECURSOS HUMANOS)

**Página de Gestão de Holerites:** `modules/RH/public/gestao-holerites.html`
**Título:** Gestão de Holerites

### 8.1 Relatório de Visualizações de Holerites

| # | Relatório | Descrição | Exportação |
|---|---|---|---|
| 1 | **Relatório de Visualizações** | Listagem de holerites com status de visualização por funcionário, filtrado por mês/ano | HTML (iframe / nova aba) |

**Endpoint:** `GET /api/rh/holerites/relatorio/visualizacoes?mes=&ano=`

### 8.2 Página de Relatório Final RH (legado)

**Arquivo:** `public/relatorio-final-rh.html`
**Título:** Relatório Final — Módulo RH Corrigido

| # | Seção | Descrição |
|---|---|---|
| 1 | **Status das Correções** | Cards de status: IDs Duplicados, Função salvarFuncionario, APIs de Estatísticas |
| 2 | **Correções Aplicadas** | Lista detalhada de correções (IDs, busca, acessibilidade, erros) |
| 3 | **Testes do Sistema** | Botões de teste: Navegação, Modais, APIs, Recarregar |

> *Nota: Este é um relatório técnico interno, não um relatório gerencial para o usuário final.*

---

## 9. RELATÓRIOS GERENCIAIS (API Centralizada)

**Arquivo:** `api/relatorios-gerenciais.js`
**Base URL:** `/api/relatorios-gerenciais/`

| # | Endpoint | Descrição |
|---|---|---|
| 1 | `GET /vendas` | Relatório gerencial de vendas |
| 2 | `GET /producao` | Relatório gerencial de produção |
| 3 | `GET /financeiro` | Relatório gerencial financeiro |
| 4 | `GET /clientes` | Relatório gerencial de clientes |
| 5 | `GET /produtos` | Relatório gerencial de produtos |
| 6 | `GET /vendedores` | Relatório gerencial de vendedores |
| 7 | `GET /dashboard` | Dashboard consolidado com dados de todos os módulos |
| 8 | `GET /exportar/:tipo` | Exportação CSV por tipo (vendas, producao, financeiro, clientes, produtos, vendedores) |

---

## 10. RESUMO GERAL

| Módulo | Página de Relatórios | Qtd Relatórios | Exportação |
|---|---|---|---|
| **Vendas** | `modules/Vendas/public/relatorios.html` | 8 (Dashboard) + 4 (PDF) = **12** | PDF, Excel |
| **Financeiro** | `modules/Financeiro/relatorios.html` | 10 (CR) + 2 (CP) + 4 (Analíticos) = **16** | PDF, Excel, Imprimir, Templates |
| **PCP — Central** | `modules/PCP/pages/relatorios.html` | **4** abas (Cabos, Vendas, Metros, Faturamento) | CSV, Imprimir |
| **PCP — Apontamentos** | `modules/PCP/relatorios-apontamentos.html` | **1** (com KPIs + tabela + sidebar) | CSV |
| **NFe** | `modules/NFe/relatorios.html` | 4 (OS) + 7 (Contratos) + 6 (Faturamento) = **17** | PDF, Imprimir |
| **Faturamento** | `modules/Faturamento/public/relatorios.html` | 5 (OS) + 5 (Contratos) + 7 (NF-e) = **17** | PDF, Imprimir, Excel |
| **Compras** | `modules/Compras/relatorios.html` | **6** relatórios PDF + 2 tabelas = **8** | PDF |
| **RH** | `modules/RH/public/gestao-holerites.html` | **1** (Visualizações Holerites) | HTML |
| **API Gerencial** | `api/relatorios-gerenciais.js` | **8** endpoints | CSV |
| | | **TOTAL: ~84 relatórios** | |

---

## Legenda de Exportação

| Formato | Descrição |
|---|---|
| **PDF** | Gerado server-side via PDFKit ou client-side, formato A4 paisagem/retrato |
| **Excel** | Via SheetJS (xlsx) client-side ou endpoint server-side |
| **CSV** | Exportação de dados tabulares via endpoint `/exportar/:tipo` |
| **Imprimir** | `window.print()` com `@media print` CSS otimizado |
| **HTML** | Relatório renderizado em iframe ou nova aba do navegador |
| **Templates** | Templates de relatório baixáveis (módulo Financeiro) |
