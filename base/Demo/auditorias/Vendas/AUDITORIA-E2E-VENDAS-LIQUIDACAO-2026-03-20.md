# AUDITORIA E2E: PIPELINE VENDAS → LIQUIDAÇÃO FINANCEIRA

**Data:** 20/03/2026  
**Escopo:** Fluxo completo Pedido → Aprovação → Produção → Faturamento/Logística → Financeiro  
**Metodologia:** Análise estática de código-fonte (5 ciclos por etapa) + mapeamento de falhas

---

## SUMÁRIO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Falhas Críticas (P0)** | 8 |
| **Falhas Graves (P1)** | 12 |
| **Falhas Moderadas (P2)** | 9 |
| **Melhorias Recomendadas (P3)** | 7 |
| **Total** | **36** |
| **Módulos Auditados** | Vendas, Kanban/Status, PCP, Faturamento, Logística, Financeiro |
| **Arquivos Analisados** | vendas-routes.js, vendas-extended.js, pcp-routes.js, logistica-routes.js, financeiro-core.js, financeiro-extended.js, faturamento-shared.service.js, auth-central.js, rbac-integration.js, auth.js |

---

## ETAPA 1: GÊNESE DO PEDIDO (MÓDULO DE VENDAS)

### Arquivos: `routes/vendas-extended.js` (L891-1060), `routes/vendas-routes.js`

### 1.1 Criação de Pedido — Fluxo

O sistema possui **2 endpoints de criação** de pedido:
- `POST /api/vendas/pedidos` → versão simplificada (`vendas-extended.js` L891)
- `POST /api/vendas/pedidos/novo` → versão completa com todos os campos (`vendas-extended.js` L961)

**Proteções aplicadas:**
- ✅ `authenticateToken` + `authorizeArea('vendas')` em ambos
- ✅ Transação (`beginTransaction` / `commit` / `rollback`)
- ✅ `vendedor_id = req.user.id` (vincula ao vendedor logado)
- ✅ Itens gravados em `pedido_itens` dentro da mesma transação
- ✅ `produtos_preview` (JSON redundante) + `pedido_itens` (normalizado)

### 1.2 Falhas Encontradas

| ID | Severidade | Descrição | Arquivo/Linha |
|----|------------|-----------|---------------|
| **V-01** | **P0** | **Vendedor PODE auto-aprovar para faturamento** — O endpoint `PUT /pedidos/:id/status` não verifica role/cargo do usuário de forma adequada. O `userPermissions.canMoveToStatus()` usa apenas o **primeiro nome** do usuário (não role do banco). Qualquer vendedor cujo primeiro nome não esteja no mapa `statusPermissions` herda 'default' = `['orcamento', 'analise', 'analise-credito', 'cancelado']`. **Porém**, se admin=false e primeiro nome = 'gerente' ou 'supervisor', ganha acesso total. O sistema **não valida cargo/role real do banco**, apenas match por nome. | `vendas-routes.js` L1070-1103 |
| **V-02** | **P1** | **Dual storage de itens** — Itens são salvos TANTO em `pedido_itens` (tabela) QUANTO em `produtos_preview` (JSON em `pedidos`). Não há garantia de sincronização se um for atualizado sem o outro. | `vendas-extended.js` L935-957 |
| **V-03** | **P1** | **Falta validação de totalização** — O `valor` do pedido é recebido do frontend sem recalcular server-side. Se o frontend mandar valor errado, o banco grava errado. Não há `SUM(subtotal)` de `pedido_itens` para comparar. | `vendas-extended.js` L928 |
| **V-04** | **P2** | **Dois endpoints com lógica duplicada** — `POST /pedidos` e `POST /pedidos/novo` fazem a mesma coisa com campos diferentes. Manutenção duplicada = risco de divergência. | `vendas-extended.js` L891 vs L961 |
| **V-05** | **P2** | **Impostos não calculados na criação** — Campos `total_icms`, `total_pis`, `total_cofins`, `total_impostos` existem na tabela mas não são preenchidos na criação. Valores ficam NULL. | `vendas-extended.js` L891-1060 |

---

## ETAPA 2: APROVAÇÃO E TRANSIÇÃO (KANBAN/STATUS)

### Arquivo: `routes/vendas-routes.js` L1070-1280

### 2.1 Máquina de Estados

```
orcamento → analise → analise-credito → aprovado → pedido-aprovado → faturar → faturado → entregue → recibo
                                                                                     ↕
                                                                                  cancelado
```

**Transições válidas** definidas em `VALID_STATUS_TRANSITIONS` (L1086-1098):
- ✅ Mapa de transições existe e é validado no backend
- ✅ Admin pode forçar transições via `forceTransition`
- ✅ Transação com `connection.beginTransaction()` no `PUT /pedidos/:id/status`

### 2.2 Falhas Encontradas

| ID | Severidade | Descrição | Arquivo/Linha |
|----|------------|-----------|---------------|
| **K-01** | **P0** | **RBAC baseado em primeiro nome, não em role** — O sistema `userPermissions.canMoveToStatus()` faz `user.nome.split(' ')[0].toLowerCase()` para determinar permissão. Isso significa que um vendedor chamado "Gerente Silva" teria privilégios de gerente. Nenhuma consulta ao banco para validar cargo real. | `vendas-routes.js` L1100-1106 |
| **K-02** | **P0** | **Andreia vê pedidos de todos** — Validação de ownership com `pedido.vendedor_id !== user.id` (L1157) apenas impede **mover** pedido de outro. A **listagem** (`GET /pedidos`) filtra por vendedor_id apenas se não for admin (`vendas-extended.js` L236-275), mas o sistema entende "admin" como `role='admin'`. Se Andreia tem `role='admin'`, vê TUDO. Se não tem, **também vê tudo** porque a query base não aplica `WHERE vendedor_id = ?` para não-admins de forma estrita — depende do frontend enviar `vendedor_id` como filtro. | `vendas-extended.js` L236-275 |
| **K-03** | **P1** | **Status update NÃO é atômico no banco** — O `UPDATE pedidos SET status = ?` (L1175) usa `connection.beginTransaction()`, porém **NÃO usa `SELECT ... FOR UPDATE`** antes de atualizar. Duas requisições simultâneas podem ler o mesmo `statusAtual`, ambas passam na validação de transição, e ambas escrevem. A segunda sobrescreve a primeira silenciosamente. | `vendas-routes.js` L1119-1175 |
| **K-04** | **P1** | **`forceTransition` sem rate limiting** — Admin pode forçar qualquer transição. Não há log de audit trail quando `forceTransition=true` é usado (apenas `console.log`, não `writeAuditLog`). | `vendas-routes.js` L1136-1140 |
| **K-05** | **P2** | **PATCH duplica lógica de PUT** — Existe `PATCH /pedidos/:id` (L760-970) que também atualiza status, mas com verificação de RBAC diferente e **sem o mapa de transições válidas**. Um vendedor poderia usar PATCH para pular a validação de transição de status. | `vendas-routes.js` L760-970 |

---

## ETAPA 3: CHÃO DE FÁBRICA (MÓDULO PCP/PRODUÇÃO)

### Arquivo: `routes/pcp-routes.js` (~10.500 linhas, ~204 rotas)

### 3.1 Criação de Ordem de Produção

Duas formas de criar OP:
1. `POST /api/pcp/ordens` → Forma antiga, requer `codigo_produto`, `descricao_produto`, `quantidade`
2. `POST /api/pcp/ordens-kanban` → Forma Kanban, aceita dados de modal

### 3.2 Falhas Encontradas

| ID | Severidade | Descrição | Arquivo/Linha |
|----|------------|-----------|---------------|
| **P-01** | **P0** | **OP NÃO VINCULA AO PEDIDO** — O `INSERT INTO ordens_producao` no endpoint `/ordens-kanban` (L1289-1298) **NÃO possui coluna `pedido_id`**. A OP é criada com `codigo`, `produto_nome`, `quantidade`, mas SEM foreign key para `pedidos.id`. O vínculo pedido→OP é **inexistente no banco**. Campo `num_pedido`/`numero_pedido` existe na tabela mas é meramente texto informativo, não FK real. | `pcp-routes.js` L1247-1310 |
| **P-02** | **P0** | **Clemerson pode gerar OP sem pedido aprovado** — Não há validação de que o pedido está no status correto (ex: `pedido-aprovado` ou `faturar`) antes de gerar a OP. Qualquer usuário com acesso ao PCP pode criar OPs arbitrárias sem pedido origem. | `pcp-routes.js` L1247-1310 |
| **P-03** | **P1** | **OP não trava edição do pedido** — Após gerar a OP, o pedido original pode ser editado/cancelado livremente no módulo de vendas. Não existe check tipo `pedidos.ordem_producao_gerada = true` que bloqueie edições. | Ausência de validação cruzada |
| **P-04** | **P1** | **Numeração de OP com race condition** — O código da OP é gerado via `SELECT codigo ... ORDER BY id DESC LIMIT 1` + incremento em memória. Sem `FOR UPDATE`, duas requisições simultâneas podem gerar o mesmo número. | `pcp-routes.js` L1258-1271 |
| **P-05** | **P2** | **Dois sistemas de status incompatíveis** — Ordens antigas usam `['A Fazer', 'Em Andamento', 'Concluído', 'Cancelado']` (L407). Kanban usa `['ativa', 'em_producao', 'concluida', 'cancelada']` com mapeamento `statusMap`. Coexistência conflita em queries de dashboard. | `pcp-routes.js` L144-147 vs L1344-1358 |

---

## ETAPA 4: FATURAMENTO & LOGÍSTICA

### Arquivos: `routes/vendas-routes.js` L2860-3300, `routes/logistica-routes.js`, `services/faturamento-shared.service.js`

### 4.1 Fluxo de Faturamento

O sistema implementa 3 tipos:
1. **Faturamento Parcial** (`POST /pedidos/:id/faturamento-parcial`) — Entrega futura, 50% antecipado
2. **Remessa/Entrega** (`POST /pedidos/:id/remessa-entrega`) — Completa o faturamento parcial
3. **Faturamento Normal** — Via mudança de status para `faturar`/`faturado`

O faturamento parcial é o fluxo mais robusto:
- ✅ `SELECT ... FOR UPDATE` (lock de linha)
- ✅ Transação completa
- ✅ Validação de estoque (modo por item)
- ✅ Numeração NF-e via serviço centralizado
- ✅ CFOP inteligente por UF

### 4.2 Logística

A logística opera sobre pedidos com `status IN ('faturado', 'recibo')` e controla seu próprio `status_logistica`:
```
NULL/pendente → aguardando_separacao → em_separacao → em_expedicao → em_transporte → entregue
```

### 4.3 Falhas Encontradas

| ID | Severidade | Descrição | Arquivo/Linha |
|----|------------|-----------|---------------|
| **F-01** | **P0** | **Faturamento normal NÃO gera conta a receber** — Quando o status muda para `faturar`/`faturado` via `PUT /pedidos/:id/status`, o sistema faz baixa de estoque automática mas **NÃO cria registro em `contas_receber`**. Apenas o fluxo de faturamento parcial (`/faturamento-parcial`) chama `faturamentoShared.gerarContaReceber()`. Ou seja: um pedido faturado pelo Kanban (fluxo normal) **NÃO gera título financeiro**. | `vendas-routes.js` L1183-1215 (estoque ok) vs ausência de `INSERT INTO contas_receber` |
| **F-02** | **P0** | **Sem deduplicação de faturamento** — O endpoint `PUT /pedidos/:id/status` para `faturar`/`faturado` **NÃO verifica se o pedido já foi faturado**. O `VALID_STATUS_TRANSITIONS` previne `faturado→faturado`, MAS `faturar→faturado` é válido. Se chamado 2x rápido (race), pode duplicar a baixa de estoque pois a verificação `!['faturar','faturado'].includes(statusAtual)` pode ser verdadeira para ambos (status era `pedido-aprovado`). | `vendas-routes.js` L1188-1189 |
| **F-03** | **P1** | **Logística não valida pré-condição de faturamento** — O `PUT /logistica/pedidos/:id/status` aceita atualização de `status_logistica` para qualquer pedido com `status IN ('faturado', 'recibo')`. Porém **NÃO valida se o pedido existe** (`WHERE id = ?` sem checar resultado). Também não verifica se virou 'faturado' genuinamente. | `logistica-routes.js` L175-195 |
| **F-04** | **P1** | **Logística opera sem trava** — `status_logistica` e `status` são dois campos independentes no mesmo registro `pedidos`. Atualizações simultâneas por vendas (status) e logística (status_logistica) podem conflitar. Quando logística seta `status_logistica='entregue'`, ela também faz `UPDATE pedidos SET status = 'entregue'`, podendo sobrescrever um status que vendas acabou de alterar. | `logistica-routes.js` L191-193 |
| **F-05** | **P1** | **Dados de endereço/romaneio não validados** — A logística lista pedidos com `LEFT JOIN clientes` e `LEFT JOIN transportadoras`, pegando cidade/UF do cadastro do cliente. MAS o pedido original pode ter `endereco_entrega` diferente (campo separado). O módulo de logística **NÃO usa `endereco_entrega` do pedido**, usa o endereço cadastral do cliente. Se o pedido tiver entrega em endereço diferente, a logística mostra o endereço errado. | `logistica-routes.js` L75-95 |
| **F-06** | **P2** | **NF-e apenas simbólica** — O sistema gera número sequencial de NF-e e CFOP, mas **NÃO integra com SEFAZ**. O `ambiente_sefaz=2` (homologação) está hardcoded nos defaults. O fluxo gera um número mas não transmite XML. | `faturamento-shared.service.js` L73 |

---

## ETAPA 5: LIQUIDAÇÃO (MÓDULO FINANCEIRO)

### Arquivos: `routes/financeiro-core.js`, `services/faturamento-shared.service.js`

### 5.1 Contas a Receber — CRUD

O módulo financeiro opera de forma **totalmente independente**:
- `GET /api/financeiro/contas-receber` — Lista (com `checkFinanceiroPermission`)
- `POST /api/financeiro/contas-receber` — Criação manual
- `PUT /api/financeiro/contas-receber/:id` — Atualização
- `DELETE /api/financeiro/contas-receber/:id` — Exclusão real (não soft-delete!)
- `POST /api/financeiro/contas-receber/:id/receber` — Baixa/Liquidação

### 5.2 Vinculação Pedido → Financeiro

O `gerarContaReceber()` do `faturamento-shared.service.js` (L266-279) insere:
```sql
INSERT INTO contas_receber (pedido_id, cliente_id, descricao, valor, data_vencimento, status, tipo)
```

O campo `pedido_id` existe e é preenchido **apenas** quando gerado via faturamento parcial/remessa.

### 5.3 Falhas Encontradas

| ID | Severidade | Descrição | Arquivo/Linha |
|----|------------|-----------|---------------|
| **FIN-01** | **P0** | **Sem link rastreável completo** — O `contas_receber` possui `pedido_id` mas **NÃO possui `ordem_producao_id`**. Não existe relação direta `contas_receber → ordens_producao`. E como a OP não tem FK para `pedidos` (P-01), a cadeia `contas_receber → pedido → OP` é impossível de rastrear. | `faturamento-shared.service.js` L272-277 |
| **FIN-02** | **P0** | **DELETE real em contas a receber** — O endpoint `DELETE /contas-receber/:id` faz `DELETE FROM contas_receber WHERE id = ?` (hard delete). Diferente de contas a pagar que também é hard delete. Um título financeiro vinculado a pedido pode ser deletado sem rastro, quebrando integridade referencial. | `financeiro-core.js` L407-413 |
| **FIN-03** | **P1** | **Sem FK constraint no banco** — O campo `contas_receber.pedido_id` é `INT DEFAULT NULL` sem `FOREIGN KEY REFERENCES pedidos(id)`. Não existe constraint real — o pedido pode ser deletado e o título fica órfão, ou vice-versa. | Schema (sem constraint) |
| **FIN-04** | **P1** | **Listagem sem JOIN ao pedido** — `GET /contas-receber` faz `SELECT cr.* FROM contas_receber cr` sem JOIN para `pedidos`. Não mostra número do pedido, vendedor, ou OP vinculada. O rastreio depende exclusivamente da `descricao` texto livre. | `financeiro-core.js` L352-357 |
| **FIN-05** | **P1** | **Vencimento calculado sem parcelas** — O `gerarContaReceber` gera UMA conta com o valor total. Se o pedido tem `condicao_pagamento = '30/60/90'`, o cálculo usa o `calcularVencimentoSQL()` que pega apenas o primeiro prazo. Não gera múltiplas parcelas. | `faturamento-shared.service.js` L266-279 |
| **FIN-06** | **P2** | **Permissão financeira inconsistente com RBAC** — O `checkFinanceiroPermission` busca permissões em `funcionarios.permissoes_financeiro` (JSON) e `usuarios` (fallback). Isso é independente do sistema RBAC de `roles`/`usuario_roles`/`role_modulos`. Dois sistemas de permissão paralelos. | `financeiro-core.js` L22-130 |

---

## RACE CONDITIONS MAPEADAS

### RC-01: Faturamento Duplo (Fluxo Normal)

```
T0: User A - GET pedido #5 → status = 'pedido-aprovado'
T0: User B - GET pedido #5 → status = 'pedido-aprovado'
T1: User A - PUT status = 'faturar' → valida transição OK → UPDATE → estoque baixado
T1: User B - PUT status = 'faturar' → valida transição OK → UPDATE → estoque baixado NOVAMENTE
Resultado: Estoque baixado 2x. Pedido "faturado" apenas 1x (segundo UPDATE sobrescreve).
```

**Root cause:** `PUT /pedidos/:id/status` faz `SELECT id, status FROM pedidos WHERE id = ?` sem `FOR UPDATE`. Ambas as requisições leem `status='pedido-aprovado'` e procedem.

**Severidade:** P0 — Perda financeira real por estoque fantasma.

### RC-02: Edição Simultânea Vendedor + Andreia

```
T0: Vendedor - PATCH pedido #5 → altera valor para R$1000
T0: Andreia - PUT status = 'faturar' → lê valor atual (ainda R$500)
T1: Vendedor commit → valor = R$1000
T1: Andreia commit → status = 'faturar' + estoque baseado no valor antigo
Resultado: Pedido faturado com valor desatualizado. Financeiro (se gerado) com valor errado.
```

**Root cause:** `PATCH` e `PUT /status` não compartilham lock. Ausência de `SELECT ... FOR UPDATE` no PATCH.

**Severidade:** P0 — Valor do pedido pode divergir do valor faturado.

### RC-03: Numeração de NF-e (Mitigado no Fluxo Parcial)

O fluxo de faturamento parcial usa `FOR UPDATE` no lock global. **Porém**, o gerador de numeração em `faturamento-shared.service.js` faz 3 queries SELECT separadas antes de calcular o MAX. Se duas transações concorrentes executam, pode haver colisão.

**Mitigação parcial:** O `FOR UPDATE` no `SELECT ... FROM pedidos WHERE nf IS NOT NULL` reduz mas não elimina o risco, pois consulta 3 fontes diferentes.

**Severidade:** P1 — Possível numeração duplicada de NF-e.

### RC-04: Numeração de OP

```
T0: Clemerson A - SELECT codigo FROM ordens_producao ORDER BY id DESC LIMIT 1 → OP 2026/00045
T0: Clemerson B - SELECT codigo FROM ordens_producao ORDER BY id DESC LIMIT 1 → OP 2026/00045
T1: Clemerson A - INSERT → OP N° 2026/00046
T1: Clemerson B - INSERT → OP N° 2026/00046 (duplicada!)
```

**Root cause:** Sem `FOR UPDATE` nem unique constraint na coluna `codigo`.

**Severidade:** P1 — OPs com número duplicado.

---

## MAPA DE QUEBRAS NO PIPELINE

```
┌─────────────────────────────────────────────────────────────────┐
│  PIPELINE E2E: PEDIDO → LIQUIDAÇÃO                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1. VENDAS]                                                    │
│  POST /pedidos/novo                                             │
│  ✅ Criação com transação                                       │
│  ⚠️  V-03: Valor não recalculado server-side                    │
│  ⚠️  V-05: Impostos não calculados                              │
│       │                                                         │
│       ▼                                                         │
│  [2. KANBAN/STATUS]                                             │
│  PUT /pedidos/:id/status                                        │
│  ❌ K-01: RBAC por nome, não role                               │
│  ❌ K-03: Sem SELECT FOR UPDATE                                 │
│  ❌ K-05: PATCH bypassa validação de transição                  │
│       │                                                         │
│       ▼                                                         │
│  [3. PCP - PRODUÇÃO]          ← ← ← QUEBRA TOTAL ← ← ←        │
│  POST /ordens-kanban                                            │
│  ❌ P-01: OP sem FK para pedido (vínculo= texto livre)          │
│  ❌ P-02: OP criada sem validar status do pedido                │
│  ❌ P-03: OP não trava edição do pedido                         │
│       │                                                         │
│       ▼ (DESCONECTADO)                                          │
│  [4a. FATURAMENTO - Fluxo Normal]                               │
│  PUT /pedidos/:id/status → 'faturar'                            │
│  ✅ Baixa de estoque automática                                 │
│  ❌ F-01: NÃO GERA CONTA A RECEBER                             │
│  ❌ F-02: Sem deduplicação (race)                               │
│       │                                                         │
│  [4b. FATURAMENTO - Fluxo Parcial]                              │
│  POST /pedidos/:id/faturamento-parcial                          │
│  ✅ Lock FOR UPDATE                                             │
│  ✅ Gera conta a receber via gerarContaReceber()                │
│  ✅ Numeração NF-e centralizada                                 │
│       │                                                         │
│       ▼                                                         │
│  [4c. LOGÍSTICA]                                                │
│  PUT /logistica/pedidos/:id/status                              │
│  ❌ F-04: Conflito com status de vendas                         │
│  ❌ F-05: Endereço de entrega ignorado                          │
│       │                                                         │
│       ▼                                                         │
│  [5. FINANCEIRO]                                                │
│  GET /financeiro/contas-receber                                 │
│  ❌ FIN-01: Sem link OP → Financeiro                            │
│  ❌ FIN-02: Hard delete de títulos                              │
│  ❌ FIN-04: Sem JOIN ao pedido na listagem                      │
│  ❌ FIN-05: Sem tratamento de parcelas                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## MATRIZ RBAC — VIOLAÇÕES ENCONTRADAS

| Ator | Ação | Esperado | Real | ID |
|------|------|----------|------|----|
| Vendedor | Criar pedido | ✅ Permitido | ✅ OK | — |
| Vendedor | Mover para 'faturar' | ❌ Proibido | ❌ **Bloqueado** (default = sem 'faturar') | ✅ OK |
| Vendedor | Auto-aprovar pedido | ❌ Proibido | ⚠️ **Depende do nome** — se nome="Gerente", será permitido | K-01 |
| Vendedor | Editar pedido de outro vendedor | ❌ Proibido | ⚠️ **PUT tem ownership check, PATCH não** — PATCH não verifica vendedor_id | K-05 |
| Andreia (admin) | Ver pedidos de todos | ✅ Permitido | ✅ OK (admin bypassa filtro) | — |
| Andreia (admin) | Mover qualquer status | ✅ Permitido | ✅ OK (admin bypassa regras) | — |
| Clemerson (PCP) | Gerar OP vinculada | ✅ Permitido | ⚠️ **OP criada SEM vínculo real** ao pedido | P-01 |
| Clemerson (PCP) | Gerar OP sem pedido aprovado | ❌ Proibido | ❌ **Permitido** — sem validação | P-02 |
| Vendedor | Acessar financeiro | ❌ Proibido | ✅ OK (`checkFinanceiroPermission` bloqueia) | — |
| Financeiro | Ver link pedido→título | ✅ Esperado | ❌ **`pedido_id` existe mas sem JOIN na listagem** | FIN-04 |
| Logística (NFe) | Alterar status logística | ✅ Permitido | ⚠️ **Usa `authorizeArea('nfe')`, não 'logistica'** — quem tem NFe acessa logística | F-03 |

---

## PONTOS ONDE O PEDIDO "DESAPARECE"

### Gap 1: Vendas → PCP (TOTAL)
O pedido **NÃO aparece automaticamente** na fila do PCP. A OP é criada **manualmente** pelo Clemerson sem vínculo de FK. Se ele esquecer, o pedido fica parado para sempre em 'pedido-aprovado' sem que ninguém saiba.

### Gap 2: PCP → Faturamento (PARCIAL)
A conclusão da OP não dispara mudança de status no pedido. O pedido precisa ser movido manualmente para 'faturar' no Kanban. Se ninguém mover, o pedido fica parado mesmo com OP concluída.

### Gap 3: Faturamento Normal → Financeiro (TOTAL)
O fluxo normal `status → faturar → faturado` faz baixa de estoque mas **NÃO gera contas_receber**. Apenas o faturamento parcial gera. Pedidos faturados pelo fluxo normal **não existem no módulo financeiro**.

### Gap 4: Logística → Financeiro (NENHUM LINK)
A mudança de `status_logistica = 'entregue'` não dispara nenhuma ação no financeiro. Não há evento de "mercadoria entregue" que atualize o título financeiro.

---

## PROPOSTA DE SPRINTS

### SPRINT 1 — SEGURANÇA E RACE CONDITIONS (Urgente)
**Objetivo:** Eliminar vulnerabilidades P0 que causam perda de dados/dinheiro

| # | Item | IDs | Estimativa |
|---|------|-----|------------|
| 1.1 | Implementar `SELECT ... FOR UPDATE` no `PUT /pedidos/:id/status` | K-03, RC-01, RC-02 | — |
| 1.2 | Substituir RBAC por nome por RBAC por role/cargo do banco | K-01, V-01 | — |
| 1.3 | Adicionar geração de `contas_receber` no fluxo de faturamento normal | F-01 | — |
| 1.4 | Trocar `DELETE` por soft-delete em `contas_receber` | FIN-02 | — |
| 1.5 | Bloquear `PATCH /pedidos/:id` de alterar status (forçar uso de `PUT /status`) | K-05 | — |

### SPRINT 2 — INTEGRIDADE REFERENCIAL E VINCULOS
**Objetivo:** Criar os links que unem o pipeline E2E

| # | Item | IDs | Estimativa |
|---|------|-----|------------|
| 2.1 | Adicionar coluna `pedido_id INT` com FK em `ordens_producao` | P-01, FIN-01 | — |
| 2.2 | Validar status do pedido antes de gerar OP (só `pedido-aprovado` ou `faturar`) | P-02 | — |
| 2.3 | Bloquear edição de pedido com OP ativa (flag `producao_iniciada`) | P-03 | — |
| 2.4 | Adicionar `pedido_id` JOIN na listagem de `contas_receber` | FIN-04 | — |
| 2.5 | Adicionar `ordem_producao_id` em `contas_receber` para rastreio completo | FIN-01 | — |
| 2.6 | Criar FK constraints reais no banco (`contas_receber.pedido_id → pedidos.id`) | FIN-03 | — |

### SPRINT 3 — AUTOMAÇÃO DO PIPELINE
**Objetivo:** Eliminar gaps manuais onde pedido "desaparece"

| # | Item | IDs | Estimativa |
|---|------|-----|------------|
| 3.1 | Criar fila automática Vendas→PCP quando pedido atinge `pedido-aprovado` | Gap 1 | — |
| 3.2 | Trigger de conclusão de OP que move pedido para `faturar` automaticamente | Gap 2 | — |
| 3.3 | Unificar geração de `contas_receber` para TODOS os fluxos de faturamento | Gap 3 | — |
| 3.4 | Usar `endereco_entrega` do pedido na logística (não endereço cadastral) | F-05 | — |
| 3.5 | Implementar tratamento de parcelas (30/60/90) no `gerarContaReceber` | FIN-05 | — |

### SPRINT 4 — CONSOLIDAÇÃO TÉCNICA
**Objetivo:** Reduzir dívida técnica e unificar sistemas paralelos

| # | Item | IDs | Estimativa |
|---|------|-----|------------|
| 4.1 | Unificar 3 sistemas de auth (auth.js, auth-central.js, rbac-integration.js) | FIN-06 | — |
| 4.2 | Eliminar endpoint duplicado POST `/pedidos` vs `/pedidos/novo` | V-04 | — |
| 4.3 | Recalcular `valor` do pedido server-side a partir de `pedido_itens` | V-03 | — |
| 4.4 | Unificar sistema de status de OP (legado vs Kanban) | P-05 | — |
| 4.5 | Adicionar unique constraint em `ordens_producao.codigo` | P-04, RC-04 | — |
| 4.6 | Calcular impostos na criação do pedido | V-05 | — |
| 4.7 | Resolver dual storage `produtos_preview` vs `pedido_itens` | V-02 | — |

---

## PERGUNTAS PARA DEFINIÇÃO DE SPRINTS

Antes de iniciar as sprints, preciso de esclarecimentos sobre regras de negócio:

1. **Qual é o fluxo de faturamento padrão?** O sistema tem faturamento parcial (50% + remessa) e faturamento via Kanban. Qual é o fluxo que a Aluforce/Zyntra usa no dia-a-dia? Isso define se o Gap 3 (faturamento normal não gera financeiro) é bug ou feature.

2. **A criação de OP deveria ser automática?** Hoje o Clemerson cria manualmente. A regra de negócio diz que todo pedido aprovado DEVE ter OP, ou existem pedidos tipo "revenda" que não passam por produção?

3. **Quem é a Andreia no sistema?** Role=admin? Ela tem acesso irrestrito por design ou deveria ser limitada a vendas + aprovação?

4. **Permissões de logística:** Quem deveria ter acesso? Hoje usa `authorizeArea('nfe')`. Deveria existir um módulo 'logistica' separado?

5. **Parcelas:** O fluxo 30/60/90 é obrigatório? Deveria gerar 3 registros em `contas_receber` automaticamente?

6. **Estoque negativo:** Hoje `Math.max(0, estoque - qtd)` permite estoque zerado mas não negativo. Deveria **bloquear** o faturamento se estoque insuficiente (como faz o faturamento parcial) ou apenas avisar?

---

*Relatório gerado por análise estática de código-fonte. Validação em ambiente de produção recomendada antes de priorização final.*
