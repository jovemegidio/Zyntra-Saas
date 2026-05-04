# AUDITORIA DE FLUXO: APONTAMENTOS (PCP) E CENTRAL DE RELATÓRIOS

**Data:** 2026-06  
**Auditor:** GitHub Copilot (Claude Opus 4.6, sessão automatizada)  
**Escopo:** Módulo PCP — Apontamentos de produção, Central de Relatórios, RBAC  
**Tipo:** Read-only — nenhuma correção de código aplicada  

---

## ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Fase 1 — Fluxo do Operador (Apontamentos)](#2-fase-1--fluxo-do-operador-apontamentos)
3. [Fase 2 — Fluxo da Gerência (Relatórios)](#3-fase-2--fluxo-da-gerência-relatórios)
4. [Fase 3 — Controle de Acesso (RBAC)](#4-fase-3--controle-de-acesso-rbac)
5. [Análise de Timezone](#5-análise-de-timezone)
6. [Matriz de Achados por Severidade](#6-matriz-de-achados-por-severidade)
7. [Inventário de Arquivos Auditados](#7-inventário-de-arquivos-auditados)
8. [DEV SPEC — Runner k6 + Smoke Run (2026-03-28)](#8-dev-spec--runner-k6--smoke-run-2026-03-28)

---

## 1. RESUMO EXECUTIVO

| Métrica               | Valor |
|------------------------|-------|
| Achados CRÍTICOS       | 2     |
| Achados ALTOS          | 3     |
| Achados MÉDIOS         | 4     |
| Achados BAIXOS         | 2     |
| Endpoints auditados    | 12    |
| Frontends auditados    | 4     |
| Tabelas envolvidas     | 2     |

### Achados Críticos em 1 frase:
1. **Dois subsistemas de apontamentos coexistem sem relação:** a tabela `apontamentos_producao` (vinculada a OPs) é **orfã de frontend ativo** — o frontend atual (`apontamentos.html`) só alimenta `apontamentos_chao_fabrica`.
2. **Nenhum endpoint de apontamento ou relatório aplica RBAC no servidor** — qualquer usuário autenticado (operador, vendedor, RH) acessa e grava em qualquer rota PCP.

---

## 2. FASE 1 — FLUXO DO OPERADOR (Apontamentos)

### 2.1 Arquitetura Descoberta: Dois Subsistemas Paralelos

O módulo PCP contém **dois sistemas de apontamento independentes e desconectados**:

| Aspecto | Subsistema A: OP-based | Subsistema B: Timer-based (Chão de Fábrica) |
|---------|------------------------|----------------------------------------------|
| **Tabela** | `apontamentos_producao` | `apontamentos_chao_fabrica` |
| **Rota POST** | `POST /api/pcp/apontamentos` | `POST /api/pcp/apontamentos/chao` |
| **Frontend ativo** | ❌ **Nenhum** (`apontamentos_backup.html` existe mas não é linkado) | ✅ `apontamentos.html` |
| **Campos-chave** | `ordem_producao_id`, `etapa_id`, `quantidade_produzida`, `quantidade_refugo`, `maquina`, `turno` | `tipo_atividade`, `nome_atividade`, `hora_inicio`, `hora_fim`, `duracao_segundos`, `pedido_numero` |
| **Trigger** | Submit único de formulário (qtd + tempo) | Cronômetro start/stop em tempo real |
| **Relatório que consome** | `GET /api/pcp/relatorios/metros-produzidos` | `GET /api/pcp/apontamentos/relatorio` |
| **Efeitos colaterais** | Atualiza `etapas_producao`, `ordens_producao` (progresso, status) | Emite Socket.IO `pcp-atividade-iniciada` |

### 2.2 ACHADO CRÍTICO #1 — Tabela `apontamentos_producao` Orfã

**Servidor:** `modules/PCP/server.js` linhas 8242-8320  
**Rota:** `POST /api/pcp/apontamentos`  

O endpoint existe e funciona (validação + INSERT + UPDATE cascata em etapas/OPs), mas:
- O frontend ativo `apontamentos.html` chama `POST /api/pcp/apontamentos/chao` (tabela diferente)
- O antigo `apontamentos_backup.html` era o frontend correto para esta rota, mas está desconectado do sistema (sem link no sidebar/menu)
- A página `ordens-producao.html` tem CSS de modal de apontamento (`.modal-apontamento-saas`, `.apontamento-btn`) mas **nenhuma chamada fetch ao endpoint**

**Impacto:** A tabela `apontamentos_producao` não recebe dados novos. Relatórios que a consultam (`metros-produzidos`) mostram dados obsoletos ou zerados.

### 2.3 Fluxo Ativo: Operador → `apontamentos_chao_fabrica`

**Frontend:** `modules/PCP/apontamentos.html`

```
[Operador abre apontamentos.html]
    → GET /api/me (carrega user info)
    → GET /api/pcp/apontamentos/meus?data=YYYY-MM-DD (histórico do dia)
    → [Seleciona atividade (17 tipos: ST, 1, 1A, PR, PM, FM, ...)]
    → [Pressiona play → cronômetro local inicia]
    → POST /api/pcp/notificar-atividade (broadcast Socket.IO)
    → [Operador trabalha...]
    → [Pressiona stop → cronômetro para]
    → POST /api/pcp/apontamentos/chao {
        tipo_atividade, nome_atividade,
        hora_inicio (ISO), hora_fim (ISO),
        duracao_segundos, pedido_numero, produto_descricao, observacoes
      }
    → INSERT INTO apontamentos_chao_fabrica
    → [Atualiza histórico local]
```

**Validação de dados no servidor (linha 8875):**
- ✅ `tipo_atividade` e `nome_atividade` required
- ⚠️ `pedido_numero` aceita string livre (sem validação de existência)
- ⚠️ `produto_descricao` aceita string livre
- ⚠️ `duracao_segundos` não é validado (aceita 0 ou negativo implicitamente)

### 2.4 Offline Support

O frontend implementa um **Offline Queue Manager** (`/js/offline-sync-manager.js`):
- Se `!navigator.onLine || resp.status >= 500`: enfileira como retry com prioridade 1
- Sincroniza quando rede restaurada
- **Risco:** Se o operador fizer logout antes da sync, dados ficam em `localStorage` do navegador

---

## 3. FASE 2 — FLUXO DA GERÊNCIA (Relatórios)

### 3.1 Duas Páginas de Relatórios

| Página | Abas/Reports | Tipo de Dados |
|--------|-------------|---------------|
| `pages/relatorios.html` (Central) | 5 abas: Cabos Vendidos, Ranking Vendas, Metros Produzidos, Faturamento, **Apontamentos** | Mix de tabelas |
| `relatorios-apontamentos.html` (Dedicada) | 1 relatório: Apontamentos | Apenas `apontamentos_chao_fabrica` |

### 3.2 Central de Relatórios: `pages/relatorios.html`

**Endpoints consumidos e suas fontes de dados:**

| Endpoint | Fonte SQL | Tabela(s) |
|----------|-----------|-----------|
| `GET /api/pcp/relatorios/cabos-mais-vendidos` | pedidos/produtos | `pedidos`, `pedidos_items`, `pedidos_produtos` |
| `GET /api/pcp/relatorios/ranking-vendas` | pedidos | `pedidos` |
| `GET /api/pcp/relatorios/metros-produzidos` | apontamentos + ordens | `apontamentos_producao` ⚠️ + `ordens_producao` |
| `GET /api/pcp/relatorios/faturamento-mensal` | pedidos | `pedidos` |
| `GET /api/pcp/apontamentos/relatorio` | chão de fábrica | `apontamentos_chao_fabrica` |

### 3.3 ACHADO ALTO — Relatório "Metros Produzidos" Usa Tabela Orfã

**Servidor:** `modules/PCP/server.js` linhas 8595-8660  
**Rota:** `GET /api/pcp/relatorios/metros-produzidos`  

Este relatório executa:
```sql
SELECT DATE(ap.data_apontamento) as data,
       SUM(ap.quantidade_produzida) as quantidade_produzida, ...
FROM apontamentos_producao ap
WHERE ap.data_apontamento BETWEEN ? AND ?
```

Porém **nenhum frontend ativo insere em `apontamentos_producao`** (ver Achado Crítico #1). O relatório retornará resultados zerados ou de dados legados.

### 3.4 Análise de Filtros — Rota de Apontamentos

**Rota:** `GET /api/pcp/apontamentos/relatorio`  
**Tabela:** `apontamentos_chao_fabrica`

| Filtro | Parâmetro | SQL gerado | Funciona? |
|--------|-----------|-----------|-----------|
| Período | `dataInicio`, `dataFim` | `data BETWEEN ? AND ?` | ✅ |
| Funcionário | `usuario` | `usuario_id = ?` | ⚠️ Envia ID mas frontend usa `select` populado por dados do período — pode envidar string vazia |
| Atividade | `atividade` | `tipo_atividade = ?` | ✅ |
| Pedido | `pedido` | `pedido_numero LIKE ?` | ✅ (com wildcard `%pedido%`) |

**Default de datas (server-side — linha 8959):**
```javascript
const inicio = dataInicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const fim = dataFim || new Date().toISOString().split('T')[0];
```
- Default: primeiro dia do mês corrente até hoje
- ⚠️ `new Date().getFullYear()` roda no timezone do servidor (VPS provavelmente UTC), não no timezone do usuário

### 3.5 ACHADO MÉDIO — Filtro de Funcionário Não Implementado na Central

**Página:** `pages/relatorios.html`  

A Central de Relatórios monta a URL:
```javascript
let url = `/api/pcp/apontamentos/relatorio?dataInicio=${dataInicio}&dataFim=${dataFim}`;
if (funcionario) url += `&usuario=${funcionario}`;
```

Porém o dropdown de funcionários é populado com dados **retornados pela mesma API**:
```json
{ "funcionarios": [{ "id": 123, "nome": "João" }] }
```

Se o filtro muda para um período sem dados, a lista de funcionários volta vazia, tornando impossível filtrar por funcionário em períodos anteriores.

### 3.6 ACHADO MÉDIO — Duplicidade de Páginas de Relatório

`relatorios-apontamentos.html` e a aba "Apontamentos" em `pages/relatorios.html` chamam o **mesmo endpoint** (`/api/pcp/apontamentos/relatorio`), mas:
- `relatorios-apontamentos.html` tem role check client-side (redireciona operadores)
- `pages/relatorios.html` **NÃO** faz role check algum (qualquer autenticado vê)

Operadores redirecionados de `relatorios-apontamentos.html` podem acessar `pages/relatorios.html` diretamente.

### 3.7 ACHADO MÉDIO — Tipos de Atividade Não Classificados

No frontend `relatorios-apontamentos.html`, a eficiência é calculada usando:
```javascript
const TIPOS_PRODUTIVOS = ['1', '1A', 'produção'];
const TIPOS_MANUTENCAO = ['PM', 'ME', 'MM', 'PCM', 'MP', 'MC', 'manutencao'];
const TIPOS_PARADA = ['PR', 'FM', 'TT', 'QE', 'TB', 'TM', 'QL', 'intervalo'];
```

**Não classificados:** `ST` (Setup) e `AM` (Aquecimento de Máquina) **não pertencem a nenhuma categoria**. O tempo gasto nessas atividades desaparece do cálculo de eficiência, distorcendo os indicadores.

### 3.8 Exportação CSV

| Aspecto | Status |
|---------|--------|
| BOM UTF-8 | ✅ (`\ufeff` para compatibilidade Excel) |
| Escape de aspas | ✅ Duplo-quote em campos texto |
| Colunas | Funcionário, Atividade, Data, Início, Fim, Duração, OP, Pedido, Observações |
| Coluna OP | ⚠️ Sempre `null` (campo `op_codigo` retorna `NULL as op_codigo` do servidor) |

---

## 4. FASE 3 — CONTROLE DE ACESSO (RBAC)

### 4.1 Arquitetura de Autenticação

```
[Request] → authenticateToken (JWT verify) → [Route Handler]
                                          OR
[Request] → authenticateToken → requireProductionRole('ADMIN', ...) → [Route Handler]
```

**`authenticateToken`** (alias `authRequired`): Apenas verifica se o token JWT é válido. Não verifica cargo/role.

**`requireProductionRole(...categories)`**: Verifica roles usando `PRODUCTION_ROLES`:
```javascript
const PRODUCTION_ROLES = {
    ADMIN:      ['admin', 'administrador', 'ti', 'diretoria'],
    SUPERVISOR: ['supervisor', 'gerente', 'coordenador'],
    PCP:        ['pcp', 'analista', 'planejador'],
    OPERATOR:   ['operador', 'producao', 'chao_fabrica'],
    VIEWER:     ['visualizador', 'consulta']
};
```

### 4.2 ACHADO CRÍTICO #2 — RBAC Ausente em Rotas de Dados

**Inventário completo de uso de `requireProductionRole` no servidor:**

| Rota | Middleware | RBAC? |
|------|-----------|-------|
| `DELETE /api/pcp/ordens/:id` | `authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP')` | ✅ |
| `DELETE /api/pcp/produtos/:id` | `authRequired, requireProductionRole('ADMIN', 'SUPERVISOR')` | ✅ |
| `DELETE /api/pcp/materiais/:id` | `authRequired, requireProductionRole('ADMIN', 'SUPERVISOR')` | ✅ |
| `DELETE /api/pcp/maquinas/:id` | `authRequired, requireProductionRole('ADMIN')` | ✅ |
| `GET /internal-debug` | `authRequired, requireProductionRole('ADMIN')` | ✅ |
| `GET /api/pcp/debug/pedidos-faturados` | `authRequired, requireProductionRole('ADMIN')` | ✅ |
| **`POST /api/pcp/apontamentos`** | **`authRequired`** | ❌ |
| **`POST /api/pcp/apontamentos/chao`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/apontamentos/meus`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/apontamentos/relatorio`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/relatorios/cabos-mais-vendidos`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/relatorios/ranking-vendas`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/relatorios/metros-produzidos`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/relatorios/faturamento-mensal`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/apontamentos/stats`** | **`authRequired`** | ❌ |
| **`GET /api/pcp/ordens/:id/apontamentos`** | **`authRequired`** | ❌ |

**O middleware `requireProductionRole` é aplicado SOMENTE em operações DELETE e rotas de debug.**

**Rotas de apontamento (criação e leitura) e TODOS os relatórios são acessíveis por qualquer usuário autenticado**, incluindo vendedores, RH, financeiro — bastando ter um JWT válido.

### 4.3 ACHADO ALTO — Role Check Client-Side Contornável

`relatorios-apontamentos.html` implementa um gate no frontend:
```javascript
const rolesPermitidas = ['admin', 'administrador', 'supervisor', 'gerente',
                          'diretoria', 'ti', 'pcp', 'consultoria'];
const deptPermitidos = ['ti', 'pcp', 'diretoria', 'administração', 'gerência'];

if (!temRole && !temDept && !temEmail && !temPermPcp) {
    window.location.href = 'apontamentos.html'; // Redireciona operador
    return;
}
```

Este check é **puramente cosmético** — um operador pode:
1. Abrir DevTools, bloquear o redirect
2. Acessar `pages/relatorios.html` (que NÃO tem esse check)
3. Chamar `GET /api/pcp/apontamentos/relatorio` diretamente via curl/Postman

### 4.4 ACHADO ALTO — Endpoint `/meus` Sem Filtro Obrigatório por Usuário

**Rota:** `GET /api/pcp/apontamentos/meus`  
**Servidor:** linhas 8920-8955

```javascript
if (userId) {
    query += ' AND usuario_id = ?';
    params.push(userId);
} else if (userName) {
    query += ' AND usuario_nome = ?';
    params.push(userName);
}
```

Se `req.user` não tiver `id` nem `nome` (JWT malformado com campos faltantes), a query retorna **todos os apontamentos de todos os operadores** daquela data, sem filtro de usuário.

---

## 5. ANÁLISE DE TIMEZONE

### 5.1 Fluxo de Dados de Tempo

```
[Navegador São Paulo UTC-3]
  → hora_inicio: new Date().toISOString()  →  "2026-06-15T02:30:00.000Z" (UTC)
  → data (calculada no servidor): hora_inicio.split('T')[0]  →  "2026-06-15"
  
[Navegador São Paulo UTC-3 · 23:30 local = 02:30 UTC do dia seguinte]
  → hora_inicio: "2026-06-16T02:30:00.000Z"
  → data: "2026-06-16" ← DIVERGE do dia local (15 de junho)
```

### 5.2 ACHADO MÉDIO — Data do Apontamento Calculada em UTC no Servidor

**Servidor:** `POST /api/pcp/apontamentos/chao` (linha 8886)
```javascript
const dataApontamento = hora_inicio
    ? new Date(hora_inicio).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
```

A coluna `data` (usada em todos os filtros de relatório) é derivada da data UTC, não da data local do operador. Para operadores no turno da noite (ex: 22h-06h BRT), apontamentos após meia-noite UTC (21h BRT) serão registados no dia seguinte.

**Impacto concreto:**
- Operador do turno noturno (22h-06h BRT) trabalha no dia 15/06
- Apontamentos feitos entre 21h-00h BRT (00h-03h UTC do dia 16) terão `data = 2026-06-16`
- Consulta `GET /meus?data=2026-06-15` não mostrará esses registros
- Relatório filtrado por "15/06" não incluirá essas horas

### 5.3 Default de Datas no Relatório

| Local | Código | Timezone |
|-------|--------|----------|
| Frontend (filtro) | `new Date().toISOString().split('T')[0]` | UTC |
| Server (fallback) | `new Date().toISOString().split('T')[0]` | UTC (node process) |
| Servidor (coluna data) | `NOW()` / `CURDATE()` em algumas queries stats | Timezone do MySQL |

Se o MySQL estiver em timezone diferente do Node (ex: MySQL em `-03:00`, Node em UTC), as funções SQL `CURDATE()` e `NOW()` produzirão datas diferentes das calculadas em JavaScript.

---

## 6. MATRIZ DE ACHADOS POR SEVERIDADE

### 🔴 CRÍTICO

| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| C1 | Tabela `apontamentos_producao` orfã: frontend ativo alimenta apenas `apontamentos_chao_fabrica` | `server.js:8242` / `apontamentos.html` | Dados de OP sem alimentação; relatório "metros produzidos" retorna zeros |
| C2 | RBAC server-side ausente em rotas de apontamento e relatórios | `server.js:8866,8920,8956,8595` etc. | Qualquer usuário autenticado (vendedor, RH, etc.) pode criar apontamentos e ver relatórios PCP |

### 🟠 ALTO

| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| A1 | Relatório "Metros Produzidos" consulta tabela sem dados novos | `server.js:8612` | Dashboard mostra produção zerada ou desatualizada |
| A2 | Role check em `relatorios-apontamentos.html` é client-side only | `relatorios-apontamentos.html` ~L1220 | Contornável via DevTools ou acesso direto a `pages/relatorios.html` |
| A3 | `/meus` retorna todos os registros se user sem id/nome | `server.js:8935-8940` | Vazamento de dados de outros operadores |

### 🟡 MÉDIO

| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| M1 | Data UTC diverge da data local para turnos noturnos | `server.js:8886` | Apontamentos aparecem no dia errado no relatório |
| M2 | Dropdown de funcionários depende dos dados do período filtrado | `server.js:8996` / `relatorios-apontamentos.html` | Impossível filtrar por funcionário em período sem dados |
| M3 | Atividades ST e AM não classificadas no cálculo de eficiência | `relatorios-apontamentos.html` | Indicadores de eficiência distorcidos (tempo não contabilizado) |
| M4 | Duplicidade de páginas de relatório com controles de acesso inconsistentes | `relatorios-apontamentos.html` vs `pages/relatorios.html` | Confusão de UX + bypass de controle |

### 🟢 BAIXO

| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| B1 | Coluna OP sempre `null` no relatório de apontamentos | `server.js:8990` (`NULL as op_codigo`) | Coluna vazia na tabela e no export CSV |
| B2 | `duracao_segundos` não validado (aceita 0/negativo) | `server.js:8899` | Registro de duração inválida possível |

---

## 7. INVENTÁRIO DE ARQUIVOS AUDITADOS

### Backend
| Arquivo | Linhas Auditadas | Descrição |
|---------|-----------------|-----------|
| `modules/PCP/server.js` | 427-475, 8088-8350, 8580-8680, 8830-9030 | RBAC, apontamentos_producao (POST/GET), relatórios, apontamentos_chao_fabrica (POST/GET/relatório) |

### Frontend
| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `modules/PCP/apontamentos.html` | ✅ Ativo | Cronômetro chão de fábrica → `POST /chao` |
| `modules/PCP/relatorios-apontamentos.html` | ✅ Ativo | Relatório dedicado com role check client-side |
| `modules/PCP/pages/relatorios.html` | ✅ Ativo | Central de 5 relatórios sem role check |
| `modules/PCP/apontamentos_backup.html` | ❌ Desconectado | Único frontend para `POST /api/pcp/apontamentos` (tabela producao) |
| `modules/PCP/ordens-producao.html` | ✅ Ativo | Tem CSS/modal de apontamento mas sem fetch (dead UI) |

### Tabelas MySQL
| Tabela | CREATE TABLE em | Fonte de Dados Ativa | Relatórios que Consomem |
|--------|----------------|---------------------|------------------------|
| `apontamentos_chao_fabrica` | `server.js:8840` (auto-create) | ✅ `apontamentos.html` → `POST /chao` | `GET /apontamentos/relatorio`, `GET /apontamentos/meus` |
| `apontamentos_producao` | Manual/migração | ❌ **Nenhum frontend ativo** | `GET /relatorios/metros-produzidos`, `GET /apontamentos/stats`, `GET /ordens/:id/apontamentos` |

---

## RECOMENDAÇÕES PRIORIZADAS (Não implementadas — apenas documentadas)

1. **[C1+C2] Decisão arquitetural necessária:** Decidir se `apontamentos_producao` será reativado (reconectar `apontamentos_backup.html` ou integrar em `ordens-producao.html`) ou se `apontamentos_chao_fabrica` é o sistema definitivo (e migrar dados + relatórios).

2. **[C2] Aplicar `requireProductionRole` nas rotas:**
   - `POST /api/pcp/apontamentos/chao` → `requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP', 'OPERATOR')`
   - `GET /api/pcp/apontamentos/relatorio` → `requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP')`
   - `GET /api/pcp/relatorios/*` → `requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP', 'VIEWER')`

3. **[A3] Forçar filtro de usuário em `/meus`:** Se `!userId && !userName`, retornar `[]` em vez de query sem filtro.

4. **[M1] Usar timezone local no cálculo de `data`:** Receber timezone do frontend ou configurar a VPS para `America/Sao_Paulo`.

5. **[M3] Classificar ST e AM:** Incluir `ST` em `TIPOS_PARADA` e `AM` em `TIPOS_PARADA` ou criar `TIPOS_PREPARACAO`.

---

## 8. DEV SPEC — Runner k6 + Smoke Run (2026-03-28)

### 8.1 Infraestrutura de Teste Criada

| Artefato | Caminho | Descrição |
|----------|---------|-----------|
| Script k6 | `tests/perf/pcp-devspec.k6.js` | 8 cenários DEV SPEC, métricas customizadas |
| Runner PowerShell | `scripts/run-pcp-devspec-k6.ps1` | Fallback triplo: k6 local → Docker → download portátil |
| Binário k6 | `.tools/k6/k6.exe` | k6 v0.49.0 Windows x64, provisionado automaticamente |
| npm script (local) | `test:perf:pcp:k6:local` | `BaseUrl=http://localhost:3001` |
| npm script (custom) | `test:perf:pcp:k6` | Parâmetros via `-BaseUrl`, `-AuthBearer`, etc. |

**Nota de porta:** O PCP server escuta em **3001** (`PORT_PCP=3001`) por padrão, separado do servidor principal (3000). O script k6 e o npm script `:local` já foram corrigidos para usar 3001.

### 8.2 Cenários DEV SPEC Configurados

| ID | Cenário | Executor | VUs | Foco |
|----|---------|----------|-----|------|
| V1 | `fat_payload_op_colossal` | shared-iterations | 1 | OP com 5.000 itens — payload > 500 KB |
| V2 | `pdf_stress_50_concurrent` | shared-iterations | 1 | 50 PDFs simultâneos |
| V3 | `report_tsunami_5y` | shared-iterations | 1 | Relatório sem paginação / limit colossal |
| C1 | `race_choque_apontamentos` | shared-iterations | 1 | 5 apontamentos simultâneos (> qtd OP) |
| C2 | `race_status_vs_apontamento` | shared-iterations | 1 | PATCH status em paralelo com POST apontamento |
| C3 | `idempotencia_duplo_clique` | shared-iterations | 1 | 10 POSTs idênticos em 1s |
| CH1 | `caos_transacao_zumbi` | shared-iterations | 1 | Timeout no meio da transação |
| CH2 | `caos_rehidratacao_offline` | shared-iterations | 1 | Payload offline reenviado após reconexão |

### 8.3 Primeiro Run Real — Smoke (2026-03-28, servidor offline)

**Condição:** Backend PCP **não estava em execução**. Todos os 74 HTTP requests retornaram `connection refused`.  
**Ferramenta:** k6 v0.49.0 portable (`.tools/k6/k6.exe`)  
**Duração total:** ~37 segundos  
**Summary gerado:** `tests/perf/pcp-devspec-summary-smoke.json`

#### Resultado dos Checks por Grupo

| Grupo | Check | Passes | Fails | Observação |
|-------|-------|--------|-------|------------|
| V1 — OP Colossal | V1 respondeu (201/400/413/422) | 0 | 1 | connection refused |
| V1 — OP Colossal | **V1 sem timeout de socket** | **1** | 0 | k6 trata ECONNREFUSED antes do socket timeout |
| V2 — PDF Stress | V2 pelo menos 1 PDF respondeu | 0 | 1 | connection refused |
| V2 — PDF Stress | **V2 lote processado sem colapso total** | **1** | 0 | limiar aceitável para colapso: 50% falhas |
| V3 — Tsunami | V3 sem paginação retorna 400 | 0 | 1 | connection refused |
| V3 — Tsunami | V3 limit=100000 retorna 400 | 0 | 1 | connection refused |
| V3 — Tsunami | V3 page/limit válidos não quebram | 0 | 1 | connection refused |
| C1 — Race Apontamentos | C1 pelo menos 1 sucesso | 0 | 1 | connection refused |
| C1 — Race Apontamentos | C1 bloqueia excedente (≥1 conflito) | 0 | 1 | connection refused |
| C1 — Race Apontamentos | **C1 não aceita todas as 5** | **1** | 0 | 0 aceitos < 5 (trivialmente verdadeiro) |
| C2 — Status vs Apontamento | **C2 status responde sem timeout** | **1** | 0 | ECONNREFUSED < socket timeout |
| C2 — Status vs Apontamento | **C2 apontamento responde sem timeout** | **1** | 0 | ECONNREFUSED < socket timeout |
| C2 — Status vs Apontamento | C2 ao menos um resultado válido (200/409) | 0 | 1 | connection refused |
| C3 — Duplo Clique | **C3 ideal: no máximo 1 criação** | **1** | 0 | 0 criações < 1 (trivialmente verdadeiro) |
| CH1 — Transação Zumbi | **CH1 request terminou** | **1** | 0 | ECONNREFUSED termina imediatamente |
| CH2 — Rehidratação | CH2 primeira tentativa respondeu | 0 | 1 | connection refused |
| CH2 — Rehidratação | CH2 segunda tentativa respondeu | 0 | 1 | connection refused |
| CH2 — Rehidratação | CH2 ideal: segunda rejeitada como 409 | 0 | 1 | connection refused |

**Resumo:** 7 passes / 11 fails — todos os passes são artefatos de lógica do teste (connection refused não é socket timeout / 0 aceitos ≤ 1 criação). **Nenhum comportamento real do servidor foi observado.**

#### Findings Registrados (contexto: server offline)

| Finding | Trigger | Status |
|---------|---------|--------|
| `V3_PAGINATION_BYPASS` | `status !== 400` para requisição sem paginação | ⚠️ Requer run com server ON para validar |
| `C1_RACE_NOT_BLOCKED` | Nenhum 409/422 retornado | ⚠️ Requer run com server ON |
| `CH1_TIMEOUT_TRIGGERED` | Timeout de socket excedido | ⚠️ Requer run com server ON |
| `CH2_DUPLICATE_ACCEPTED` | Segunda tentativa não recebeu 409 | ⚠️ Requer run com server ON |

#### Exit code: 99
Thresholds `http_req_failed < 5%` e `pcp_step_ok_rate > 0.90` violados — esperado com backend offline.

### 8.4 Próximos Passos — Execução Real

#### Pré-requisitos
1. Criar `modules/PCP/.env` a partir de `modules/PCP/.env.example` com credenciais do banco
2. Instalar dependências: `npm install` na raiz do projeto
3. Subir o PCP server: `node modules/PCP/server.js` (escuta em **:3001**)
4. Obter um JWT válido (login em `/api/login`) e copiar o token

#### Comando local (JWT como bearer)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-pcp-devspec-k6.ps1 `
  -BaseUrl     "http://localhost:3001" `
  -AuthBearer  "<TOKEN_JWT>" `
  -OpId        <ID_OP_REAL> `
  -EtapaId     <ID_ETAPA_REAL> `
  -OrdemCompraId <ID_OC_REAL>
```

#### Atalho npm (usa defaults: localhost:3001, sem auth)
```bash
npm run test:perf:pcp:k6:local
```

#### Comando contra produção/staging
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-pcp-devspec-k6.ps1 `
  -BaseUrl     "https://<vps-host>" `
  -AuthBearer  "<TOKEN_JWT_PRODUCAO>" `
  -OpId        <ID_OP_VALIDO> `
  -EtapaId     <ID_ETAPA_VALIDA> `
  -OrdemCompraId <ID_OC_VALIDO> `
  -SummaryOut  "tests/perf/pcp-devspec-summary-prod.json"
```

#### Sinais de sucesso esperados no run real
- Exit code **0** ou **99** (99 = comportamento detectado mas threshold cruzado — aceitável)
- V3 → server retorna 400 para requisições sem paginação: confirma proteção implementada
- C1 → ao menos 1 de 5 apontamentos retorna 409/422: confirma `FOR UPDATE` funcionando
- C3 → 0 ou 1 criação (não 10): confirma idempotência ou gargalo de DB
- CH2 → segunda tentativa retorna 409: confirma dedup por chave única

---

## 9. TESTE DE SATURAÇÃO — Condição de Corrida (2026-03-28)

### 9.1 Cenário: 50 VUs × 200 Apontamentos em Janela de 30s

Script dedicado: `tests/perf/pcp-race-saturacao.k6.js`  
npm script: `test:perf:pcp:k6:race`

Este é um teste de **saturação pura** — diferente do DEV SPEC metodical da Seção 8, aqui o objetivo é **inundar o endpoint com máxima concorrência** para detectar deadlocks, crashes e overshoot de quantidade.

| Parâmetro | Valor |
|-----------|-------|
| VUs | 50 |
| Iterações totais | 200 |
| Janela máxima | 30s |
| Endpoint | `POST /api/pcp/apontamentos` |
| Tabela | `apontamentos_producao` |

### 9.2 Tradução do Cenário Original para o Sistema Real

| Campo do Script Original | Situação no Sistema Real |
|--------------------------|--------------------------|
| `status 201` (sucesso) | ❌ Servidor retorna **200**, não 201 — `res.json({success:true})` sem `.status(201)` |
| `tempo_gasto_minutos` | ❌ Campo inexistente — servidor usa `tempo_producao` (mesma semântica, outro nome) |
| `data_apontamento` | ❌ Ignorado — servidor usa `NOW()` internamente, não aceita data do cliente |
| `ordem_producao_id: 'OP-998877'` | ❌ Deve ser **inteiro** (`Number`) — coluna FK na tabela é INT |
| **`etapa_id` ausente** | ❌ OBRIGATÓRIO — sem ele **100% das requests retornam 400** imediatamente |
| `X-Idempotency-Key` | ⚠️ Silenciosamente ignorado — servidor não implementa dedup por este header |

### 9.3 Métricas Customizadas

| Métrica | Tipo | Significado |
|---------|------|-------------|
| `pcp_race_inserts_ok` | Counter | Apontamentos aceitos (200) |
| `pcp_race_blocked_limit` | Counter | Bloqueados por limite/status (409) |
| `pcp_race_server_errors` | Counter | Crashes (5xx) — deve ser **0** |
| `pcp_race_no_crash_rate` | Rate | Taxa de requests sem 5xx — threshold: **100%** |
| `pcp_race_req_duration_ms` | Trend | Latência por request — threshold p(95) < 2000ms |

### 9.4 Checks por Request

| Check | Aprovação | O que testa |
|-------|-----------|-------------|
| `Status é 200 (Apontamento Inserido)` | `r.status === 200` | FOR UPDATE liberou e INSERT ocorreu |
| `Status é 409/422 (Bloqueado por Limite/Status da OP)` | `r.status === 409 \|\| 422` | OP cancelada ou qtd_prevista excedida |
| `NUNCA deve retornar 500 (Deadlock/Crash)` | `r.status !== 500` | Ausência de deadlock/exceção não tratada |
| `Tempo de resposta aceitável (< 500ms)` | `r.timings.duration < 500` | Latência sob carga real |
| `X-Idempotency-Key processado` | `r.status === 409 && header presente` | Detecta se server implementa dedup — **esperado falhar** |

### 9.5 Interpretação dos Resultados Esperados

```
Se quantidade_prevista da etapa = 100  e  10 unidades/request:
  Requests 1–10  → 200 (aceitos)     ← qtd acumulada chega a 100
  Requests 11–200 → 409             ← "Apontamento excede limite da etapa"

Distribuição saudável com 50 VUs:
  Mix de 200+409 = FOR UPDATE funcionando
  Nenhum 500     = Sem deadlock (MySQL limpa a transa ção do lado perdedor)
  Nenhum registro duplicado além do esperado = consistência garantida
```

**Finding esperado:** `X-IDEMPOTENCY-KEY-NOT-IMPLEMENTED` — o servidor não processa o header `X-Idempotency-Key`; cada request com mesmo payload gera INSERT independente enquanto a OP tiver quota.

### 9.6 Execução do Teste de Saturação

```powershell
# Mínimo necessário (servidor local sem auth)
npm run test:perf:pcp:k6:race

# Com auth e IDs reais
powershell -ExecutionPolicy Bypass -File scripts/run-pcp-devspec-k6.ps1 `
  -TestScript    "tests/perf/pcp-race-saturacao.k6.js" `
  -BaseUrl       "http://localhost:3001" `
  -AuthBearer    "<JWT_OPERATOR_ROLE>" `
  -OpId          <ID_OP> `
  -EtapaId       <ID_ETAPA> `
  -QtdPorReq     10
```

**Sumário gerado em:** `tests/perf/pcp-race-saturacao-summary.json`

---

*Fim do relatório de auditoria.*
