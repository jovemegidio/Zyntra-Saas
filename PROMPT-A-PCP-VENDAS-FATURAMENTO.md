# PROMPT A — PCP + Vendas + Faturamento + Dados Reais

**Carga: 50% (15 tarefas)**
**Foco: Backend, dados reais, lógica de negócio, encoding, funcionalidade**

---

## CONTEXTO DO SISTEMA

### Arquitetura

- **Backend:** Node.js 18+ / Express / MySQL 8 / Redis / Socket.IO 4
- **Frontend:** HTML + CSS + Vanilla JS (sem framework SPA)
- **Auth:** JWT HS256 via `middleware/auth-central.js` — funções: `authenticateToken`, `requireModule`, `authorizeArea`, `requireAction`, `requireAdmin`
- **RBAC:** 8 perfis (`admin`, `gerente`, `vendedor`, `operador`, `consultoria`, `rh`, `financeiro`, `pcp`)
- **Deploy:** PM2 cluster mode, VPS 31.97.64.102, processo `aluforce-v2-production`
- **Rotas:** `routes/vendas-routes.js` (~70 endpoints), `routes/pcp-routes.js` (~204 endpoints)
- **CSS Pattern:** Cada módulo usa seu próprio CSS inline + arquivos em `/css/` e `módulo/css/`. Padrão de cores: `--fin-primary: #0ea5e9`, backgrounds `#f5f5f5`, cards com `border-radius: 16px`, font `Inter`

### Módulos Envolvidos

| Módulo | Base Path | HTML Path |
| -------- | ----------- | ----------- |
| PCP | `modules/PCP/` | `ordens-producao.html`, `faturamento.html`, `apontamentos.html`, `index.html` |
| Vendas | `modules/Vendas/public/` | `dashboard.html`, `dashboard-admin.html`, `pedidos.html` |
| Faturamento | `modules/Faturamento/public/` | `pix.html`, `regua.html`, `emitir.html`, `index.html`, `consultar.html` |

### APIs Relevantes

- `GET /api/vendas/pedidos` — lista pedidos com status, valores, cliente
- `GET /api/vendas/pedidos/:id` — pedido completo com itens
- `GET /api/vendas/pedidos/:id/itens` — itens do pedido
- `POST /api/vendas/pedidos/:id/faturar` — faturar pedido
- `GET /api/pcp/ordens-producao` — lista OPs
- `POST /api/pcp/ordens-producao` — criar OP
- `PUT /api/pcp/ordens-producao/:id` — atualizar OP
- `GET /api/pcp/apontamentos` — lista apontamentos
- `GET /api/pcp/dashboard/resumo` — resumo dashboard PCP
- `GET /api/vendas/dashboard/ranking-vendedores` — ranking vendedores

### Regras de Negócio Críticas

- O `numero_pedido` em OPs é gerado automaticamente a partir do pedido de vendas — NÃO pode ser editado manualmente
- Condição de pagamento no faturamento DEVE ser importada do pedido original
- Ranking de vendedores contabiliza APENAS pedidos com status `faturado`
- Status pipeline de OP: `pendente → em_producao → concluido → faturado`
- Botão "Configurações" do PCP só aparece na página `index.html` (dashboard), NÃO nas demais

---

## TAREFAS

### T-A01: Condição de pagamento importada do pedido no faturamento

**Arquivo:** `modules/Faturamento/public/emitir.html` e/ou `modules/PCP/faturamento.html`
**Problema:** A condição de pagamento NÃO está sendo puxada automaticamente do pedido quando se abre a tela de faturamento.
**Solução:**

1. Ao carregar dados do pedido para faturar, fazer `GET /api/vendas/pedidos/:id` e extrair `condicao_pagamento`
2. Preencher automaticamente o campo de condição de pagamento no formulário de faturamento
3. O campo pode ser editável mas deve vir PRÉ-PREENCHIDO com o valor do pedido
**Teste:** Verificar que ao abrir faturamento de um pedido com condição "30/60/90", o campo já aparece preenchido

### T-A02: Corrigir OP — campos não preenchidos / dados errados do modal

**Arquivo:** `modules/PCP/ordens-producao.html`
**Problema:** O modal de OP não está puxando corretamente os dados do pedido (campos vazios ou com dados errados). A página `vendas_pcp` está OK mas a de produção não.
**Solução:**

1. Verificar função que popula o modal de OP — provavelmente `abrirModalOrdem(id)`
2. Garantir que os campos `descricao`, `codigo`, `quantidade`, `cliente`, `prazo_entrega` são preenchidos da fonte correta
3. Cross-check com os dados da tabela `ordens_producao` no banco
**Teste:** Abrir modal de OP e verificar que TODOS os campos estão preenchidos corretamente

### T-A03: Número do pedido na OP — automático e não editável

**Arquivo:** `modules/PCP/ordens-producao.html`
**Problema:** O campo `numero_pedido` na OP pode ser editado manualmente. Deve ser gerado automaticamente conforme o número do pedido no kanban de vendas.
**Solução:**

1. Localizar o campo `numero_pedido` no formulário/modal de OP
2. Torná-lo `readonly` ou `disabled` no HTML
3. Garantir que é preenchido automaticamente via API quando a OP é criada a partir de um pedido
**Teste:** Criar OP a partir de pedido e verificar que `numero_pedido` vem preenchido e NÃO pode ser alterado

### T-A04: Remover botão específico da página ordens-producao

**Arquivo:** `modules/PCP/ordens-producao.html`
**Problema:** Há um botão que precisa ser removido (identificado na área demarcada em vermelho do PDF — verificar visualmente qual botão está sobrando na interface, provavelmente um botão de ação duplicado ou fora de contexto).
**Solução:** Localizar e remover o botão indicado. Verificar se não há event listener órfão.
**Teste:** Verificar que a funcionalidade restante continua operando normalmente

### T-A05: Corrigir erros de console em ordens-producao.html

**Arquivo:** `modules/PCP/ordens-producao.html`
**Problema:**

```text
ordens-producao.html:3536 Uncaught TypeError: Cannot read properties of null (reading 'style')
    at abrirModalOrdem (ordens-producao.html:3536:30)
    at card.ondblclick (ordens-producao.html:3186:17)
```

**Solução:**

1. Ir à linha ~3536 da função `abrirModalOrdem`
2. O elemento referenciado por `getElementById` ou `querySelector` retorna `null`
3. Adicionar null-check antes de acessar `.style`: `if (el) el.style...`
4. Verificar se o ID/classe do elemento no HTML corresponde ao que o JS procura
**Teste:** Fazer double-click em card de OP e verificar que o modal abre sem erros no console

### T-A06: Página faturamento no PCP — funcionar com dados reais e calendário

**Arquivo:** `modules/PCP/faturamento.html`
**Problema:** A página de faturamento no módulo PCP está com dados mock/estáticos. Precisa funcionar com dados reais dos pedidos e o calendário deve permitir mover pedidos (drag & drop) para datas específicas.
**Solução:**

1. Substituir dados estáticos por chamadas à API: `GET /api/vendas/pedidos?status=aprovado` ou `GET /api/pcp/faturamento/pendentes`
2. Implementar drag & drop no calendário usando eventos `dragstart/dragover/drop`
3. Ao mover um pedido, fazer `PUT` para atualizar `data_faturamento_prevista`
**Teste:** Verificar que pedidos reais aparecem no calendário e podem ser movidos entre datas

### T-A07: Corrigir lista de faturamentos no PCP

**Arquivo:** `modules/PCP/faturamento.html`
**Problema:** A lista de faturamentos não está funcionando corretamente.
**Solução:**

1. Verificar a função de carregamento da lista (provavelmente `carregarFaturamentos()`)
2. Garantir que a API retorna dados e o parser está correto
3. Verificar se o tbody/container da lista existe no DOM
**Teste:** Lista exibe corretamente os faturamentos pendentes e realizados

### T-A08: Área demarcada no PCP — correção visual/funcional

**Arquivo:** `modules/PCP/` (verificar screenshots — provavelmente `ordens-producao.html` ou `index.html`)
**Problema:** Áreas demarcadas em vermelho no PDF precisam de correção. Verificar visualmente.
**Solução:** Analisar a UI atual e corrigir o que está desalinhado/quebrado
**Teste:** Verificação visual da interface

### T-A09: Dashboard vendas — ranking por vendedor com dados reais (pedidos faturados)

**Arquivo:** `modules/Vendas/public/dashboard.html` e/ou `modules/Vendas/public/dashboard-admin.html`
**Problema:** O ranking por vendedor deve contabilizar por pedido FATURADO, não por todos os pedidos.
**Solução:**

1. Localizar a função/API que alimenta o ranking
2. Garantir que a query filtra `WHERE status = 'faturado'` (ou equivalente)
3. Se já usar a API `GET /api/vendas/dashboard/ranking-vendedores`, verificar a query SQL no backend `routes/vendas-routes.js` ou `routes/vendas-extended.js`
4. O frontend deve exibir apenas pedidos faturados no cálculo
**Teste:** Ranking mostra valores corretos considerando apenas pedidos faturados

### T-A10: Dashboard PCP — funcionar com dados reais dos apontamentos

**Arquivo:** `modules/PCP/index.html` e/ou `modules/PCP/apontamentos.html`
**Problema:** O dashboard do PCP e/ou seção de apontamentos está com dados mock. Precisa funcionar com dados reais.
**Solução:**

1. Verificar cards de resumo (`total OPs`, `em produção`, `atrasadas`, etc.)
2. Substituir dados estáticos por chamadas a `GET /api/pcp/dashboard/resumo`
3. Gráficos de apontamentos devem usar `GET /api/pcp/apontamentos`
**Teste:** Dashboard reflete dados reais do banco de dados

### T-A11: Apontamentos — funcionar com dados reais

**Arquivo:** `modules/PCP/apontamentos.html`
**Problema:** Página de apontamentos não está carregando dados reais.
**Solução:** Garantir integração com API `GET /api/pcp/apontamentos` e renderização correta
**Teste:** Apontamentos listados correspondem aos dados do banco

### T-A12: Corrigir erros de encoding no PCP

**Arquivo:** `modules/PCP/ordens-producao.html` e/ou outros arquivos PCP
**Problema:** Caracteres especiais (acentos) aparecem quebrados — encoding incorreto.
**Solução:**

1. Verificar `<meta charset="UTF-8">` no `<head>` de cada arquivo HTML do PCP
2. Verificar se o arquivo está salvo em UTF-8 (sem BOM)
3. Verificar se a API retorna `Content-Type: application/json; charset=utf-8`
4. Se usando `innerHTML`, garantir que não há double-encoding
**Teste:** Textos com acentos (descrição, observações) aparecem corretamente

### T-A13: Faturamento — funcionar com dados reais do módulo vendas

**Arquivo:** `modules/Faturamento/public/consultar.html` e/ou `emitir.html`
**Problema:** A página de faturamento deve funcionar com dados reais vindos do módulo vendas.
**Solução:** Integrar com `GET /api/vendas/pedidos?status=aprovado` para listar pedidos prontos para faturar
**Teste:** Dados de pedidos reais aparecem na consulta de faturamento

### T-A14: Botão configurações só na primeira página do PCP

**Arquivo:** `modules/PCP/ordens-producao.html`, `modules/PCP/faturamento.html`, `modules/PCP/apontamentos.html`, `modules/PCP/materiais.html`, `modules/PCP/estoque.html`, `modules/PCP/relatorios.html`
**Problema:** O botão de configurações aparece em TODAS as páginas do PCP, mas deveria aparecer SOMENTE em `index.html` (dashboard).
**Solução:**

1. Localizar o botão de configurações no HTML/sidebar de cada subpágina
2. Remover ou ocultar em todas exceto `index.html`
3. Se gerado dinamicamente em JS, adicionar condição `if (window.location.pathname.endsWith('index.html'))`
**Teste:** Navegar entre páginas do PCP — botão configurações visível só no dashboard

### T-A15: Remover páginas pix.html e régua de cobrança do Faturamento

**Arquivo:** `modules/Faturamento/public/pix.html`, `modules/Faturamento/public/regua.html`
**Problema:** Estas páginas precisam ser removidas do módulo Faturamento.
**Solução:**

1. Remover os links do sidebar/menu do Faturamento (provavelmente em `index.html` ou em um JS de sidebar)
2. Não deletar os arquivos fisicamente (manter como backup) — apenas remover a navegação
3. Remover rotas associadas se houver em `modules/Faturamento/api/faturamento.js`
**Teste:** Menu do Faturamento não mostra mais PIX nem Régua de Cobrança

---

## REGRAS DE EXECUÇÃO

1. **NÃO alterar** arquitetura, padrões de CSS global, ou sistema de autenticação
2. **Manter** padrão de `credentials: 'include'` em todos os `fetch()`
3. **Manter** sanitização XSS existente (`esc()`, `sanitize()`)
4. **Manter** prepared statements em queries SQL
5. **Testar** cada alteração verificando que não quebra funcionalidade existente
6. **Fazer git commit** com mensagem: `fix(pcp,vendas,fat): [PROMPT-A] <descrição>`
7. **Deploy VPS** via `pscp` + `pm2 restart aluforce-v2-production`

---

## TESTES UNITÁRIOS REQUERIDOS

Para cada tarefa, criar teste em `tests/prompt-a-tests.js` usando o padrão:

```javascript
// tests/prompt-a-tests.js
const assert = require('assert');

describe('PROMPT-A Fixes', () => {
    // T-A01: Condição pagamento importada
    // T-A02: Campos OP preenchidos
    // T-A03: numero_pedido readonly
    // T-A05: Null-check em abrirModalOrdem
    // T-A09: Ranking filtra por faturado
    // T-A12: Encoding UTF-8
    // T-A14: Botão config só no index
    // T-A15: Links PIX/Régua removidos
});
```
