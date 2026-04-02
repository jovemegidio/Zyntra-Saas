# AUDITORIA DE PRODUÇÃO — MÓDULO VENDAS (Zyntra ERP)

> **Data:** Junho 2026  
> **Escopo:** `modules/Vendas/` — server.js (6638 linhas), 10 HTML, 8 JS, 7 CSS  
> **Classificação:** 🔴 CRÍTICO | 🟡 MÉDIO | 🟢 BAIXO | ℹ️ INFO

---

## RESUMO EXECUTIVO

| Severidade | Qtd | Área Principal |
|---|---|---|
| 🔴 CRÍTICO | 8 | Segurança, Integridade de Dados |
| 🟡 MÉDIO | 14 | Autenticação, Permissões, Lógica |
| 🟢 BAIXO | 10 | Consistência, UX, Manutenibilidade |
| ℹ️ INFO | 5 | Boas práticas já implementadas |

---

## 1. BACKEND — SEGURANÇA E AUTENTICAÇÃO

### 🔴 C-01: PATCH /pedidos/:id — Estorno de estoque SEM transação
**Arquivo:** `modules/Vendas/server.js` L2762–L3330  
**Descrição:** Quando um pedido é cancelado via PATCH, o estorno de estoque (devolver itens ao inventário) é executado **fora de qualquer transação**. Cada `UPDATE produtos SET estoque_atual = estoque_atual + ?` é operação individual. Se o servidor cair no meio, parte do estoque é estornada e parte não.

**Comparação:** A rota `PUT /pedidos/:id/status` (L2488) **usa transação** (`connection.beginTransaction()`) para a mesma operação de estorno.

**Correção:**
```js
// L2762 — PATCH /pedidos/:id
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
    // ... todas as operações de update + estorno ...
    await connection.commit();
} catch (err) {
    await connection.rollback();
    throw err;
} finally {
    connection.release();
}
```

---

### 🔴 C-02: Duplicar Pedido — Schema mismatch na cópia de itens
**Arquivo:** `modules/Vendas/server.js` L3897–L3924  
**Descrição:** A rota `POST /pedidos/:id/duplicar` insere itens na `pedido_itens` usando colunas que **não existem no schema real** da tabela:

```sql
-- INSERT usa:
codigo_produto, produto, valor_unitario, valor_total, ipi, icms, pis, cofins

-- Schema real (L3339 ensurePedidoItensTable):
codigo, descricao, preco_unitario, total, (sem ipi/icms/pis/cofins como colunas)
```

Isso pode causar `ER_BAD_FIELD_ERROR` silencioso ou inserção de NULLs em colunas erradas se o DB tiver colunas extras legadas.

**Correção:** Alinhar os nomes de coluna ao schema definido em `ensurePedidoItensTable()`.

---

### 🔴 C-03: Hardcoded emails/IDs para controle de permissão
**Arquivo:** `modules/Vendas/server.js` L1372  
```js
const USERS_PERMITIDOS_COMISSAO = ['andreia', 'antonio', 'ti', 'tialuforce'];
```

**Arquivo:** `modules/Vendas/public/js/vendas-access-control.js` L29–L52  
```js
const EMAILS_RESTRITOS = [
    'clemerson.silva@aluforce.ind.br',
    'guilherme.bastos@aluforce.ind.br',
    'thiago.scarcella@aluforce.ind.br'
];
const SUPERVISORES = { IDS: [5, 38], NOMES: ['augusto', 'renata'] };
const VENDEDORES_IDS = { 5: 'Augusto...', 12: 'Fabiano...', ... };
```

**Arquivo:** `modules/Vendas/public/js/vendas-admin-check.js` L32  
```js
const ADMINS_AUTORIZADOS = ['ti', 'douglas', 'andreia', 'fernando', 'consultoria', 'admin'];
```

**Impacto:** Qualquer mudança de equipe (contratação, demissão, troca de email) requer deploy de código. Emails de funcionários são dados PII expostos no frontend JS (acessível a qualquer usuário autenticado via DevTools).

**Correção:** Mover para tabela `permissoes_vendas` no banco e carregar via API `/api/vendas/me` (que já retorna `permissoes_vendas`).

---

### 🔴 C-04: `POST /clientes` sem validação do campo `empresa_id`
**Arquivo:** `modules/Vendas/server.js` L4627–L4656  
**Descrição:** O campo `empresa_id` é recebido diretamente do body sem validação:
```js
empresa_id || 1  // Fallback hardcoded para empresa ID 1
```
Qualquer usuário autenticado pode associar um cliente a qualquer empresa passando um `empresa_id` arbitrário. Não há verificação de que o usuário pertence àquela empresa.

---

### 🔴 C-05: `POST /transportadoras` — Column mismatch com tabela
**Arquivo:** `modules/Vendas/server.js` L5439–L5460  
**Descrição:** O INSERT usa colunas `nome, razao_social, cnpj, ie, telefone, email, endereco, cidade, uf, cep` mas a tabela criada pelo GET (L5410) define colunas `razao_social, nome_fantasia, cnpj_cpf, inscricao_estadual, cidade, estado`. Os nomes não coincidem — `nome` vs `nome_fantasia`, `cnpj` vs `cnpj_cpf`, `ie` vs `inscricao_estadual`, `uf` vs `estado`.

---

### 🟡 M-01: Rotas sem `authenticateToken` individual (dependem do `router.use`)
**Arquivo:** `modules/Vendas/server.js` L996  
**Descrição:** A partir de L996 (`apiVendasRouter.use(authenticateToken)`), todas as rotas ficam protegidas pelo middleware do router. Porém:

1. Rotas como `/me` (L5663), `/dashboard/top-produtos` (L5802), `/ligacoes/*` (L5895–L6012) dependem **exclusivamente** desse `use()` e não têm `authenticateToken` explícito.
2. Se algum refactoring mover essas rotas para outro arquivo/router, elas perdem autenticação silenciosamente.
3. `/me` (L5663) é especialmente sensível — retorna `foto`, `email`, `role`, `is_admin`, `permissoes_vendas` do usuário.

**Correção:** Adicionar `authenticateToken` explícito em rotas sensíveis como defesa em profundidade.

---

### 🟡 M-02: `GET /clientes` — Sem ownership check
**Arquivo:** `modules/Vendas/server.js` L4571–L4590  
**Descrição:** Qualquer usuário autenticado pode listar **todos** os clientes do sistema. Não há filtro por `empresa_id` ou `vendedor_id`. Um vendedor vê clientes de todos os outros vendedores.

Compare com `GET /kanban/pedidos` (L457) que **filtra** pedidos por vendedor quando o usuário não é admin.

---

### 🟡 M-03: `dashboard/admin` usa parâmetro com acento
**Arquivo:** `modules/Vendas/server.js` ~L1581  
**Descrição:** A rota `GET /dashboard/admin` aceita `req.query.período` com acento. Dependendo do encoding da URL, isso pode falhar silenciosamente (`período` recebido como `undefined`).

---

### 🟡 M-04: `DELETE /clientes/:id` — Hard delete sem verificação de pedidos
**Arquivo:** `modules/Vendas/server.js` L4704  
**Descrição:** A exclusão de clientes é hard delete (`DELETE FROM clientes`) sem verificar se existem pedidos associados. Se houver FK constraint em `pedidos.cliente_id`, dará erro de constraint. Se não houver, ficam pedidos órfãos.

---

### 🟡 M-05: `POST /vendedores` insere na tabela `usuarios` com `role = 'vendedor'`
**Arquivo:** `modules/Vendas/server.js` L5137–L5158  
**Descrição:** Cria um usuário real na tabela `usuarios` sem senha. Esse usuário não conseguirá fazer login. Se o sistema usar email como unique key, pode conflitar com criação posterior via RH/Admin.

---

### 🟡 M-06: Tabelas criadas automaticamente em runtime (CREATE TABLE IF NOT EXISTS)
**Arquivo:** `modules/Vendas/server.js`  
**Locais:** L4924 (produtos), L5175 (condicoes_pagamento), L5235 (tipos_frete), L5288 (regioes), L5338 (cargos), L5415 (transportadoras), L5621 (cenarios_fiscais), L3339 (pedido_itens)
**Descrição:** Pelo menos 8 tabelas são criadas automaticamente dentro de route handlers. Isso é antipadrão — mistura lógica de migração com lógica de negócio, causa queries extras desnecessárias em cada request, e torna difícil rastrear o schema real do sistema.

---

## 2. FRONTEND — FETCH CALLS, XSS, ROLE-BASED ACCESS

### 🟡 M-07: `vendas-app.js` e `vendas-kanban.js` — Login duplo e lógica duplicada
**Arquivo:** `modules/Vendas/public/js/vendas-app.js` L1–L600  
**Arquivo:** `modules/Vendas/public/js/vendas-kanban.js` L1–L600  
**Descrição:** Ambos os arquivos:
- Declaram `pedidos = []` como variável global
- Implementam `carregarDadosKanban()` / `carregarPedidosDaAPI()`
- Implementam `renderKanban()` / `renderizarKanban()`
- Implementam `formatarMoeda()`
- Implementam drag-and-drop

Se ambos forem carregados na mesma página, haverá conflito de variáveis globais e duplicação de event listeners. O `index.html` precisa carregar apenas UM deles.

---

### 🟡 M-08: Filtro de pedidos no frontend por nome de vendedor (caso-insensitive parcial)
**Arquivo:** `modules/Vendas/public/js/vendas-kanban.js` L82–L90  
```js
if (usuarioLogado && !VendasAuth.isAdmin(usuarioLogado)) {
    const nomeVendedor = (usuarioLogado.nome ? usuarioLogado.nome.split(' ')[0] : '').toLowerCase();
    pedidos = todosPedidos.filter(p => {
        const vendedorPedido = (p.vendedor || '').toLowerCase();
        return vendedorPedido.includes(nomeVendedor) || nomeVendedor.includes(vendedorPedido.split(' ')[0]);
    });
}
```
**Problema:** Filtragem no frontend é bypassável via DevTools. O backend (`GET /kanban/pedidos`) já filtra corretamente, mas se houver divergência entre os filtros, o usuário verá dados parciais ou errados. Além disso, correspondência parcial por primeiro nome pode causar vazamento entre vendedores com nomes semelhantes (ex: "Marco" e "Marcos").

---

### 🟡 M-09: `vendas-access-control.js` — Busca de vendedorId por correspondência de nome parcial
**Arquivo:** `modules/Vendas/public/js/vendas-access-control.js` L111–L130  
```js
function getVendedorIdFromUser(user) {
    // Tentar pelo nome do usuário
    const nomeUsuario = (user.nome || '').toLowerCase();
    for (const [id, nome] of Object.entries(VENDEDORES_IDS)) {
        if (nome.toLowerCase().includes(nomeUsuario.split(' ')[0])) {
            return parseInt(id);
        }
    }
    // Tentar pelo email ...
}
```
**Problema:** Se "Fabiano" (ID 12) e "Fabíola" (ID 13) ambos começam com "Fab", a busca por primeiro nome pode retornar o vendedor errado. A correspondência por substring é frágil.

---

### 🟢 B-01: XSS — Sanitização adequada nos cards do kanban
**Arquivo:** `modules/Vendas/public/js/vendas-kanban.js` L15–L20  
**Arquivo:** `modules/Vendas/public/js/vendas-app.js` L250–L260  
Ambos usam `escapeHtml()` / `_esc()` para sanitizar dados antes de inserir no innerHTML dos cards. A permissão modal também usa `escapeHtml`. ✅

---

## 3. CONSISTÊNCIA DE DEPENDÊNCIAS CSS/JS

### 🟡 M-10: Font Awesome — Duas versões diferentes em uso
| Página | Versão | SRI |
|---|---|---|
| index.html, pedidos.html, relatorios.html, prospeccao.html, cte.html | **6.5.1** | ✅ |
| clientes.html, dashboard.html, dashboard-admin.html, comissoes.html, estoque.html | **6.4.2** | ❌ |

**Impacto:** Ícones podem diferir entre páginas. Versão 6.4.2 sem SRI significa que um CDN comprometido pode injetar JS malicioso.

**Correção:** Padronizar em 6.5.1 com SRI em todas as páginas.

---

### 🟡 M-11: CSS inconsistente entre páginas
| CSS | index.html | pedidos.html | clientes.html | dashboard.html | dashboard-admin.html | comissoes.html | estoque.html | relatorios.html | prospeccao.html | cte.html |
|---|---|---|---|---|---|---|---|---|---|---|
| modal-standard-compat.css | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| counter-global-standard.css | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| popup-confirmacao.css | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |

**Impacto:** Modais podem ter estilo diferente ou quebrado em páginas que não incluem `modal-standard-compat.css`. Se algum JS invoca um modal em `estoque.html`, ele aparece sem estilo.

---

### 🟢 B-02: cte.html usa Bootstrap 5.3.0 — Único
**Arquivo:** `modules/Vendas/public/cte.html`  
**Descrição:** Esta é a única página que carrega Bootstrap. Não é um bug, mas pode causar conflitos de estilo com as classes custom do restante do módulo.

---

## 4. LÓGICA DE NEGÓCIO E OPERAÇÕES DO DIA-A-DIA

### 🔴 C-06: `POST /pedidos` — Campo `vendedor_id` editável pelo frontend
**Arquivo:** `modules/Vendas/server.js` L2042–L2270  
**Descrição:** O vendedor_id é recebido do body do request. O backend usa `req.user.id` como fallback, mas se o frontend enviar um valor explícito, ele é aceito. Isso permite que um vendedor crie pedidos atribuídos a outro vendedor.

**Justificativa da criticidade:** Se Vendedor A cria pedido e atribui a Vendedor B, as comissões serão calculadas para B. O admin pode não perceber a discrepância.

---

### 🔴 C-07: `POST /pedidos/:id/faturar` — Chamada a serviço externo sem retry/timeout
**Arquivo:** `modules/Vendas/server.js` ~L3697–L3850  
**Descrição:** A rota de faturamento faz `axios.post('http://localhost:3003/api/nfe/gerar', ...)` para gerar NFe. Se o serviço NFe estiver indisponível:
1. O pedido já teve o status mudado para 'faturado' ANTES da chamada NFe
2. Se a chamada falhar, o status fica em 'faturado' mas sem NFe real

**Correção:** Mudar status para 'faturado' SOMENTE após confirmação de sucesso da NFe, ou implementar estado intermediário 'faturando'.

---

### 🔴 C-08: `POST /pedidos/:id/faturamento-parcial` — Sem verificação do total já faturado
**Arquivo:** `modules/Vendas/server.js` L4038–L4130  
**Descrição:** O faturamento parcial (50% F9) não verifica se já houve faturamento parcial anterior. É possível faturar parcialmente 50% duas vezes, resultando em 100% do valor faturado como "parcial".

---

### 🟡 M-12: Pedido creation — `empresa_id` fallback para ID 1
**Arquivo:** `modules/Vendas/server.js` L4648  
```js
empresa_id || 1
```
Se nenhum `empresa_id` é fornecido, o cliente é associado à empresa ID=1. Em produção, empresa 1 pode não ser a correta, ou pode nem existir.

---

### 🟡 M-13: `atualizarTotalPedido()` — Subtotal recalculado server-side (OK) mas desconto não validado
**Arquivo:** `modules/Vendas/server.js` ~L3620–L3690  
**Descrição:** O total é recalculado a partir dos itens (subtotal + IPI + ICMS_ST + frete - desconto). O desconto é lido do pedido existente mas não há validação de que `desconto <= subtotal`. Um admin poderia definir desconto maior que o subtotal, resultando em valor negativo.

---

### 🟡 M-14: `GET /dashboard/top-produtos` — Sem autenticação
**Arquivo:** `modules/Vendas/server.js` L5802  
**Descrição:** A rota está após `apiVendasRouter.use(authenticateToken)` (L996), então é protegida pelo middleware do router. Porém não tem `authenticateToken` explícito, vulnerável a refactoring acidental. Além disso, usa fallback para tabela `itens_pedido` / `pedidos_vendas` que pode ser de outro módulo.

---

## 5. INTEGRAÇÕES

### 🟢 B-03: NFe via axios a localhost:3003 — Funcional mas acoplado
**Arquivo:** `modules/Vendas/server.js` ~L3730  
```js
const nfeResponse = await axios.post('http://localhost:3003/api/nfe/gerar', payload);
```
URL hardcoded. Se o serviço NFe mudar de porta ou host, requer mudança no código.

**Sugestão:** Usar variável de ambiente `NFE_SERVICE_URL`.

---

### 🟢 B-04: CDR Scraper (Scrapy/Puppeteer) — Degradação graciosa
**Arquivo:** `modules/Vendas/server.js` L5895–L6012  
As rotas de ligação/CDR têm try-catch adequado e retornam dados vazios quando o scraper está indisponível. ✅

---

### 🟢 B-05: Socket.IO — Broadcast de atualizações de pedido
**Arquivo:** `modules/Vendas/server.js` L6582+  
Socket.IO configurado para notificar todos os clientes conectados sobre mudanças de status. Funcional.

---

## 6. PERMISSÕES E VISIBILIDADE POR ROLE

### 🟡 M-15 (resumo do C-03): Mapa de permissões hardcoded em 3 arquivos
| Arquivo | Dados hardcoded |
|---|---|
| server.js L1372 | `USERS_PERMITIDOS_COMISSAO` — 4 usernames |
| vendas-access-control.js | `EMAILS_RESTRITOS` (3), `SUPERVISORES` (2 IDs), `VENDEDORES_IDS` (5 IDs+nomes) |
| vendas-admin-check.js | `ADMINS_AUTORIZADOS` — 6 usernames |

Nenhum desses valores vem do banco. Adição/remoção de funcionário requer deploy.

---

### 🟢 B-06: Verificação admin no backend — `verificarSeAdmin()` centralizada
**Arquivo:** `modules/Vendas/server.js` L264  
```js
const authorizeAdmin = (req, res, next) => {
    if (!verificarSeAdmin(req.user)) return res.status(403).json({ ... });
    next();
};
```
A função `verificarSeAdmin` verifica `is_admin`, `role`, e usa o acesso central. Bem implementado. ✅

---

### 🟢 B-07: `PATCH /pedidos/:id` — Ownership check presente
**Arquivo:** `modules/Vendas/server.js` L2798–L2802  
```js
if (!isAdmin && existing.vendedor_id && Number(existing.vendedor_id) !== Number(user.id)) {
    return res.status(403).json({ message: 'Acesso negado...' });
}
```
Correto — vendedor só edita seus próprios pedidos. ✅

---

## 7. SQL INJECTION E PARAMETRIZAÇÃO

### ℹ️ I-01: Todas as queries usam placeholder `?`
Nenhuma concatenação de string em SQL detectada em todo o server.js. Todos os `pool.query()` usam prepared statements com `?`. ✅

---

### ℹ️ I-02: Input sanitization helpers presentes
**Arquivo:** `modules/Vendas/server.js` (início do arquivo)  
`sanitizeString()`, `sanitizeNumber()`, `sanitizeInt()` aplicados nos produtos CRUD. Porém **não são aplicados em todos os endpoints** — ex: `POST /clientes` usa valores do body diretamente.

---

## 8. BOAS PRÁTICAS JÁ IMPLEMENTADAS ✅

| # | Prática | Local |
|---|---|---|
| ℹ️ I-03 | NF number com `FOR UPDATE` — evita duplicação sob concorrência | server.js L4873 |
| ℹ️ I-04 | File upload com whitelist de MIME types e limite de 10MB | server.js L1000–L1010 |
| ℹ️ I-05 | Estorno atômico com `SET estoque_atual = estoque_atual + ?` (evita TOCTOU) | server.js L3180 |
| ✅ | SSO via httpOnly cookie — sem token em localStorage | vendas-app.js L51–L75 |
| ✅ | XSS sanitization em cards do kanban | vendas-kanban.js L15 |
| ✅ | AbortController para evitar fetch race conditions | vendas-app.js L150 |
| ✅ | Status transition matrix com validação server-side | server.js L2488 |
| ✅ | Audit logging via `logAudit()` em produtos CRUD | server.js L5044 |
| ✅ | CNPJ/CPF validação completa com dígitos verificadores | validacoes.js |
| ✅ | Rate limiting por tipo (auth, general, api) | server.js imports |

---

## TOP 5 AÇÕES PRIORITÁRIAS

| # | Ação | Severidade | Esforço |
|---|---|---|---|
| 1 | Envolver PATCH estorno em transação (C-01) | 🔴 | Baixo |
| 2 | Corrigir schema da rota `duplicar` (C-02) e `transportadoras` (C-05) | 🔴 | Baixo |
| 3 | Mover permissões hardcoded para banco de dados (C-03) | 🔴 | Médio |
| 4 | Garantir status 'faturado' só após confirmação NFe (C-07) | 🔴 | Médio |
| 5 | Padronizar Font Awesome 6.5.1 com SRI em todas as páginas (M-10) | 🟡 | Baixo |

---

*Fim da auditoria. Total: 37 itens verificados, 8 críticos, 14 médios.*
