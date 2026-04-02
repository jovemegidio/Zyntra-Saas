# 🔥 AUDITORIA LIFECYCLE CHAOS — Módulo Vendas

**Data:** 2026-03-21  
**Escopo:** Simulação de interrupções abruptas, vazamentos de memória, deadlocks e race conditions  
**Arquivo principal:** `modules/Vendas/server.js` (~6400 linhas)  

---

## 📋 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Race conditions encontradas | **9+** |
| Rotas sem transação (antes) | **9 de 11** rotas críticas |
| Vulnerabilidades NF duplicada | **4 locais** (TOCTOU) |
| Funções indefinidas causando crash | **3** (`loadChatHistory`, `saveChatHistory`, `appendChatLog`) |
| Fixes aplicados | **8** |
| Severidade máxima | **P0 — CRÍTICA (fiscal + financeira)** |

---

## 🔴 ACHADOS CRÍTICOS (P0)

### 1. NF Duplicada por Race Condition (TOCTOU)
**Padrão vulnerável (4 locais):**
```sql
SELECT MAX(CAST(nf_numero AS UNSIGNED)) AS ultima_nf FROM pedidos WHERE nf_numero IS NOT NULL;
-- ⚠️ Sem lock: outra request pode ler o mesmo MAX e gerar a mesma NF
UPDATE pedidos SET nf_numero = ? WHERE id = ?;
```

**Impacto:** Duas requisições simultâneas de faturamento geram o MESMO número de NF → violação fiscal.

**Rotas afetadas:**
- `POST /pedidos/:id/faturar`
- `POST /pedidos/:id/faturamento-parcial`  
- `POST /pedidos/:id/remessa-entrega`
- `POST /pedidos/:id/gerar-nf`

**Status:** ✅ CORRIGIDO — Todas usam `SELECT ... FOR UPDATE` dentro de transação atômica.

---

### 2. Faturamento sem Transação (6+ queries desprotegidas)
**Padrão vulnerável:**
```javascript
await pool.query('UPDATE pedidos SET status = "faturado"...');
// ⚠️ Se o processo morre aqui, pedido fica "faturado" sem histórico
await pool.query('INSERT INTO historico_pedidos...');
```

**Impacto:** Crash entre UPDATE e INSERT deixa pedido em estado inconsistente — status "faturado" sem registro de histórico, sem NF, ou sem financeiro.

**Rotas afetadas:**
- `POST /pedidos/:id/faturar` (2 queries)
- `POST /pedidos/:id/faturamento-parcial` (5 queries)
- `POST /pedidos/:id/remessa-entrega` (6+ queries com loop)

**Status:** ✅ CORRIGIDO — `pool.getConnection()` + `beginTransaction()` + `commit()` / `rollback()` + `finally { connection.release() }`.

---

### 3. Loop de Estoque sem Transação (Baixa Parcial)
**Padrão vulnerável em remessa-entrega:**
```javascript
for (const item of itensPedido) {
    await pool.query('INSERT INTO estoque_movimentos...');
    await pool.query('UPDATE produtos SET estoque_atual = estoque_atual - ?...');
    // ⚠️ Se falha no item 5 de 10, itens 1-4 já foram debitados
}
await pool.query('UPDATE pedidos SET estoque_baixado = 1...');
```

**Impacto:** Falha no meio do loop deixa estoque parcialmente debitado; pedido não marcado como `estoque_baixado=1` mas produtos já descontados → inventário corrompido.

**Status:** ✅ CORRIGIDO — Loop completo dentro de transação. Falha em qualquer item faz rollback de TODOS.

---

### 4. Estorno de Estoque TOCTOU (Cancelamento)
**Padrão vulnerável (2 locais):**
```javascript
const estoqueAnterior = parseFloat(produto.estoque_atual); // ⚠️ Lê valor
const novoEstoque = estoqueAnterior + quantidade;            // ⚠️ Calcula
await pool.query('UPDATE produtos SET estoque_atual = ?', [novoEstoque, id]); // ⚠️ Escreve valor absoluto
```

**Impacto:** Dois cancelamentos simultâneos leem o MESMO `estoque_atual`. Ambos calculam `anterior + qtd`. O último a escrever sobrescreve o primeiro → unidades de estoque perdidas.

**Exemplo:** Estoque = 100. Cancel A (+10) e Cancel B (+5) simultâneos.  
- Sem fix: A lê 100 → escreve 110. B lê 100 → escreve 105. **Resultado: 105** (10 unidades perdidas)  
- Com fix: `SET estoque_atual = estoque_atual + 10` + `SET estoque_atual = estoque_atual + 5`. **Resultado: 115** ✅

**Rotas afetadas:**
- `PUT /pedidos/:id/status` (bloco de cancelamento)
- `PATCH /pedidos/:id` (bloco de cancelamento via PATCH)

**Status:** ✅ CORRIGIDO — `UPDATE SET estoque_atual = estoque_atual + ?` (incremento atômico no DB).

---

## 🟠 ACHADOS ALTOS (P1)

### 5. Pool de Conexões sem Limite de Fila
**Arquivo:** `database/pool.js`  
**Configuração anterior:** `queueLimit: 0` (ilimitado)

**Impacto:** Sob carga extrema, milhares de requests empilham esperando conexão → Node.js consome memória ilimitada → OOM kill.

**Status:** ✅ CORRIGIDO — `queueLimit: 250`. Requests acima do limite recebem erro imediato em vez de consumir memória indefinidamente.

---

### 6. Funções de Chat Indefinidas (ReferenceError)
**Funções chamadas mas nunca definidas:**
- `loadChatHistory()` — chamada 2× 
- `saveChatHistory()` — chamada 1×
- `appendChatLog()` — chamada 3×

**Impacto:** Cada conexão Socket.IO disparava `ReferenceError` silenciado por try/catch. Chat completamente não funcional. Logs de conexão/desconexão perdidos.

**Status:** ✅ CORRIGIDO — Implementadas 3 funções com armazenamento in-memory, limite de 200 mensagens (evita memory leak), e log condicional (somente em dev).

---

### 7. Ausência de Graceful Shutdown
**Problema:** Nenhum handler para `SIGTERM` ou `SIGINT`. 2 `setInterval` sem cleanup. Pool de conexões nunca fechado.

**Impacto:** 
- PM2 envia SIGTERM → processo não responde → force kill após `kill_timeout` (5s) → requests em andamento abortadas → transações pendentes no MySQL
- setIntervals mantêm referência → garbage collector não libera

**Status:** ✅ CORRIGIDO — Handlers `SIGTERM` e `SIGINT` adicionados. Limpam intervalos, fecham Socket.IO, encerram pool MySQL ordenadamente.

---

## 🟢 PONTOS POSITIVOS ENCONTRADOS

| Aspecto | Status |
|---------|--------|
| PM2 `max_memory_restart: '1G'` | ✅ Configurado |
| Connection release em `finally` blocks | ✅ Presente nas rotas corrigidas |
| Notificações limitadas a 100 | ✅ Capping implementado |
| `--max-old-space-size=4096` | ✅ Configurado no PM2 |
| JWT validation no Socket.IO | ✅ Token validado antes de aceitar conexão |

---

## 📂 ARQUIVOS MODIFICADOS

| Arquivo | Alteração |
|---------|-----------|
| `modules/Vendas/server.js` | 6 fixes (transações, estorno atômico, NF lock, chat funcs, SIGTERM) |
| `database/pool.js` | `queueLimit: 0` → `queueLimit: 250` |

---

## 🧪 CENÁRIOS DE ESTRESSE COBERTOS

### Cenário 1: Interrupção Abrupta durante Faturamento
**Antes:** Crash entre `UPDATE pedidos SET status='faturado'` e `INSERT historico` deixava estado corrompido.  
**Depois:** Transação atômica — ou todas as operações completam, ou nenhuma.

### Cenário 2: Dois Usuários Faturam o Mesmo Pedido Simultaneamente
**Antes:** Ambos geravam `SELECT MAX(nf_numero)` → mesma NF para pedidos diferentes.  
**Depois:** `FOR UPDATE` serializa acessos — segundo request espera o primeiro completar.

### Cenário 3: Cancelamento Simultâneo do Mesmo Pedido
**Antes:** Último cancelamento sobrescrevia estorno do primeiro (read-modify-write race).  
**Depois:** `SET estoque_atual = estoque_atual + ?` — incremento atômico no DB, sem perda.

### Cenário 4: Remessa com 50 Itens e Falha no Item 30
**Antes:** 29 produtos debitados, 21 não debitados, pedido não marcado como baixado — inventário fantasma.  
**Depois:** Rollback completo — todos os 50 itens voltam ao estado original.

### Cenário 5: 500 Requests Simultâneas sob Carga
**Antes:** Pool com `queueLimit: 0` acumulava infinitamente → OOM.  
**Depois:** Máximo 250 na fila. Excedentes recebem erro HTTP imediato.

### Cenário 6: PM2 Reinicia o Processo (SIGTERM)
**Antes:** Sem handler → force kill → conexões MySQL abertas, intervalos vazando, requests cortadas.  
**Depois:** Graceful shutdown → limpa intervalos, fecha Socket.IO, encerra pool, exit(0).

### Cenário 7: Conexão Socket.IO
**Antes:** `ReferenceError: loadChatHistory is not defined` em cada conexão (silenciada).  
**Depois:** Funções implementadas, chat funcional, histórico limitado a 200 msgs.

---

## ⚠️ ITENS PENDENTES (prioridade futura)

| Item | Severidade | Descrição |
|------|-----------|-----------|
| Rate limiter MemoryStore fallback | MEDIUM | Quando Redis cai, MemoryStore cresce sem limite. Considerar wipear periodicamente. |
| Socket.IO error handler global | LOW | `io.engine.on('connection_error', ...)` não implementado. |
| Aggregate cache interval cleanup | LOW | `setInterval` em `computeAndCacheAggregates` na linha ~6267 não está sendo limpo no SIGTERM (está em escopo de função). |

---

*Relatório gerado automaticamente pela auditoria Lifecycle Chaos.*
