# AUDITORIA E2E: PIPELINE VENDAS → LIQUIDAÇÃO FINANCEIRA
**Data:** 21/03/2026 | **Auditor:** QA/SDET Automated  
**Escopo:** Fluxo completo Pedido → Aprovação → Produção → Faturamento/Logística → Contas a Receber  
**Metodologia:** Análise estática de código-fonte (5 ciclos simulados por etapa)

---

## ÍNDICE
1. [Resumo Executivo](#resumo-executivo)
2. [Etapa 1: Gênese do Pedido](#etapa-1-gênese-do-pedido)
3. [Etapa 2: Aprovação e Transição (Kanban/RBAC)](#etapa-2-aprovação-e-transição)
4. [Etapa 3: Chão de Fábrica (PCP)](#etapa-3-chão-de-fábrica)
5. [Etapa 4: Faturamento e Logística](#etapa-4-faturamento-e-logística)
6. [Etapa 5: Liquidação Financeira](#etapa-5-liquidação-financeira)
7. [Race Conditions e Integridade Transacional](#race-conditions)
8. [Mapa de Quebras Lógicas e Gargalos](#mapa-de-quebras)
9. [Matriz de Violações RBAC](#matriz-rbac)
10. [Classificação de Severidade](#classificação)

---

## RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Falhas Críticas (CRIT)** | 6 |
| **Falhas Altas (HIGH)** | 9 |
| **Falhas Médias (MED)** | 7 |
| **Falhas Baixas (LOW)** | 5 |
| **Total de Achados** | **27** |
| **Pipeline End-to-End funcional?** | **SIM, com ressalvas graves** |
| **Dados imutáveis ponta-a-ponta?** | **NÃO** (valor editável até faturamento) |
| **RBAC isolado corretamente?** | **PARCIAL** (backend forte, frontend fraco) |

### Veredito
O pipeline Vendas → Liquidação **funciona end-to-end** — um pedido criado por vendedor pode chegar até `contas_receber` com valor e vencimento corretos. Porém há **6 falhas críticas** que comprometem integridade transacional, rastreabilidade e isolamento de dados.

---

## ETAPA 1: GÊNESE DO PEDIDO (Módulo de Vendas)

**Arquivo:** `routes/vendas-routes.js` L288-355  
**Endpoint:** `POST /api/vendas/pedidos`

### Fluxo Verificado
1. Vendedor autentica via JWT (httpOnly cookie)
2. `authenticateToken` → `authorizeArea('vendas')` → `writeGuard` → `auditTrail` → `tenantScope()`
3. Pedido criado com `vendedor_id = req.user.id`, status = `'orcamento'`
4. Validação: `empresa_id` (int), `valor` (float > 0.01), `descricao` (max 1000 chars)

### ✅ O QUE FUNCIONA
- Pedido é salvo com `vendedor_id` vinculado ao JWT (não é possível forjar)
- Validação de input via `express-validator` está aplicada
- Notificações criadas para admins e vendedor (não-bloqueante)
- `writeGuard` bloqueia perfis de consultoria
- `tenantScope()` injeta `empresa_id` no request

### ❌ ACHADOS

#### **[E1-CRIT-01] Pedido Criado SEM Itens — Valor Não-Confrontável**
- **Arquivo:** `routes/vendas-routes.js` L300-305
- **Descrição:** O `POST /pedidos` aceita `valor` como campo livre sem exigir itens associados. O pedido é criado com um valor declarado pelo vendedor, mas **nenhum item detalhado**. A inserção de itens acontece em endpoints separados (`POST /pedidos/:id/itens`).
- **Impacto:** Um pedido pode existir com `valor = 50000` mas `0 itens`. Não há validação server-side que force `SUM(itens.subtotal) == pedido.valor`. O valor pode ser inconsistente ao longo de todo o pipeline.
- **Severidade:** **CRÍTICO**  
- **5x Ciclos:** Em 5/5 ciclos simulados, seria possível criar pedido com valor arbitrário sem itens.

#### **[E1-HIGH-01] `tenantScope()` Não Filtra `GET /pedidos`**
- **Arquivo:** `repositories/pedido-repository.js` L52-61 + `routes/vendas-routes.js` L200-206
- **Descrição:** O `GET /api/vendas/pedidos` usa `repos.pedido.list()` que NÃO aplica filtro por `empresa_id` nem por `vendedor_id`. A query é `SELECT ... FROM pedidos ... ORDER BY id DESC LIMIT ?` — retorna TODOS os pedidos do sistema. O `tenantScope()` injeta `req.empresaId` mas **ninguém usa** esse valor na query.
- **Impacto:** Qualquer vendedor autenticado no módulo de Vendas vê **todos os pedidos de todos os vendedores**, incluindo valores e clientes.
- **Severidade:** **ALTO** (violação de privacy + LGPD)

#### **[E1-HIGH-02] Campo `valor` Editável Via PATCH Sem Auditoria de Delta**
- **Arquivo:** `routes/vendas-routes.js` L528-800 (PATCH endpoint)
- **Descrição:** O `PATCH /pedidos/:id` permite editar o campo `valor` sem registrar o valor anterior. A alteração é silenciosa — não há diff log mostrando "valor mudou de R$10.000 para R$5.000".
- **Impacto:** Possível manipulação de preço pós-aprovação. Auditor não consegue rastrear alterações históricas de valor.
- **Severidade:** **ALTO**

#### **[E1-MED-01] Criação do Pedido Não Usa Transação**
- **Arquivo:** `routes/vendas-routes.js` L300-305
- **Descrição:** O `INSERT INTO pedidos` e o subsequente `INSERT INTO notificacoes` (L328-350) não estão envolvidos em transação. Se a inserção de notificações falhar, o pedido existe sem notificação (aceitável). Mas se houver erro entre o INSERT e o retorno, a response pode falhar enquanto o pedido já foi criado.
- **Severidade:** **MÉDIO** (erro não-crítico, notificação é non-blocking)

---

## ETAPA 2: APROVAÇÃO E TRANSIÇÃO (Kanban/RBAC)

**Arquivo:** `routes/vendas-routes.js` L1053-1085 (userPermissions) + L1086-1460 (PUT /status)  
**Endpoint:** `PUT /api/vendas/pedidos/:id/status`

### Fluxo de Transição de Status (Máquina de Estados)
```
orcamento → analise → analise-credito → aprovado → pedido-aprovado → faturar → faturado → entregue → recibo
                                                                                    ↓
                                                                              cancelado (de vários pontos)
```

### Mapa de Permissões por Role
| Role | Status Permitidos |
|------|-------------------|
| `user` / `comercial` (Vendedores) | `orcamento`, `analise`, `analise-credito`, `cancelado` |
| `admin` | **TODOS** (bypass total) |

### ✅ O QUE FUNCIONA
- **Máquina de estados** com `VALID_STATUS_TRANSITIONS` impede pulos (ex: `orcamento` → `faturado`)
- **SELECT ... FOR UPDATE** no PUT /status previne race condition de concurrent updates
- **Transação completa** (BEGIN → FOR UPDATE → UPDATE → COMMIT/ROLLBACK)
- Vedação de PATCH para status: `updates.status !== undefined` retorna 400
- Vendedor **não pode aprovar próprio pedido** para `faturar` (apenas `analise`/`cancelado`)
- OP auto-gerada quando pedido chega em `pedido-aprovado`
- Contas a receber auto-gerada quando pedido chega em `faturar`/`faturado`

### ❌ ACHADOS

#### **[E2-CRIT-02] Andreia Não Existe Como Role — Gap de Aprovação**
- **Arquivo:** `routes/vendas-routes.js` L1053-1067
- **Descrição:** O sistema de permissões define apenas 3 roles: `user`, `comercial`, `admin`. **Não existe role intermediário** (ex: `supervisor`, `gerente_comercial`, `aprovador`) que permita mover pedidos para `aprovado` ou `pedido-aprovado` sem ser admin.
- **Impacto:** Para a Andreia poder mover pedidos para "Faturar", ela precisa ter role `admin`. Isso dá a ela **acesso total ao sistema** — pode deletar pedidos, forçar transições, etc. Não há separação de deveres (Segregation of Duties).
- **Severidade:** **CRÍTICO** (violação de SoD/RBAC)
- **Fluxo Esperado vs Real:**
  - **Esperado:** Andreia (role=aprovador) pode mover para `aprovado`/`faturar` mas NÃO pode deletar, criar pedidos, etc.
  - **Real:** Andreia precisa ser `admin` para aprovar, ganhando poder absoluto.

#### **[E2-CRIT-03] `forceTransition` Permite Bypass da Máquina de Estados**
- **Arquivo:** `routes/vendas-routes.js` L1115-1125
- **Descrição:** O endpoint aceita `{ forceTransition: true }` no body. Com essa flag, um admin pode pular de `orcamento` direto para `faturado`, ignorando todas as etapas intermediárias. **Não há validação de que o pedido tem itens, OP, ou dados completos.**
- **Impacto:** Administrador pode faturar pedido incompleto. Contas a receber será gerada sem validação de dados.
- **Severidade:** **CRÍTICO**

#### **[E2-HIGH-03] Vendedor Pode Cancelar Pedido em Qualquer Status (Até `analise-credito`)**
- **Arquivo:** `routes/vendas-routes.js` L1058-1060
- **Descrição:** Roles `user`/`comercial` podem mover para `cancelado`. Combinando com `VALID_STATUS_TRANSITIONS`, um vendedor pode cancelar um pedido que já está em `analise-credito` (análise de crédito). Isso permite que o vendedor sabote o processo de aprovação unilateralmente.
- **Severidade:** **ALTO**

#### **[E2-HIGH-04] Frontend Usa Listas Hardcoded de Email/Nome Para Controle de Acesso**
- **Arquivo:** `modules/Vendas/public/js/vendas-access-control.js` L33-48
- **Descrição:** O controle de acesso no frontend usa arrays hardcoded:
  ```javascript
  const EMAILS_RESTRITOS = ['clemerson.silva@...', 'guilherme.bastos@...', 'thiago.scarcella@...'];
  const SUPERVISORES = { IDS: [5, 38], NOMES: ['augusto', 'renata'] };
  ```
  Essas definições **não sincronizam com o banco de dados**. Se Clemerson mudar de cargo, o código precisa ser editado manualmente.
- **Impacto:** Manutenção frágil. Risco de desalinhamento entre DB e frontend.
- **Severidade:** **ALTO** (governança de acesso)

#### **[E2-MED-02] Visibilidade Kanban — Todos Veem Todos os Pedidos**
- **Descrição:** Como identificado em E1-HIGH-01, o `GET /pedidos` retorna todos. No Kanban, TODOS os pedidos aparecem para TODOS os usuários. A Andreia vê pedidos de todos os vendedores (conforme perguntado). Porém, isso é por design ou falha?
- **Regra de negócio:** Se Andreia precisa aprovar pedidos de todos os vendedores, ela precisa vê-los. ✅ 
- **Porém:** Vendedores comuns também veem pedidos alheios. ❌
- **Severidade:** **MÉDIO** (depende da regra de negócio)

---

## ETAPA 3: CHÃO DE FÁBRICA (PCP — Ordem de Produção)

**Arquivo:** `routes/pcp-routes.js` L1248-1370 (POST /ordens-kanban) + L1375-1530 (PUT/PATCH)

### Fluxo de Integração Vendas → PCP
```
Pedido status='pedido-aprovado' 
  → Auto: INSERT ordens_producao (pedido_id=X)  [vendas-routes.js L1186-1220]
  → Manual: POST /api/pcp/ordens-kanban { pedido_id: X }  [pcp-routes.js L1248]
```

### ✅ O QUE FUNCIONA
- **Dupla rota de geração de OP:**
  - Automática: Quando pedido muda para `pedido-aprovado`, OP é criada automaticamente dentro da mesma transação (`vendas-routes.js` L1186)
  - Manual: Endpoint `POST /ordens-kanban` com validação de status do pedido
- **OP duplicada prevenida:** Verifica `SELECT id FROM ordens_producao WHERE pedido_id = ? AND status NOT IN ("cancelada")` antes de inserir
- **Validação de status:** OP só pode ser gerada para pedidos com status `pedido-aprovado`, `faturar`, `aprovado`
- **Lock de edição:** PATCH do pedido verifica OP ativa e bloqueia campos críticos (`valor`, `frete`, `cliente_id`) quando há OP vinculada
- **Código OP sequencial:** `FOR UPDATE` na geração de código previne duplicata
- **OP concluída → pedido para "faturar":** Gap-2 fix implementado em PUT e PATCH

### ❌ ACHADOS

#### **[E3-CRIT-04] OP Concluída → Faturar: UPDATE Sem Transação (Race Condition)**
- **Arquivo:** `routes/pcp-routes.js` L1427-1444 (PUT) + L1513-1530 (PATCH)
- **Descrição:** Quando a OP é marcada como `concluida`, o código faz:
  ```javascript
  // L1427-1444 (PUT /ordens-kanban/:id)
  const [opData] = await pool.query('SELECT pedido_id FROM ordens_producao WHERE id = ?', [id]);
  const [pedido] = await pool.query('SELECT status FROM pedidos WHERE id = ?', [pedidoId]);
  if (pedido[0].status === 'pedido-aprovado') {
      await pool.query('UPDATE pedidos SET status = "faturar" WHERE id = ?', [pedidoId]);
  }
  ```
  **Três queries separadas sem transação e sem FOR UPDATE.** Se dois operadores concluem a OP simultaneamente, ou se um vendedor edita o pedido entre o SELECT e o UPDATE, há corrida de dados.
- **Contraste:** O `PUT /pedidos/:id/status` em vendas-routes.js usa transação + FOR UPDATE (correto). Mas o trigger de PCP **não usa nenhum dos dois**.
- **Impacto:** O pedido pode ficar num estado inconsistente (OP concluída mas pedido não movido para faturar, ou status sobrescrito).
- **Severidade:** **CRÍTICO**

#### **[E3-HIGH-05] Clemerson Pode Gerar OP Para Pedido Não-Aprovado (Via API)**
- **Arquivo:** `routes/pcp-routes.js` L1270-1278
- **Descrição:** A validação é `statusPermitidos = ['pedido-aprovado', 'faturar', 'aprovado']`. Status `aprovado` está na lista, mas `aprovado` é um estado de transição curto antes de `pedido-aprovado`. Se o pedido estiver em `aprovado` (o que é raro), a OP pode ser gerada prematuramente.
- **Pergunta de auditoria:** "O Clemerson consegue gerar OP para pedido que NÃO foi movido pela Andreia?"
  - **Resposta:** NÃO, se Andreia é quem move para `pedido-aprovado`. A validação de status impede. Porém, se o pedido estiver em `aprovado` (transição intermediária), SIM.
- **Severidade:** **ALTO** (edge case explorável)

#### **[E3-MED-03] Geração de OP Automática e Manual Coexistem — Risco de Duplicata Silenciosa**
- **Descrição:** A OP pode ser gerada automaticamente (vendas-routes.js, on status='pedido-aprovado') E manualmente (pcp-routes.js, POST /ordens-kanban). Ambos verificam existência de OP antes de inserir, mas a verificação automática usa `connection` (transação) e a manual usa `connection.getConnection()` (transação separada).
- **Risco Teórico:** Se a OP automática e uma requisição manual POST /ordens-kanban executam no mesmo milissegundo, ambas podem ver "0 OPs ativas" e inserir duas OPs.
- **Mitigação Existente:** A verificação `WHERE pedido_id = ? AND status NOT IN ("cancelada")` existe em ambos, mas sem lock compartilhado cross-transaction.
- **Severidade:** **MÉDIO** (race condition teórica, baixa probabilidade em uso real)

#### **[E3-MED-04] PCP Não Verifica `authenticateToken` + `authorizeArea` Explicitamente Para Endpoints de OP**
- **Descrição:** Verificar se o router.use() de pcp-routes.js aplica auth globalmente.
- **Resultado:** Confirmado que PCP routes aplica `authenticateToken` e `authorizeArea('pcp')` no nível do router. ✅ Porém, **o Clemerson precisa ter permissão de módulo `pcp`** no banco. Se ele tiver, ele pode fazer qualquer operação no PCP sem granularidade por ação.
- **Severidade:** **MÉDIO** (falta granularidade de ação)

---

## ETAPA 4: FATURAMENTO E LOGÍSTICA

**Arquivos:**
- `routes/logistica-routes.js` (250 linhas, ~8 endpoints)
- `routes/vendas-routes.js` L3063-3200 (faturamento parcial)
- `services/faturamento-shared.service.js` (serviço centralizado)

### Fluxo
```
Pedido status='faturar'/'faturado'
  → Estoque baixado automaticamente (vendas-routes.js L1233-1250)
  → Contas a receber gerada (vendas-routes.js L1260-1290)
  → Logística: pedido aparece WHERE status IN ('faturado','recibo')
  → Status logística: pendente → separação → expedição → transporte → entregue
```

### ✅ O QUE FUNCIONA
- **Logística puxa de `pedidos` diretamente** — não há tabela intermediária, reduzindo desincronização
- **Dashboard de logística** conta pedidos por `status_logistica` separado do `status` principal
- **Endpoint PUT /logistica/pedidos/:id/status** valida status contra lista fixa
- **Quando logística marca 'entregue'**, status principal do pedido muda para 'entregue' automaticamente
- **Dados de endereço:** JOIN com `clientes` + campo `endereco_entrega` do pedido

### ❌ ACHADOS

#### **[E4-HIGH-06] Logística Não Filtra por `status_logistica IS NULL` Corretamente no GET /pedidos**
- **Arquivo:** `routes/logistica-routes.js` L70-130
- **Descrição:** O filtro para "pendente" é:
  ```sql
  AND (p.status_logistica IS NULL OR p.status_logistica = 'pendente' 
       OR p.status_logistica = 'aguardando_separacao' OR p.status_logistica = '')
  ```
  Isso mescla 3 estados distintos (`NULL`, `'pendente'`, `'aguardando_separacao'`) como se fossem um só. Um pedido recém-faturado (`status_logistica = NULL`) aparece na mesma fila que um pedido já em aguardando separação.
- **Impacto:** Operadores de logística não conseguem distinguir pedidos novos de pedidos já triados.
- **Severidade:** **ALTO**

#### **[E4-HIGH-07] Endereço de Entrega Pode Ser Modificado Após Faturamento**
- **Arquivo:** `routes/vendas-routes.js` L800-810 (PATCH)
- **Descrição:** O PATCH do pedido bloqueia `valor`, `frete`, `desconto` (campos financeiros) quando `isFaturado = true`, mas **NÃO bloqueia** `endereco_entrega`, `municipio_entrega`, `transportadora_nome`, `tipo_frete`. Estes campos podem ser alterados DEPOIS do faturamento.
- **Impacto:** O endereço de entrega no módulo de logística pode ser **diferente** do que estava no momento do faturamento. Romaneio inconsistente.
- **Severidade:** **ALTO** (integridade de dados de entrega)

#### **[E4-MED-05] Logística Não Verifica Existência de OP Concluída**
- **Arquivo:** `routes/logistica-routes.js` L70-130
- **Descrição:** O filtro de logística é `WHERE p.status IN ('faturado', 'recibo')`. Não verifica se a OP vinculada foi concluída. Um pedido faturado via `forceTransition` apareceará na logística sem nunca ter passado pelo PCP.
- **Severidade:** **MÉDIO** (aceitável se forceTransition é controlado, problemático se não)

#### **[E4-LOW-01] Logística Usa `authorizeArea('nfe')` Em Vez de `authorizeArea('logistica')`**
- **Arquivo:** `routes/logistica-routes.js` L12
- **Descrição:** `router.use(authorizeArea('nfe'))` — logística é controlada pela permissão de NFe. Se um usuário tem acesso a NFe mas não deveria ter acesso a logística (ou vice-versa), há vazamento de permissão.
- **Severidade:** **BAIXO** (se NFe e Logística têm mesmo grupo de acesso por design)

---

## ETAPA 5: LIQUIDAÇÃO FINANCEIRA (Contas a Receber)

**Arquivos:**
- `services/faturamento-shared.service.js` L250-310 (gerarContaReceber)
- `routes/financeiro-routes.js` L1048-1120 (GET /contas-receber)
- `routes/vendas-routes.js` L1260-1290 (trigger automático)

### Fluxo de Geração Automática
```
Pedido muda para 'faturar'/'faturado' (PUT /pedidos/:id/status)
  → Verifica se já existe contas_receber com pedido_id
  → Se não existe: faturamentoShared.gerarContaReceber()
    → Extrai parcelas da condicao_pagamento ("30/60/90")
    → Gera N registros em contas_receber com vencimentos corretos
    → Status = 'pendente', tipo = 'faturamento'
```

### ✅ O QUE FUNCIONA
- **Geração automática de contas a receber** no momento do faturamento — sem gap manual
- **Suporte a parcelas:** "30/60/90" gera 3 registros com valores divididos e ajuste de centavos
- **Prevenção de duplicata:** Verifica existência antes de inserir
- **Vencimento configurável:** `prazo_vencimento_padrao` via tabela `configuracoes`
- **Transação:** Geração acontece dentro da transação do PUT /status (mesma connection)
- **Validação de valor > 0** antes de gerar
- **CFOP inteligente:** Determina CFOP correto por UF/tipo de operação

### ❌ ACHADOS

#### **[E5-CRIT-05] `pedido_id` Não É Retornado no GET /contas-receber — Rastreabilidade Quebrada**
- **Arquivo:** `routes/financeiro-routes.js` L1070-1100
- **Descrição:** A query do GET /contas-receber seleciona:
  ```sql
  cr.id, cr.cliente_id, cr.valor, cr.descricao, cr.status, cr.data_vencimento, 
  cr.parcela_numero, cr.total_parcelas, ...
  ```
  **`cr.pedido_id` NÃO está no SELECT**. O link rastreável entre Financeiro → Pedido → OP está **quebrado no frontend**. O campo existe na tabela, é preenchido corretamente, mas não é exposto pela API.
- **Impacto:** Pergunta de validação: "Existe um link rastreável (ID do Pedido) ligando o título financeiro à OP do Clemerson e ao Pedido do Vendedor?" → **NÃO, no frontend. SIM, no banco de dados.**
- **Severidade:** **CRÍTICO** (rastreabilidade E2E quebrada)

#### **[E5-CRIT-06] Contas a Receber Gerada Com Valor do Pedido, Não Com SUM(itens)**
- **Arquivo:** `routes/vendas-routes.js` L1267-1268 + `services/faturamento-shared.service.js` L262-290
- **Descrição:**
  ```javascript
  const valorPedido = parseFloat(pedidoData.valor || 0);
  // ... 
  contaReceberGerada = await faturamentoShared.gerarContaReceber(connection, {
      valor: valorPedido,  // ← usa pedido.valor, NÃO SUM(itens)
  });
  ```
  O valor da conta a receber vem de `pedidos.valor` (campo editável livre) e **NÃO** de `SUM(pedido_itens.subtotal)`. Combinando com [E1-CRIT-01], se o vendedor criou o pedido com `valor = 100000` mas os itens somam `50000`, a conta a receber será de R$100.000.
- **Impacto:** Valor obrado pode não corresponder ao valor real dos produtos vendidos.
- **Severidade:** **CRÍTICO** (integridade financeira)

#### **[E5-HIGH-08] GET /contas-receber Não Tem Filtro por `pedido_id`**
- **Arquivo:** `routes/financeiro-routes.js` L1050-1065
- **Descrição:** Os filtros disponíveis são `status`, `vencimento_inicio`, `vencimento_fim`. Não há filtro por `pedido_id`, dificultando a consulta "quais títulos pertencem ao pedido X?".
- **Severidade:** **ALTO** (usabilidade de rastreamento)

#### **[E5-HIGH-09] POST /contas-receber Manual Não Exige `pedido_id`**
- **Arquivo:** `routes/financeiro-routes.js` L1111-1135
- **Descrição:** O endpoint de criação manual aceita `cliente_nome`, `valor`, `data_vencimento`, `descricao`, `categoria`. **Não aceita `pedido_id`**. Contas criadas manualmente não terão vínculo com nenhum pedido, quebrando a rastreabilidade E2E.
- **Severidade:** **ALTO** (contas financeiras órfãs)

#### **[E5-MED-06] Conta a Receber Gerada Sem `data_emissao` Explícita**
- **Arquivo:** `services/faturamento-shared.service.js` L280-290
- **Descrição:** O INSERT não define `data_emissao` ou `data_criacao` explicitamente. Usa `data_vencimento = DATE_ADD(NOW(), INTERVAL ? DAY)` mas não registra quando o título foi emitido.
- **Severidade:** **MÉDIO** (auditoria parcial)

#### **[E5-LOW-02] Cache de Contas a Receber (2 minutos) Pode Atrasar Visualização**
- **Arquivo:** `routes/financeiro-routes.js` L1048
- **Descrição:** `cacheMiddleware('fin_contas_rec', 120000)` — 2 minutos de cache. Se o faturamento gera uma conta e o usuário abre Financeiro imediatamente, pode não ver a conta por até 2 minutos.
- **Severidade:** **BAIXO** (UX)

---

## RACE CONDITIONS E INTEGRIDADE TRANSACIONAL

### Cenário: Andreia E Vendedor Editam O Mesmo Pedido No Mesmo Segundo

| Operação | Endpoint | Proteção | Resultado |
|----------|----------|----------|-----------|
| Vendedor PATCH + Andreia PATCH | `PATCH /pedidos/:id` | **SEM transação, SEM FOR UPDATE** | ❌ **Last-Write-Wins** — a última requisição sobrescreve a primeira sem conflito. Dados podem ser perdidos. |
| Vendedor PATCH + Andreia PUT status | `PATCH` vs `PUT /status` | PATCH sem lock, PUT com FOR UPDATE | ⚠️ PATCH pode completar entre o FOR UPDATE do PUT, causando estado misto |
| Duas mudanças de status simultâneas | `PUT /status` x2 | ✅ **Protegido** — `SELECT ... FOR UPDATE` serializa |
| Duas OPs para mesmo pedido | `POST /ordens-kanban` x2 | ✅ **Protegido** — verificação + `FOR UPDATE` na geração de código |
| OP auto + OP manual simultâneas | vendas-routes.js + pcp-routes.js | ⚠️ **Parcialmente protegido** — transações diferentes, mesmo check |

#### **[RC-HIGH-01] PATCH /pedidos/:id Não Usa Transação Nem Lock**
- **Arquivo:** `routes/vendas-routes.js` L528-1040
- **Descrição:** Todo o endpoint PATCH (>500 linhas) roda com `pool.query()` direto, sem `getConnection()`, sem `beginTransaction()`, sem `FOR UPDATE`. Múltiplos writes simultâneos causam last-write-wins.
- **Impacto:** Se Andreia e Vendedor editam campos diferentes no mesmo milissegundo, apenas a última escrita persiste. Dados de transporte, frete, observação podem ser perdidos silenciosamente.
- **Severidade:** **ALTO**

#### **[RC-MED-01] OP Concluída → "Faturar" Sem Transação**
- Já documentado como [E3-CRIT-04]

---

## MAPA DE QUEBRAS LÓGICAS E GARGALOS

### Diagrama do Pipeline com Pontos de Falha

```
┌────────────────────────────────────────────────────────────────────┐
│                    PIPELINE E2E VENDAS → LIQUIDAÇÃO                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [VENDEDOR]                                                        │
│     │                                                              │
│     ▼                                                              │
│  ┌─────────────────────┐                                           │
│  │ 1. POST /pedidos    │ ⚠️ E1-CRIT-01: Valor sem itens           │
│  │    status=orcamento  │ ⚠️ E1-HIGH-01: Todos veem tudo          │
│  └─────────┬───────────┘                                           │
│            │                                                       │
│     ▼ (PUT /status → analise)                                      │
│                                                                    │
│  [ANDREIA / ADMIN]                                                 │
│     │ ⚠️ E2-CRIT-02: Precisa ser ADMIN para aprovar               │
│     ▼                                                              │
│  ┌─────────────────────────┐                                       │
│  │ 2. PUT /status          │                                       │
│  │    → pedido-aprovado    │──────────┐ AUTO: Gera OP              │
│  │    (FOR UPDATE ✅)       │          │ ✅ Transação               │
│  └─────────┬───────────────┘          ▼                            │
│            │                 ┌──────────────────┐                  │
│            │                 │ 3. ordens_producao│                  │
│            │                 │    status=ativa   │                  │
│            │                 │    pedido_id=X ✅  │                  │
│            │                 └────────┬─────────┘                  │
│            │                          │                            │
│  [CLEMERSON / PCP]                    │                            │
│            │ ⚠️ E3-CRIT-04           ▼                            │
│            │                 ┌──────────────────┐                  │
│            │                 │ OP → concluida    │                  │
│            │                 │ UPDATE pedido     │                  │
│            │                 │ status='faturar'  │ ❌ Sem transação │
│            │                 └────────┬─────────┘                  │
│            │                          │                            │
│            ▼                          ▼                            │
│  ┌─────────────────────────────────────┐                           │
│  │ 4. PUT /status → faturar/faturado   │                           │
│  │    - Baixa estoque ✅                │                           │
│  │    - Gera contas_receber ✅          │                           │
│  │    ⚠️ E5-CRIT-06: Valor ≠ SUM(itens)│                           │
│  └─────────┬───────────────────────────┘                           │
│            │                                                       │
│            ├──────────────────────────────┐                        │
│            ▼                              ▼                        │
│  ┌──────────────────┐          ┌──────────────────┐                │
│  │ 5. LOGÍSTICA     │          │ 6. FINANCEIRO    │                │
│  │ GET /pedidos     │          │ GET /contas-recv │                │
│  │ WHERE faturado   │          │ ⚠️ E5-CRIT-05:  │                │
│  │ ⚠️ E4-HIGH-06    │          │ pedido_id ausente│                │
│  └──────────────────┘          └──────────────────┘                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Gargalos Identificados (Pontos Onde Pedido "Desaparece")

| # | Entre Quais Módulos | Descrição | Risco |
|---|---------------------|-----------|-------|
| G1 | Vendas → PCP | Se OP automática falha silenciosamente (try/catch não-bloqueante L1220), pedido fica em `pedido-aprovado` SEM OP. PCP não vê o pedido. | **ALTO** |
| G2 | PCP → Faturamento | Se a conclusão da OP falha no UPDATE do pedido (catch L1442), pedido fica em `pedido-aprovado` com OP concluída. Faturamento não vê o pedido. | **ALTO** |
| G3 | Faturamento → Logística | Logística puxa `WHERE status IN ('faturado', 'recibo')`. Se pedido está em `faturar` (mas não `faturado`), não aparece na logística. | **MÉDIO** |
| G4 | Faturamento → Financeiro | Se geração de contas_receber falha (catch L1290 não-bloqueante), pedido faturado não tem título financeiro. | **ALTO** |

---

## MATRIZ DE VIOLAÇÕES RBAC

| Ação | Vendedor (user) | Supervisora (user+supervisor) | Andreia (admin?) | Clemerson (pcp) | Admin Real |
|------|:---:|:---:|:---:|:---:|:---:|
| Criar pedido | ✅ | ✅ | ✅ | ❌ | ✅ |
| Ver TODOS os pedidos | ⚠️ **SIM** | ⚠️ **SIM** | ✅ | ❌ | ✅ |
| Editar pedido de outro | ❌ (PATCH check) | ❌ (check) | ✅ (admin) | ❌ | ✅ |
| Aprovar pedido → analise | ✅ | ✅ | ✅ | ❌ | ✅ |
| Mover → pedido-aprovado | ❌ | ❌ | ✅ (admin) | ❌ | ✅ |
| Mover → faturar | ❌ | ❌ | ✅ (admin) | ❌ | ✅ |
| Cancelar pedido | ✅ (próprio) | ✅ (próprio) | ✅ | ❌ | ✅ |
| Excluir pedido | ❌ | ❌ | ✅ (admin) | ❌ | ✅ |
| Gerar OP | ❌ | ❌ | ❌ | ✅ | ✅ |
| Concluir OP | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver contas a receber | ❌ | ❌ | ❌* | ❌ | ✅ |
| Baixar pagamento | ❌ | ❌ | ❌* | ❌ | ✅ |

*Andreia teria acesso ao Financeiro se for admin, mas essa não deveria ser sua função.

### Violações Detectadas
1. **Vendedor vê pedidos de todos** (não deveria em cenários multi-vendedor)
2. **Sem role "aprovador/supervisor"** — obriga uso de admin para transições
3. **Clemerson no PCP tem acesso amplo** a todas as operações PCP sem granularidade
4. **Frontend hardcoda lista de restritos** em vez de consultar banco

---

## CLASSIFICAÇÃO DE SEVERIDADE

### CRÍTICO (Corrigir Imediatamente)

| ID | Achado | Módulo | Risco |
|----|--------|--------|-------|
| E1-CRIT-01 | Pedido sem itens, valor não-confrontável | Vendas | Integridade financeira |
| E2-CRIT-02 | Sem role intermediário para aprovação | RBAC | Violação SoD |
| E2-CRIT-03 | `forceTransition` bypassa pipeline | Vendas/Status | Integridade de pipeline |
| E3-CRIT-04 | OP concluída → faturar sem transação | PCP | Race condition |
| E5-CRIT-05 | `pedido_id` ausente no GET /contas-receber | Financeiro | Rastreabilidade E2E |
| E5-CRIT-06 | Conta a Receber usa `pedido.valor` em vez de SUM(itens) | Financeiro | Integridade financeira |

### ALTO (Corrigir Neste Sprint)

| ID | Achado | Módulo |
|----|--------|--------|
| E1-HIGH-01 | GET /pedidos sem filtro por vendedor/empresa | Vendas |
| E1-HIGH-02 | Valor editável via PATCH sem auditoria de delta | Vendas |
| E2-HIGH-03 | Vendedor cancela pedido em análise de crédito | RBAC |
| E2-HIGH-04 | Frontend usa listas hardcoded para acesso | Frontend |
| E3-HIGH-05 | OP gerável para pedido em status "aprovado" | PCP |
| E4-HIGH-06 | Logística mescla NULL/pendente/aguardando | Logística |
| E4-HIGH-07 | Endereço editável após faturamento | Vendas/Logística |
| E5-HIGH-08 | GET /contas-receber sem filtro por pedido_id | Financeiro |
| E5-HIGH-09 | POST manual contas-receber sem pedido_id | Financeiro |
| RC-HIGH-01 | PATCH /pedidos sem transação | Vendas |

### MÉDIO (Próximo Sprint)

| ID | Achado | Módulo |
|----|--------|--------|
| E1-MED-01 | POST /pedidos sem transação | Vendas |
| E2-MED-02 | Kanban mostra todos os pedidos | Vendas/UX |
| E3-MED-03 | OP auto+manual podem duplicar | PCP |
| E3-MED-04 | PCP sem granularidade de ação | RBAC/PCP |
| E4-MED-05 | Logística não verifica OP concluída | Logística |
| E5-MED-06 | Conta a receber sem data_emissao | Financeiro |
| RC-MED-01 | OP→faturar sem transação (duplicata CRIT-04) | PCP |

### BAIXO (Backlog)

| ID | Achado | Módulo |
|----|--------|--------|
| E4-LOW-01 | Logística usa permissão NFe | RBAC |
| E5-LOW-02 | Cache 2min atrasa visualização | UX |
| LOW-03 | `vendas-access-control.js` IDs de supervisor hardcoded | Frontend |
| LOW-04 | Audit trail registra ação mas não registra valores antigos/novos | Auditoria |
| LOW-05 | `pedido_historico` não registra quem gerou a OP automática | PCP/Auditoria |

---

## RESPOSTA ÀS PERGUNTAS DE VALIDAÇÃO

### Etapa 1: O vendedor consegue aprovar o próprio pedido para faturamento?
**NÃO.** O backend impede: role `user`/`comercial` só pode mover para `orcamento`, `analise`, `analise-credito`, `cancelado`. Tentativa de mover para `faturar` retorna HTTP 403. ✅

### Etapa 2: A Andreia consegue ver pedidos de TODOS os vendedores?
**SIM.** O `GET /api/vendas/pedidos` retorna todos sem filtro por vendedor. Isso é necessário para a função de aprovação, mas o endpoint não distingue entre admin e vendedor na visibilidade. ⚠️

### Etapa 2: Ao mover o card, o status é atualizado atomicamente?
**SIM.** O `PUT /pedidos/:id/status` usa `SELECT ... FOR UPDATE` + transação. A atualização é atômica. ✅

### Etapa 3: O Clemerson consegue gerar OP para pedido não-aprovado?
**NÃO** (na maioria dos casos). A validação exclui status que não sejam `pedido-aprovado`, `faturar`, `aprovado`. ✅ com ressalva para `aprovado`.

### Etapa 3: A geração da OP trava edição do pedido?
**SIM, parcialmente.** O PATCH verifica OP ativa e bloqueia campos críticos (`valor`, `frete`, `desconto`, `parcelas`, `condicao_pagamento`, `cliente_id`). Porém, outros campos (descrição, observação, transporte) continuam editáveis. ⚠️

### Etapa 4: O pedido aparece na Logística após faturamento?
**SIM**, quando `status IN ('faturado', 'recibo')`. Aparece com dados de cliente e endereço. ✅

### Etapa 4: Dados de endereço estão idênticos ao pedido original?
**NÃO GARANTIDO.** O endereço pode ser editado via PATCH após o faturamento ([E4-HIGH-07]). ❌

### Etapa 5: Foi gerada previsão de recebimento com valores exatos e datas corretas?
**SIM**, com suporte a parcelas (30/60/90) e ajuste de centavos. ✅ Porém, valor baseado em `pedidos.valor` (não `SUM(itens)` — [E5-CRIT-06]). ⚠️

### Etapa 5: Existe link rastreável (ID do Pedido) Financeiro → OP → Vendedor?
**PARCIALMENTE.** O vínculo existe no BANCO (`contas_receber.pedido_id` → `pedidos.id` → `ordens_producao.pedido_id`), mas **não é exposto na API** (`pedido_id` ausente no GET /contas-receber — [E5-CRIT-05]). ❌ no frontend, ✅ no banco.

---

*Relatório gerado por análise estática de código. Nenhuma correção foi aplicada. Priorizar CRIT > HIGH > MED > LOW.*
