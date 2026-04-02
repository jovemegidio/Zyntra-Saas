# ROOT CAUSE ANALYSIS — QUEBRA DE PIPELINE E2E: PRODUÇÃO → FATURAMENTO

**Incidente:** Pedido aprovado (Andreia) → OP gerada (Clemerson) → Tela de Faturamento vazia  
**Severidade:** CRÍTICA — Ruptura total de fluxo E2E  
**Data da Análise:** 20/03/2026  
**Analista:** Engenheiro de Resolução de Incidentes (Tier 3)

---

## RESUMO EXECUTIVO

Foram identificadas **5 causas-raiz encadeadas** que, em conjunto, impedem que um pedido processado pelo PCP apareça na tela de Faturamento. O problema NÃO é um bug isolado — é uma **ausência sistêmica de integração** entre os módulos PCP e Faturamento.

---

## PASSO 1: AUDITORIA DA MÁQUINA DE ESTADOS (Database Check)

### 1.1 Status do Pedido Após Geração de OP

**Achado CRÍTICO:** Nenhum dos 3 endpoints de criação de OP atualiza a tabela `pedidos`.

| Endpoint | Arquivo | Linha | Atualiza `pedidos.status`? |
|----------|---------|-------|---------------------------|
| `POST /api/pcp/ordens-producao` | `modules/PCP/server.js` | 2995–3030 | **NÃO** |
| `POST /api/pcp/ordem-producao/excel` | `modules/PCP/server.js` | 5294–5420 | **NÃO** |
| `POST /api/pcp/ordens-producao` (Modal) | `modules/PCP/server.js` | 5668–5950 | **NÃO** |

**Evidência — Endpoint simples (L2995-3030):**
```javascript
// modules/PCP/server.js:3004-3015
const [result] = await db.query(`
    INSERT INTO ordens_producao 
    (codigo, produto_nome, quantidade, unidade, status, prioridade, 
     data_inicio, data_prevista, responsavel, progresso, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
`, [...]);
// ❌ NENHUM "UPDATE pedidos SET status = 'producao'" existe após o INSERT
```

### 1.2 Status do Pedido Após Conclusão de OP

**Achado CRÍTICO:** Quando uma OP é marcada como `concluida`, o pedido não é retornado a nenhum status faturável.

**Evidência — Endpoint de status (L1742-1778):**
```javascript
// modules/PCP/server.js:1762-1764
if (status === 'concluida' || status === 'Concluída') {
    updateSql += ', data_conclusao = NOW(), progresso = 100';
    // ❌ AUSENTE: UPDATE pedidos SET status = 'faturar' WHERE id = (SELECT pedido_id FROM ordens_producao WHERE id = ?)
}
```

### 1.3 Vínculo OP ↔ Pedido (FK)

| Campo em `ordens_producao` | Tipo | FK Constraint? | Preenchimento |
|---------------------------|------|----------------|---------------|
| `pedido_id` | INT | **NÃO** | Frequentemente NULL |
| `numero_pedido` | VARCHAR(50) | **NÃO** | Texto livre, sem validação |

**Resultado:** Mesmo que se quisesse fazer o UPDATE de `pedidos` ao concluir a OP, não há vínculo confiável para encontrar o pedido original.

### 1.4 Diagrama de Estado Real vs. Esperado

```
ESTADO ESPERADO:
  aprovado ──[OP criada]──→ producao ──[OP concluída]──→ faturar ──[NFe gerada]──→ faturado

ESTADO REAL:
  aprovado ──[OP criada]──→ aprovado (INALTERADO!)
                            └── OP vive isolada em ordens_producao
                                Pedido NUNCA muda via PCP
```

---

## PASSO 2: INSPEÇÃO DA QUERY DE FATURAMENTO (BFF/API)

### 2.1 O que a tela "Notas Fiscais Recentes" realmente mostra

**Arquivo:** `modules/Faturamento/public/index.html` (L231)
```javascript
async function carregarNFes() {
    const r = await fetch(`/api/faturamento/nfes?status=${status}&data_inicio=${inicio}&data_fim=${fim}`, 
        { credentials: 'include' });
    // ...
}
```

**Endpoint backend:** `modules/Faturamento/api/faturamento.js` (L476-520)
```sql
SELECT n.*, c.nome as cliente_nome, p.id as pedido_numero, COUNT(ni.id) as total_itens
FROM nfe n
LEFT JOIN clientes c ON n.cliente_id = c.id
LEFT JOIN pedidos p ON n.pedido_id = p.id
LEFT JOIN nfe_itens ni ON n.id = ni.nfe_id
WHERE 1=1
-- Filtros dinâmicos: status, data_inicio, data_fim, cliente_id
GROUP BY n.id ORDER BY n.data_emissao DESC LIMIT 100
```

**ACHADO:** A tela busca SOMENTE da tabela `nfe`. **NÃO existe nenhuma query a `pedidos` com status = 'faturar' ou 'pronto' ou 'producao'.** A tela mostra **NF-es já emitidas**, não "pedidos aguardando faturamento".

### 2.2 O Empty State é "correto" — porém enganoso

**Arquivo:** `modules/Faturamento/public/index.html` (L241-243)
```javascript
function renderizarNFes(nfes) {
    if (!nfes.length) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">
            <i class="fas fa-file-invoice"></i>
            <h3>Nenhuma NF-e encontrada</h3>
            <p>Emita sua primeira nota fiscal</p>
        </div></td></tr>';
    }
}
```

**Diagnóstico:** A API retorna `{ success: true, data: [] }` (array vazio legítimo, status 200). NÃO é um erro 500 silenciado. Simplesmente não existem registros na tabela `nfe` para aquele contexto.

### 2.3 Gate de Geração de NF-e — Filtro Hardcoded

**Arquivo:** `modules/Faturamento/api/faturamento.js` (L106-114)
```sql
SELECT p.*, c.nome as cliente_nome, ...
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
WHERE p.id = ? AND p.status = 'aprovado'    ← BARREIRA INFLEXÍVEL
```

**Status aceitos:** APENAS `'aprovado'`  
**Status rejeitados:** `'producao'`, `'faturar'`, `'pronto'`, `'pendente'`, `'orcamento'`, qualquer outro

Se o pedido estiver em qualquer status diferente de `'aprovado'`, o endpoint retorna:
```json
{ "success": false, "message": "Pedido não encontrado ou não está aprovado" }
```

---

## PASSO 3: MAPEAMENTO DE FILA E MENSAGERIA

### 3.1 Bull/Redis — Configurado mas NÃO instanciado para integração PCP→Faturamento

O módulo Faturamento tem Bull como dependência (`package-lock.json` → `bull@^4.12.0`), citado em documentação (`FUNCIONALIDADES.md`, `README.md`) como "Processamento assíncrono com filas (Bull/Redis)". Porém:

- **Nenhum `require('bull')`** encontrado em código de produção (`api/faturamento.js`, `server.js`)
- **Nenhuma fila** definida para consumir eventos de "OP Concluída"
- **Nenhuma Dead Letter Queue** existe
- **Zero workers** de processamento assíncrono entre PCP e Faturamento

### 3.2 Socket.io — Notificação sem ação

**Arquivo:** `modules/PCP/server.js` (L8086-8094)
```javascript
if (global.io) {
    global.io.emit('pcp-apontamento-registrado', {
        tipo: 'apontamento',
        ordem_producao_id,
        etapa_id,
        quantidade_produzida,
        // ...
    });
}
```

Este evento Socket.io é **meramente informativo** (notificação push para UI). **Nenhum listener** no módulo Faturamento consome este evento para disparar transição de estado.

### 3.3 PCP tem tabela `programacao_faturamento` — COMPLETAMENTE ISOLADA

**Arquivo:** `modules/PCP/server.js` (L3085-3130)
```javascript
app.get('/api/pcp/faturamentos', authRequired, async (req, res) => {
    const [tables] = await db.query("SHOW TABLES LIKE 'programacao_faturamento'");
    // Se a tabela não existe, retorna lista vazia
    // Se existe, busca de programacao_faturamento
});
```

**O PCP tem seu próprio sistema de "faturamento"** via tabela `programacao_faturamento`, frontend em `producao-faturamento.js`, com endpoint `/api/pcp/faturamentos`.

**MAS:** Este sistema é 100% desconectado do módulo Faturamento real (`modules/Faturamento/`), que usa tabela `nfe` e endpoint `/api/faturamento/`.

| Aspecto | PCP (producao-faturamento) | Faturamento (módulo real) |
|---------|---------------------------|--------------------------|
| Tabela | `programacao_faturamento` | `nfe` + `nfe_itens` |
| Endpoint | `/api/pcp/faturamentos` | `/api/faturamento/nfes` |
| Frontend | `producao-faturamento.js` | `modules/Faturamento/public/index.html` |
| Integração | **ZERO** cross-module | **ZERO** com PCP |

---

## PASSO 4: VALIDAÇÃO DE REGRA DE NEGÓCIO OCULTA

### 4.1 Divergência de Vocabulário de Status entre Módulos

O sistema tem **3 vocabulários de status incompatíveis**:

**Vendas/Kanban** (`modules/Vendas/routes/api.js:1625`):
```javascript
const statusValidos = ['orcamento', 'pendente', 'aprovado', 'producao', 'pronto', 'enviado', 'entregue', 'cancelado', 'faturado'];
```

**Vendas/Kanban HTML** (`modules/Vendas/public/index.html:5693-5790`):
```
Colunas: orcamento → analise → aprovado → faturar → faturado → recibo
```

**Faturamento** (`modules/Faturamento/api/faturamento.js:110`):
```sql
WHERE p.status = 'aprovado'   -- aceita APENAS este valor
```

**Conflitos identificados:**
| Status no Kanban HTML | Status no backend `api.js` | Aceito pelo Faturamento? |
|----------------------|---------------------------|-------------------------|
| `faturar` | NÃO está nos `statusValidos` | **NÃO** |
| `producao` | Está em `statusValidos` | **NÃO** |
| `pronto` | Está em `statusValidos` | **NÃO** |
| `aprovado` | Está em `statusValidos` | **SIM** (único aceito) |

**O Kanban tem uma coluna "Faturar" (`data-status="faturar"`), mas `'faturar'` NÃO está nos `statusValidos` do backend!** O drag-and-drop para esta coluna pode falhar silenciosamente no backend ou funcionar por uma rota alternativa em `server.js`.

### 4.2 Rota de Faturamento em Vendas (bypass do módulo Faturamento)

**Arquivo:** `modules/Vendas/routes/api.js` (L901-1000)
```javascript
router.post('/pedidos/:id/faturar', authenticateToken, async (req, res) => {
    // Aceita qualquer status exceto 'cancelado' e 'faturado'
    // NÃO verifica se OP foi concluída
    // NÃO verifica se status = 'aprovado'
    // Simplesmente faz: UPDATE pedidos SET status = 'faturado'
});
```

**Achado:** Vendas tem seu PRÓPRIO endpoint de faturamento (`/api/vendas/pedidos/:id/faturar`) que **NÃO gera NF-e, NÃO calcula tributos, NÃO envia à SEFAZ**. Apenas muda o status para `'faturado'` e opcionalmente gera um registro na tabela `financeiro`.

### 4.3 Ausência de Guard "OP Concluída"

**Nenhum código em nenhum módulo valida:** "O pedido tem uma OP associada? Ela está concluída?"

O endpoint `/gerar-nfe` verifica:
- ✅ `pedido.status = 'aprovado'`
- ✅ Pedido tem itens
- ✅ NFe não existe para o pedido
- ✅ Estoque suficiente
- ❌ **NÃO verifica se existe OP**
- ❌ **NÃO verifica se OP está concluída**

---

## DIAGNÓSTICO FINAL — 5 CAUSAS-RAIZ

### RC-1: PCP NÃO ATUALIZA STATUS DO PEDIDO (Causa Principal)

| | |
|---|---|
| **O quê** | Os endpoints de criação/conclusão de OP no PCP nunca executam `UPDATE pedidos SET status` |
| **Onde** | `modules/PCP/server.js` — Linhas 2995-3030, 5294-5420, 5668-5950, 1742-1778 |
| **Impacto** | Pedido fica eternamente em `'aprovado'` (se ninguém moveu no Kanban) ou em `'producao'` (se moveram manualmente) |
| **Severidade** | CRÍTICA |

### RC-2: FATURAMENTO ACEITA APENAS STATUS 'aprovado'

| | |
|---|---|
| **O quê** | O endpoint `POST /gerar-nfe` tem filtro `WHERE p.status = 'aprovado'` hardcoded |
| **Onde** | `modules/Faturamento/api/faturamento.js` — Linha 110 |
| **Impacto** | Se alguém moveu o pedido para `'producao'`, `'faturar'`, ou `'pronto'` no Kanban, NF-e não pode ser gerada NUNCA |
| **Severidade** | ALTA |

### RC-3: TELA MOSTRA APENAS NF-es EXISTENTES, NÃO "PEDIDOS AGUARDANDO"

| | |
|---|---|
| **O quê** | `index.html` do Faturamento busca da tabela `nfe`, não de `pedidos`. Não existe "Fila de Faturamento" |
| **Onde** | `modules/Faturamento/public/index.html` — Linha 231 (`GET /api/faturamento/nfes`) |
| **Impacto** | O empty state "Nenhuma NF-e encontrada" é tecnicamente correto, mas o usuário espera ver pedidos prontos para faturar |
| **Severidade** | ALTA (UX/Navegação) |

### RC-4: DOIS SISTEMAS DE "FATURAMENTO" PARALELOS E DESCONECTADOS

| | |
|---|---|
| **O quê** | PCP tem `programacao_faturamento` + `/api/pcp/faturamentos`. Faturamento tem `nfe` + `/api/faturamento/nfes`. Zero integração |
| **Onde** | `modules/PCP/server.js` L3081-3190 vs `modules/Faturamento/api/faturamento.js` L476-520 |
| **Impacto** | Dados inseridos em um sistema nunca aparecem no outro |
| **Severidade** | ALTA |

### RC-5: AUSÊNCIA DE FK E VÍNCULO CONFIÁVEL ENTRE OP E PEDIDO

| | |
|---|---|
| **O quê** | `ordens_producao.pedido_id` não tem FK, frequentemente NULL. `numero_pedido` é VARCHAR sem validação |
| **Onde** | `modules/PCP/server.js` — Definição de schema L7555-7560 |
| **Impacto** | Impossível fazer rastreio reverso OP→Pedido para atualizar status |
| **Severidade** | MÉDIA |

---

## FLUXO DA FALHA (Reprodução Exata)

```
1. Andreia (Vendas) → Aprova pedido #ABC
   pedidos: { id: ABC, status: 'aprovado' }                    ✅

2. Clemerson (PCP) → Gera OP baseada no pedido #ABC
   ordens_producao: { id: 1, pedido_id: NULL/ABC, status: 'planejada' }
   pedidos: { id: ABC, status: 'aprovado' }                    ⚠️ INALTERADO!
   
   OU: Alguém move no Kanban para 'producao'
   pedidos: { id: ABC, status: 'producao' }                    ⚠️ PRESO!

3. Clemerson → Completa OP
   ordens_producao: { id: 1, status: 'concluida', data_conclusao: NOW() }
   pedidos: { id: ABC, status: 'producao' }                    ⚠️ INALTERADO!

4. Usuário abre tela de Faturamento (modules/Faturamento/public/index.html)
   → fetch('/api/faturamento/nfes')
   → SELECT * FROM nfe → 0 resultados (nenhuma NFe foi gerada)
   → Renderiza: "Nenhuma NF-e encontrada"                      ❌ PROBLEMA VISÍVEL

5. Se tentar gerar NFe via modal (informando pedido_id):
   → POST /gerar-nfe { pedido_id: ABC }
   → SELECT FROM pedidos WHERE id = ABC AND status = 'aprovado'
   → Se status = 'producao': 0 resultados → ERRO!              ❌ BLOQUEADO
   → Se status = 'aprovado': funciona (mas não houve produção)  ⚠️ PULA PCP
```

---

## MAPA DE CORREÇÕES NECESSÁRIAS (Sprint Backlog)

### P0 — BLOQUEADORES IMEDIATOS

| # | Ação | Arquivo | Linha |
|---|------|---------|-------|
| 1 | Ao criar OP com `pedido_id`, fazer `UPDATE pedidos SET status = 'producao'` | `modules/PCP/server.js` | 3015, 5420, 5950 |
| 2 | Ao concluir OP, fazer `UPDATE pedidos SET status = 'faturar'` (ou `'aprovado'`) usando `ordens_producao.pedido_id` | `modules/PCP/server.js` | 1762 |
| 3 | No `/gerar-nfe`, aceitar `status IN ('aprovado', 'faturar', 'pronto')` em vez de `= 'aprovado'` | `modules/Faturamento/api/faturamento.js` | 110 |

### P1 — INTEGRAÇÃO ESTRUTURAL

| # | Ação | Arquivo |
|---|------|---------|
| 4 | Adicionar FK constraint `ordens_producao.pedido_id → pedidos.id` | Migration SQL |
| 5 | Exigir `pedido_id` obrigatório ao criar OP (quando vem de pedido) | `modules/PCP/server.js` |
| 6 | Criar seção "Pedidos Aguardando Faturamento" no index.html do Faturamento (query a `pedidos WHERE status IN ('faturar','pronto')`) | `modules/Faturamento/public/index.html` |
| 7 | Unificar ou deprecar `programacao_faturamento` em favor do módulo Faturamento real | `modules/PCP/server.js` + `producao-faturamento.js` |

### P2 — CONSISTÊNCIA DE VOCABULÁRIO

| # | Ação |
|---|------|
| 8 | Alinhar `statusValidos` do Kanban backend com colunas do Kanban HTML (incluir `'faturar'` nos `statusValidos`) |
| 9 | Criar ENUM ou constante compartilhada para status de pedido, usada por Vendas, PCP e Faturamento |
| 10 | Validar regra de negócio: NFe só pode ser gerada se existir OP concluída vinculada (ou pedido que não requer produção) |

---

## DIAGRAMA DE INTEGRAÇÃO (Estado Atual vs. Desejado)

### ATUAL (Quebrado):
```
┌─────────┐         ┌──────────┐         ┌──────────────┐
│ VENDAS  │         │   PCP    │         │ FATURAMENTO  │
│         │         │          │         │              │
│ pedidos ├────?────┤ ordens_  │    ∅    │    nfe       │
│ (status)│  sem FK │ producao │ ══════ │ (pendente/   │
│         │         │          │ NENHUMA │  autorizada) │
│ Kanban: │         │ programac│ LIGAÇÃO │              │
│ faturar │         │ _fatura- │         │ index.html   │
│         │         │  mento   │         │ mostra SÓ    │
│         │         │ (isolada)│         │ nfe existente│
└─────────┘         └──────────┘         └──────────────┘
```

### DESEJADO (Corrigido):
```
┌─────────┐  FK     ┌──────────┐  status  ┌──────────────┐
│ VENDAS  │────────→│   PCP    │────────→│ FATURAMENTO  │
│         │         │          │          │              │
│ pedidos ├──FK────→┤ ordens_  │ UPDATE   │    nfe       │
│ aprovado│         │ producao │ pedidos  │              │
│    ↓    │         │ pedido_id│ status=  │ index.html:  │
│producao │←────────┤   (FK!)  │'faturar' │ 1. Fila      │
│    ↓    │         │          │    │     │    pedidos   │
│ faturar │←────────┤ concluida│    ↓     │ 2. NFes      │
│    ↓    │         └──────────┘ aceita   │    emitidas  │
│faturado │←────────────────────'faturar' │              │
└─────────┘                               └──────────────┘
```

---

## RESPOSTA ÀS PERGUNTAS DO INCIDENTE

> **O status_id do pedido foi atualizado corretamente após a geração da OP?**  
> **NÃO.** O PCP não executa nenhum UPDATE na tabela `pedidos`. O status permanece inalterado.

> **Ele está em um limbo?**  
> **SIM.** Se alguém moveu no Kanban para `'producao'`, o pedido fica preso nesse status eternamente, pois nenhum código o move de volta.

> **Existe FK faltando?**  
> **SIM.** `ordens_producao.pedido_id` não tem FOREIGN KEY constraint, frequentemente é NULL.

> **A query de faturamento está filtrando incorretamente?**  
> **SIM.** `WHERE p.status = 'aprovado'` é hardcoded. Status `'producao'`, `'faturar'`, `'pronto'` são rejeitados.

> **A API retorna array vazio ou erro 500?**  
> **Array vazio** (`{ success: true, data: [] }`). A query funciona corretamente, mas a tabela `nfe` está vazia porque ninguém gerou NF-e.

> **O sistema usa mensageria?**  
> **NÃO na prática.** Bull está como dependência mas não é instanciado. Socket.io emite notificações visuais sem side effects.

> **Existe validação impeditiva silenciosa?**  
> **SIM.** Duas: (1) Status `'aprovado'` é o único aceito para gerar NF-e; (2) A tela de Faturamento não mostra pedidos pendentes, só NF-es existentes.

> **A tela está projetada para mostrar apenas notas já emitidas?**  
> **SIM.** A tela `modules/Faturamento/public/index.html` é uma listagem de NF-es (`tabela nfe`), não uma fila de trabalho. **Falta uma seção/aba "Pedidos Aguardando Faturamento"** que faça query à tabela `pedidos`.

---

*Relatório gerado por análise estática de código-fonte. Nenhuma alteração foi feita nos arquivos.*
