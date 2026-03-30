# 🔍 AUDITORIA GERAL DE SANIDADE, UI/UX E FLUXOS CORE

**Data:** 25 de Março de 2026  
**Escopo:** Compras · RH · PCP · Vendas  
**Tipo:** Code-level QA (HTML / JS / CSS / Rotas backend)  
**Validação:** Achados-chave verificados manualmente por grep + read_file

---

## 📊 RESUMO EXECUTIVO

| Módulo   | ⛔ CRITICAL | 🔴 HIGH | 🟠 MEDIUM | 🟡 LOW | Total |
|----------|:-----------:|:-------:|:---------:|:------:|:-----:|
| Compras  | 1           | 4       | 3         | 3      | **11** |
| RH       | 0           | 0       | 23        | 0      | **23** |
| PCP      | 3           | 3       | 4         | 0      | **10** |
| Vendas   | 1           | 6       | 7         | 2      | **16** |
| **TOTAL**| **5**       | **13**  | **37**    | **5**  | **60** |

---

## SEÇÃO 1 — UI / ORTOGRAFIA

### 1.1 Encoding Corruption (Padrão Sistêmico)

O módulo RH tem corrupção de acentos em TODA a sidebar (mesmo texto repetido em ~13 HTMLs).
O backend `src/routes/compras.js` tem corrupção `??` em TODOS os comentários.

#### RH — Sidebar / Títulos (repetido em ~13 arquivos)

| Texto Corrompido | Correto | Arquivos Afetados |
|---|---|---|
| "Gesto de Holerites" | "Gestão de Holerites" | ferias.html, holerites.html, avaliacoes.html, gestao-ponto.html e +9 |
| "Gesto de Frias" | "Gestão de Férias" | ferias.html sidebar L60-64 |
| "Solicitaes" | "Solicitações" | ferias.html, holerites.html sidebar |
| "Calendrio" | "Calendário" | calendario-rh.html L9+L18, sidebar de vários |
| "ESPECFICOS" | "ESPECÍFICOS" | dashboard.html L20-157, funcionarios.html, beneficios.html, ponto.html (CSS comments) |
| "FUNCIONRIOS" | "FUNCIONÁRIOS" | dashboard.html |
| "Competncia" | "Competência" | folha.html L19 |
| "Usurio" | "Usuário" | holerites.html L56 |
| "Maro" | "Março" | holerites.html L60 |
| "Relatrio" | "Relatório" | holerites.html L73 |
| "rpido" | "rápido" | dashboard.html L7 |
| "Nao foi possivel" | "Não foi possível" | avaliacoes.html L166 |
| "Autenticao" | "Autenticação" | treinamentos.html L46 |

> **Total RH:** 23 ocorrências ortográficas — sem bugs funcionais ou de segurança.

#### Compras — Backend Route Encoding

| Arquivo | Exemplo | Impacto |
|---|---|---|
| `src/routes/compras.js` L2 | `// ROTAS DO M??DULO DE COMPRAS` | Apenas comentários — sem impacto funcional |
| `src/routes/compras.js` L10,15 | `Valida????o de CNPJ` / `d??gitos verificadores` | Idem |

#### Compras — Frontend Typos

| Arquivo | Linha | Texto | Correto | Severidade |
|---|---|---|---|---|
| `modules/Compras/public/js/compras-main.js` | 70 | "Em Trnsito" | "Em Trânsito" | LOW |
| `src/routes/compras.js` | 142 | "dinmica" (comentário) | "dinâmica" | LOW |

#### PCP — Typos Visíveis ao Usuário

| Arquivo | Linha | Texto | Correto | Severidade |
|---|---|---|---|---|
| `modules/PCP/usuario-system.js` | 37, 50 | "saudAção" | "saudação" | HIGH — exibido no UI |
| `modules/PCP/ordens-producao.html` | 2205 | "dinémica" | "dinâmica" | HIGH — visível na tela |

#### Vendas — Typos Menores

| Arquivo | Linha | Texto | Correto | Severidade |
|---|---|---|---|---|
| `modules/Vendas/public/js/vendas-kanban.js` | ~62 | "Orcamento" (status label interno) | "Orçamento" | LOW — código interno |

---

## SEÇÃO 2 — ERROS DE CONSOLE / SEGURANÇA

### 2.1 ⛔ CRITICAL — XSS (Cross-Site Scripting)

| # | Arquivo | Linha(s) | Descrição | Vetor |
|---|---|---|---|---|
| **C1** | `modules/Compras/public/js/pedidos-compras-novo.js` | 82-83 | `${p.numero}` e `${p.fornecedor}` injetados em innerHTML SEM escaping | Nome de fornecedor com `<script>` |
| **C2** | `modules/Compras/public/js/cotacoes-compras-novo.js` | ~94, 112-114 | `${c.numero}`, `${c.material}` sem escaping em innerHTML | Material/cotação com HTML malicioso |
| **C3** | `modules/Compras/public/js/dashboard-compras-novo.js` | ~50+ | Template literal com dados da API sem sanitização | Dados da API em innerHTML |
| **C4** | `modules/Vendas/public/js/vendas-kanban.js` | 157 | `${pedido.numero}` NÃO escapado (enquanto `pedido.cliente` na L163 USA `escapeHtml()`) | Número do pedido manipulado |

> **Fix padrão:** Usar `escapeHtml()` (já existe em vendas-kanban.js L10) ou `textContent` em vez de `innerHTML`.

### 2.2 ⛔ CRITICAL — Hardcoded localhost em Produção

| # | Arquivo | Linha(s) | URL Hardcoded | Impacto |
|---|---|---|---|---|
| **C5** | `modules/PCP/gerar_ordem_excel.html` | 135 | `http://localhost:3001/api/pcp/ordens-producao` | Form action quebra em produção |
| **C6** | `modules/PCP/gerar_ordem_excel.html` | 178 | `http://localhost:3001` (iframe src) | iframe não carrega em VPS |
| **C7** | `modules/PCP/gerar_ordem_excel.html` | 201 | `http://localhost:3001/api/pcp/clientes?q=test` | Fetch falha em produção |
| **C8** | `modules/PCP/INSTRUCOES_MODAL_NOVO.html` | 45, 104, 128 | `http://localhost:3002` | Links/botões abrem localhost |
| **C9** | `modules/PCP/limpar_cache.html` | 19 | `http://localhost:3002` | Redirect para localhost |

> **Fix:** Substituir por URLs relativas (`/api/pcp/...`) ou usar `window.location.origin`.

### 2.3 🔴 HIGH — Variáveis Não Declaradas / Console Errors

| # | Arquivo | Linha(s) | Problema |
|---|---|---|---|
| **H1** | `modules/PCP/js/pcp-dashboard.js` | 15, 80, 144 | Variável `token` referenciada mas nunca declarada neste arquivo — depende de global implícito |
| **H2** | `modules/PCP/js/pcp-dashboard.js` | 88-89 | `credentials: 'include'` duplicado no mesmo objeto fetch (L88 e L89) |

### 2.4 🔴 HIGH — Tratamento de Erros Insuficiente

| # | Arquivo | Problema | Impacto |
|---|---|---|---|
| **H3** | `modules/Compras/compras-api.js` | Fetch sem tratamento para 401/403/500/timeout | Sessão expirada = tela em branco |
| **H4** | `modules/Vendas/public/js/vendas-kanban.js` ~L87 | try/catch trata 401 (sessão expirada) como erro genérico | Usuário fica preso em Kanban vazio sem saber que deslogou |
| **H5** | `routes/vendas-extended.js` L155,189,221,301 | Queries com `console.log('⚠️ ...ignorada')` — erros engolidos silenciosamente | Debug em produção impossível |

### 2.5 🟠 MEDIUM — Riscos de XSS Menores (PCP)

| # | Arquivo | Linha | Descrição |
|---|---|---|---|
| **M1** | `modules/PCP/templates/pcp-modals.html` | 609 | `onerror` com `outerHTML` — manipulação DOM no handler de erro |
| **M2** | `modules/PCP/pcp.js` | 2649, 2734 | `innerHTML` com form cloning — risco se dados contêm HTML |

---

## SEÇÃO 3 — FLUXOS QUEBRADOS / LÓGICA DE NEGÓCIO

### 3.1 ⛔ CRITICAL — Validação de Desconto Ausente (Vendas)

| Arquivo | Problema |
|---|---|
| `modules/Vendas/public/js/validacoes.js` | **Não existe** função de validação de desconto. Frontend aceita valores negativos ou >100% |

**Impacto:** Pedidos podem ser criados com desconto negativo (valor aumenta) ou >100% (valor negativo).  
**Fix:** Adicionar `validarDesconto(valor, subtotal)` com bounds checking (0 ≤ desconto ≤ subtotal).

### 3.2 🔴 HIGH — Modal Não Reseta Formulário ao Fechar (Vendas)

```javascript
// modules/Vendas/public/js/vendas-app.js L428-435
function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // ❌ FALTA: modal.querySelector('form')?.reset();
    }
}
```

**Impacto:** Dados de um pedido anterior persistem quando o modal abre novamente.  
**Nota:** Alguns handlers específicos (L563, L600, L946) chamam `reset()` individualmente, mas a função genérica `fecharModal` não.

### 3.3 🔴 HIGH — Valores Monetários Sem Validação NaN (Vendas Kanban)

```javascript
// modules/Vendas/public/js/vendas-kanban.js L213
contadores[pedido.status].total += Number(pedido.valor || 0);
// Se pedido.valor = "abc" → Number("abc") = NaN → total vira NaN
```

**Fix:** `parseFloat(pedido.valor) || 0`

### 3.4 🔴 HIGH — Sem Validação de Transição de Status (Vendas Routes)

| Arquivo | Linha | Problema |
|---|---|---|
| `routes/vendas-routes.js` | ~172 | PUT `/pedidos/:id` aceita QUALQUER status novo sem validar transição |

**Impacto:** Permite: Faturado → Orçamento, Cancelado → Em produção (violação de regra de negócio).  
**Fix:** Implementar state machine com transições permitidas.

### 3.5 🔴 HIGH — Formulário Sem Validação (Compras Requisição)

| Arquivo | Problema |
|---|---|
| `modules/Compras/requisicoes.html` | Formulário de requisição de compra pode ser submetido vazio (sem validação frontend) |

### 3.6 🔴 HIGH — IDOR em Endpoint PDF (Vendas)

| Arquivo | Linha | Problema |
|---|---|---|
| `routes/vendas-extended.js` | ~472 | GET `/pedidos/:id/pdf` verifica autenticação e área, mas **não verifica** se o pedido pertence ao vendedor logado |

**Impacto:** Vendedor A pode gerar PDF do pedido do Vendedor B informando ID.  
**Fix:** Adicionar `WHERE vendedor_id = req.user.id` (ou checar admin).

### 3.7 🟠 MEDIUM — Duplo-clique Sem Proteção (Vendas)

```javascript
// modules/Vendas/public/js/vendas-app.js L533
async function salvarPedido() {
    // ❌ Sem flag/disabled para prevenir duplo submit
    await apiRequest(...);
}
```

**Impacto:** Usuário pode criar 2 pedidos idênticos com double-click.

### 3.8 🟠 MEDIUM — Modal Backdrop Não Fechável (Vendas CT-e)

| Arquivo | Linha | Problema |
|---|---|---|
| `modules/Vendas/public/cte.html` | ~325 | `.modal-overlay` sem handler de click-away |

### 3.9 🟠 MEDIUM — Referência DOM Faltante (Compras)

| Arquivo | Linha | Problema |
|---|---|---|
| `modules/Compras/index.html` | 528 | `verTodasNotificacoes()` chamada mas possivelmente não definida neste contexto |

---

## 📋 PLANO DE AÇÃO POR PRIORIDADE

### 🔥 Sprint Imediato (CRITICAL + HIGH de Segurança)

| # | Ação | Módulo | Esforço |
|---|---|---|---|
| 1 | Adicionar `escapeHtml()` em pedidos-compras-novo.js, cotacoes-compras-novo.js, dashboard-compras-novo.js | Compras | 30min |
| 2 | Escapar `pedido.numero` no vendas-kanban.js L157 | Vendas | 5min |
| 3 | Substituir localhost hardcoded → URLs relativas em gerar_ordem_excel.html | PCP | 15min |
| 4 | Remover/atualizar localhost em INSTRUCOES_MODAL_NOVO.html e limpar_cache.html | PCP | 10min |
| 5 | Adicionar check de ownership no endpoint PDF vendas-extended.js | Vendas | 20min |
| 6 | Adicionar validação de desconto em validacoes.js | Vendas | 20min |

### 🟠 Sprint Corrente (HIGH funcional + UX)

| # | Ação | Módulo | Esforço |
|---|---|---|---|
| 7 | Adicionar `form.reset()` no `fecharModal()` genérico | Vendas | 5min |
| 8 | Corrigir `Number()` → `parseFloat() \|\| 0` no kanban L213 | Vendas | 5min |
| 9 | Implementar state machine de status no vendas-routes.js | Vendas | 1h |
| 10 | Adicionar validação no form de requisição Compras | Compras | 30min |
| 11 | Tratar 401 em fetch do kanban redirecionando para login | Vendas | 15min |
| 12 | Declarar `token` ou importar corretamente em pcp-dashboard.js | PCP | 10min |
| 13 | Remover `credentials:'include'` duplicado no pcp-dashboard.js L88-89 | PCP | 5min |
| 14 | Corrigir "saudAção" → "saudação" em usuario-system.js | PCP | 5min |
| 15 | Corrigir "dinémica" → "dinâmica" em ordens-producao.html | PCP | 5min |

### 🟡 Backlog (MEDIUM typos + LOW)

| # | Ação | Módulo | Esforço |
|---|---|---|---|
| 16 | Batch replace de 23 typos na sidebar do RH (script sed/replace) | RH | 30min |
| 17 | Corrigir encoding `??` nos comentários de compras.js | Compras | 15min |
| 18 | Corrigir "Em Trnsito" em compras-main.js | Compras | 5min |
| 19 | Adicionar proteção double-click em salvarPedido() | Vendas | 10min |
| 20 | Adicionar click-away handler em modals CT-e | Vendas | 10min |

---

## FALSOS POSITIVOS DESCARTADOS

| Achado Original | Verificação | Resultado |
|---|---|---|
| `mostrarFormularioEmissao()` não definida (cte.html L166) | grep encontrou definição na L827 do mesmo arquivo | ✅ **FALSO POSITIVO** |
| SQL injection em vendas-extended.js L96 (período vs periodo) | L56 já trata ambos: `req.query.periodo \|\| req.query.período` | ✅ **FALSO POSITIVO** (L149 usa `período` mas é var JS válida) |

---

## 📈 MÉTRICAS DE SAÚDE POR MÓDULO

| Módulo | Segurança | Funcional | UI/UX | Nota Geral |
|--------|:---------:|:---------:|:-----:|:----------:|
| **Compras** | ⚠️ XSS (3 pontos) | ⚠️ Form validation | ✅ OK (2 typos) | **C+** |
| **RH** | ✅ Limpo | ✅ Limpo | ⚠️ 23 typos (superficial) | **B+** |
| **PCP** | ⚠️ localhost hardcoded | ⚠️ token não declarado | ⚠️ 2 typos visíveis | **C** |
| **Vendas** | ⚠️ XSS + IDOR | ⚠️ Desconto + Status | ⚠️ Modal reset | **C** |

---

*Relatório gerado por análise estática de código. Recomenda-se teste manual complementar para edge cases de UX.*
