# Changelog — Zyntra ERP

Todas as alterações notáveis do projeto serão documentadas neste arquivo.

---

## [2.5.0] — 2026-04-08

### Adicionado
- **App Android Nativo (Kotlin)**: Aplicativo Android completo com Clean Architecture (MVVM), Hilt DI, Retrofit — módulos: Vendas, Compras, Financeiro, PCP, RH, NFe, Clientes, Dashboard; autenticação com TokenAuthenticator/SessionManager
- **Base Enterprise Multi-Tenant**: Sistema base reutilizável (Indústria, Comércio, Serviços, Agropecuário, Demo) com 516+ módulos e 110+ páginas públicas
- **AI Proxy**: Nova rota de integração com serviços de IA (`routes/ai-proxy.js`)
- **PDF Template Engine**: Motor de geração de PDFs profissionais (`routes/pdf-template.js`)
- **Fotos Colaboradores (Comissões)**: 28 fotos reais integradas ao sistema de avatares com `avatarNameMap` de 44 funcionários — elimina iniciais coloridas
- **Condições de Pagamento Dinâmicas**: Opções filtradas automaticamente pelo valor total do pedido — À Vista sempre disponível; condições a prazo habilitadas conforme faixa de valor
- **CNPJ Auto-Fill (Transportadoras)**: Ao digitar CNPJ completo no modal Nova Transportadora, preenche automaticamente razão social, nome fantasia, IE, telefone, email, cidade, UF e CEP via API proxy
- **POST /transportadoras**: Cadastro rápido de transportadoras direto do modal de vendas com botão "+"
- **Auto-Entrada de Estoque**: Entrada automática no estoque ao importar XML de NF de Entrada (compras)
- **Rate Limiter Redis**: Rate limiting em produção com Redis (`services/rate-limiter-redis.js`)
- **Financeiro Sidebar JS**: Componente de sidebar dinâmica para módulo Financeiro
- **Monitoring Stack**: Dashboards Grafana + métricas Prometheus para monitoramento em produção
- **Página 403 (Acesso Negado)**: Página profissional de controle de acesso
- **Z-Index Scale (Design System)**: Escala padronizada de z-index para consistência visual
- **Condições de Pagamento Utils**: Módulo utilitário reutilizável (`utils/condicoes-pagamento.js`)
- **12+ Relatórios de Auditoria**: Documentação detalhada de segurança, qualidade e permissões do ERP

### Corrigido
- **Histórico de Alterações (Audit Log)**: Rota duplicada em `auth-section-routes.js` interceptava antes da rota real — removida; modal agora exibe dados reais de 3 tabelas MySQL
- **Condições de Pagamento — Labels**: Removidos textos de faixa de valor dos labels do dropdown (ex: "R$3.000–R$5.999"); validação agora é dinâmica com opções habilitadas/desabilitadas conforme valor
- **Condições de Pagamento — Novo Orçamento**: Campo lia de `novo-parcelas` (inexistente); corrigido para `novo-condicao-pagamento` com validação obrigatória
- **NFs de Entrada — Mapeamento de Colunas**: Aliases corrigidos: `chave_nfe→chave_acesso`, `emitente_cnpj→fornecedor_cnpj`, `emitente_razao→fornecedor_razao_social`
- **Permissões — guilherme.bastos**: Login removido; migrado para `compras@aluforce.ind.br` com acesso restrito ao módulo Compras
- **Desconto 33.88%**: Validação de desconto aceita percentuais com decimais corretamente

### Alterado
- **Permissões Compras@**: Usuário `compras` restrito a `areas: ['compras']` (antes tinha acesso a vendas, PCP, financeiro)
- **Avatares Comissões**: Sistema migrado de `.webp/.jpg` para `.png` padronizado com mapa de 44 funcionários

### Implantação
- 9 arquivos de código + 29 fotos de avatar deployados na VPS
- DB atualizado (login guilherme.bastos → compras)
- PM2 reiniciado (aluforce-v2-production)

---

## [2.4.0] — 2026-04-06

### Adicionado
- **Autocomplete Fornecedores (Compras)**: Select estático de fornecedores substituído por campo de busca com dropdown filtrável em tempo real — digitação filtra por nome/razão social, seleção preenche campo hidden
- **DELETE Pedidos de Compra**: Nova rota DELETE /api/compras/pedidos/:id para exclusão direta de pedidos independente do status
- **Precificação — Endpoint API**: Rota GET /api/vendas/precificacao para consulta de tabela de preços

### Corrigido
- **Compras — Exclusão de Pedidos**: Corrigido erro 409 Conflict ao excluir/cancelar pedidos — cancelamento agora é idempotente (pedido já cancelado retorna sucesso), frontend usa método DELETE
- **Compras — Exclusão de Cotações**: Removida restrição que impedia exclusão de cotações finalizadas — agora permite deletar cotações em qualquer status
- **Compras — Relatórios undefined**: Corrigidos campos exibindo "undefined" em relatórios de pedidos e materiais — adicionadas cadeias de fallback para campos acentuados/não-acentuados (numero/número, descricao/descrição, nome/razao_social)
- **Compras — Curva ABC undefined**: Corrigidos campos codigo e descricao na análise ABC e desempenho de fornecedores com fallbacks seguros
- **Gestão de Estoque — Modal Novo Material**: Corrigido erro null em `abrirModalNovoMaterial` — IDs HTML com acentos (código, descrição, mínimo) normalizados para IDs sem acento matching o JS
- **Gestão de Estoque — Modal Editar/Histórico**: Corrigidos IDs acentuados nos modais de edição e histórico de materiais
- **Cotações — Null Guards**: Adicionadas proteções contra null em itens de propostas, totais e melhorProposta em cotacoes.js
- **Requisições — Array Guard**: Corrigido crash quando `req.itens` é null/undefined em requisicoes.js
- **PCP — Ordens de Produção**: Adicionado optional chaining para `ordem.produto.substring()` evitando crash quando produto é null
- **Financeiro — Contas a Pagar**: Adicionado null check no select de categoria-id antes de popular innerHTML
- **Vendas — Restrição por Vendedor**: Vendedores só visualizam seus próprios pedidos/orçamentos; gerentes veem todos
- **Vendas — Notificações Null Guard**: Corrigido crash no carregamento de notificações quando resposta da API é null
- **Vendas — Template Orçamento**: Logotipo e informações da empresa corrigidos no template de orçamento/proposta
- **Vendas — Remoção de Avatares**: Avatar removido de 8+ páginas (Vendas, Compras, Financeiro, PCP) — layout simplificado
- **Vendas — Email Auto-Subject**: Assunto e mensagem preenchidos automaticamente ao enviar orçamento por email
- **Vendas — Exclusão em Massa**: Botão "Excluir Todos" funcional para limpar pedidos de venda
- **PCP — Sidebar Unificada**: Links duplicados de relatórios consolidados em link único
- **PCP — Modal Null Fix**: Corrigido crash em modal de detalhes quando campos são null
- **PCP — Encoding Fix**: Corrigidos 661 caracteres com encoding quebrado em ordens-producao.html
- **Kanban — Filtro Vendedor**: Filtro de vendedor aplicado ao quadro Kanban de vendas
- **Kanban — Notificação OP**: Notificação ao mover ordem de produção no Kanban
- **Vendas — Desconto 33.88%**: Validação de desconto corrigida para aceitar percentuais com decimais
- **Vendas — Origem Fixa**: Campo origem fixado como "Sistema" para novos pedidos
- **Vendas — Auto-Fill Produto**: Preenchimento automático de dados do produto ao selecionar item
- **Vendas — Modal Simplificado**: Modal de item de venda simplificado removendo campos desnecessários
- **Faturamento+Logística — Header**: Header e branding corrigidos nas páginas de Faturamento e Logística
- **Vendas — Undefined Values**: Fallbacks adicionados para campos exibindo undefined em listagens

### Implantação
- 10+ arquivos deployados na VPS via SCP
- PM2 reiniciado (aluforce-v2-production)
- Commits: 84ddb0b (sessão 1), 647c0b8 (sessão 2), sessão 3 atual

---

## [2.3.0] — 2026-03-27

### Adicionado
- **Contas a Receber — Módulo Completo**: Status dropdown (pendente/liquidada/parcial/vencida/protestada/cartório), campo pago_no_dia, aceita_troca_factory, upload de comprovante de pagamento, aba de rastreamento, simulador PM, aba FUNDOS, workbook switching (CR / CR Especiais / FUNDOS)
- **CNAB 240 — Contas a Pagar**: Multi-seleção de despesas com barra de ações, geração de remessa CNAB 240 (.REM) com Header/Lote/Segmento A+B/Trailers, importação de retorno CNAB (.RET) com parsing de Segmento A, baixa automática em lote, pagamento batch
- **Central de Relatórios PCP — 5ª Aba**: Relatórios de Apontamentos incorporados como aba "Apontamentos" na Central de Relatórios unificada — 5 KPIs (Funcionários Ativos, Horas Trabalhadas, Horas Produção, Total Apontamentos, Eficiência Geral), filtros (período, funcionário, atividade com 17 tipos, pedido), tabela detalhada, resumo por funcionário, distribuição por atividade (barra + legenda + tabela), indicadores de eficiência (produtivo, parada, manutenção, média/dia)
- **Migration DB**: `002-financeiro-schema-cr.js` — 7 novas colunas: pago_no_dia, aceita_troca_factory, comprovante_url, origem_integracao, dia_recomprado, data_para_cartorio, data_protestado
- **Catálogo de Relatórios**: 72+ relatórios mapeados e documentados em 8 módulos

### Alterado
- **Sidebar PCP Unificada**: Dois links separados de relatórios (Relatórios + Central) consolidados em único link "Relatórios" apontando para a Central unificada, em todas as 5 páginas PCP (index, ordens-producao, apontamentos, relatorios, relatorios-apontamentos)
- **Financeiro Server**: Novas rotas e suporte a colunas adicionais de Contas a Receber
- **package.json**: Versão atualizada para 2.3.0

### Implantação
- 46 arquivos deployados na VPS via SCP
- Migration DB executada com sucesso
- PM2 reiniciado (aluforce-v2-production + aluforce-pcp)

---

## [2.2.2] — 2026-03-25

### Adicionado
- **Condição de Pagamento**: Modal redesenhado com visual profissional (dark header, inputs focáveis), salva e carrega condições do banco de dados
- **Parcelas Automáticas**: Número de parcelas e tabela de vencimentos calculados automaticamente ao selecionar condição de pagamento
- **Contadores Padronizados**: Módulo NFe atualizado com footer links e padrão visual Compras (stat-card + stat-footer)
- **QR Code Estoque**: Integrado como funcionalidade no dashboard e sidebar do módulo Compras (ação rápida + botão lateral)
- **Ligações CDR**: Endpoints /ligacoes/cdr e /ligacoes/resumo com fallback gracioso

### Corrigido
- **Fix PDF Vendas**: Corrigido `token is not defined` na geração de PDF e `número is not defined` no nome do documento

---

## [2.2.1] — 2026-03-25

### Adicionado
- **Permissões logistica@**: Usuário de logística visualiza cards "Faturamento & Logística" e "Vendas" no dashboard
- **Novo Pedido de Venda**: Autocomplete de produtos exibe todos os itens (com e sem estoque)
- **Deploy VPS**: Pipeline de deploy funcional com pscp/plink

### Corrigido
- **Bug parsePermissao**: Corrigido parsing JSON do campo `areas` no `/api/me` (valores como `["nfe","vendas"]` eram corrompidos por split de vírgula antes do JSON.parse)

---

## [2.2.0] — 2026-03 (Março)

### Adicionado
- **QR Code Estoque**: Sistema de entrada/saída de materiais via QR Code no celular
- **Auto-Import Ponto**: Importação automática de marcações de ponto (Control iD)
- **Auditoria RH**: Correções de segurança (access control, XSS, validação)

### Alterado
- **Rebranding**: Nova identidade visual (Agência do Japa), remoção de referências concorrentes
- **Login**: Nova logo e rodapé atualizado

---

## [2.1.7] — 2026-03 (Março)

### Adicionado
- **Login Fix**: Correção no fluxo de autenticação (refresh tokens, CSRF, rate limiting)
- **Top Vendedores**: Ranking filtrado apenas por usuários com role `comercial`
- **Template Financeiro**: Novo template XLSX de importação de Contas a Pagar (62 colunas)
- **Padronização CSS**: 88 arquivos padronizados com design system unificado
- **Chat Teams**: Widget injetado automaticamente em todas as 85+ páginas
- **Chat DM**: Lista de contatos inteligente (recentes + online + todos)
- **Integração Bancária**: API completa com boletos, CNAB e pagamentos
- **Segurança**: Migração automática de schema, refresh tokens com rastreamento
- **Auditoria de Produção**: 53/53 verificações passando, dados reais validados

---

## [2.1.6] — 2026-02 (Fevereiro)

### Adicionado
- **BOB I.A.**: Assistente virtual integrado ao chat
- **Chat Teams**: Canais, DMs, áudio, arquivos, emojis
- **PWA**: Suporte offline completo com sync
- **Help Page**: Central de ajuda

---

## [2.1.5] — 2026-01 (Janeiro)

### Adicionado
- **NF-e completa**: Emissão, manifestação, importação XML
- **Módulo de Compras**: Requisições, cotações, pedidos de compra
- **PCP**: Ordens de produção com importação/exportação Excel
- **Conciliação Bancária**: Importação OFX/CNAB e conciliação automática
- **eSocial**: Integração com obrigações trabalhistas
