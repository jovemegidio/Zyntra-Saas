# 🔥 GOD MODE AUDIT — RISK MATRIX CONSOLIDADA
## Zyntra ERP — Auditoria 5 Dimensões
**Data:** Julho 2025 | **Score Anterior:** 31/100 (CRITICAL) | **Score Atual:** 38/100 (CRITICAL)

---

## 📊 RESUMO EXECUTIVO

| Dimensão | CRIT | HIGH | MED | LOW | Total |
|----------|------|------|-----|-----|-------|
| **D1 — Backend Mutation** | 2 | 3 | 4 | 1 | **10** |
| **D2 — Frontend UI/UX Chaos** | 18 | 42 | 48 | 25 | **133** |
| **D3 — E2E Pipeline Integrity** | 5 | 1 | 2 | 0 | **8** |
| **D4 — Chaos Engineering** | 3 | 5 | 0 | 0 | **8** |
| **D5 — Security Offensive** | 4 | 8 | 0 | 0 | **12** |
| **TOTAL** | **32** | **59** | **54** | **26** | **171** |

---

## 🔴 P0 — CRÍTICOS (CORRIGIR EM 48H)

### D1-CRIT-01 | N+1 Query Loop em NFe Emissão
- **Arquivo:** [routes/nfe-routes.js](routes/nfe-routes.js#L150-L215)
- **Evidência:** 4 queries sequenciais por item (SELECT material + UPDATE materiais + UPDATE produtos + UPDATE estoque + INSERT movimentações) dentro de loop `for (const item of itens)`
- **Impacto Negócio:** NFe com 50 itens = 200 queries. Timeout em produção, SEFAZ rejeita por lentidão. Faturamento travado.
- **Correção:** Batch SELECT com `WHERE id IN (?)`, batch UPDATE com CASE statement, single INSERT com VALUES múltiplos.

### D1-CRIT-02 | N+1 + Missing Transaction em PCP Materiais
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js#L5007-L5030)
- **Evidência:** 3+ queries por material SEM transaction. `catch(syncErr) { /* tabelas podem nao existir */ }` engole erros.
- **Impacto Negócio:** Falha parcial deixa estoque inconsistente entre `materiais`, `produtos` e `estoque`. Quebra de inventário.
- **Correção:** Envolver em `BEGIN TRANSACTION...COMMIT` com rollback on error.

### D3-CRIT-01 | FK pedido_id inexistente em ordens_producao
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js) + [scripts/setup-itens-op.js](scripts/setup-itens-op.js#L46)
- **Evidência:** Coluna `pedido_vinculado_id` existe sem constraint. `numero_pedido` é VARCHAR sem validação.
- **Impacto Negócio:** Impossível rastrear "qual pedido gerou esta OP". Auditoria fiscal comprometida. RCA impossível.
- **Correção:** Migration: `ALTER TABLE ordens_producao ADD CONSTRAINT fk_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id)`.

### D3-CRIT-02 | NFe Cancelamento Não-Atômico
- **Arquivo:** [routes/nfe-routes.js](routes/nfe-routes.js#L173-L210)
- **Evidência:** Loop de estorno (`for (const mov of movimentacoes)`) fora de transaction. Se falhar na 2ª iteração, 1ª já commitada. Retry duplica estorno.
- **Impacto Negócio:** Estoque divergente, contas_receber fantasma, NFe cancelada com CR ativa. Auditoria fiscal falha.
- **Correção:** Refactorar para transaction única + idempotência (flag `estornada` para evitar reprocessamento).

### D3-CRIT-03 | Estoque Negativo por Race Condition
- **Arquivo:** [modules/Compras/api/estoque.js](modules/Compras/api/estoque.js#L267-L318)
- **Evidência:** `SELECT quantidade_atual FROM estoque WHERE material_id = ?` SEM `FOR UPDATE`. Duas requests simultâneas leem mesmo valor e decrementam → oversell.
- **Impacto Negócio:** Venda de produto sem estoque. Promessa de entrega impossível. Reputação da empresa comprometida.
- **Correção:** Adicionar `FOR UPDATE` em SELECT + `CHECK (quantidade_atual >= 0)` constraint no banco.

### D3-CRIT-04 | Pedido Hard-Delete sem Cascade
- **Arquivo:** [routes/vendas-routes.js](routes/vendas-routes.js#L595-L630)
- **Evidência:** `DELETE FROM pedidos WHERE id = ?` executa mesmo se validação de OP falhar silenciosamente (coluna pedido_id pode não existir).
- **Impacto Negócio:** OP órfã, NFe sem pedido-pai, CR sem referência, auditoria destruída.
- **Correção:** Converter para soft-delete (`UPDATE pedidos SET status = 'excluido', deleted_at = NOW()`).

### D4-CRIT-01 | Race Condition em Numeração de Pedidos
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js#L3475-L3495)
- **Evidência:** `SELECT MAX(CAST(numero_pedido AS UNSIGNED))` sem FOR UPDATE nem transaction. Threads concorrentes geram mesmo número.
- **Impacto Negócio:** Pedidos duplicados, confusão em faturamento, anomalia fiscal.
- **Correção:** Usar AUTO_INCREMENT ou sequence table com FOR UPDATE.

### D4-CRIT-02 | Race Condition em numero_nfe
- **Arquivo:** [routes/nfe-api.js](routes/nfe-api.js#L283-L295)
- **Evidência:** `Math.floor(Math.random() * 1000000)` como numero_nfe. Pseudoaleatório, não atômico.
- **Impacto Negócio:** NFe duplicada na SEFAZ = ILEGAL. Multa fiscal. Bloqueio de CNPJ.
- **Correção:** Sequence table com AUTO_INCREMENT + lock ou `SELECT MAX(numero_nfe) + 1 FOR UPDATE`.

### D4-CRIT-03 | Oversell por Concorrência em Estoque
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js#L475-L476) + [routes/nfe-routes.js](routes/nfe-routes.js#L150)
- **Evidência:** UPDATE materiais sem transaction + FOR UPDATE. Duas NFes simultâneas para mesmo produto → ambas subtraem do mesmo estoque → valor final incorreto.
- **Impacto Negócio:** Produto vendido 2x sem ter em estoque. Entrega impossível.
- **Correção:** Transaction + FOR UPDATE + CHECK constraint `quantidade_estoque >= 0`.

### D5-CRIT-01 | RBAC Bypass via Endpoints PCP
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js#L30)
- **Evidência:** Middleware `authorizeArea` aceita 'pcp' OU 'compras', mas user com role='financeiro' pode acessar se middleware inline não bloquear.
- **Impacto Negócio:** Funcionário de financeiro cria/edita produtos e OPs. Segregação de funções violada.
- **Correção:** Validar que `authorizeArea` é **restritivo** (deny by default). Audit all bypass paths.

### D5-CRIT-02 | IDOR em GET/PUT /api/produtos/:id
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js#L2975-L3110)
- **Evidência:** Sem `checkOwnership` middleware. User A acessa/modifica produto de User B via ID.
- **Impacto Negócio:** Espionagem de preços internos, adulteração de dados de concorrente.
- **Correção:** Adicionar `checkOwnership(pool, 'produtos', 'usuario_id')` middleware.

### D5-CRIT-03 | SQL Injection via Dynamic Field Names
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js#L3069)
- **Evidência:** `UPDATE produtos SET ${setClauses.join(', ')} WHERE id = ?` onde `setClauses` vem de `Object.keys(req.body)`.
- **Impacto Negócio:** Extraction de senhas, dados PII, manipulação de registros financeiros.
- **Correção:** Whitelist de campos permitidos: `const ALLOWED_FIELDS = ['nome', 'descricao', ...]`.

### D5-CRIT-04 | SELECT * Expõe Dados Sensíveis
- **Arquivo:** [routes/pcp-routes.js](routes/pcp-routes.js#L768) + [routes/pcp-routes.js](routes/pcp-routes.js#L1525)
- **Evidência:** `SELECT * FROM produtos`, `SELECT * FROM ordens_producao` — retorna ALL columns para o client.
- **Impacto Negócio:** Colunas sensíveis (custo, margem, chave_pix, api_key) expostas na response.
- **Correção:** Substituir por lista explícita de colunas.

### D2-CRIT-01 | innerHTML XSS em Logística e NFe (26 instâncias)
- **Arquivo:** [modules/Logistica/public/index.html](modules/Logistica/public/index.html#L452) + [modules/NFe/emitir.html](modules/NFe/emitir.html#L722)
- **Evidência:** `tbody.innerHTML = lista.map(p => '<td>${p.cliente}</td>')` sem escapeHtml(). Input `<img src=x onerror=alert(1)>` em cliente executa JS.
- **Impacto Negócio:** Session hijacking, roubo de tokens, phishing interno. LGPD violation.
- **Correção:** Aplicar `escapeHtml()` em TODOS os template literals que renderizam dados de API.

### D2-CRIT-02 | Double-Click Submit sem Proteção (31 botões)
- **Arquivo:** [modules/Logistica/public/index.html](modules/Logistica/public/index.html#L509-L523) + múltiplos módulos
- **Evidência:** `confirmarMudancaStatus()` chama fetch sem `btn.disabled = true`. 
- **Impacto Negócio:** Duplo-click gera 2 mudanças de status, 2 NFes, 2 contas_receber. Dados financeiros duplicados.
- **Correção:** Pattern: `btn.disabled = true` antes do fetch + `finally { btn.disabled = false }`.

### D2-CRIT-03 | setInterval Memory Leaks (18 instâncias)
- **Arquivo:** [modules/Financeiro_backup/index.html](modules/Financeiro_backup_20260319/index.html#L1073) + múltiplos
- **Evidência:** `setInterval(() => atualizarDashboard(true), 300000)` sem clearInterval. Navegação SPA acumula timers.
- **Impacto Negócio:** Após 1h de uso, browser lento. Tab crash. Dados recarregados de 5 dashboards simultaneamente.
- **Correção:** Track intervalId. Clear on page unload. Use `requestAnimationFrame` para dashboards.

---

## 🟠 P1 — HIGH (CORRIGIR EM 1 SEMANA)

| ID | Dimensão | Título | Arquivo | Impacto |
|----|----------|--------|---------|---------|
| D1-HIGH-01 | Backend | Missing Transaction em PUT /pedidos/:id/status | [logistica-routes.js#L65](routes/logistica-routes.js#L65) | Pedido em estado inconsistente (status_logistica ≠ status) |
| D1-HIGH-02 | Backend | Silent LGPD crypto fallback | [vendas-routes.js#L88](routes/vendas-routes.js#L88) | PII gravado em plaintext sem aviso |
| D1-HIGH-03 | Backend | Silent sync error em NFe estoque | [nfe-routes.js#L200](routes/nfe-routes.js#L200) | Estoque em 3 tabelas dessincronizado |
| D3-HIGH-01 | Pipeline | Sem status validation PCP→Logística | [logistica-routes.js](routes/logistica-routes.js) | Pedido entregue sem OP concluída |
| D4-HIGH-01 | Chaos | SEFAZ timeout sem retry/DLQ | [nfe-api.js#L113](routes/nfe-api.js#L113) | NFe em estado indeterminado, duplicata possível |
| D4-HIGH-02 | Chaos | DB pool sem acquireTimeout | [database/pool.js](database/pool.js) | Sistema trava se MySQL lento |
| D4-HIGH-03 | Chaos | Redis down = logout em cascata | [auth-central.js](middleware/auth-central.js) | DoS: derrubar Redis desconecta todos usuários |
| D4-HIGH-04 | Chaos | Rate limiter sem fallback Redis | [security-middleware.js](security-middleware.js) | Bruteforce login ilimitado se Redis down |
| D5-HIGH-01 | Security | JWT_SECRET fallback "dev-only-secret" | [utils/cache.js#L55](utils/cache.js#L55) | Forja de tokens JWT |
| D5-HIGH-02 | Security | JWT válido após logout (inatividade) | [auth-central.js#L84](middleware/auth-central.js#L84) | Reutilização de token após logout |
| D5-HIGH-03 | Security | Error messages expõem schema DB | [pcp-routes.js#L3603](routes/pcp-routes.js#L3603) | Information disclosure |
| D5-HIGH-04 | Security | Stack traces em logs produção | [pcp-routes.js#L3581](routes/pcp-routes.js#L3581) | LFI + stack trace = paths + queries expostos |
| D2-HIGH-01 | Frontend | Undefined rendering (27 instâncias) | Múltiplos módulos | "undefined" visível para usuário, crash em .toFixed() |
| D2-HIGH-02 | Frontend | Missing loading states (19 instâncias) | Múltiplos módulos | Tela vazia por 2-5s, UX degradada |

---

## 🟡 P2 — MEDIUM (CORRIGIR EM 2 SEMANAS)

| ID | Dimensão | Título | Arquivo | Impacto |
|----|----------|--------|---------|---------|
| D1-MED-01 | Backend | Missing FK check em transportadora | [logistica-routes.js#L105](routes/logistica-routes.js#L105) | Transportadora orphan |
| D1-MED-02 | Backend | CNPJ/email sem validação formato | [logistica-routes.js#L295](routes/logistica-routes.js#L295) | Dados inválidos no DB |
| D1-MED-03 | Backend | Contas-pagar valor sem check > 0 | [financeiro-core.js#L140](routes/financeiro-core.js#L140) | Contas negativas criadas |
| D1-MED-04 | Backend | Auth pattern inconsistente no financeiro | [financeiro-core.js#L130](routes/financeiro-core.js#L130) | Potencial bypass marginal |
| D3-MED-01 | Pipeline | CR duplicação possível em retry | [financeiro-reactive.service.js](services/financeiro-reactive.service.js) | CR duplicada por NFe |
| D3-MED-02 | Pipeline | Sem optimistic locking (version) | — | Edições concorrentes sobrescrevem |
| D2-MED-01 | Frontend | Modal z-index conflicts (12 instâncias) | Múltiplos módulos | Modais sobrepondo |
| D2-MED-02 | Frontend | Event listeners sem removal (7 instâncias) | Múltiplos módulos | Memory leak gradual |

---

## 📈 SCORE BREAKDOWN

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZYNTRA ERP — GOD MODE SCORE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  D1 Backend Robustness      ████████░░░░░░░░░░░░  40/100       │
│    ✅ Auth middleware global (exceto inconsistências)            │
│    ✅ express-validator em PCP materiais                        │
│    ✅ Transações em vendas POST /pedidos                        │
│    ❌ N+1 em NFe e PCP (CRIT)                                  │
│    ❌ Missing transactions em logística                         │
│    ❌ Silent error swallowing                                   │
│                                                                 │
│  D2 Frontend Resilience     ██░░░░░░░░░░░░░░░░░░  12/100       │
│    ✅ escapeHtml() existe (mas usado <30% das vezes)            │
│    ✅ Alguns botões com loading state                           │
│    ❌ 26 innerHTML XSS (CRIT)                                  │
│    ❌ 31 botões sem double-click guard (CRIT)                   │
│    ❌ 18 setInterval leaks (CRIT)                               │
│    ❌ 27 undefined rendering gaps                               │
│    ❌ 19 missing loading states                                 │
│                                                                 │
│  D3 E2E Pipeline Integrity  ███████░░░░░░░░░░░░░  35/100       │
│    ✅ NFe → CR auto-creation funciona                           │
│    ✅ FOR UPDATE em status transition (vendas→faturar)          │
│    ❌ FK pedido→OP inexistente (CRIT)                           │
│    ❌ NFe cancelamento não-atômico (CRIT)                       │
│    ❌ Estoque negativo por race (CRIT)                          │
│    ❌ Hard-delete sem cascade (CRIT)                            │
│                                                                 │
│  D4 Chaos Resilience        ████░░░░░░░░░░░░░░░░  20/100       │
│    ✅ Timeout configurado em SEFAZ call (30s)                   │
│    ❌ Sem retry/DLQ para SEFAZ timeout                          │
│    ❌ Race condition em numeração                               │
│    ❌ Oversell por concorrência                                 │
│    ❌ Redis down = logout cascata                               │
│    ❌ DB pool sem timeout adequado                              │
│                                                                 │
│  D5 Security Posture        █████████░░░░░░░░░░░  45/100       │
│    ✅ JWT httpOnly cookies                                      │
│    ✅ authenticateToken em router.use()                         │
│    ✅ authorizeArea() em maioria das rotas                      │
│    ✅ Parameterized queries (mysql2)                            │
│    ❌ IDOR em produtos (CRIT)                                   │
│    ❌ SQL injection via dynamic fields (CRIT)                   │
│    ❌ JWT_SECRET fallback hardcoded                              │
│    ❌ SELECT * expõe dados sensíveis                            │
│    ❌ Error messages expõem schema                              │
│                                                                 │
│  ═══════════════════════════════════════════════════            │
│  SCORE GERAL:  38/100 — 🔴 CRITICAL                            │
│  (anterior: 31/100 → melhora de +7 pts após sprints)           │
│  ═══════════════════════════════════════════════════            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 PLANO DE REMEDIAÇÃO — ORDEM DE PRIORIDADE

### Sprint 1 — BLOQUEADORES FISCAIS (3-5 dias)
| # | Fix | Arquivos | Esforço |
|---|-----|----------|---------|
| 1 | Sequence table para numero_nfe (eliminar Math.random) | nfe-api.js | 2h |
| 2 | Transaction + FOR UPDATE em TODOS os decrementos de estoque | nfe-routes.js, pcp-routes.js, modules/Compras/api/estoque.js | 4h |
| 3 | NFe cancelamento refactorado com transaction única + idempotência | nfe-routes.js | 6h |
| 4 | Whitelist de campos em UPDATE dinâmico (SQL injection fix) | pcp-routes.js | 1h |
| 5 | FK constraint pedido_id em ordens_producao (migration) | Setup scripts + pcp-routes.js | 3h |

### Sprint 2 — SEGURANÇA (3-5 dias)
| # | Fix | Arquivos | Esforço |
|---|-----|----------|---------|
| 6 | checkOwnership em TODAS rotas /api/:id | pcp-routes.js, vendas-routes.js | 4h |
| 7 | Remover JWT_SECRET fallback hardcoded | utils/cache.js | 30min |
| 8 | Substituir SELECT * por colunas explícitas | pcp-routes.js (10+ queries) | 3h |
| 9 | Sanitizar error messages em produção | pcp-routes.js, nfe-routes.js | 2h |
| 10 | escapeHtml() em TODOS innerHTML com dados de API | Logistica, NFe, Financeiro HTMLs | 4h |

### Sprint 3 — FRONTEND RESILIENCE (3-5 dias)
| # | Fix | Arquivos | Esforço |
|---|-----|----------|---------|
| 11 | btn.disabled pattern em todos botões com fetch | Todos HTMLs (31 instâncias) | 4h |
| 12 | clearInterval/removeEventListener em navigation | Financeiro, Compras HTMLs | 3h |
| 13 | Loading skeleton em tabelas/dashboards | Logistica, NFe, Financeiro HTMLs | 3h |
| 14 | Null-safe rendering (|| '', || 0) | Todos HTMLs (27 instâncias) | 2h |

### Sprint 4 — RESILIENCE (3-5 dias)
| # | Fix | Arquivos | Esforço |
|---|-----|----------|---------|
| 15 | Soft-delete em pedidos (eliminar hard-delete) | vendas-routes.js | 2h |
| 16 | Transaction em logística status update | logistica-routes.js | 2h |
| 17 | Redis fallback (in-memory rate limiter) | security-middleware.js | 3h |
| 18 | DB pool acquireTimeout + circuit breaker | database/pool.js | 2h |
| 19 | SEFAZ retry com exponential backoff + DLQ | nfe-api.js | 4h |
| 20 | Optimistic locking (version column) em pedidos/OPs | Migration + routes | 4h |

---

## ✅ PONTOS POSITIVOS ENCONTRADOS

1. **Auth global via router.use()** — Padrão correto na maioria das rotas
2. **express-validator em PCP materiais** — Validação robusta de input
3. **Transações em vendas POST /pedidos** — Atomicidade garantida na criação
4. **FOR UPDATE em status transitions (vendas→faturar)** — Lock correto
5. **Audit trail ativo em vendas** — Rastreabilidade de operações
6. **Tenant scope em vendas** — Isolamento multi-tenant
7. **JWT httpOnly cookies** — Proteção contra XSS token theft
8. **NFe → CR auto-creation** — Pipeline faturamento→financeiro funcional
9. **LGPD crypto module** — Existe (precisa ser mandatory, não optional)
10. **escapeHtml() utility** — Existe (precisa ser usado consistentemente)

---

*Relatório gerado por auditoria automatizada GOD MODE — 5 dimensões, 171 findings.*
*Próximo passo recomendado: Sprint 1 (Bloqueadores Fiscais) imediatamente.*
