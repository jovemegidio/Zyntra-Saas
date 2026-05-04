# 🔥 AUDITORIA EXTREMA DE FRONT-END: DE-MOCKING, RENDERIZAÇÃO E ESTRESSE DE COMPONENTES

**Sistema**: ALUFORCE ERP (Zyntra)  
**Data**: 2025-03-15  
**Tipo**: SOMENTE DIAGNÓSTICO — nenhuma correção aplicada  
**Escopo**: ~69 páginas HTML, ~358 arquivos JS, 10 módulos  
**Plataforma**: Vanilla JavaScript/HTML (sem frameworks SPA)  

---

## SCORE GERAL: 31/100 (CRÍTICO)

| Dimensão | Score | Itens Críticos | Itens Altos | Itens Médios |
|----------|-------|---------------|-------------|-------------|
| D1 — De-Mocking | 35/100 | 5 | 6 | 8 |
| D2 — Estresse de Componentes | 22/100 | 8 | 12 | 10+ |
| D3 — DOM/Performance | 28/100 | 5 | 10 | 15+ |
| D4 — Segurança Client-Side | 40/100 | 2 | 5 | 8 |

---

## MATRIZ DE RISCO — TOP 20 ACHADOS

| # | Dimensão | Severidade | Módulo | Achado | Impacto no Usuário |
|---|----------|-----------|--------|--------|-------------------|
| 1 | D2 | 🔴 CRITICAL | Vendas | `faturarPedido()` sem debounce — L6152 | **NF-e duplicada na SEFAZ — impacto fiscal real** |
| 2 | D2 | 🔴 CRITICAL | Faturamento | `transmitirSEFAZ()` sem proteção — emitir.html L412 | **Transmissão fiscal duplicada** |
| 3 | D2 | 🔴 CRITICAL | Vendas | `salvarPedido()` sem debounce — L6133 | Corrupção de dados, PATCHs duplicados |
| 4 | D2 | 🔴 CRITICAL | Financeiro | `salvarConta()` sem disabled — contas_pagar.html L933 | Contas duplicadas no sistema financeiro |
| 5 | D1 | 🔴 CRITICAL | RH | `loadMockDashboardData()` ativo — rh-admin.js L140 | Dashboard RH exibe dados FALSOS |
| 6 | D1 | 🔴 CRITICAL | Compras | `gerarRequisicoesExemplo()` ativo — requisicoes.js L220 | Requisições FICTÍCIAS exibidas ao usuário |
| 7 | D1 | 🔴 CRITICAL | PCP (server) | `faturamentosExemplo` — server.js L3094 | Front-end PCP recebe faturamentos FALSOS |
| 8 | D1 | 🔴 CRITICAL | PCP (server) | `ordensExemplo` — server_pcp.js L1187 | OPs fictícias no painel PCP |
| 9 | D1 | 🔴 CRITICAL | Vendas (server) | Dashboard com `Math.random()` — server.js L5400 | Gráfico de receita ALEATÓRIO |
| 10 | D2 | 🔴 CRITICAL | Todos | 200+ instâncias innerHTML com dados de usuário sem escape | **XSS stored em todo o sistema** |
| 11 | D3 | 🔴 CRITICAL | Global | anti-copy-protection.js: 3 setIntervals permanentes | CPU drenada em TODAS as páginas |
| 12 | D3 | 🔴 CRITICAL | Vendas | index.html monolítico (20.800 linhas) — 30+ listeners sem cleanup | Memory leak progressivo |
| 13 | D4 | 🔴 CRITICAL | Global | 155+ arquivos acessam JWT via localStorage diretamente | Migração auth incompleta, token exposto a XSS |
| 14 | D4 | 🔴 CRITICAL | Global | Token demo hardcoded — script.js L600 | `simulated-token-employee-789` acessível |
| 15 | D2 | 🟠 HIGH | Vendas | 25+ botões Salvar/Excluir sem proteção double-click | Dados duplicados em todas as ações |
| 16 | D2 | 🟠 HIGH | Faturamento | 5+ `.catch(() => {})` — erros engolidos silenciosamente | Falhas fiscais não reportadas ao usuário |
| 17 | D3 | 🟠 HIGH | Todos | 15+ MutationObservers sem `.disconnect()` | Memory leak acumulativo |
| 18 | D3 | 🟠 HIGH | Chat | Socket.IO: 10+ `socket.on()` e ZERO `socket.off()` | Handlers duplicam ao reconectar widget |
| 19 | D1 | 🟠 HIGH | Financeiro | Notificações: 4 stubs `verificar*()` sem implementação | Verificações financeiras não funcionam |
| 20 | D1 | 🟠 HIGH | Financeiro | gestor_anexos.js: download retorna `'#'`, excluir simula sucesso | Anexos inacessíveis / exclusão falsa |

---

# DIMENSÃO 1: DE-MOCKING (Score: 35/100)

> Dados mock/hardcoded que chegam ao usuário final quando APIs falham.

---

## 🔴 SEVEROS — Mock Data Ativo em Produção

### D1-CRIT-01 — RH Admin: Dashboard e Funcionários Fictícios
- **Arquivo**: `modules/RH/public/rh-admin.js`
- **Linhas**: L139-140, L160-170, L175-180, L201-206, L296-350, L360-430
- **Padrão**: `loadMockDashboardData()`, `loadMockFuncionarios()`
- **Dados falsos**: `'João Silva'`, `'Maria Santos'`, `'Pedro Costa'`, CPFs falsos `'123.456.789-00'`, salários `'R$ 8.500,00'`, stats `'147'`, `'142'`, `'R$ 298.5K'`
- **Gatilho**: Chamado como fallback quando API falha (catch block ativo)
- **API necessária**: `GET /api/rh/funcionarios`, `GET /api/rh/stats`
- **Impacto**: Gestor de RH toma decisões baseado em números FALSOS

### D1-CRIT-02 — Compras: Requisições Exemplo
- **Arquivo**: `modules/Compras/requisicoes.js`
- **Linhas**: L220, L920-965
- **Padrão**: `requisicoes = gerarRequisicoesExemplo()` — chamada como fallback ativo
- **Dados falsos**: Requisições com nomes (`'João Silva'`, `'Maria Santos'`), itens (`'Cabo Triplex 10mm²'`)
- **API necessária**: `GET /api/compras/requisicoes`
- **Impacto**: Tela de Requisições exibe compras que nunca existiram

### D1-CRIT-03 — PCP Server: Faturamentos Fictícios
- **Arquivo**: `modules/PCP/server.js`
- **Linhas**: L3092-3166
- **Padrão**: `faturamentosExemplo` — array com 5 registros hardcoded
- **Dados falsos**: `'Construtora Silva & Cia'`, `'Indústria ABC Ltda'`, NFs e valores em R$
- **API necessária**: Retornar `[]` ou HTTP 500 em vez de dados fictícios

### D1-CRIT-04 — PCP Server: Ordens de Produção + Faturamentos Duplicados
- **Arquivo**: `modules/PCP/server_pcp.js`
- **Linhas**: L1185-1258 (`ordensExemplo`), L1395-1469 (`faturamentosExemplo` duplicado)
- **Padrão**: 4 OPs falsas + faturamentos duplicados do server.js
- **API necessária**: Retornar `[]` quando tabela não existe

### D1-CRIT-05 — Vendas Server: Receita Aleatória
- **Arquivo**: `modules/Vendas/server.js`
- **Linhas**: L5400-5408, L5455-5469
- **Padrão**: `Math.floor(Math.random() * 200000) + 20000` para receita
- **Dados falsos**: Vendedores reais (`'Márcia Scarcella'`, `'Augusto Ladeira'`) com faturamentos inventados
- **API necessária**: Retornar `[]` ou erro quando dados reais indisponíveis

---

## 🟠 ALTOS — UI Shells e Stubs Não-Funcionais

### D1-HIGH-01 — PCP: UI Shell Completo
- **Arquivo**: `modules/PCP/index_new.html`
- **Linhas**: L1423, L1458, L1465-1514, L1652
- **Padrão**: 12+ `alert('...Em desenvolvimento')` stubs
- **Impacto**: Página exibida ao usuário como funcional, mas nenhum botão opera

### D1-HIGH-02 — Financeiro: Notificações Stub
- **Arquivo**: `modules/Financeiro/notificacoes.js`
- **Linhas**: L46, L55, L60, L65, L85-90, L106-115, L128
- **Padrão**: 4 métodos `verificar*()` são apenas `console.log`; `criar()` sem persistência
- **API necessária**: `POST /api/financeiro/notificacoes`, `PATCH /api/financeiro/notificacoes/:id/lida`

### D1-HIGH-03 — Financeiro: Anexos Falsos
- **Arquivo**: `modules/Financeiro/gestor_anexos.js`
- **Linhas**: L550, L570, L585-591
- **Padrão**: `obterUrlAnexo()` retorna `'#'`; `excluirAnexo()` retorna `{ success: true }` sem API
- **API necessária**: `GET /api/financeiro/anexos/:id/url`, `DELETE /api/financeiro/anexos/:id`

### D1-HIGH-04 — Financeiro: Importação OFX/XLSX Stub
- **Arquivo**: `modules/Financeiro/conciliacao_bancaria.js`
- **Linhas**: L513, L532, L575
- **Padrão**: `processarOFX()` e `processarXLSX()` retornam `[]` — parsers não implementados
- **API necessária**: `POST /api/financeiro/conciliacao/importar`

### D1-HIGH-05 — PCP: Movimentações de Estoque Falsas
- **Arquivo**: `modules/PCP/index.html`
- **Linhas**: L13442-13451
- **Padrão**: `exemploMovs` — 2 movimentações hardcoded como fallback de erro

### D1-HIGH-06 — PCP Routes: Materiais e Produtos Exemplo
- **Arquivo**: `routes/pcp-routes.js`
- **Linhas**: L1829-1853 (`materiaisExemplo`), L2494-2511 (`produtosExemplo`), L4280 (`'Cliente Teste'`)

---

## 🟡 MÉDIOS — TODOs de Integração Pendente

### D1-MED-01 — Vendas: Pedidos não persistem
- **Arquivo**: `modules/Vendas/public/index.html`
- **Linhas**: L12194 (`// TODO: Salvar no backend`), L17092 (NF com `Math.random()`), L17185 (e-mail simulado)

### D1-MED-02 — Vendas: Arquivo Duplicado
- **Arquivo**: `modules/Vendas/public/index_utf8.html`
- **Linhas**: L12489, L18263 — espelho do index.html com mesmos TODOs

### D1-MED-03 — RH: Cálculos com Valores Fictícios
- **Arquivo**: `modules/RH/public/pages/dashboard.html`
- **Linhas**: L989-1010
- **Padrão**: `salarioBase = 3000`, INSS hardcoded em 11%

### D1-MED-04 — RH: CNPJ Fictício em Holerites
- **Arquivo**: `modules/RH/public/pages/holerites.html`
- **Linhas**: L356, L411, L413
- **Padrão**: CNPJ `00.000.000/0001-00`, VR=400 fixo, VT=salarioBase*0.06

### D1-MED-05 — RH: CNPJ Fictício Duplicado
- **Arquivo**: `modules/RH/public/pages/meus-holerites.html`
- **Linha**: L913

### D1-MED-06 — RH: Benefícios Padrão Hardcoded
- **Arquivo**: `modules/RH/public/pages/beneficios.html`
- **Linhas**: L427-467, L544
- **Padrão**: 3 benefícios hardcoded (VT, CS Saúde, Cesta Básica) como fallback

### D1-MED-07 — Financeiro: Exportação Stub
- **Arquivo**: `modules/Financeiro/fluxo_caixa.js`
- **Linhas**: L351, L356
- **Padrão**: `// TODO: Implementar exportação real` para PDF e Excel

---

# DIMENSÃO 2: ESTRESSE DE COMPONENTES (Score: 22/100)

> Botões sem debounce, XSS via innerHTML, inputs sem validação, dropdowns sem virtualização.

---

## 🔴 SEVEROS — Botões Críticos Sem Proteção Double-Click

### D2-CRIT-01 — Faturar Pedido (RISCO FISCAL)
- **Arquivo**: `modules/Vendas/public/index.html`
- **Linha**: L6152 (`onclick="faturarPedido()"`), L11336 (função async sem guard)
- **Padrão**: Zero proteção: sem debounce, sem `btn.disabled`, sem flag de re-entrada
- **Impacto**: Clique duplo gera NF-e duplicada na SEFAZ — rejeição ou faturamento a maior

### D2-CRIT-02 — Transmitir SEFAZ (RISCO REGULATÓRIO)
- **Arquivo**: `modules/Faturamento/public/emitir.html`
- **Linha**: L412
- **Padrão**: `async function transmitirSEFAZ(nfeId)` — sem debounce ou disabled
- **Impacto**: Transmissão duplicada à receita federal

### D2-CRIT-03 — Salvar Pedido
- **Arquivo**: `modules/Vendas/public/index.html`
- **Linha**: L6133 (`onclick="salvarPedido()"`)
- **Padrão**: Sem proteção alguma
- **Impacto**: 2 PATCHs simultâneos ao backend, corrupção de dados

### D2-CRIT-04 — Salvar Novo Orçamento
- **Arquivo**: `modules/Vendas/public/index.html`
- **Linha**: L7424 (`onclick="salvarNovoOrcamento()"`)
- **Impacto**: Pedidos duplicados no banco

### D2-CRIT-05 — Salvar Conta Financeira
- **Arquivo**: `modules/Financeiro/public/contas_pagar.html`
- **Linhas**: L933 (button submit), L1223 (função sem `btn.disabled = true`)
- **Impacto**: Contas a pagar duplicadas

### Tabela Completa — Botões Sem Proteção (Vendas)

| Função | Linha | Risco |
|--------|-------|-------|
| `salvarPedido()` | L6133 | 🔴 CRITICAL |
| `faturarPedido()` | L6152 | 🔴 CRITICAL |
| `salvarNovoOrcamento()` | L7424 | 🔴 CRITICAL |
| `salvarItemPedido()` | L7648 | 🟠 HIGH |
| `salvarNFsRelacionadas()` | L7924 | 🟠 HIGH |
| `salvarInfoFisco()` | L7956 | 🟡 MEDIUM |
| `salvarCamposObsNFe()` | L7998 | 🟡 MEDIUM |
| `salvarEnderecoEntrega()` | L8059 | 🟡 MEDIUM |
| `salvarICMSTransporte()` | L8103 | 🟡 MEDIUM |
| `salvarClienteManual()` | L8358 | 🟠 HIGH |
| `excluirPedido()` | L6184 | 🟠 HIGH |
| `excluirItemSelecionado()` | L5835 | 🟠 HIGH |
| `excluirAnexo()` | L12234 | 🟡 MEDIUM |

**Referência positiva**: `modules/RH/public/app.js` L483-492 implementa `btn.disabled = true` com helper `setLoading()` — **único módulo** com proteção. Padrão deve ser replicado.

---

## 🔴 SEVERO — XSS via innerHTML (200+ instâncias)

### Padrão Sistêmico
O codebase inteiro constrói HTML via template literals com dados de API/banco sem escape via `innerHTML =`. Funções de escape existem (`_escape()` em app.js L2054, `_escFin()` em financeiro-shared.js L132) mas são usadas em apenas 2-3 locais. 

### Instâncias Mais Perigosas (XSS Stored)

| Arquivo | Linha | Dado Exposto | Severidade |
|---------|-------|-------------|-----------|
| `modules/RH/public/app.js` | L165 | Título/mensagem de aviso (editável por admin) | 🔴 CRITICAL |
| `modules/RH/public/app.js` | L1206 | URL de arquivo + nome de arquivo | 🔴 CRITICAL |
| `modules/RH/public/app.js` | L1297 | Email de funcionário | 🔴 CRITICAL |
| `modules/Vendas/public/js/vendas-app.js` | L287 | Nome de cliente em cards kanban | 🔴 CRITICAL |
| `modules/Vendas/public/js/vendas-app.js` | L832 | Histórico: descrição + nome de usuário | 🔴 CRITICAL |
| `modules/Vendas/public/js/vendas-kanban.js` | L414 | Dados de cliente/vendedor em cards | 🔴 CRITICAL |
| `modules/RH/public/app.js` | L239 | Nome de funcionário | 🟠 HIGH |
| `modules/RH/public/app.js` | L839 | Nome/cargo/setor de funcionário | 🟠 HIGH |
| `modules/Vendas/public/index.html` | L13253 | Assunto de email e destinatário | 🟠 HIGH |
| `modules/Vendas/public/index.html` | L13468 | Descrição de tarefa (editável) | 🟠 HIGH |
| `modules/Financeiro/public/contas_receber.html` | L623 | Dados de fornecedor/descrição | 🟠 HIGH |
| `modules/Financeiro/public/contas_pagar.html` | L1125 | Contas a pagar com dados | 🟠 HIGH |
| `modules/Financeiro/public/contas_receber.html` | L652 | Nomes de clientes em dropdown | 🟠 HIGH |
| `modules/Financeiro/public/contas_pagar.html` | L1155 | Nomes de fornecedores em opções | 🟠 HIGH |
| `modules/Faturamento/public/logistica.html` | L359 | Dados de pedido | 🟠 HIGH |
| `modules/Compras/public/js/cotacoes-compras-novo.js` | L45 | Dados de cotação | 🟠 HIGH |
| `modules/RH/public/rh-admin.js` | L184 | Lista de funcionários | 🟠 HIGH |
| `modules/Faturamento/public/emitir.html` | L406 | Mensagem de status | 🟡 MEDIUM |
| `modules/Faturamento/public/danfe.html` | L280 | Mensagem de erro | 🟡 MEDIUM |
| `modules/Vendas/public/js/vendas-app.js` | L479 | ID/número de pedido (numérico) | 🟡 MEDIUM |

### Recomendação
Criar helper `escapeHTML()` global em `_shared/` e aplicar em TODOS os pontos de interpolação.

---

## 🟠 ALTO — Error Handling: `.catch(() => {})` Sistemático no Faturamento

| Arquivo | Linha | Padrão | Impacto |
|---------|-------|--------|---------|
| `modules/Faturamento/public/emitir.html` | L437 | `.catch(() => {})` | Transmissão à SEFAZ falha silenciosamente |
| `modules/Faturamento/public/logistica.html` | L675 | `.catch(() => {})` | Falha de logística não reportada |
| `modules/Faturamento/public/danfe.html` | L306 | `.catch(() => {})` | DANFE não carrega sem mensagem |
| `modules/Faturamento/public/eventos.html` | L264 | `.catch(() => {})` | Eventos fiscais silenciados |
| `modules/Faturamento/public/regua.html` | L402 | `.catch(() => {})` | Régua fiscal sem feedback |

---

## 🟠 ALTO — Dropdowns Sem Virtualização

| Arquivo | Linha | Dado | Impacto |
|---------|-------|------|---------|
| `modules/Vendas/public/index.html` | L19932 | Catálogo de produtos | Freeze com 500+ produtos |
| `modules/Vendas/public/index.html` | L19978 | Segunda lista de produtos | Idem |
| `modules/Vendas/public/index.html` | L20114 | Terceira instância | Idem |
| `modules/Financeiro/public/contas_receber.html` | L652 | Lista de clientes (500+) | Renderiza todos de uma vez |
| `modules/Financeiro/public/contas_pagar.html` | L1155 | Lista de fornecedores | Sem filtro |

---

## 🟠 ALTO — Inputs Sem Validação

| Arquivo | Problema | Impacto |
|---------|---------|---------|
| `modules/Vendas/public/index.html` | ~100+ `<input>` e apenas 8 com `maxlength` | Strings ilimitadas aceitas |
| `modules/Vendas/public/index.html` L10132 | `salvarPedido()` coleta ~20 campos sem validar comprimento | Backend recebe dados arbitrários |
| `modules/Vendas/public/index.html` L16852 | `salvarNovoOrcamento()` valida apenas cliente vazio | Nome ilimitado via `.toUpperCase()` |
| `modules/Financeiro/public/contas_pagar.html` L1223 | `salvarConta()` sem validação | Descrição/observações sem limite |
| `modules/Vendas/public/index.html` | `edit-valor-frete`, `edit-peso-*` — type="text" sem min/max | Aceita valores inválidos |

---

## 🟡 MÉDIO — Loading States Ausentes

| Arquivo | Linha | Contexto |
|---------|-------|---------|
| `modules/Vendas/public/js/vendas-kanban.js` | L390 | Limpa colunas sem spinner |
| `modules/Vendas/public/js/vendas-app.js` | L179 | Fetch sem loading state |
| `modules/RH/public/app.js` | L820 | Tabela vazia sem indicação |
| `modules/Financeiro/public/contas_pagar.html` | - | 0.5-2s de tela em branco |
| `modules/Compras/public/js/dashboard-compras-novo.js` | L27 | Dashboard em branco |

**Referência positiva**: Vendas index.html L13283, L14045 já têm `fa-spinner fa-spin`. RH app.js L1244 tem `'Carregando...'`.

---

# DIMENSÃO 3: DOM/PERFORMANCE (Score: 28/100)

> Memory leaks, event listeners órfãos, observers sem cleanup, arquivos monolíticos.

---

## 🔴 SEVEROS — Memory Leaks Sistêmicos

### D3-CRIT-01 — anti-copy-protection.js: 3 Timers Permanentes
- **Arquivo**: `public/js/anti-copy-protection.js`
- **Linhas**: L244, L245, L315
- **Padrão**: 3x `setInterval` sem NENHUM `clearInterval`
- **Intervalos**: 1s + 2s + periódico (DevTools detection)
- **Impacto**: TODOS os usuários pagam custo de CPU de 3 timers rodando indefinidamente. Mobile/low-end = drain de bateria e jank perceptível
```javascript
setInterval(checkDevTools, 1000);          // L244 — NUNCA cleared
setInterval(detectDevToolsConsole, 2000);  // L245 — NUNCA cleared
setInterval(function() { /* ... */ });     // L315 — NUNCA cleared
```

### D3-CRIT-02 — Vendas index.html: 30+ Listeners Sem Cleanup (20.800 linhas)
- **Arquivo**: `modules/Vendas/public/index.html`
- **Tamanho**: 20.830 linhas (monolítico: HTML + CSS + JS inline)
- **addEventListener**: 30+ espalhados por todo o arquivo
- **removeEventListener**: ZERO em todo o arquivo
- **Impacto**: Arquivo monolítico que nunca limpa listeners. Parse time altíssimo. Memory leak progressivo em sessões longas.

### D3-CRIT-03 — Vendas index_utf8.html: Clone Monolítico
- **Arquivo**: `modules/Vendas/public/index_utf8.html`
- **Tamanho**: ~19.500 linhas — duplicação do monolito com mesmos problemas

### D3-CRIT-04 — _shared: 20+ Listeners, 1 removeEventListener
- **Arquivos**: `modules/_shared/aluforce-auto-layout.js`, `aluforce-layout.js`, `header-functions.js`, `connection-monitor.js`, `confirm-dialog.js`
- **addEventListener**: 20+ no total
- **removeEventListener**: Apenas 1 em `confirm-dialog.js` L259 (keydown)
- **Impacto**: Carregados em TODAS as páginas do sistema. Se re-inicializados, listeners duplicam.

### D3-CRIT-05 — dashboard-numbers-script.js: MutationObserver em document.body
- **Arquivo**: `modules/RH/public/dashboard-numbers-script.js`
- **Padrão**: `setInterval(forceNumbersVisibility, 5000)` + MutationObserver observando `document.body` com `{ childList: true, subtree: true, attributes: true }`
- **disconnect()**: NUNCA chamado
- **Impacto**: Observer dispara em QUALQUER mudança DOM na página inteira — dupla penalidade com timer de 5s

---

## 🟠 ALTOS — setIntervals Sem Cleanup

### Tabela Completa — setInterval sem clearInterval

| Arquivo | Linha | Intervalo | Módulo | Impacto |
|---------|-------|-----------|--------|---------|
| `public/js/anti-copy-protection.js` | L244,245,315 | 1s, 2s, periódico | Global | CPU drain |
| `modules/_shared/inactivity-manager.js` | L413 | CONFIG.CHECK_INTERVAL | Global | Timer principal nunca cleared |
| `modules/_shared/user-greeting.js` | L274 | 60s | Global | Todas páginas |
| `modules/RH/public/dashboard-numbers-script.js` | inline | 5s | RH | + MutationObserver |
| `modules/RH/public/app.js` | L2401 | 30s | RH | Polling avisos permanente |
| `modules/RH/public/api-cache.js` | L204 | 10min | RH | Cache refresh |
| `modules/RH/public/tempo-casa-calculator.js` | L219 | 5min | RH | Timer permanente |
| `public/js/auth-unified.js` | L559 | periódico | Global | Auth check em todas páginas |
| `public/js/api-config.js` | L180 | periódico | Global | API health check |
| `public/js/notification-button.js` | L67 | periódico | Global | Notification polling |
| `public/js/aluforce-turbo.js` | L1047 | periódico | Global | Performance optimization loop |
| `public/js/dashboard-enhanced.js` | L524 | periódico | Dashboard | Refresh loop |
| `public/js/greeting-premium.js` | L143 | periódico | Global | Greeting animation |
| `modules/Financeiro/js/financeiro-comum.js` | L122 | 30s | Financeiro | Session check |
| `modules/Financeiro/public/index.html` | L1139 | 5min | Financeiro | Dashboard refresh |
| `modules/Financeiro/notificacoes.js` | L37 | periódico | Financeiro | Notif polling |
| `modules/PCP/pcp-contadores.js` | L266 | **500ms** | PCP | 2 callbacks/seg! |
| `modules/PCP/pcp-contadores.js` | L388 | periódico | PCP | Segundo timer |
| `modules/PCP/pcp-optimizations.js` | L66 | 2min | PCP | Optimization scan |
| `modules/PCP/pcp_modern.js` | L3309 | periódico | PCP | Animação |
| `modules/PCP/index.html` | L8194 | periódico | PCP | Status refresh |

**Referência positiva** (com cleanup):
- `login.js` L62,73,1040,1315 — todos 4 com clearInterval ✅
- `connection-monitor.js` L370 — clearInterval em L363, L379 ✅
- `background-manager.js` L252 — clearInterval em L249, L264 ✅
- `dashboard-executivo.js` L566 — this.intervalId com L573 ✅

---

## 🟠 ALTO — MutationObservers Sem disconnect()

| # | Arquivo | Linha | Target | disconnect()? |
|---|---------|-------|--------|--------------|
| 1 | `modules/Compras/compras-api.js` | L484 | DOM element | ❌ |
| 2 | `modules/Compras/public/js/relatorios-compras-novo.js` | L312 | DOM element | ❌ |
| 3 | `modules/Compras/public/js/recebimento-compras-novo.js` | L128 | DOM element | ❌ |
| 4 | `modules/Compras/public/js/pedidos-compras-novo.js` | L113 | DOM element | ❌ |
| 5 | `modules/Compras/public/js/materiais-compras-novo.js` | L154 | DOM element | ❌ |
| 6 | `modules/Compras/public/js/fornecedores-compras-novo.js` | L129 | DOM element | ❌ |
| 7 | `modules/Compras/public/js/estoque-compras-novo.js` | L155 | DOM element | ❌ |
| 8 | `modules/Compras/public/js/dashboard-compras-novo.js` | L398 | DOM element | ❌ |
| 9 | `modules/Compras/public/js/cotacoes-compras-novo.js` | L149 | DOM element | ❌ |
| 10 | `modules/Compras/js/modal-system.js` | L391 | DOM element | ❌ |
| 11-12 | `modules/PCP/producao-faturamento.js` | L454, L469 | 2 observers | ❌ |
| 13-14 | `modules/PCP/pcp-correcoes.js` | L165, L193 | 2 observers | ❌ |
| 15 | `modules/PCP/materiais-functions.js` | L1147 | DOM element | ❌ |
| 16 | `modules/RH/public/dashboard-numbers-script.js` | inline | **document.body** | ❌ |

**Total: 16 MutationObservers, ZERO disconnect() em todo o front-end.**

---

## 🟠 ALTO — Socket.IO Sem Cleanup

### D3-HIGH-06 — Chat Widget: 10+ socket.on() sem socket.off()
- **Arquivo**: `public/chat-teams/chat-widget.js`
- **Linha**: L434 — `io('/chat-teams', { auth: { token } })`
- **Handlers registrados**: connect, disconnect, chat_message, + 7 outros
- **socket.off()**: ZERO em todo o arquivo
- **socket.disconnect()**: ZERO (apenas escuta evento 'disconnect')
- **Impacto**: Widget reinicializado = handlers duplicam indefinidamente

### D3-HIGH-07 — Chat Widget Secundário
- **Arquivo**: `chat/public/widget.js`
- **Linha**: L64
- **Mesmo padrão**: socket.on() sem socket.off()

---

## 🟠 ALTO — innerHTML += em Loops (O(N²))

| Arquivo | Linha | Padrão | Impacto |
|---------|-------|--------|---------|
| `modules/Vendas/public/js/vendas-kanban.js` | L414 | `coluna.innerHTML += cardHTML` em forEach | 50+ cards → jank |
| `public/js/config-modals.js` | L624, L4083, L6365, L7071 | `innerHTML +=` em forEach para `<option>` | Selects com muitas opções |
| `modules/Financeiro/public/index.html` | L672-673 | `origemSelect.innerHTML += '...'` em loop | Re-parse repetitivo |
| `modules/Vendas/public/index.html` | L14916 | `badgesDiv.innerHTML += badgeHTML` | Impacto limitado |

---

## 🟠 ALTO — Focus Trap e Acessibilidade em Modais

| Módulo | Focus Trap | Tab Cycling | Escape Close | Restore Focus | Body Overflow |
|--------|-----------|-------------|-------------|---------------|---------------|
| **RH** (app.js) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PCP** (index.html) | ⚠️ Parcial | ❌ | ✅ | ❌ | ✅ |
| **Vendas** (index.html) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Financeiro** (htmls) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Compras** (htmls) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

# DIMENSÃO 4: SEGURANÇA CLIENT-SIDE (Score: 40/100)

> Armazenamento de tokens, CSRF, dados sensíveis, fluxo de auth.

---

## 🔴 SEVEROS — Segurança

### D4-CRIT-01 — JWT em localStorage: Migração Incompleta (155+ arquivos)
- **Mecanismo**: `auth-unified.js` v7.3 implementa "Storage Isolator" que intercepta `localStorage.getItem/setItem` para chaves auth, redirecionando para `sessionStorage`
- **Problema**: **155+ arquivos** chamam `localStorage.getItem('authToken')` diretamente
- **Risco**: Se o interceptor não carregar primeiro (race condition), token é lido do localStorage real. E o interceptor NÃO cobre chaves custom (`clienteSelecionado`, `etapasKanban`)
- **Dados em localStorage**:

| Chave | Conteúdo | Sensível? |
|-------|----------|-----------|
| `authToken` / `token` | JWT completo | 🔴 SIM |
| `userData` | `{id, nome, email, role, permissions, empresa_id}` | 🟠 SIM |
| `clienteSelecionado` | JSON cliente (nome, CNPJ) | 🟡 PARCIAL |
| `etapasKanban` | Config kanban | ❌ NÃO |
| `darkMode` | boolean | ❌ NÃO |

### D4-CRIT-02 — Token Demo Hardcoded em Produção
- **Arquivo**: `public/js/script.js`
- **Linhas**: L585-601
- **Código**:
```javascript
const userData = {
    nome: "Maria Oliveira",
    cpf: "111.222.333-44",
    email: "maria.oliveira@empresa.com",
    banco: "Banco Itaú",
    agencia: "5678",
    conta: "12345-6"
};
localStorage.setItem('authToken', 'simulated-token-employee-789');
localStorage.setItem('userData', JSON.stringify(userData));
```
- **Impacto**: Função `simulateEmployeeLogin()` acessível em produção com PII fictício e token previsível

---

# ✅ CORREÇÕES APLICADAS (Sprint Chaos Fix — 2026-03-21)

## Fase 1 — XSS: `escaparHTML()` Aplicado

### vendas-app.js (6 pontos):
- `criarCardPedido()`: `pedido.cliente`, `statusText`, `pedido.origem`
- `renderizarItens()`: `item.codigo`, `item.descricao`
- `abrirModalFaturar()`: `pedidoAtual.cliente`
- `renderizarAnexos()`: `anexo.nome`
- `renderizarHistorico()`: `item.acao`, `item.usuario`, `item.detalhes`

### index.html (~25 pontos):
- Função `escaparHTML()` global adicionada no bloco "UTILITÁRIOS GLOBAIS"
- **Kanban card**: `item.cliente`, `item.status` em `criarPedidoHTML()`
- **Autocomplete produtos**: `p.codigo`, `p.descricao`, `p.unidade`, `p.local_estoque`
- **Tabela pesquisa produtos**: `p.codigo`, `p.descricao`
- **Recibo/impressão**: `pedidoAtual.cliente`, `cliente_cnpj`, `cliente_ie`, `cliente_endereco`, `cliente_bairro`, `cliente_cidade`, `cliente_uf`, `cliente_cep`
- **NF impressão**: `pedidoAtual.cliente`, `cliente_cnpj`, `cliente_cpf`, `cliente_ie`, `cliente_cep`, `cliente_telefone`, `cliente_contato`, `d.endCliente`
- **Modal faturar**: `pedidoAtual.cliente` em 3 modais (normal, kanban, parcial)
- **comunicarSefaz()**: `p.nf`, `p.cliente` na lista SEFAZ
- **Faturar todos**: `p.cliente` na lista de pedidos
- **Export HTML/PDF**: `p.id`, `p.cliente`, `p.status`
- **PDF relatórios**: `item.cliente`, `item.vendedor`, `item.condicao`, `item.status`, `item.nf` (vendas, clientes, faturamento)
- **Campos Obs NF-e**: `obs.campo`, `obs.valor` em `renderizarCamposObs()`
- **Alterações produto**: `a` em lista de alterações detectadas

## Fase 2 — innerHTML += Loop Fix

### vendas-kanban.js:
- **Antes**: `coluna.innerHTML += cardHTML` dentro de `forEach()` → O(n²) DOM operations
- **Depois**: Acumula HTML em `htmlPorColuna` objeto, depois `coluna.innerHTML = html` por coluna (batch único)

## Fase 3 — Memory Leak Fixes

### modal-integration.js:
- MutationObserver salvo em `_modalObserver` com `disconnect()` antes de re-criar
- Flag `input.dataset.changeListenerAdded` previne listeners duplicados ao reabrir modal
- Flag `_notificationListenersSetup` previne acúmulo de 6+ socket listeners por reconexão
- Handler `beforeunload`: desconecta observer, limpa timeouts, chama `socket.off()` + `socket.disconnect()`

## Fase 4 — Re-Entrancy Guards (Double-Click Protection)

### index.html — 12 funções protegidas:
| Função | Flag | Severidade |
|--------|------|-----------|
| `executarRemessaKanban()` | `window._executandoRemessa` | CRITICAL |
| `cancelarPedido()` | `window._cancelandoPedido` | CRITICAL |
| `confirmarFaturarTodos()` | `window._faturandoTodos` | CRITICAL |
| `transmitirSefaz()` | `window._transmitindoSefaz` | CRITICAL |
| `salvarItemPedido()` | `window._salvandoItem` | HIGH |
| `salvarClienteManual()` | `window._salvandoClienteManual` | HIGH |
| `salvarNovoCliente()` | `window._salvandoNovoCliente` | HIGH |
| `salvarNovoProduto()` | `window._salvandoProduto` | HIGH |
| `salvarNovaCondicao()` | `window._salvandoCondicao` | HIGH |
| `salvarNovoTipoFrete()` | `window._salvandoTipoFrete` | HIGH |
| `salvarNovaRegiao()` | `window._salvandoRegiao` | HIGH |
| `salvarNovoCargo()` | `window._salvandoCargo` | HIGH |
| `salvarNovoVendedor()` | `window._salvandoVendedor` | HIGH |

**Padrão usado**: `if (window._flag) return; window._flag = true; try { ... } finally { window._flag = false; }`

## Validação
- ✅ `node --check` em vendas-app.js, vendas-kanban.js, modal-integration.js
- ✅ `new Function()` parse em 3 blocos `<script>` inline de index.html
- ✅ Zero erros de sintaxe

---

## 🟠 ALTOS — Gaps de Segurança

### D4-HIGH-01 — CSRF: Proteção Limitada a UM Arquivo
- **Único arquivo com CSRF**: `modules/_shared/connection-monitor.js` L422-426
```javascript
const csrfToken = getCookie('csrf_token');
if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
```
- **Todos os outros módulos** (Vendas, Financeiro, Compras, PCP, RH): fetch SEM CSRF token
- Nenhum `<form>` inclui campo hidden `_csrf`

### D4-HIGH-02 — 401 Handling Inconsistente
- **auth-unified.js**: Redireciona para `/login.html?returnTo=...` ✅
- **Compras**: SEM tratamento de 401 — falha silenciosa, dados não carregam
- **RH rh-admin.js**: SEM redireção automática em 401

### D4-HIGH-03 — Redirect Não Validado
- **Arquivo**: `public/js/notifications-manager.js` L316, L336
- **Padrão**: `window.location.href = link` onde `link` vem de data da API
- **Risco**: Se API retornar URL maliciosa (comprometimento de BD), redirect ocorre sem validação

### D4-HIGH-04 — IP Interno Exposto
- **Arquivo**: `public/js/app-mobile-config.js` L25
- **Código**: `local: 'http://192.168.68.133:3000'`

### D4-HIGH-05 — Senha de Certificado Digital em FormData
- **Arquivo**: `public/js/config-modals.js` L1768, L1782
- **Padrão**: `formData.append('senha', ...)` — visível em DevTools Network tab

---

## 🟡 MÉDIOS — Segurança

### D4-MED-01 — Token em URL Query String (Backup)
- **Arquivo**: `modules/RH/public_backup/app.js`
- **Padrão**: `/api/avisos/stream?token=${encodeURIComponent(token)}`
- **Mitigante**: Versão produção usa handshake com short-lived token ✅

### D4-MED-02 — `javascript:` Protocol
- **Arquivo**: `modules/Financeiro/contas-receber.html` L3041
- **Padrão**: `href="javascript:carregarContasDoServidor()"`

### D4-MED-03 — Cookies: document.cookie em 11 arquivos
- **Análise**: Todos os acessos são para cookies não-HttpOnly (CSRF, preferences). Token auth é HttpOnly ✅
- **Aceitável**: Padrão correto de separação

### D4-MED-04 — Proteção Open Redirect
- **Arquivo**: `public/js/login.js` L911-912
- **Validação atual**: `decodedReturn.startsWith('/') && !decodedReturn.startsWith('//')`
- **Gap**: Não valida contra paths internos perigosos (`/api/admin/delete`)

---

## ✅ POSITIVOS — Segurança

| Item | Status | Arquivo |
|------|--------|---------|
| Cookie auth é HttpOnly | ✅ OK | Server-side |
| **ZERO** `eval()` ou `new Function()` em produção | ✅ OK | Todos |
| **ZERO** credenciais de DB no client-side | ✅ OK | Todos |
| SSE usa handshake + short-lived token (produção) | ✅ OK | RH app.js |
| Open redirect bloqueado para `//` | ✅ OK | login.js |

---

# RESUMO DE PRIORIDADES

## Sprint Emergencial (P0) — Impacto Fiscal + Corrupção de Dados
| # | Item | Módulo | Estimativa |
|---|------|--------|-----------|
| 1 | Debounce em `faturarPedido()` + `transmitirSEFAZ()` | Vendas, Faturamento | Rápida |
| 2 | Debounce em todos os `salvar*()` e `excluir*()` | Vendas, Financeiro | Rápida |
| 3 | Remover `loadMockDashboardData()`/`loadMockFuncionarios()` → mostrar mensagem de erro | RH | Rápida |
| 4 | Remover `gerarRequisicoesExemplo()` → mostrar mensagem de erro | Compras | Rápida |
| 5 | Remover fallbacks `*Exemplo` dos servers PCP → retornar `[]` | PCP | Rápida |
| 6 | Remover `Math.random()` do dashboard Vendas server | Vendas | Rápida |

## Sprint P1 — XSS + Memory Leaks Sistêmicos
| # | Item | Módulo | Estimativa |
|---|------|--------|-----------|
| 7 | Criar `escapeHTML()` global e aplicar em todos os `innerHTML` com dados de API | Todos | Média |
| 8 | Tratar `.catch(() => {})` no Faturamento → mostrar erro ao usuário | Faturamento | Rápida |
| 9 | Cleanup anti-copy-protection.js: adicionar clearInterval ou remover DevTools detection | Global | Rápida |
| 10 | Completar migração JWT: eliminar localStorage direto em 155 arquivos | Global | Grande |
| 11 | Remover `simulateEmployeeLogin()` e dados PII de script.js | Global | Rápida |

## Sprint P2 — Performance + Acessibilidade
| # | Item | Módulo | Estimativa |
|---|------|--------|-----------|
| 12 | Refatorar Vendas `index.html` de 20.800 linhas em módulos separados | Vendas | Grande |
| 13 | Adicionar `disconnect()` aos 16 MutationObservers | Compras, PCP, RH | Média |
| 14 | Adicionar `socket.off()` / `socket.disconnect()` no chat widget | Chat | Rápida |
| 15 | Adicionar `clearInterval` aos 20+ timers sem cleanup | Todos | Média |
| 16 | Focus trap em modais de Vendas, Financeiro, Compras | Vendas, Fin, Compras | Média |
| 17 | Virtualização para dropdowns de produtos/clientes (500+ items) | Vendas, Financeiro | Média |
| 18 | maxlength/pattern/required em inputs de formulários | Todos | Média |
| 19 | CSRF token em TODOS os módulos (não só connection-monitor) | Todos | Média |
| 20 | Loading states/spinners para fetch calls sem indicador | Todos | Média |

---

## CONTADORES FINAIS

| Categoria | Quantidade |
|-----------|-----------|
| Mock data ativo em produção | **5 fontes CRÍTICAS** |
| UI stubs não-funcionais | **6 módulos** |
| TODOs de integração pendente | **8 itens** |
| Botões sem debounce/double-click | **25+ botões** |
| innerHTML com dados sem escape (XSS) | **200+ instâncias** |
| `.catch(() => {})` silenciosos | **5+ no Faturamento** |
| setInterval sem clearInterval | **22 timers** |
| addEventListener sem removeEventListener | **50+ listeners** |
| MutationObserver sem disconnect() | **16 observers** |
| Socket.IO sem socket.off() | **2 instâncias (10+ handlers)** |
| Arquivos monolíticos (5000+ linhas) | **4 arquivos** |
| Modais sem focus trap | **3 módulos** |
| JWT em localStorage (migração incompleta) | **155+ arquivos** |
| CSRF ausente em módulos | **4 módulos (Vendas, Fin, Compras, PCP)** |
| Loading states ausentes | **15+ fluxos** |
| Inputs sem validação client-side | **Maioria dos formulários** |

---

*Relatório gerado por auditoria automatizada. Todos os achados foram verificados com grep/scan dos arquivos fonte.*
*Score geral: 31/100 — AÇÃO IMEDIATA NECESSÁRIA nos itens P0.*
