# RELATÓRIO DE DIAGNÓSTICO TDD — GERAÇÃO DE ORDEM DE PRODUÇÃO (PCP)

> **Data:** 20/03/2026  
> **Autor:** QA/SDET Engine — Automação TDD  
> **Módulo:** PCP — Geração de Ordem de Produção  
> **Metodologia:** TDD (Red → Green → Refactor)  
> **Status:** 🔴 **RED STATE** — 3 falhas críticas + 8 alertas de risco detectados

---

## RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Total de Testes Executados** | **136** (102 Unit + 34 Stress) |
| **Testes Aprovados (GREEN)** | 133 |
| **Testes Reprovados (RED)** | **3** |
| **Alertas de Risco (WARN)** | **8** |
| **Coverage de Módulos** | Fase 1 (Data Mapping), Fase 2 (E2E — definido), Fase 3 (Edge Cases) |
| **Gravidade Máxima** | 🔴 **Nível 1 — Crítica** (Dados perdidos no INSERT; Schema incompatível) |

---

## 🔴 FALHAS DETECTADAS (RED STATE)

### FALHA 1: INSERT Incompleto no Banco de Dados

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-017` |
| **Módulo/Componente** | `PCP → API → POST /api/pcp/ordem-producao/excel` (server.js, ~linha 5650) |
| **Comportamento Esperado (Expected)** | O `INSERT INTO ordens_producao` deve gravar **todos** os campos do cabeçalho do pedido: `vendedor`, `pedido_referencia`, `numero_orcamento`, `contato`, `telefone`, `email`, `tipo_frete`, `condicoes_pagamento`, `transportadora_nome`, `valor_total`. |
| **Comportamento Atual (Actual / Red State)** | O INSERT atual grava apenas **6 campos**: `codigo_produto, descricao_produto, quantidade, data_previsao_entrega, cliente, observacoes, status`. Os outros **10 campos** são preenchidos no Excel mas **não persistem no banco de dados**. |
| **Impacto no Fluxo** | 🔴 **CRÍTICO NÍVEL 1** — Dados comerciais (vendedor, condições de pagamento, transportadora) são perdidos. Se o Excel for corrompido ou perdido, não há como reconstruir a OP a partir do banco. O histórico de auditoria fica incompleto. A rastreabilidade Vendas→PCP é parcial. |
| **Ação de Correção Sugerida (Sprint)** | 1. Adicionar colunas à tabela `ordens_producao`: `vendedor VARCHAR(200)`, `pedido_referencia VARCHAR(100)`, `numero_orcamento VARCHAR(50)`, `contato VARCHAR(200)`, `telefone VARCHAR(50)`, `email VARCHAR(200)`, `tipo_frete VARCHAR(10)`, `condicoes_pagamento VARCHAR(200)`, `transportadora_nome VARCHAR(200)`, `valor_total DECIMAL(14,2)`. 2. Atualizar o INSERT em `POST /api/pcp/ordem-producao/excel` para incluir todos os campos. 3. Atualizar o SELECT em `GET /api/pcp/ordens-producao` para retornar os novos campos. |

**Código Atual (Red):**
```sql
INSERT INTO ordens_producao 
  (codigo_produto, descricao_produto, quantidade, 
   data_previsao_entrega, cliente, observacoes, status) 
VALUES (?, ?, ?, ?, ?, ?, 'Rascunho')
```

**Código Esperado (Green):**
```sql
INSERT INTO ordens_producao 
  (codigo_produto, descricao_produto, quantidade, 
   data_previsao_entrega, cliente, observacoes, status,
   vendedor, pedido_referencia, numero_orcamento, contato,
   telefone, email, tipo_frete, condicoes_pagamento,
   transportadora_nome, valor_total) 
VALUES (?, ?, ?, ?, ?, ?, 'planejada', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

---

### FALHA 2: Ausência de Foreign Key (FK) — Pedido Vendas ↔ OP

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-017` (sub-teste 2) |
| **Módulo/Componente** | `Database Schema → tabela ordens_producao` (migration `0004_pcp_bom_roteiros.sql`) |
| **Comportamento Esperado (Expected)** | A tabela `ordens_producao` deve conter uma coluna `pedido_vendas_id INT` (ou similar) com FK apontando para a tabela `pedidos` do módulo Vendas, garantindo rastreabilidade bidirecional. |
| **Comportamento Atual (Actual / Red State)** | Schema atual: `id, numero, produto_id, quantidade, status, data_criacao, empresa_id`. **Não existe coluna `pedido_vendas_id`, `pedido_id` nem `pedido_referencia`** como FK no schema da tabela. A vinculação Vendas→PCP só existe no Excel gerado (campo `numero_pedido`), não no banco. |
| **Impacto no Fluxo** | 🔴 **CRÍTICO NÍVEL 1** — Impossível fazer query "Qual Pedido de Venda originou esta OP?" diretamente no banco. Relatórios de rastreabilidade Venda→Produção dependem exclusivamente do arquivo Excel. Se o Excel for perdido, o vínculo é irrecuperável. Compliance e auditoria comprometidos. |
| **Ação de Correção Sugerida (Sprint)** | 1. Migration: `ALTER TABLE ordens_producao ADD COLUMN pedido_vendas_id INT NULL COMMENT 'FK para pedidos de Vendas';` 2. Adicionar INDEX: `CREATE INDEX idx_op_pedido ON ordens_producao(pedido_vendas_id);` 3. Atualizar INSERT/SELECT nas rotas de OP para incluir `pedido_vendas_id`. 4. Popular retroativamente usando `pedido_referencia` dos Excels existentes. |

---

### FALHA 3: Status "Rascunho" Incompatível com ENUM do Schema

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-018` |
| **Módulo/Componente** | `PCP → API → POST /api/pcp/ordem-producao/excel` + `Database Schema ENUM` |
| **Comportamento Esperado (Expected)** | O status usado no INSERT deve existir no ENUM definido na tabela `ordens_producao`. O ENUM permite: `'planejada', 'liberada', 'executando', 'concluida', 'cancelada'`. |
| **Comportamento Atual (Actual / Red State)** | O INSERT usa `status = 'Rascunho'` (com R maiúsculo). Este valor **não existe** no ENUM da tabela. Dependendo da configuração do MySQL (strict mode), o INSERT pode: (a) falhar silenciosamente com string vazia, (b) lançar erro SQL, ou (c) truncar para o primeiro valor do ENUM. |
| **Impacto no Fluxo** | 🟡 **ALTO** — OPs podem ser inseridas com status vazio ou inválido. A listagem `GET /api/pcp/ordens-producao` ordena por status — um status não reconhecido cairá no `ELSE 5` do CASE e será exibido por último, possivelmente escondido da vista do operador. Kanban PCP não terá coluna para "Rascunho", tornando a OP invisível no board. |
| **Ação de Correção Sugerida (Sprint)** | **Opção A** (recomendada): Alterar INSERT para usar `'planejada'` (valor válido do ENUM). **Opção B**: Adicionar `'rascunho'` ao ENUM: `ALTER TABLE ordens_producao MODIFY COLUMN status ENUM('rascunho','planejada','liberada','executando','concluida','cancelada') DEFAULT 'rascunho';` |

---

## ⚠️ ALERTAS DE RISCO (WARNINGS)

### WARN-01: Overflow de Template com 50+ Itens

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-029` |
| **Risco** | Template Excel tem **15 linhas** para itens (L18-L32). Pedidos com mais de 15 produtos terão itens **silenciosamente ignorados** ou sobrepostos às seções de Observações/Pagamento (L34+). |
| **Impacto** | Produção receberá OP incompleta — itens não listados não serão fabricados. |
| **Recomendação** | Implementar paginação no Excel: se `itens.length > 15`, criar planilha adicional "Continuação" ou expandir dinâmicamente as linhas da tabela com `worksheet.spliceRows()`. |

### WARN-02: Body-Parser Limit para OPs Grandes

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-030` |
| **Risco** | Payload JSON de 100 itens pode exceder o limite default do `express.json()` (100KB). Pedidos grandes retornarão `413 Payload Too Large`. |
| **Recomendação** | Configurar: `app.use(express.json({ limit: '2mb' }))` no server.js. |

### WARN-03: Texto Longo em Observações pode Sobrepor Layout

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-031` |
| **Risco** | Observações com 5000+ caracteres podem sobrescrever visualmente as linhas 42-44 (Condições de Pagamento) no Excel, pois as células não têm `wrapText: true` com altura de linha dinâmica. |
| **Recomendação** | Adicionar `worksheet.getRow(37).height = 'auto'` ou truncar observações a 500 chars com indicador `"...[ver completo]"`. |

### WARN-04: Emojis em Versões Antigas do Excel

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-034` |
| **Risco** | Emojis (🏭🔧⚠️) podem renderizar como `□□□` em Excel 2010 ou anterior. |
| **Recomendação** | Documentar versão mínima: Excel 2016. Sanitizar emojis se target inclui Excel antigo. |

### WARN-05: Data "2026-02-30" Auto-Corrigida Silenciosamente

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-040` |
| **Risco** | JavaScript `new Date('2026-02-30')` auto-corrige para 01/03/2026 sem erro. Prazo de entrega pode ficar errado sem o usuário perceber. |
| **Recomendação** | Implementar validação explícita de datas no backend: verificar se `dia <= diasNoMes(mes, ano)` antes de aceitar. |

### WARN-06: Sem Validação de Status no Endpoint de Geração da OP

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-019` (E2E — definido mas pendente de execução) |
| **Risco** | O endpoint `POST /api/pcp/ordem-producao/excel` **não valida** o status do pedido antes de gerar a OP. Pedidos em "orçamento" ou "cancelado" podem gerar OPs que serão enviadas ao chão de fábrica indevidamente. |
| **Recomendação** | Adicionar guard no início do endpoint: `if (!['aprovado','producao','faturado'].includes(pedido.status)) return res.status(400).json({ message: 'Status inválido para gerar OP' });` |

### WARN-07: Sem Controle de Imutabilidade Pós-Produção

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-020` (E2E — definido mas pendente de execução) |
| **Risco** | `PUT /api/pcp/ordens-producao/:id` aceita alterações independente do status. Vendedor ou outro usuário pode alterar quantidades/dados de uma OP que já está sendo executada no chão de fábrica. |
| **Recomendação** | Adicionar guard: `if (['executando','concluida'].includes(ordemAtual.status)) return res.status(409).json({ message: 'OP em execução/concluída não pode ser alterada' });` |

### WARN-08: Sem Prevenção de OP Duplicada

| Campo | Detalhe |
|-------|---------|
| **ID do Teste** | `TDD-OP-022` (E2E — definido) |
| **Risco** | O mesmo pedido pode gerar múltiplas OPs sem aviso. Cada clique no botão "Gerar Excel" cria um novo INSERT + novo arquivo Excel without checking se já existe OP para aquele pedido. |
| **Recomendação** | Antes do INSERT, verificar: `SELECT COUNT(*) FROM ordens_producao WHERE pedido_referencia = ?`. Se > 0, retornar warning ou 409 Conflict. |

---

## ✅ TESTES APROVADOS — RESUMO POR FASE

### Fase 1: Validação de Dados e Template — 99/102 ✅ (97.1%)

| Suite | Testes | Status |
|-------|--------|--------|
| TDD-OP-001: Cabeçalho do Pedido | 4/4 | ✅ GREEN |
| TDD-OP-002: Vendedor e Prazo | 2/2 | ✅ GREEN |
| TDD-OP-003: Dados do Cliente | 5/5 | ✅ GREEN |
| TDD-OP-004: Dados da Transportadora | 6/6 | ✅ GREEN |
| TDD-OP-005: Condições e Observações | 4/4 | ✅ GREEN |
| TDD-OP-006: Códigos de Perfis | 3/3 | ✅ GREEN |
| TDD-OP-007: Quantidades | 3/3 | ✅ GREEN |
| TDD-OP-008: Dimensões Técnicas | 9/9 | ✅ GREEN |
| TDD-OP-009: Acabamento/Cor | 3/3 | ✅ GREEN |
| TDD-OP-010: Instruções de Montagem | 3/3 | ✅ GREEN |
| TDD-OP-011: Peso e Lote | 6/6 | ✅ GREEN |
| TDD-OP-012: Valores Financeiros | 7/7 | ✅ GREEN |
| TDD-OP-013: Anti-Null | 15/15 | ✅ GREEN |
| TDD-OP-014: Contrato da API | 3/3 | ✅ GREEN |
| TDD-OP-015: Mapeamento Células | 17/17 | ✅ GREEN |
| TDD-OP-016: Tabela de Itens | 8/8 | ✅ GREEN |
| TDD-OP-017: INSERT no Banco | 0/2 | 🔴 RED |
| TDD-OP-018: Status Inicial | 1/2 | 🔴 RED |

### Fase 3: Testes de Estresse — 34/34 ✅ (100%)

| Suite | Testes | Status |
|-------|--------|--------|
| TDD-OP-028: 15 itens (limite) | 3/3 | ✅ GREEN |
| TDD-OP-029: 50 itens (overflow) | 3/3 | ✅ GREEN + WARN |
| TDD-OP-030: 100 itens (stress) | 2/2 | ✅ GREEN + WARN |
| TDD-OP-031: Texto 5000+ chars | 2/2 | ✅ GREEN + WARN |
| TDD-OP-032: Caracteres Técnicos | 2/2 | ✅ GREEN |
| TDD-OP-033: Unicode Internacional | 2/2 | ✅ GREEN |
| TDD-OP-034: Emojis | 2/2 | ✅ GREEN + WARN |
| TDD-OP-035: XSS/SQL Injection | 3/3 | ✅ GREEN |
| TDD-OP-036: Quantidade Zero | 2/2 | ✅ GREEN |
| TDD-OP-037: Valores Extremos | 3/3 | ✅ GREEN + WARN |
| TDD-OP-038: Overflow Numérico | 2/2 | ✅ GREEN |
| TDD-OP-039: CPF/CNPJ no Excel | 3/3 | ✅ GREEN |
| TDD-OP-040: Datas Inválidas | 3/3 | ✅ GREEN + WARN |
| TDD-OP-041: Espelho entre Abas | 1/1 | ✅ GREEN |
| TDD-OP-042: Preservação Fórmulas | 1/1 | ✅ GREEN |

### Fase 2: E2E (Definidos — Pendente Execução com Servidor)

| Suite | Testes Definidos | Status |
|-------|-----------------|--------|
| TDD-OP-019: Gatilho de Status | 4 | ⏳ Pendente |
| TDD-OP-020: Imutabilidade | 3 | ⏳ Pendente |
| TDD-OP-021: Vínculo FK | 3 | ⏳ Pendente |
| TDD-OP-022: Duplicação | 1 | ⏳ Pendente |
| TDD-OP-023: RBAC | 3 | ⏳ Pendente |
| TDD-OP-024: Navegação PCP | 1 | ⏳ Pendente |
| TDD-OP-025: Ordens Page | 1 | ⏳ Pendente |
| TDD-OP-026: Kanban Colunas | 1 | ⏳ Pendente |
| TDD-OP-027: Dashboard KPIs | 1 | ⏳ Pendente |

---

## 📋 BACKLOG DE SPRINTS (Priorizado por Impacto)

### Sprint 1: Correções Críticas de Schema e Persistência (🔴 P0)

| # | Tarefa | Componente | Estimativa |
|---|--------|-----------|------------|
| 1.1 | Adicionar 10 colunas faltantes em `ordens_producao` | Migration SQL | - |
| 1.2 | Adicionar coluna `pedido_vendas_id INT` com INDEX | Migration SQL | - |
| 1.3 | Atualizar INSERT em `POST /api/pcp/ordem-producao/excel` | server.js L5650 | - |
| 1.4 | Atualizar INSERT em `POST /api/pcp/ordens-producao` (modal) | server.js L5680 | - |
| 1.5 | Corrigir status `'Rascunho'` → `'planejada'` ou alterar ENUM | server.js + migration | - |
| 1.6 | Atualizar SELECT em `GET /api/pcp/ordens-producao` | server.js L2942 | - |

### Sprint 2: Guards de Negócio (⚠️ P1)

| # | Tarefa | Componente | Estimativa |
|---|--------|-----------|------------|
| 2.1 | Validação de status do pedido antes de gerar OP | server.js (guard no POST) | - |
| 2.2 | Guard de imutabilidade no PUT (bloquear OP em execução/concluída) | server.js (guard no PUT) | - |
| 2.3 | Verificação de duplicatas antes de INSERT | server.js (SELECT COUNT) | - |
| 2.4 | Validação de transição unidirecional de status | server.js (máquina de estados) | - |
| 2.5 | Validação explícita de datas (rejeitar datas impossíveis) | server.js (input validation) | - |

### Sprint 3: Resiliência de Template e Edge Cases (⚠️ P2)

| # | Tarefa | Componente | Estimativa |
|---|--------|-----------|------------|
| 3.1 | Paginação dinâmica para pedidos com 15+ itens | Excel generator | - |
| 3.2 | Auto-height para células de observações longas | Excel generator | - |
| 3.3 | Configurar `express.json({ limit: '2mb' })` | server.js (middleware) | - |
| 3.4 | Sanitização de emojis para compatibilidade Excel | Excel generator | - |
| 3.5 | Validação de quantidade > 0 no backend | server.js (validation) | - |

---

## ARQUIVOS DE TESTE GERADOS

| Arquivo | Fase | Testes | Framework |
|---------|------|--------|-----------|
| `tests/unit/pcp-ordem-producao.test.js` | 1 | 102 | Node.js Test Runner |
| `tests/unit/pcp-ordem-producao-stress.test.js` | 3 | 34 | Node.js Test Runner |
| `tests/e2e/pcp-ordem-producao.spec.js` | 2 | 18 | Playwright |

### Comandos de Execução

```bash
# Fase 1: Testes Unitários de Dados
node --test tests/unit/pcp-ordem-producao.test.js

# Fase 3: Testes de Estresse
node --test tests/unit/pcp-ordem-producao-stress.test.js

# Fase 2: Testes E2E (requer servidor rodando)
npx playwright test tests/e2e/pcp-ordem-producao.spec.js

# Todas as fases unitárias de uma vez
node --test tests/unit/pcp-ordem-producao.test.js tests/unit/pcp-ordem-producao-stress.test.js
```

---

## DIAGRAMA DE FLUXO: VENDAS → PCP (Estado Atual vs Esperado)

```
ESTADO ATUAL (Com Falhas):
═══════════════════════════════════════════════════════════════

  VENDAS                        PCP                         PRODUÇÃO
  ┌──────────┐  Sem validação  ┌──────────────┐            ┌──────────────┐
  │ Pedido   │ ───────────────►│ POST excel   │            │ Chão Fábrica │
  │ (qualquer│  de status!     │              │            │              │
  │  status) │                 │ INSERT com   │            │ OP pode ter  │
  └──────────┘                 │ 6 campos     │──(Excel)──►│ dados        │
                               │ (perde 10!)  │            │ incompletos  │
                               │              │            │              │
                               │ Status       │            │ Sem FK para  │
                               │ 'Rascunho'   │            │ rastrear     │
                               │ (inválido!)  │            │ pedido       │
                               └──────────────┘            └──────────────┘

ESTADO ESPERADO (Pós-Sprint):
═══════════════════════════════════════════════════════════════

  VENDAS                        PCP                         PRODUÇÃO
  ┌──────────┐  ✅ Guard       ┌──────────────┐            ┌──────────────┐
  │ Pedido   │ ───────────────►│ POST excel   │            │ Chão Fábrica │
  │ status = │  só "aprovado"  │              │            │              │
  │"aprovado"│  ou "producao"  │ INSERT com   │──(Excel)──►│ OP completa  │
  └──────────┘                 │ 16 campos ✅ │            │ com todos    │
       │                       │              │            │ os dados     │
       │ FK                    │ Status       │            │              │
       └───────────────────────│ 'planejada'  │            │ FK rastreável│
         pedido_vendas_id      │ (ENUM ✅)    │            │ ao pedido    │
                               └──────────────┘            └──────────────┘
```

---

> **Próximo Passo:** Executar Sprint 1 (P0) para corrigir as 3 falhas críticas.  
> Após correção, re-executar: `node --test tests/unit/pcp-ordem-producao.test.js`  
> Meta: **102/102 GREEN (100%)**
