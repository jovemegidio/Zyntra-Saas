# Zyntra ERP — Funcionalidades Implementadas e Status dos Módulos

> **Versão do Sistema:** 2.4.0  
> **Data de Referência:** 01 de Abril de 2026  
> **Status Geral:** Em Produção (clientes ativos desde Janeiro/2026)  
> **URL de Produção:** https://aluforce.api.br  
> **Stack:** Node.js 18 · Express 4 · MySQL 8 · Socket.IO 4 · PWA · Android (Capacitor 8)

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Módulo Dashboard Principal](#2-módulo-dashboard-principal)
3. [Módulo Vendas](#3-módulo-vendas)
4. [Módulo Financeiro](#4-módulo-financeiro)
5. [Módulo PCP (Planejamento e Controle de Produção)](#5-módulo-pcp)
6. [Módulo NF-e / NFS-e (Nota Fiscal Eletrônica)](#6-módulo-nf-e--nfs-e)
7. [Módulo Faturamento](#7-módulo-faturamento)
8. [Módulo Compras](#8-módulo-compras)
9. [Módulo RH (Recursos Humanos)](#9-módulo-rh)
10. [Módulo Logística](#10-módulo-logística)
11. [Zyntra Teams — Chat Corporativo](#11-zyntra-teams--chat-corporativo)
12. [BOB I.A. — Assistente Virtual](#12-bob-ia--assistente-virtual)
13. [Aplicativo Mobile (Android)](#13-aplicativo-mobile-android)
14. [Aplicativo Desktop (Tauri)](#14-aplicativo-desktop-tauri)
15. [Landing Page & Onboarding SaaS](#15-landing-page--onboarding-saas)
16. [Automações n8n](#16-automações-n8n)
17. [Infraestrutura, Segurança e DevOps](#17-infraestrutura-segurança-e-devops)
18. [Relatórios Consolidados (72+)](#18-relatórios-consolidados)
19. [Integrações Ativas](#19-integrações-ativas)
20. [Funcionalidades em Desenvolvimento / Roadmap](#20-funcionalidades-em-desenvolvimento--roadmap)
21. [Cronologia de Releases](#21-cronologia-de-releases)

---

## 1. Visão Geral do Sistema

O **Zyntra ERP** é uma plataforma ERP SaaS industrial completa, multi-tenant, cobrindo todo o ciclo operacional empresarial — do pedido de venda à emissão fiscal, do chão de fábrica ao financeiro — em uma única plataforma.

### Números do Sistema

| Indicador | Valor |
|-----------|-------|
| Módulos principais | 11 |
| Páginas HTML | 100+ |
| Rotas de API | 60+ arquivos de rotas |
| Relatórios mapeados | 72+ |
| Automações n8n | 36 workflows |
| Arquivos de serviço | 25+ |
| Páginas da Landing Page | 25+ |

### Arquitetura Multi-Tenant (SaaS)

| Componente | Descrição |
|------------|-----------|
| `empresas_tenant` | Cadastro de empresas, plano, trial 14 dias, status |
| `usuarios_empresas` | Vínculo N:N usuário ↔ empresa |
| `middleware/empresa.js` | Contexto de tenant extraído do JWT por requisição |
| JWT + Refresh Tokens | Autenticação com rastreamento completo de sessões |
| ACL Granular | Permissões por módulo e função (admin, gerente, vendedor, comprador, financeiro, produção, visualizador) |

---

## 2. Módulo Dashboard Principal

**Status:** ✅ Implementado e em Produção  
**Localização:** `public/`

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Dashboard Executivo | ✅ Produção | KPIs em tempo real, gráficos Chart.js, alertas |
| Multi-empresa | ✅ Produção | Seleção de empresa ativa para usuários multi-tenant |
| Top Vendedores | ✅ Produção | Ranking filtrado por usuários com role `comercial` |
| Saúde Financeira | ✅ Produção | Indicadores consolidados receita vs despesa |
| Navegação Modular | ✅ Produção | Sidebar unificada com acesso a todos os módulos |
| Login Seguro | ✅ Produção | JWT + Refresh Tokens + CSRF + Rate Limiting |
| Esqueci Senha / Redefinir | ✅ Produção | Fluxo completo de recuperação de senha |
| MRP — Estrutura de Produto | ✅ Produção | BOM (Bill of Materials), árvore de produto |
| eSocial | ✅ Produção | Integração com obrigações trabalhistas governamentais |
| Configurações SaaS | ✅ Produção | 50+ categorias de configuração por tenant |
| PWA / Service Worker | ✅ Produção | Funciona offline com background sync |
| Gerenciador de Inatividade | ✅ Produção | Logout automático por inatividade |
| Manifest / Instalação | ✅ Produção | Instalável como app no navegador |

### Páginas

- `index.html` — Painel de Controle principal
- `login.html` — Autenticação
- `esocial.html` — Integração eSocial
- `mrp.html` — Estrutura de Produto (MRP)
- `config.html` — Configurações gerais
- `esqueci-senha.html` / `redefinir-senha.html` — Recuperação de acesso
- `offline-settings.html` — Configurações offline (PWA)
- `logistica.html` — Painel de logística
- `manifestacao-nfe.html` — Manifestação de NF-e

---

## 3. Módulo Vendas

**Status:** ✅ Implementado e em Produção  
**Localização:** `modules/Vendas/`  
**Servidor próprio:** `modules/Vendas/server.js`

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Dashboard Kanban | ✅ Produção | Pipeline visual por status (Pedido → Análise Crédito → Aprovado → Faturar → Faturado → Recibo) |
| Pedidos de Venda | ✅ Produção | Criação, edição, listagem com filtros (status, período, vendedor), paginação |
| Gestão de Clientes | ✅ Produção | Carteira com cards visuais, badges VIP/Ativo, KPIs, ticket médio, limite de crédito |
| Orçamentos | ✅ Produção | Status (Aberto, Aprovado, Rejeitado, Expirado), conversão para pedido |
| Comissões | ✅ Produção | Cálculo automático por categoria (Power 2%, Multiplexados 1%, Outros 1%) |
| Prospecção | ✅ Produção | Gestão de prospectos e negociações |
| Tabelas de Preço | ✅ Produção | Múltiplas tabelas configuráveis |
| Autocomplete Produtos | ✅ Produção | Busca inteligente exibindo todos os itens (com e sem estoque) |
| PDF Automático | ✅ Produção | Geração de PDF de orçamentos/pedidos |
| Condição de Pagamento | ✅ Produção | Modal profissional, parcelas calculadas automaticamente |
| CT-e | ✅ Produção | Conhecimento de Transporte Eletrônico |
| Ligações CDR | ✅ Produção | Endpoints `/ligacoes/cdr` e `/ligacoes/resumo` com fallback |
| Estoque (visualização) | ✅ Produção | Consulta de estoque dentro do módulo de vendas |

### Relatórios (10)

- Evolução das Vendas (gráfico área/linha)
- Pedidos por Status (gráfico pizza)
- Top Vendedores (tabela rankeada)
- Vendas por Período (PDF)
- Comissões por Categoria (PDF)
- Análise de Clientes (PDF)
- Performance de Produtos (PDF)
- Dashboard Admin (KPIs executivos)
- Exportação Excel
- Exportação PDF

### Páginas

`index.html` · `dashboard.html` · `pedidos.html` · `clientes.html` · `prospeccao.html` · `comissoes.html` · `relatorios.html` · `estoque.html` · `cte.html` · `dashboard-admin.html`

---

## 4. Módulo Financeiro

**Status:** ✅ Implementado e em Produção  
**Localização:** `modules/Financeiro/`

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Dashboard Financeiro | ✅ Produção | KPIs: Total a Receber, Total a Pagar, Saldo Projetado, Saldo em Contas |
| Contas a Receber (CR) | ✅ Produção | Status dropdown (pendente/liquidada/parcial/vencida/protestada/cartório), campo pago_no_dia, aceita_troca_factory, upload comprovante, aba rastreamento, simulador PM, aba FUNDOS, workbook switching |
| Contas a Pagar (CP) | ✅ Produção | Gestão completa de obrigações, aprovações, prazos |
| CNAB 240 | ✅ Produção | Multi-seleção de despesas, geração remessa .REM (Header/Lote/Segmento A+B/Trailers), importação retorno .RET, baixa automática em lote |
| Contas Bancárias | ✅ Produção | Cadastro completo, controle de saldos, movimentações (entrada/saída/transferência) |
| Fluxo de Caixa | ✅ Produção | Períodos predefinidos (7, 15, 30, 60, 90 dias), gráficos interativos, projeções |
| Conciliação Bancária | ✅ Produção | Importação OFX/CNAB, reconciliação automática de transações |
| Boletos | ✅ Produção | Emissão e controle de boletos bancários |
| Plano de Contas | ✅ Produção | Estrutura hierárquica de contas contábeis |
| Centros de Custo | ✅ Produção | Categorias e centros de custo |
| Impostos | ✅ Produção | Gestão de impostos: ICMS, IPI, PIS, COFINS, ICMS ST, DIFAL, FCP |
| Orçamentos Financeiros | ✅ Produção | Planejamento e controle orçamentário |
| Recorrências | ✅ Produção | Pagamentos e recebimentos recorrentes |
| Parcelamento | ✅ Produção | Sistema de parcelamento de títulos |
| NFS-e (Financeiro) | ✅ Produção | Emissão de Nota Fiscal de Serviço Eletrônica |
| Fornecedores e Clientes | ✅ Produção | Dados pessoais, contato, endereço, limite de crédito, dados bancários/PIX |
| Notificações Automáticas | ✅ Produção | Vencimentos, atrasos, saldo baixo (a cada 1 minuto) |
| DRE | ✅ Produção | Demonstração de Resultado do Exercício (Receita Bruta → Resultado Líquido) |
| Integração Bancária | ✅ Produção | API completa com boletos, CNAB e pagamentos |

### Relatórios (11)

- KPIs: Total a Receber, a Pagar, Saldo Projetado, Saldo em Contas
- Títulos Liquidados / Vencidos / A Vencer (PDF, Excel)
- Por Cliente / Por Fornecedor (PDF, Excel)
- Portador Carteira / Descontos / Contas por Período
- DRE Simplificado (Excel)
- Receitas vs Despesas (gráfico barras)
- Despesas por Categoria (gráfico pizza)
- Relatórios personalizáveis (salvar/carregar)

### Páginas (15)

`index.html` · `contas-receber.html` · `contas-pagar.html` · `bancos.html` · `fluxo-caixa.html` · `conciliacao.html` · `boletos.html` · `nfse.html` · `centros-custo.html` · `plano-contas.html` · `impostos.html` · `orcamentos.html` · `recorrencias.html` · `relatorios.html` · `dashboard-contas-pagar.html` · `dashboard-contas-receber.html`

---

## 5. Módulo PCP

**Status:** ✅ Implementado e em Produção  
**Localização:** `modules/PCP/`  
**Servidor próprio:** `modules/PCP/server.js` (porta dedicada)

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Dashboard PCP | ✅ Produção | Visão geral da produção, KPIs, alertas |
| Ordens de Produção | ✅ Produção | Criação, edição, acompanhamento, import/export Excel |
| Apontamentos de Produção | ✅ Produção | Registro de mão de obra, rastreamento por funcionário, atividade, OP |
| Gestão de Materiais | ✅ Produção | Cadastro, estoque mínimo, componentes |
| Gestão de Estoque (PCP) | ✅ Produção | Inventário, movimentações, rastreabilidade |
| Gestão de Produção | ✅ Produção | Controle por fases de produção |
| Faturamento integrado PCP | ✅ Produção | Faturamento direto a partir de OPs |
| Ordens de Compra (PCP) | ✅ Produção | Requisições automáticas baseadas em estoque mínimo |
| Central de Relatórios Unificada | ✅ Produção | 5 abas com KPIs, gráficos e tabelas |
| Diário de Produção | ✅ Produção | Registro diário de atividades produtivas |
| Configurações PCP | ✅ Produção | Parâmetros de produção por empresa |
| Árvore de Produto | ✅ Produção | Estrutura BOM (Bill of Materials) |
| Etiquetas | ✅ Produção | Geração de etiquetas para produção |
| GTIN | ✅ Produção | Catálogo de produtos com código GTIN |
| Clientes (PCP) | ✅ Produção | Consulta de clientes para pedidos |
| Impressão / Templates | ✅ Produção | Templates de impressão para ordens e documentos |
| Pipeline Produção → Faturamento | ✅ Produção | Fluxo completo da OP até emissão de NF-e |
| Tablet Fix | ✅ Produção | Interface otimizada para uso em tablets no chão de fábrica |

### Relatórios (5 abas na Central)

1. **Cabos Mais Vendidos** — Ranking por quantidade e valor, gráfico de barras
2. **Ranking de Vendas** — Por vendedor e cliente, evolução mensal
3. **Metros Produzidos** — Produção diária, área/barras, metragem por OPs
4. **Faturamento Mensal** — Análise anual, colunas, top clientes
5. **Apontamentos** — 5 KPIs (Func. Ativos, Horas, Eficiência), resumo por funcionário, distribuição por atividade

### Páginas (10+)

`index.html` · `ordens-producao.html` · `apontamentos.html` · `relatorios-apontamentos.html` · `pages/estoque.html` · `pages/materiais.html` · `pages/ordem-compra.html` · `pages/faturamento.html` · `pages/gestao-producao.html` · `pages/relatorios.html` · `gerar_ordem_excel.html` · `login.html`

---

## 6. Módulo NF-e / NFS-e

**Status:** ✅ Implementado e em Produção  
**Localização:** `modules/NFe/`

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Emissão NF-e 4.0 | ✅ Produção | Geração XML completa (IDE, emitente, destinatário, produtos, impostos, transporte, pagamento) |
| Integração SEFAZ | ✅ Produção | Autorização (síncrono/assíncrono), consulta recibo, consulta NF-e, status do serviço |
| Assinatura Digital A1 | ✅ Produção | Certificado PFX/P12, XMLDSIG, SHA-1, RSA |
| DANFE | ✅ Produção | Visualização e impressão do Documento Auxiliar |
| Cancelamento | ✅ Produção | Cancelamento de NF-e via SEFAZ |
| Carta de Correção (CC-e) | ✅ Produção | Correção textual de NF-e autorizada |
| Inutilização | ✅ Produção | Inutilização de faixas de numeração |
| Manifestação do Destinatário | ✅ Produção | Confirmação, ciência, desconhecimento, operação não realizada |
| Importação de XML | ✅ Produção | Importação de NF-e de terceiros |
| NFS-e | ✅ Produção | Emissão de Nota Fiscal de Serviço Eletrônica |
| Cálculo Tributário Completo | ✅ Produção | ICMS, ICMS ST, DIFAL, FCP, IPI, PIS/COFINS, Simples Nacional (CSOSN) |
| Webservices por UF | ✅ Produção | SP, MG, SVRS — produção e homologação |
| Dashboard NFe | ✅ Produção | Visão geral de notas emitidas, pendentes, canceladas |

### Relatórios (17)

- **Ordens de Serviço:** OS Abertas, por Período, por Técnico, por Status
- **Contratos:** Ativos, por Vencimento, por Valor, por Cliente, Renovações, Cancelados, Receita Recorrente (MRR)
- **Faturamento:** Mensal, por Status, Top Clientes, Produtos Mais Vendidos, Impostos, Comparativo Anual

### Páginas (12)

`index.html` · `dashboard.html` · `emitir.html` · `danfe.html` · `consultar.html` · `eventos.html` · `inutilizacao.html` · `nfse.html` · `logistica.html` · `relatorios.html` · `nfe.html`

---

## 7. Módulo Faturamento

**Status:** ✅ Implementado e em Produção  
**Localização:** `modules/Faturamento/`  
**Servidor próprio:** `modules/Faturamento/server.js`

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Dashboard Faturamento | ✅ Produção | Visão geral de NF-e emitidas e pendentes |
| Emissão NF-e | ✅ Produção | Fluxo completo de emissão fiscal |
| DANFE | ✅ Produção | Visualização e impressão |
| NFS-e | ✅ Produção | Nota Fiscal de Serviço |
| Consulta NF-e | ✅ Produção | Busca e filtros avançados |
| Eventos | ✅ Produção | Cancelamento, CC-e, inutilização |
| PIX | ✅ Produção | Integração com pagamentos instantâneos |
| Logística | ✅ Produção | Integração CT-e e expedição |
| Régua de Faturamento | ✅ Produção | Workflow visual do processo de faturamento |

### Relatórios (17)

- **Ordens de Serviço:** Abertas, Concluídas, Pendentes, por Técnico, Faturamento OS
- **Contratos:** Ativos, A Vencer, Vencidos, Receita, por Cliente
- **Faturamento & NF-e:** Emitidas, Canceladas, Mensal, Impostos, por Cliente, Logística, Inadimplência

### Páginas (11)

`dashboard.html` · `emitir.html` · `danfe.html` · `nfse.html` · `consultar.html` · `eventos.html` · `pix.html` · `relatorios.html` · `logistica.html` · `regua.html`

---

## 8. Módulo Compras

**Status:** ✅ Implementado e em Produção  
**Localização:** `modules/Compras/`  
**Servidor próprio:** `modules/Compras/server.js`

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Dashboard Compras | ✅ Produção | KPIs: Total Pedidos, Valor Total, Fornecedores Ativos, Materiais Críticos |
| Pedidos de Compra | ✅ Produção | Criação, aprovação, rastreamento de status |
| Requisições de Compra | ✅ Produção | Solicitações internas com workflow de aprovação |
| Cotações | ✅ Produção | Comparação de propostas multi-fornecedor |
| Cadastro de Fornecedores | ✅ Produção | Avaliação, histórico, performance |
| Recebimento de Materiais | ✅ Produção | Conferência, integração com estoque |
| Gestão de Estoque (Compras) | ✅ Produção | Inventário, estoque mínimo, níveis de reposição |
| QR Code Estoque | ✅ Produção | Entrada/saída de materiais via QR Code no celular |
| Dashboard Executivo | ✅ Produção | Visão gerencial consolidada |
| Otimização de Estoque | ✅ Produção | Análise ABC, ponto de reposição |
| Materiais | ✅ Produção | Cadastro de matérias-primas e materiais |
| Notificações | ✅ Produção | Atrasos, status de pedidos, recebimentos |

### Relatórios (6)

- KPIs: Total Pedidos, Valor Total, Fornecedores Ativos, Materiais Críticos
- Relatório de Pedidos (PDF)
- Relatório de Fornecedores (PDF)
- Relatório de Estoque (PDF)
- Relatório de Cotações (PDF)
- Relatório de Recebimentos (PDF)

### Páginas (9)

`index.html` · `pedidos.html` · `requisicoes.html` · `cotacoes.html` · `fornecedores.html` · `recebimento.html` · `gestao-estoque.html` · `qrcode-estoque.html` · `relatorios.html`

---

## 9. Módulo RH

**Status:** ✅ Implementado e em Produção  
**Localização:** `modules/RH/`  
**Servidor próprio:** `modules/RH/server.js`

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Gestão de Funcionários | ✅ Produção | 50+ campos, upload de documentos (foto, holerites, atestados), histórico salarial/cargos |
| Controle de Ponto | ✅ Produção | Eletrônico, 4 marcações, cálculo de horas extras, espelho mensal, aprovação de ajustes |
| Auto-Import Ponto | ✅ Produção | Importação automática de marcações (Control iD) |
| Portal do Funcionário | ✅ Produção | Acesso individual: ponto, holerites, férias, dados cadastrais |
| Férias | ✅ Produção | Períodos aquisitivos automáticos, solicitação online, workflow (Func → Gestor → RH), fracionamento (até 3 períodos), abono pecuniário |
| Folha de Pagamento | ✅ Produção | INSS/IRRF/FGTS (tabelas 2025), proventos, descontos, 13º, rescisões, provisões contábeis |
| Holerites | ✅ Produção | Gestão e consulta pelo funcionário |
| Benefícios | ✅ Produção | VT, VR, VA, Plano de Saúde, associação, valores empresa/funcionário, dependentes |
| Avaliação de Desempenho | ✅ Produção | Períodos configuráveis, competências por cargo, metas, feedback 360°, PDI |
| Auto-avaliação | ✅ Produção | Formulário de auto-avaliação pelo colaborador |
| Solicitações | ✅ Produção | Diversas solicitações RH pelo portal |
| Envio de Atestados | ✅ Produção | Upload de atestados médicos |
| Calendário RH | ✅ Produção | Agenda de eventos (férias, feriados, treinamentos) |
| Área Administrativa | ✅ Produção | Painel gerencial para o departamento de RH |
| Dados Cadastrais / Pessoais | ✅ Produção | Gestão pelo colaborador |
| Requisições de Compra (RH) | ✅ Produção | Solicitação de compras pelo departamento de RH |
| Manual do Colaborador | ✅ Produção | Documentação digital acessível pelo portal |
| Treinamentos | ✅ Produção | Gestão de cursos e treinamentos |

### Relatórios (10)

- Performance de funcionários
- Controle de atrasos e faltas
- Custos de benefícios
- Relatório de ponto (espelho mensal)
- Férias — períodos aquisitivos
- Folha de pagamento resumo
- Avaliações de desempenho
- Relatório de treinamentos
- Custos de RH por centro de custo
- Relatório de solicitações

### Páginas (25+)

`index.html` · `funcionario.html` · `areaadm.html` · `funcionarios.html` · `gestao-ponto.html` · `ponto.html` · `espelho-ponto.html` · `minhas-ferias.html` · `ferias.html` · `dados-cadastrais.html` · `dados-pessoais.html` · `beneficios.html` · `holerites.html` · `meus-holerites.html` · `folha.html` · `avaliacoes.html` · `autoavaliacao.html` · `avaliacoes-recebidas.html` · `aplicar-avaliacoes.html` · `solicitacoes.html` · `gestao-solicitacoes.html` · `enviar-atestado.html` · `importar-ponto.html` · `calendario-rh.html` · `requisicoes-compra.html` · `manual-colaborador.html`

---

## 10. Módulo Logística

**Status:** ✅ Implementado e em Produção  
**Localização:** `routes/logistica-routes.js` + páginas distribuídas

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Romaneio | ✅ Produção | Agrupamento de NF-e por entrega/veículo |
| Expedição | ✅ Produção | Controle de despacho de mercadorias |
| Rastreamento de Entregas | ✅ Produção | SLA, status de entrega em tempo real |
| Tipos de Entrega | ✅ Produção | CIF/FOB, retirada, transportadora |
| Transportadoras | ✅ Produção | Cadastro e performance de transportadoras |
| CT-e | ✅ Produção | Conhecimento de Transporte Eletrônico |

---

## 11. Zyntra Teams — Chat Corporativo

**Status:** ✅ Implementado e em Produção  
**Localização:** `chat/` + widget em `public/chat/`  
**Tecnologia:** Socket.IO em tempo real

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Canais de Equipe | ✅ Produção | Criação com controle de admin |
| Mensagens Diretas (DM) | ✅ Produção | Lista inteligente (recentes + online + todos) |
| Mensagens de Áudio | ✅ Produção | Gravação e envio de áudio |
| Compartilhamento de Arquivos | ✅ Produção | Upload de imagens e documentos |
| Emojis | ✅ Produção | 200+ emojis disponíveis |
| Status Online | ✅ Produção | Indicadores de presença em tempo real |
| Indicador de Digitação | ✅ Produção | "Fulano está digitando..." |
| Widget Global | ✅ Produção | Injetado automaticamente em todas as 85+ páginas |
| Chat Teams (Empresarial) | ✅ Produção | Comunicação corporativa dedicada |

---

## 12. BOB I.A. — Assistente Virtual

**Status:** ✅ Implementado e em Produção  
**Localização:** `chat/bob-knowledge.js` + integração OpenAI  

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Assistente 24/7 | ✅ Produção | Disponível em todas as telas do sistema |
| Base de Conhecimento | ✅ Produção | Treinado com dados do sistema |
| Integração OpenAI | ✅ Produção | Motor de IA (GPT) para respostas inteligentes |
| Chat Integrado | ✅ Produção | Acesso via widget do Zyntra Teams |

---

## 13. Aplicativo Mobile (Android)

**Status:** ✅ Implementado (APK Debug)  
**Localização:** `android-app/`  
**Tecnologia:** Capacitor 8

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| App Nativo Android | ✅ Implementado | APK de 4.56 MB via Capacitor 8 |
| Splash Screen Profissional | ✅ Implementado | Tela de carregamento com branding |
| Ícones Adaptativos | ✅ Implementado | Todas as densidades (mdpi a xxxhdpi) |
| Push Notifications | ✅ Implementado | POST_NOTIFICATIONS, VIBRATE, CAMERA |
| Conexão com Produção | ✅ Implementado | Conectado a aluforce.api.br |

---

## 14. Aplicativo Desktop (Tauri)

**Status:** ✅ Implementado  
**Localização:** `desktop-app/`  
**Tecnologia:** Tauri (Rust + WebView)

### Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| App Desktop Nativo | ✅ Implementado | Wrapper nativo via Tauri |
| Instalador Windows | ✅ Implementado | Geração de instalador via src-tauri |
| Electron (legado) | ✅ Implementado | Build alternativo via Electron |

---

## 15. Landing Page & Onboarding SaaS

**Status:** ✅ Implementado e em Produção  
**Localização:** `lp/`

### Páginas da Landing Page (25+)

| Página | Descrição |
|--------|-----------|
| `index.html` | Página principal da LP |
| `funcionalidades.html` | Apresentação de funcionalidades |
| `planos-e-precos.html` | Planos (Starter, Profissional, Enterprise) — sob consulta |
| `quem-somos.html` | Sobre a empresa |
| `segmentos.html` | Segmentos atendidos |
| `sistema-erp.html` | Detalhes do sistema |
| `para-empresas.html` | Soluções por porte |
| `para-contadores.html` | Soluções para contabilidade |
| `para-desenvolvedores.html` | API e integrações |
| `solucoes-financeiras.html` | Módulo financeiro |
| `zyntra-cash.html` | Soluções de pagamento |
| `zyntra-academy.html` | Plataforma de treinamento |
| `treinamentos.html` | Cursos disponíveis |
| `complementos.html` | Add-ons e módulos extras |
| `blog.html` | Blog corporativo |
| `carreiras.html` | Oportunidades de trabalho |
| `franquias.html` | Programa de franquias |
| `afiliados.html` | Programa de afiliados |
| `indique-zyntra.html` | Programa de indicação |
| `compliance.html` | Política de compliance |
| `central-de-seguranca.html` | Segurança da informação |
| `politica-de-privacidade.html` | LGPD |
| `portal-de-privacidade.html` | Portal do titular de dados |
| `transparencia-salarial.html` | Relatório de transparência |
| `sala-de-imprensa.html` | Press room |
| `fale-conosco.html` | Contato |
| `cadastro.html` | Cadastro e onboarding |

### Fluxo de Onboarding

1. Cadastro multi-step → `POST /api/onboarding`
2. Backend cria tenant + admin + vínculo em transação única
3. Trial de 14 dias ativo imediatamente
4. Redirect para `/login.html?welcome=1` com toast de boas-vindas
5. Modal automatizado de trial expirado com CTA para comercial

---

## 16. Automações n8n

**Status:** ✅ Implementado (36 workflows)  
**Localização:** `n8n/workflows/`

### Workflows por Categoria

| # | Workflow | Categoria | Descrição |
|---|---------|-----------|-----------|
| 01 | Relatório Vendas Diário | 📊 Relatórios | Resumo automático de vendas do dia |
| 02 | Backup Banco de Dados | 🔒 Segurança | Backup automático agendado |
| 03 | Contas a Vencer — Cobrança | 💰 Financeiro | Cobranças automáticas de títulos a vencer |
| 04 | Estoque Crítico — Alerta | 📦 Operações | Alerta de materiais abaixo do mínimo |
| 05 | Health Check — Monitoramento | 🛡️ Infra | Verificação de saúde do sistema |
| 06 | Pedidos Atrasados — Alerta | 📦 Operações | Notificação de pedidos com atraso |
| 07 | Aniversariantes — Email | 👥 RH | Email automático para aniversariantes |
| 08 | Notificação Relatórios — Email | 📊 Relatórios | Envio programado de relatórios |
| 09 | Alertas WhatsApp Multi-módulo | 📱 Comunicação | Alertas via WhatsApp Business |
| 10 | WhatsApp Alertas v2 | 📱 Comunicação | Versão atualizada de alertas WhatsApp |
| 11 | Resumo Financeiro Diário | 💰 Financeiro | Resumo financeiro automático |
| 12 | NF-e Pendentes — Alerta | 🧾 Fiscal | Notas fiscais pendentes de autorização |
| 13 | Follow-up Orçamentos | 🛒 Vendas | Acompanhamento de orçamentos abertos |
| 14 | Produção Parada — Alerta | 🏭 PCP | Alertas de parada na produção |
| 15 | Relatório Semanal RH | 👥 RH | Resumo semanal de RH |
| 16 | Meta Vendas — Alerta | 🛒 Vendas | Acompanhamento de metas de vendas |
| 17 | Conciliação — Divergências | 💰 Financeiro | Divergências bancárias |
| 18 | Escalonamento Aprovações | ⚙️ Workflow | Aprovações pendentes escalonadas |
| 19 | Entregas Atrasadas — Alerta | 📦 Logística | Alertas de atraso na entrega |
| 20 | Faturamento sem NF-e — Alerta | 🧾 Fiscal | Pedidos faturados sem NF-e |
| 21 | Transações Recorrentes — Auto | 💰 Financeiro | Lançamento automático de recorrências |
| 22 | Boletos Vencidos — Cobrança | 💰 Financeiro | Cobrança de boletos vencidos |
| 23 | Resumo Expedição Diário | 📦 Logística | Relatório de expedição do dia |
| 24 | Ponto — Inconsistências | 👥 RH | Anomalias de ponto eletrônico |
| 25 | Férias Vencendo — Alerta | 👥 RH | Períodos de férias próximos a vencer |
| 26 | Requisições de Compra Paradas | 🛒 Compras | Requisições sem movimentação |
| 27 | OPs sem Material — Alerta | 🏭 PCP | Ordens sem material disponível |
| 28 | XML Contabilidade — Export | 🧾 Fiscal | Exportação de XMLs para contabilidade |
| 29 | Fluxo de Caixa Projeção Semanal | 💰 Financeiro | Projeção semanal de caixa |
| 31 | Reativação Clientes — Campanha | 🛒 Vendas | Campanha para clientes inativos |
| 32 | Retornos Bancários — Processamento | 💰 Financeiro | Processamento de retornos CNAB |
| 33 | Performance Transportadoras Mensal | 📦 Logística | Avaliação mensal de transportadoras |
| 34 | Cleanup Usuários Inativos | 🔒 Segurança | Inativação de usuários inativos |
| 35 | Resumo Diário Produção | 🏭 PCP | Relatório diário de produção |
| 36 | Auditoria Anomalias Segurança | 🔒 Segurança | Detecção de anomalias de segurança |

---

## 17. Infraestrutura, Segurança e DevOps

### Segurança

| Recurso | Status | Descrição |
|---------|--------|-----------|
| JWT + Refresh Tokens | ✅ Produção | Autenticação com rotação automática e rastreamento |
| bcrypt | ✅ Produção | Hash de senhas |
| CSRF Tokens | ✅ Produção | Proteção contra Cross-Site Request Forgery |
| Rate Limiting (Redis) | ✅ Produção | Proteção contra abuso e força bruta |
| XSS Prevention | ✅ Produção | Sanitização de inputs |
| LGPD / PII Encryption | ✅ Produção | Módulo `lgpd-crypto.js` para dados sensíveis |
| Audit Trail | ✅ Produção | Todas as ações registradas |
| CORS Configurado | ✅ Produção | Origens permitidas configuradas |
| SSL / Let's Encrypt | ✅ Produção | HTTPS em produção |
| Sanitização de Inputs | ✅ Produção | Middleware de segurança centralizado |
| 2FA (Dois Fatores) | ✅ Produção | Serviço de autenticação em dois fatores |

### Infraestrutura

| Recurso | Status | Descrição |
|---------|--------|-----------|
| VPS Ubuntu 22.04 | ✅ Produção | Servidor de produção |
| Nginx Reverse Proxy | ✅ Produção | Balanceamento e proxy reverso |
| PM2 | ✅ Produção | Clustering, auto-restart, logs |
| Redis | ✅ Produção | Cache de sessão e rate limiting |
| Docker | ✅ Disponível | docker-compose.yml para ambiente local |
| GitHub CI/CD | ✅ Produção | Deploy automatizado para VPS |
| Backups Diários | ✅ Produção | Script `backup-daily.sh` |
| Monitoramento Grafana | ✅ Configurado | Dashboards de monitoramento |
| Prometheus | ✅ Configurado | Coleta de métricas |
| Auto-Sync VPS | ✅ Produção | Sincronização automática de arquivos |

### Serviços Implementados (25+)

| Serviço | Descrição |
|---------|-----------|
| `rate-limiter-redis.js` | Rate limiting com Redis |
| `security-logger.js` | Log de segurança |
| `permission.service.js` | Sistema de permissões |
| `scheduler.service.js` | Agendador de tarefas |
| `financial-math.js` | Cálculos financeiros (juros, amortização) |
| `cache.js` | Sistema de cache |
| `auto-import-ponto.js` | Importação automática de ponto |
| `financeiro-reactive.service.js` | Serviço reativo financeiro |
| `faturamento-shared.service.js` | Serviço compartilhado de faturamento |
| `n8n-integration.js` | Integração com n8n |
| `cdr-scraper.js` | Scraper de CDR (ligações) |
| `birthday-email-service.js` | Emails de aniversário |
| `upload-storage.js` | Armazenamento de uploads |
| `discord-service.js` / `discord-bot.js` | Integração Discord |
| `rhid-browser-sync.js` | Sincronização de navegador RH |
| `mysql-circuit-breaker.js` | Circuit breaker para MySQL |
| `metrics.js` | Coleta de métricas |
| `two-factor.service.js` | Autenticação em dois fatores |
| `resilience.js` | Padrões de resiliência |
| `external-breakers.js` | Circuit breakers para APIs externas |
| `whatsapp-service.js` | Integração WhatsApp Business |
| `email-service.js` | Serviço de emails transacionais |

---

## 18. Relatórios Consolidados (72+)

| Módulo | Quantidade | Formatos |
|--------|:----------:|----------|
| Vendas | 10 | PDF, Excel, Gráficos |
| Financeiro | 11 | PDF, Excel, DRE, Gráficos |
| PCP (Central + Apontamentos) | 5 abas | CSV, Print/PDF, Gráficos |
| NFe | 17 | PDF, Print |
| Faturamento | 17 | PDF, Excel, Print |
| Compras | 6 | PDF, KPIs |
| RH | 10 | Tela, Print |
| **Total** | **72+** | — |

---

## 19. Integrações Ativas

| Integração | Status | Descrição |
|------------|--------|-----------|
| SEFAZ (NF-e/NFS-e) | ✅ Produção | Emissão e consulta fiscal em produção |
| Open Finance / Bancário | ✅ Produção | Boletos, CNAB 240 remessa/retorno, PIX |
| WhatsApp Business | ✅ Produção | Mensagens, notificações de pedidos e cobranças |
| OpenAI (BOB I.A.) | ✅ Produção | Assistente virtual inteligente |
| SMTP / Email | ✅ Produção | Emails transacionais e relatórios |
| n8n (Automações) | ✅ Produção | 36 workflows de automação |
| Control iD | ✅ Produção | Importação automática de ponto eletrônico |
| Discord | ✅ Produção | Notificações e alertas via bot |
| eSocial | ✅ Produção | Integração com obrigações trabalhistas |
| Redis | ✅ Produção | Cache e rate limiting |
| Socket.IO | ✅ Produção | Chat e notificações em tempo real |

---

## 20. Funcionalidades em Desenvolvimento / Roadmap

Com base na análise do código e documentação, as seguintes áreas apresentam sinais de evolução contínua:

| Funcionalidade | Status | Observações |
|----------------|--------|-------------|
| App Android (produção) | 🔧 Em refinamento | APK em debug, em processo de publicação |
| App Desktop (Tauri) | 🔧 Em refinamento | Estrutura pronta, em fase de testes e polish |
| Zyntra Academy | 📋 Planejado | Plataforma de treinamento (LP criada) |
| Zyntra Cash | 📋 Planejado | Soluções financeiras avançadas (LP criada) |
| Programa de Franquias | 📋 Planejado | Modelo de expansão via franquias |
| Programa de Afiliados | 📋 Planejado | Programa de indicação e comissões |
| Dashboard Contábil/Fiscal | 🔧 Em desenvolvimento | Rotas `api-contabil-fiscal.js` presentes |
| Integrações de Documentos Fiscais | 🔧 Em desenvolvimento | Rota `documentos-fiscais.js` ativa |
| Push Notifications (Web) | 🔧 Em refinamento | Rotas de push implementadas |
| Módulo de Consultoria | 📋 Planejado | Diretório `modules/Consultoria/` — acesso restrito |

---

## 21. Cronologia de Releases

| Versão | Data | Principais Entregas |
|--------|------|---------------------|
| **2.4.0** | Mar/2026 | App Android (Capacitor 8), Landing Page (25+ páginas), Onboarding SaaS, Trial 14 dias, Pricing Sob Consulta |
| **2.3.0** | 27/Mar/2026 | Contas a Receber completo, CNAB 240 (remessa/retorno), PCP Central Unificada (5 abas), 72+ relatórios, migration DB |
| **2.2.2** | 25/Mar/2026 | Condição de Pagamento, Parcelas Automáticas, QR Code Estoque, Contadores NFe, Ligações CDR |
| **2.2.1** | 25/Mar/2026 | Permissões logística, Autocomplete produtos, Deploy VPS pipeline, Fix parsePermissao |
| **2.2.0** | Mar/2026 | QR Code Estoque mobile, Auto-Import Ponto, Auditoria RH, Rebranding visual |
| **2.1.7** | Mar/2026 | Login Fix, Top Vendedores, Template XLSX, Padronização CSS (88 arquivos), Chat Teams global, Chat DM, Integração Bancária, Segurança audit 53/53 |
| **2.1.6** | Fev/2026 | BOB I.A., Chat Teams completo, PWA offline, Central de Ajuda |
| **2.1.5** | Jan/2026 | NF-e completa (SEFAZ), Módulo Compras, PCP (import/export Excel), Conciliação Bancária (OFX/CNAB), eSocial |

---

## Resumo Quantitativo

| Indicador | Valor |
|-----------|-------|
| Módulos em produção | 11 |
| Páginas HTML do sistema | 100+ |
| Relatórios mapeados | 72+ |
| Automações n8n | 36 |
| Serviços backend | 25+ |
| Rotas de API | 60+ arquivos |
| Workflows de automação | 36 |
| Páginas da Landing Page | 25+ |
| Integrações ativas | 11 |
| Versão atual | 2.4.0 |
| Em produção desde | Janeiro/2026 |
| Plataformas | Web (PWA) + Android + Desktop |

---

> **Documento gerado em 01/04/2026 com base na análise completa do código-fonte e documentação do Zyntra ERP.**  
> **Software proprietário — Agência do Japa — 2026**
