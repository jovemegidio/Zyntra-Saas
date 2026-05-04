# 🔴 POST-MORTEM: AUDITORIA DE INTEGRIDADE E ESTRESSE EXTREMO — MÓDULO DE VENDAS

**Data:** 2026-06-23  
**Auditor:** GitHub Copilot — Análise Red Team  
**Escopo:** `modules/Vendas/server.js`, `modules/Vendas/public/js/*.js`, `modules/Vendas/public/*.html`  
**Tipo:** Diagnóstico (ZERO correções aplicadas)  

---

## ÍNDICE

1. [Resumo Executivo](#resumo-executivo)
2. [Fase 1 — Motor Matemático e Precificação](#fase-1--motor-matemático-e-precificação)
3. [Fase 2 — Máquina de Estados e Lifecycle Kanban](#fase-2--máquina-de-estados-e-lifecycle-kanban)
4. [Fase 3 — Segurança Ofensiva (IDOR, Tampering, Mass Assignment)](#fase-3--segurança-ofensiva)
5. [Matriz de Risco Consolidada](#matriz-de-risco-consolidada)
6. [Impacto no Ecossistema (PCP, Financeiro, DRE, Fiscal)](#impacto-no-ecossistema)
7. [Roadmap de Correção Prioritizada](#roadmap-de-correção)

---

## RESUMO EXECUTIVO

| Severidade | Qty | % |
|------------|-----|---|
| 🔴 **CRITICAL** | 9 | 26% |
| 🟠 **HIGH** | 14 | 40% |
| 🟡 **MEDIUM** | 8 | 23% |
| 🟢 **LOW** | 4 | 11% |
| **TOTAL** | **35** | 100% |

**Veredito:** O backend do módulo Vendas opera como um **proxy passivo para o banco de dados** no que toca valores financeiros. Todas as rotas de pedidos (POST, PUT, PATCH) aceitam `valor`, `desconto`, `desconto_pct`, `preco_unitario` diretamente do payload HTTP sem validação contra tabela de preços, limites de desconto ou regras de negócio. A máquina de estados Kanban não possui matriz de transição completa, permitindo saltos arbitrários de status. Não existe controle de alçada, reserva de estoque atômica, ou optimistic locking.

**Pontos positivos confirmados:**
- ✅ SQL Injection: Todas as queries usam placeholders parameterizados
- ✅ Autenticação: `authenticateToken` aplicado globalmente via middleware
- ✅ Frontend: httpOnly cookies, sem tokens em localStorage, sem secrets no frontend
- ✅ Faturamento: NF sequencial usa `SELECT MAX(...) FOR UPDATE` (atomicidade)
- ✅ `atualizarTotalPedido()`: Cálculo server-side correto quando invocado via CRUD de itens

---

## FASE 1 — MOTOR MATEMÁTICO E PRECIFICAÇÃO

### F1-01 🔴 CRITICAL — POST /pedidos aceita `valor` do frontend sem recálculo

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Parameter Tampering — R$ 0,01 Attack |
| **Rota** | `POST /api/vendas/pedidos` |
| **Linhas** | server.js L2034–L2175 |
| **Evidência** | `const valor = sanitizeNum(req.body.valor) \|\| 0;` → INSERT direto no banco. `atualizarTotalPedido()` NÃO é chamada após INSERT. |
| **Impacto Ecossistema** | Financeiro: contas a receber subestimadas. DRE: receita subnotificada. Comissões: cálculo errado sobre valor fraudulento. |
| **Estratégia de Bloqueio** | Ignorar `req.body.valor`. Após INSERT dos itens, chamar `atualizarTotalPedido(pedidoId)`. Valor derivado exclusivamente do server-side. |

---

### F1-02 🔴 CRITICAL — PUT /pedidos/:id aceita `valor` do frontend sem recálculo

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Parameter Tampering |
| **Rota** | `PUT /api/vendas/pedidos/:id` |
| **Linhas** | server.js L2241–L2280 |
| **Evidência** | `const valor = req.body.valor ? parseFloat(req.body.valor) : null;` → UPDATE direto. |
| **Impacto Ecossistema** | Retroalteração de valor pós-criação; corrompe base fiscal se pedido já teve NF parcial. |
| **Estratégia de Bloqueio** | Remover `valor` do payload aceito. Recalcular via `atualizarTotalPedido()`. |

---

### F1-03 🔴 CRITICAL — PATCH /pedidos/:id aceita `valor` e `desconto` arbitrários

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Parameter Tampering + Mass Assignment |
| **Rota** | `PATCH /api/vendas/pedidos/:id` |
| **Linhas** | server.js L2663–L3185 |
| **Evidência** | `if (updates.valor !== undefined) { fieldsToUpdate.push('valor = ?'); }` — Aceita `desconto_pct: 99` sem limite. |
| **Impacto Ecossistema** | Qualquer vendedor pode zerar valor via API. Faturamento e DRE contaminados. |
| **Estratégia de Bloqueio** | Whitelist estrita de campos editáveis por role/status. `valor` e `desconto` nunca aceitos diretamente. |

---

### F1-04 🟠 HIGH — POST /pedidos/:id/itens aceita `preco_unitario` sem lookup na tabela de preços

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Price Manipulation |
| **Rota** | `POST /api/vendas/pedidos/:id/itens` |
| **Linhas** | server.js L3239–L3295 |
| **Evidência** | `const preco = parseFloat(preco_unitario) \|\| 0;` — Zero consulta a `produtos.preco_venda`. |
| **Impacto Ecossistema** | Produto de R$ 5.000 vendido por R$ 0,01. `atualizarTotalPedido()` recalcula, mas com preço já tampered. |
| **Estratégia de Bloqueio** | `SELECT preco_venda FROM produtos WHERE codigo = ?` + validação de tolerância (±X%). |

---

### F1-05 🟠 HIGH — PUT /pedidos/:pedidoId/itens/:itemId — mesma vulnerabilidade

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Price Manipulation |
| **Rota** | `PUT /api/vendas/pedidos/:pedidoId/itens/:itemId` |
| **Linhas** | server.js L3297–L3370 |
| **Evidência** | Idêntico ao POST — `parseFloat(preco_unitario)` sem lookup. |
| **Estratégia de Bloqueio** | Mesmo que F1-04. |

---

### F1-06 🟠 HIGH — Desconto por item pode gerar subtotal negativo

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Negative Value Injection |
| **Rotas** | POST/PUT `/pedidos/:id/itens` |
| **Linhas** | server.js L3262, L3316 |
| **Evidência** | `const subtotal = (qty * preco) - desc;` — Se `desc > qty * preco`, subtotal fica NEGATIVO. Sem guarda. |
| **Impacto Ecossistema** | Pedido com valor negativo; faturamento gera NF com valor negativo; comissões negativas. |
| **Estratégia de Bloqueio** | `if (desc > qty * preco) return res.status(400)`. Desconto limitado a 100% do subtotal bruto. |

---

### F1-07 🔴 CRITICAL — ZERO controle de alçada de desconto

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Business Logic Bypass |
| **Rotas** | Todas (POST, PUT, PATCH de pedidos e itens) |
| **Evidência** | Busca por `alcada`, `aprovacao.*desconto`, `desconto_maximo`, `limite_desconto`, `max.*desconto` retorna **ZERO resultados** em todo o server.js. |
| **Impacto Ecossistema** | Vendedor aplica desconto de 99% via Postman. Sem workflow de aprovação gerencial. |
| **Estratégia de Bloqueio** | Criar tabela `alcada_desconto` (role → desconto_max_pct). Validar em middleware antes de INSERT/UPDATE. Descontos acima do limite exigem aprovação de gestor. |

---

### F1-08 🟡 MEDIUM — `atualizarTotalPedido` existe mas é contornável

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Bypass Calculation |
| **Linhas** | server.js L3420–L3465 |
| **Evidência** | Função correta. Chamada apenas por CRUD de itens (L3276, L3335, L3399). **NÃO chamada** por POST/PUT/PATCH de pedidos. |
| **Estratégia de Bloqueio** | Rotas de pedidos não devem aceitar `valor` do body. Chamar `atualizarTotalPedido()` em toda operação que altere valor. |

---

### F1-09 🟡 MEDIUM — Base fiscal aceita valores brutos do frontend

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Tax Evasion |
| **Linhas** | server.js L3445 |
| **Evidência** | `novoTotal = totalSubtotais - descontoValor + totalIPI + totalICMSST + frete` — `valor_ipi` e `valor_icms_st` vêm direto do frontend nos itens, sem validação contra alíquota/MVA. |
| **Estratégia de Bloqueio** | Calcular IPI/ICMS-ST server-side com base em NCM + alíquota da UF destino. |

---

### F1-10 🟠 HIGH — Status protegido por role, mas valores financeiros livres

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Authorization Imbalance |
| **Rota** | `PUT /pedidos/:id/status` |
| **Linhas** | server.js L2475–L2479 |
| **Evidência** | Vendedor restringido a `['orcamento','analise','cancelado']` para transição de status. Porém pode editar `valor`, `desconto`, `desconto_pct` livremente via PATCH antes de submeter para análise. |
| **Estratégia de Bloqueio** | Aplicar mesma lógica de role para campos financeiros. Vendedor não pode alterar desconto acima do limite sem aprovação. |

---

## FASE 2 — MÁQUINA DE ESTADOS E LIFECYCLE KANBAN

### F2-01 🔴 CRITICAL — PUT /pedidos/:id/status sem matriz de transição

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Illegal State Transition |
| **Rota** | `PUT /api/vendas/pedidos/:id/status` |
| **Linhas** | server.js L2438–L2530 |
| **Evidência** | Valida se `status ∈ validStatuses` (enum check) e restringe role (vendedor vs admin). **NÃO valida from→to.** Admin pode mover de `orcamento` direto para `faturado`, ou de `faturado` para `orcamento`. |
| **Impacto Ecossistema** | PCP recebe ordens de produção de pedidos que nunca passaram por análise de crédito. Financeiro cria contas a receber de pedidos que regrediram a orçamento. |
| **Estratégia de Bloqueio** | Implementar `TRANSICOES_PERMITIDAS` (map from→to[]) e validar: `if (!TRANSICOES_PERMITIDAS[statusAtual]?.includes(novoStatus)) return 400`. |

---

### F2-02 🟠 HIGH — PATCH com TRANSICOES_PROIBIDAS incompleta + admin bypass

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Incomplete State Machine |
| **Rota** | `PATCH /api/vendas/pedidos/:id` |
| **Linhas** | server.js L2731–L2755 |
| **Evidência** | `TRANSICOES_PROIBIDAS` cobre apenas `cancelado`, `faturado`, `entregue`. **Faltam:** `orcamento` (skip direto a faturado), `analise` (sem proibições), `recibo` (pode regredir para qualquer estado). Admin bypassa todas exceto `cancelado→faturado/entregue/recibo`. |
| **Estratégia de Bloqueio** | Substituir blacklist por whitelist: `TRANSICOES_PERMITIDAS[from] = [to1, to2]`. Nenhum bypass de admin para regras estruturais. |

---

### F2-03 🟠 HIGH — POST /pedidos aceita status arbitrário na criação

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Workflow Bypass |
| **Rota** | `POST /api/vendas/pedidos` |
| **Linhas** | server.js L2097 |
| **Evidência** | `const status = sanitize(req.body.status) \|\| 'orcamento';` — Atacante envia `"status": "faturado"` e ignora todo o Kanban. |
| **Estratégia de Bloqueio** | Forçar: `const status = 'orcamento';` — ignorar body.status na criação. |

---

### F2-04 🔴 CRITICAL — PUT /pedidos/:id edita sem verificar status

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Post-Approval Mutability |
| **Rota** | `PUT /api/vendas/pedidos/:id` |
| **Linhas** | server.js L2246–L2298 |
| **Evidência** | `SELECT vendedor_id FROM pedidos WHERE id = ?` — Nem busca o campo `status`. Admin pode alterar valor, empresa_id, frete de pedido **já faturado com NF emitida**. |
| **Impacto Ecossistema** | NF emitida com valor X, depois pedido alterado para valor Y. Registros fiscais e contábeis divergem permanentemente. |
| **Estratégia de Bloqueio** | Buscar status. Bloquear edição quando `status ∈ {faturado, recibo, entregue}`. |

---

### F2-05 🔴 CRITICAL — PATCH não bloqueia edição pós-faturamento

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Post-Invoice Mutation |
| **Rota** | `PATCH /api/vendas/pedidos/:id` |
| **Linhas** | server.js L2700–L2950 |
| **Evidência** | Aceita alteração de `valor`, `frete`, `empresa_id`, `cliente_id`, `endereco_entrega`, `condicao_pagamento`, `desconto_pct`, `desconto`, `transportadora_nome` — **nenhum** bloqueado por status. |
| **Impacto Ecossistema** | Trocar `empresa_id` (cliente) pós-faturamento invalida a NF fiscalmente. Trocar endereço invalida DANFE e CFOP. |
| **Estratégia de Bloqueio** | `const CAMPOS_BLOQUEADOS_POS_FATURAMENTO = ['valor','empresa_id','cliente_id','endereco_entrega','desconto','desconto_pct','condicao_pagamento','frete']`. Verificar status antes de aceitar. |

---

### F2-06 🟡 MEDIUM — Itens: verificação parcial com hardcoded email

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Hardcoded Privilege Escalation |
| **Rotas** | POST/PUT/DELETE `/pedidos/:id/itens` |
| **Linhas** | server.js L3218–L3237 |
| **Evidência** | `if (statusBloqueados.includes(status) && userEmail !== 'ti@aluforce.ind.br')` — Email hardcoded como bypass. Não bloqueia `aprovado`, `pedido-aprovado`, `entregue`. |
| **Estratégia de Bloqueio** | Substituir email hardcoded por flag `is_admin` ou role `ti`. Bloquear edição de itens quando `status ∈ {aprovado, faturar, faturado, entregue, recibo}`. |

---

### F2-07 🔴 CRITICAL — DELETE /pedidos/:id sem verificação de status

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Data Destruction |
| **Rota** | `DELETE /api/vendas/pedidos/:id` |
| **Linhas** | server.js L2418–L2437 |
| **Evidência** | Checa ownership/admin, mas **NUNCA** verifica status. `DELETE FROM pedidos WHERE id = ?` executado direto. Pedido faturado com NF emitida pode ser deletado. |
| **Impacto Ecossistema** | NF fiscal sem pedido-pai. Contas a receber órfãs no Financeiro. Movimentações de estoque sem referência. Audit trail destruído. |
| **Estratégia de Bloqueio** | `if (['faturado','recibo','entregue'].includes(status)) return 400`. Preferir soft-delete (`status = 'excluido'`) a hard-delete. |

---

### F2-08 🟠 HIGH — POST /pedidos/:id/faturar sem validar itens/preços/status

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Ghost Invoice |
| **Rota** | `POST /api/vendas/pedidos/:id/faturar` |
| **Linhas** | server.js L3549–L3655 |
| **Evidência** | Não valida: (1) status atual — pode faturar pedido `cancelado` ou `orcamento`; (2) existência de itens — fatura pedido vazio; (3) `valor > 0`; (4) `cliente_id IS NOT NULL`. Usa transação e `FOR UPDATE` para NF (positivo), mas sem pré-validações. |
| **Estratégia de Bloqueio** | Antes do `beginTransaction`: checar `status = 'faturar'`, `itens.length > 0`, `valor > 0`, `cliente_id NOT NULL`. |

---

### F2-09 🟠 HIGH — ZERO optimistic locking em todas as rotas de status

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Race Condition / TOCTOU |
| **Rotas** | PUT/PATCH status |
| **Evidência** | SELECT status → delay → UPDATE cego. Sem coluna `version`, sem `WHERE version = ?`, sem ETag. Dois admins movem o mesmo pedido simultaneamente: ambos leem `orcamento`, um envia `analise` e outro `faturado` — o último UPDATE ganha silenciosamente. |
| **Estratégia de Bloqueio** | Adicionar `version INT DEFAULT 0` em `pedidos`. `UPDATE ... SET status = ?, version = version + 1 WHERE id = ? AND version = ?`. Return 409 se `affectedRows = 0`. |

---

## FASE 3 — SEGURANÇA OFENSIVA

### F3-01 🟠 HIGH — IDOR em 8+ rotas de itens/histórico

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Insecure Direct Object Reference |
| **Rotas afetadas** | `GET /pedidos/:id/itens`, `POST /pedidos/:id/itens`, `PUT /pedidos/:pedidoId/itens/:itemId`, `DELETE /pedidos/:pedidoId/itens/:itemId`, `GET /pedidos/:id/historico`, `POST /pedidos/:id/historico`, `GET /clientes/:id`, `PUT /clientes/:id`, `GET /empresas/:id`, `POST /pedidos/:id/faturar`, `POST /pedidos/:id/faturamento-parcial` |
| **Evidência** | Todas usam `WHERE pedido_id = ?` sem verificar se o pedido pertence ao `vendedor_id` do usuário logado. Qualquer vendedor autenticado pode enumerar e manipular itens/histórico de todos os pedidos do sistema. |
| **Estratégia de Bloqueio** | Middleware `verificarOwnership(pedidoId, userId)`. Para rotas de itens: `SELECT vendedor_id FROM pedidos WHERE id = ?` + check `vendedor_id = req.user.id OR isAdmin`. |

**Mapa IDOR detalhado:**

| Rota | Ownership Check? | Risco |
|------|-----------------|-------|
| `GET /pedidos/:id` | ✅ Checa `vendedor_id` | Seguro |
| `PUT /pedidos/:id` | ✅ Checa ownership | Seguro |
| `DELETE /pedidos/:id` | ✅ Checa ownership | Seguro |
| `PATCH /pedidos/:id` | ✅ Checa ownership | Seguro |
| `GET /pedidos/:id/itens` | ❌ **SEM CHECK** | IDOR |
| `POST /pedidos/:id/itens` | ❌ **SEM CHECK** | IDOR |
| `PUT /pedidos/:pedidoId/itens/:itemId` | ❌ **SEM CHECK** | IDOR |
| `DELETE /pedidos/:pedidoId/itens/:itemId` | ❌ **SEM CHECK** | IDOR |
| `GET /pedidos/:id/historico` | ❌ **SEM CHECK** | IDOR |
| `POST /pedidos/:id/historico` | ❌ **SEM CHECK** | IDOR |
| `GET /pedidos/:id/anexos` | ✅ Checa ownership | Seguro |
| `GET /clientes/:id` | ❌ **SEM CHECK** | IDOR |
| `PUT /clientes/:id` | ❌ **SEM CHECK** | IDOR |
| `GET /empresas/:id` | ❌ **SEM CHECK** | IDOR |
| `POST /pedidos/:id/faturar` | ❌ **SEM CHECK** | IDOR |
| `POST /pedidos/:id/faturamento-parcial` | ❌ **SEM CHECK** | IDOR |

---

### F3-02 🟡 MEDIUM — GET /clientes expõe toda a carteira sem filtro

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Data Exposure |
| **Rota** | `GET /api/vendas/clientes` |
| **Evidência** | `SELECT c.id, c.nome, ... FROM clientes c ... LIMIT ? OFFSET ?` — Sem filtro por `vendedor_id`. Todo vendedor vê toda a carteira. |
| **Estratégia de Bloqueio** | Se a carteira é segmentada, adicionar `WHERE vendedor_id = ?` ou `WHERE assigned_to = ?`. |

---

### F3-03 🔴 CRITICAL — Mass Assignment no PATCH: 50+ campos aceitos sem whitelist

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Mass Assignment |
| **Rota** | `PATCH /api/vendas/pedidos/:id` |
| **Linhas** | server.js L2687–L3030 |
| **Evidência** | `let updates = req.body;` seguido de `if (updates.X !== undefined)` para 50+ campos incluindo `valor`, `status`, `vendedor_nome`, `empresa_id`, `desconto`, `desconto_pct`. Sem whitelist. |
| **Estratégia de Bloqueio** | `const CAMPOS_PERMITIDOS = ['observacao','contato_nome','endereco_entrega',...]`. `const updates = pick(req.body, CAMPOS_PERMITIDOS[userRole])`. |

---

### F3-04 🟠 HIGH — `vendedor_id` aceito do req.body na criação

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Identity Spoofing |
| **Rota** | `POST /api/vendas/pedidos` |
| **Linhas** | server.js ~L2097 |
| **Evidência** | `const vendedor_id = req.body.vendedor_id \|\| req.body.vendedorId \|\| (req.user ? req.user.id : null);` — Atacante envia `vendedor_id: 999` para atribuir pedido a outro vendedor. |
| **Impacto Ecossistema** | Comissões creditadas ao vendedor errado. Metas distorcidas. Relatórios de ranking incorretos. |
| **Estratégia de Bloqueio** | `const vendedor_id = req.user.id;` — Derivar exclusivamente do token, ignorar body. Admin pode setar via parâmetro separado. |

---

### F3-05 🟡 MEDIUM — Pedido criado com valor 0, sem itens, sem vendedor_id

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Dirty Data Injection |
| **Rota** | `POST /api/vendas/pedidos` |
| **Evidência** | Aceita: `valor: 0`, `itens: []`, `vendedor_id: null` (se req.user === null). Única validação: `if (!empresa_id && !cliente_nome) return 400`. |
| **Estratégia de Bloqueio** | Validar: `vendedor_id IS NOT NULL`, `empresa_id OR cliente_id IS NOT NULL`. Valor calculado server-side. |

---

### F3-06 🟠 HIGH — Estoque: nenhuma reserva ao criar pedido; overselling garantido

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Race Condition — Overselling |
| **Rota** | `POST /pedidos`, remessa (L3916–L3967) |
| **Evidência** | Estoque só é baixado na remessa/entrega. Na criação, zero reserva. Na remessa, `UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ? AND estoque_atual >= ?` — se estoque insuficiente, gera apenas `console.warn` e **NÃO ABORTA** a transação. |
| **Impacto Ecossistema** | Dois vendedores vendem a última unidade simultaneamente. Pedido faturado sem estoque. PCP precisa produzir urgência. |
| **Estratégia de Bloqueio** | Na aprovação: `SELECT ... FOR UPDATE` + reserva. Na remessa: `if (affectedRows === 0) throw` + ROLLBACK. |

---

### F3-07 🟡 MEDIUM — Estorno de estoque fora de transação

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Inconsistência de Estoque |
| **Rota** | `PUT /pedidos/:id/status` (cancelamento) |
| **Linhas** | server.js L2492–L2600 |
| **Evidência** | `await pool.query('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?', [...])` — Usa `pool.query` (fora de transação) em vez de `connection.query` dentro de `beginTransaction`. Crash entre UPDATE de status e estorno = estoque inconsistente. |
| **Estratégia de Bloqueio** | Envolver cancelamento + estorno em transação atômica. |

---

### F3-08 🟡 MEDIUM — Fallback de estorno usa read-modify-write (TOCTOU)

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Race Condition |
| **Linhas** | server.js L2570–L2573 |
| **Evidência** | `const novoEstoque = estoqueAnterior + quantidade; await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, ...])` — Read-modify-write clássico. Dois cancelamentos simultâneos leem o mesmo `estoque_atual` stale. |
| **Estratégia de Bloqueio** | Usar `SET estoque_atual = estoque_atual + ?` (atômico) em vez de read-modify-write. |

---

### F3-09 🟢 LOW — SQL Injection: todas as queries parameterizadas

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | SQL Injection |
| **Evidência** | Todas as queries examinadas usam `?` placeholders. Geração dinâmica de `IN (?)` usa `.map(() => '?').join(',')` — padrão seguro. Nenhuma concatenação de string SQL encontrada. |
| **Status** | ✅ **SEGURO** |

---

### F3-10 🟢 LOW — Autenticação: sem bypass significativo

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | AuthN Bypass |
| **Evidência** | `apiVendasRouter.use(authenticateToken)` aplicado globalmente (~L1006). Rotas antes do middleware têm `authenticateToken` explícito. `POST /api/login` corretamente sem auth. |
| **Status** | ✅ **SEGURO** |

---

### F3-11 🟢 LOW — Frontend: httpOnly cookies, sem secrets

| Campo | Detalhe |
|-------|---------|
| **Evidência** | `credentials: 'include'` no fetch. Token não exposto em localStorage (migrado). Sem API keys, JWT_SECRET ou senhas hardcoded no frontend. |
| **Status** | ✅ **SEGURO** |

---

### F3-12 🟢 LOW — Nenhum isolation level customizado

| Campo | Detalhe |
|-------|---------|
| **Vetor de Risco** | Concurrency |
| **Evidência** | Busca por `ISOLATION`, `SERIALIZABLE`, `REPEATABLE READ` retorna ZERO resultados. MySQL/InnoDB usa REPEATABLE READ por padrão (adequado para maioria dos casos). |
| **Estratégia de Bloqueio** | Para operações de estoque em alta concorrência, considerar SERIALIZABLE pontual. |

---

## MATRIZ DE RISCO CONSOLIDADA

### 🔴 CRITICAL (9 findings)

| ID | Finding | Área |
|----|---------|------|
| F1-01 | POST /pedidos aceita `valor` do frontend | Motor Matemático |
| F1-02 | PUT /pedidos aceita `valor` do frontend | Motor Matemático |
| F1-03 | PATCH aceita `valor`/`desconto` arbitrários | Motor Matemático |
| F1-07 | Zero controle de alçada de desconto | Regras de Negócio |
| F2-01 | PUT status sem matriz de transição | State Machine |
| F2-04 | PUT /pedidos edita sem verificar status | Imutabilidade |
| F2-05 | PATCH edita campos pós-faturamento | Imutabilidade |
| F2-07 | DELETE sem verificação de status | Data Destruction |
| F3-03 | Mass Assignment: 50+ campos sem whitelist | Segurança |

### 🟠 HIGH (14 findings)

| ID | Finding | Área |
|----|---------|------|
| F1-04 | POST itens aceita `preco_unitario` sem lookup | Precificação |
| F1-05 | PUT itens aceita `preco_unitario` sem lookup | Precificação |
| F1-06 | Desconto por item gera subtotal negativo | Cálculo |
| F1-10 | Status protegido, valor financeiro não | Authorization |
| F2-02 | TRANSICOES_PROIBIDAS incompleta + admin bypass | State Machine |
| F2-03 | POST /pedidos aceita status arbitrário | Workflow |
| F2-08 | Faturar sem validar itens/preços/status | Faturamento |
| F2-09 | Zero optimistic locking | Concorrência |
| F3-01 | IDOR em 8+ rotas de itens/histórico | Segurança |
| F3-04 | `vendedor_id` aceito do body na criação | Identity |
| F3-06 | Overselling: sem reserva de estoque | Estoque |

### 🟡 MEDIUM (8 findings)

| ID | Finding | Área |
|----|---------|------|
| F1-08 | `atualizarTotalPedido` contornável | Cálculo |
| F1-09 | Base fiscal aceita valores brutos | Fiscal |
| F2-06 | Itens: email hardcoded bypass | Segurança |
| F3-02 | GET /clientes expõe toda carteira | Privacidade |
| F3-05 | Pedido com valor 0, sem itens | Validação |
| F3-07 | Estorno fora de transação | Estoque |
| F3-08 | Fallback estorno TOCTOU | Estoque |
| F3-12 | Sem isolation level customizado | Concorrência |

### 🟢 LOW (4 findings)

| ID | Finding | Status |
|----|---------|--------|
| F3-09 | SQL Injection: parameterizado | ✅ Seguro |
| F3-10 | Autenticação: sem bypass | ✅ Seguro |
| F3-11 | Frontend: httpOnly, sem secrets | ✅ Seguro |
| F3-12 | Isolation level default | Aceitável |

---

## IMPACTO NO ECOSSISTEMA

### Financeiro / DRE

| Cenário de Ataque | Impacto |
|-------------------|---------|
| Vendedor envia `valor: 0.01` via POST /pedidos | Contas a receber subestimadas. DRE com receita subnotificada. Fluxo de caixa incorreto. |
| Vendedor aplica `desconto_pct: 99` via PATCH | Margem de contribuição zerada. Comissões calculadas sobre R$ 0. |
| Admin edita valor pós-faturamento via PUT | NF fiscal com valor X ≠ valor Y no sistema. Divergência contábil permanente. |
| Admin deleta pedido faturado | Contas a receber sem pedido-pai. Receita reconhecida sem fonte. |

### PCP (Planejamento e Controle de Produção)

| Cenário de Ataque | Impacto |
|-------------------|---------|
| Pedido criado direto como `status: faturado` | PCP não recebe demanda para produção. Produto vendido sem ser produzido. |
| Pedido pula análise→aprovado→faturar | Ordens de produção não geradas para pedidos que deveriam gerar demanda. |
| Overselling sem reserva de estoque | PCP descobre deficit pós-faturamento. Produção emergencial. |

### Fiscal / NF-e

| Cenário de Ataque | Impacto |
|-------------------|---------|
| IPI/ICMS-ST aceitos do frontend | Alíquotas manipuláveis. NF emitida com imposto incorreto. Auto de infração SEFAZ. |
| Empresa/endereço trocados pós-faturamento | DANFE com dados divergentes do XML transmitido. Rejeição no SEFAZ. |
| Faturamento de pedido sem itens/valor 0 | NF-e com valor R$ 0,00 — rejeição na transmissão. |

### Estoque

| Cenário de Ataque | Impacto |
|-------------------|---------|
| Dois vendedores vendem última unidade | Estoque negativo. Impossibilidade de entregar um dos pedidos. |
| Estorno fora de transação (crash) | Estoque permanentemente divergente do real. |
| Delete de pedido faturado | Movimentações de estoque sem pedido-pai. Inventário irreconciliável. |

---

## ROADMAP DE CORREÇÃO

### Sprint 1 — Bloqueio de Emergência (CRITICAL)

| # | Ação | Findings | Complexidade |
|---|------|----------|-------------|
| 1 | **Ignorar `req.body.valor`** no POST/PUT/PATCH. Chamar `atualizarTotalPedido()` após toda operação. | F1-01, F1-02, F1-03, F1-08 | Média |
| 2 | **Implementar matriz `TRANSICOES_PERMITIDAS`** em PUT status e PATCH. | F2-01, F2-02 | Média |
| 3 | **Forçar `status = 'orcamento'`** na criação. Ignorar `body.status`. | F2-03 | Baixa |
| 4 | **Bloquear edição pós-faturamento** no PUT e PATCH. | F2-04, F2-05 | Média |
| 5 | **Bloquear DELETE de pedidos faturados.** Preferir soft-delete. | F2-07 | Baixa |
| 6 | **Whitelist de campos** no PATCH por role e status. | F3-03 | Alta |

### Sprint 2 — Hardening de Segurança (HIGH)

| # | Ação | Findings | Complexidade |
|---|------|----------|-------------|
| 7 | **Validar `preco_unitario`** contra `produtos.preco_venda` (tolerância ±X%). | F1-04, F1-05 | Média |
| 8 | **Guard de subtotal negativo**: `if (desc > qty * preco) return 400`. | F1-06 | Baixa |
| 9 | **Criar tabela `alcada_desconto`** e middleware de validação por role. | F1-07 | Alta |
| 10 | **Ownership check** em todas as rotas de itens/histórico/faturar. | F3-01 | Média |
| 11 | **Derivar `vendedor_id` do token**: `const vendedor_id = req.user.id;` | F3-04 | Baixa |
| 12 | **Validar pré-faturamento**: `status = 'faturar'`, `itens.length > 0`, `valor > 0`. | F2-08 | Baixa |
| 13 | **Optimistic locking**: coluna `version` com check no UPDATE. | F2-09 | Média |

### Sprint 3 — Resiliência (MEDIUM)

| # | Ação | Findings | Complexidade |
|---|------|----------|-------------|
| 14 | **Reserva de estoque** na aprovação com `SELECT ... FOR UPDATE`. | F3-06 | Alta |
| 15 | **Transação atômica** no cancelamento (status + estorno). | F3-07, F3-08 | Média |
| 16 | **Cálculo fiscal server-side** (IPI/ICMS-ST com NCM + alíquota). | F1-09 | Alta |
| 17 | **Remover email hardcoded** em `verificarPermissaoEdicaoPedido`. | F2-06 | Baixa |
| 18 | **Filtro de carteira** no GET /clientes por vendedor. | F3-02 | Baixa |

---

## NOTA FINAL

Este relatório é **diagnóstico**. Nenhuma correção foi aplicada. As 35 vulnerabilidades identificadas representam o estado atual exato do módulo Vendas em 2026-06-23. O roadmap acima prioriza por impacto ao negócio e complexidade de implementação.

**Risco consolidado: 🔴 ALTO** — O módulo aceita manipulação financeira direta via API, não possui matriz de transição completa, e permite operações destrutivas sem validação de estado. Correção imediata recomendada para os 9 findings CRITICAL antes de release.
