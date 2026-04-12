# PROMPT B — Financeiro: Fluxo de Caixa + Correções UC-FIN-04 + Riscos Auditoria

**Carga: 30% (12 tarefas)**
**Foco: Frontend Financeiro, segurança XSS, conformidade UC-FIN-04/UC-FIN-05, mitigação de riscos R08/R16**

---

## CONTEXTO DO SISTEMA

### Arquitetura

- **Backend:** Node.js 18+ / Express.js / MySQL 8 (pool `aluforce_vendas`) / Redis / Socket.IO 4
- **Frontend:** HTML + CSS + Vanilla JS (sem framework SPA)
- **Auth:** JWT HS256 via `middleware/auth-central.js` — funções: `authenticateToken`, `requireModule`, `authorizeArea`, `requireAction`
- **RBAC:** 8 perfis — para Financeiro os relevantes são: `admin`, `gerente`, `financeiro`, `consultoria` (read-only)
- **Deploy:** PM2 cluster mode, VPS 31.97.64.102, processo `aluforce-v2-production`
- **Cache:** Redis (TTL 5 min para dashboard) com fallback Map local (LRU, 2000 entradas)
- **CSS Pattern:** Módulo Financeiro usa `/Financeiro/css/fin-layout.css`, `fin-components.css`, `fin-header-sidebar.css`. Cores: `--fin-primary: #0ea5e9`, font `Inter`
- **Circuit Breaker:** Timeout de 15s em queries; 503 Service Unavailable quando acionado

### Módulo Envolvido

| Módulo | Base Path | Arquivos Alvo |
|--------|-----------|---------------|
| Financeiro | `modules/Financeiro/public/` | `fluxo_caixa.html`, `contas_pagar.html`, `contas_receber.html`, `conciliacao.html`, `index.html` |
| Financeiro Backend | `routes/` ou `modules/Financeiro/api/` | Rotas de `/api/financeiro/fluxo-caixa`, `/api/financeiro/contas-pagar`, `/api/financeiro/contas-receber` |

### APIs Relevantes

- `GET /api/financeiro/fluxo-caixa?inicio={date}&fim={date}` — movimentações do período (entradas + saídas)
- `POST /api/financeiro/contas-pagar` — criar conta a pagar (idempotência via `X-Idempotency-Key`)
- `POST /api/financeiro/contas-pagar/:id/baixar` — baixar conta (marcar como paga)
- `GET /api/financeiro/contas-receber` — listar contas a receber
- `GET /api/financeiro/recorrencias/status` — status de processamento de lançamentos recorrentes
- `GET /api/me` — dados do usuário logado (nome, avatar, perfil)

### Referências — Documento de Casos de Uso v2.4.0

| Caso de Uso | Descrição | Gaps Identificados |
|-------------|-----------|-------------------|
| **UC-FIN-04** | Fluxo de Caixa Projetado | Falta período "Semana", saldos negativos sem destaque vermelho, projeção não diferencia futuro vs. realizado |
| **UC-FIN-05** | Lançamentos Recorrentes | Sem validação se recorrências foram processadas — projeção pode estar incompleta |
| **UC-FIN-01** | Criar Conta a Pagar | Idempotência via `X-Idempotency-Key` — verificar se frontend envia esse header |
| **UC-FIN-02** | Baixar Conta | Race condition em duplo clique — verificar debounce/lock no botão |

### Riscos da Matriz de Auditoria v2.4.0

| Risco | Descrição | Módulo | Impacto | Mitigação |
|-------|-----------|--------|---------|-----------|
| **R08** | Thundering herd em cache miss | Infra | Alto | Cache stampede protection — verificar se frontend trata 503 graciosamente |
| **R16** | Excel/CSV export com >50k linhas causa OOM | Financeiro | Alto | Paginação obrigatória ou warning antes de exports grandes |
| **R09** | Race condition em estoque (concorrência) | Vendas/PCP | Médio | Afeta o Financeiro via webhook de faturamento — baixa pode duplicar |

---

## TAREFAS

### T-B01: Adicionar período "Semana" ao seletor (UC-FIN-04)

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** O PDF (UC-FIN-04) especifica que o seletor deve oferecer períodos de "semana, mês, trimestre". O seletor atual NÃO tem opção de Semana.
**Solução:**
1. Adicionar botão `<button class="period-btn" data-periodo="semana">Semana</button>` antes do botão "Este Mês"
2. No `switch` da função `selecionarPeriodo()`, adicionar case `'semana'` calculando domingo a sábado da semana atual
3. Manter o botão "Este Mês" como `active` por padrão
**Teste:** Clicar em "Semana" → datas de início e fim correspondem à semana corrente → dados carregam corretamente

---

### T-B02: Destacar saldos negativos em vermelho (UC-FIN-04)

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** UC-FIN-04 exige explicitamente: "destaca em vermelho os períodos de déficit; permite drill-down por lançamento". Atualmente as linhas com saldo negativo NÃO têm destaque visual.
**Solução:**
1. Na função `renderizarTabela()`, ao calcular `saldoAcum`, se `saldoAcum < 0`:
   - Adicionar classe `saldo-negativo` ao `<tr>`
   - Aplicar CSS: `tr.saldo-negativo td { background: #fef2f2; }`
2. No gráfico, preencher área abaixo de zero com gradiente vermelho transparente
3. Nos KPIs, mudar dinamicamente a cor do texto do "Saldo do Período" para vermelho se negativo
**Teste:** Inserir movimentações que resultem em saldo negativo → linha fica com fundo vermelho claro → KPI fica vermelho

---

### T-B03: Corrigir XSS em renderizarTabela — sanitizar dados da API (OWASP A7)

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** A função `renderizarTabela()` usa `innerHTML` com dados direto da API (`m.descricao`, `m.categoria`) SEM sanitização. Um atacante que injete `<script>` em uma descrição via API compromete o navegador de qualquer usuário que abra o Fluxo de Caixa.
**Solução:**
1. Criar helper de sanitização: `function escHtml(s) { const d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; }`
2. Envolver TODOS os campos de texto da API com `escHtml()` antes de inserir em `innerHTML`:
   - `escHtml(m.descricao || m.descrição || '-')`
   - `escHtml(m.categoria || m.categoria_nome || '-')`
3. A função `exportarFluxoPDF()` já usa `esc()` — manter consistência usando o mesmo padrão
**Teste:** Criar movimentação com descrição `<img src=x onerror=alert(1)>` → na tabela deve aparecer como texto, NÃO executar script

---

### T-B04: Corrigir HTML quebrado em exportarFluxoPDF (Bug Crítico)

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** Dentro da string do `document.write()` na função `exportarFluxoPDF()`, tags `<script>` do Chat Widget BOB AI e Chat Teams foram acidentalmente concatenadas ao HTML da impressão. Isso causa:
- Scripts duplicados carregados dentro do popup de impressão
- HTML malformado na impressão
- Potencial vazamento do widget de chat para documento impresso
**Solução:**
1. Corrigir o fechamento do template literal do `document.write()` — garantir que termina em `</body></html>` ANTES das tags de script externas
2. Adicionar resumo de totais (Entradas / Saídas / Saldo) no cabeçalho do PDF impresso
3. Destacar linhas com saldo negativo no relatório impresso (classe `.negativo`)
4. Adicionar rodapé com data de geração e total de movimentações
**Teste:** Clicar "Imprimir" → popup abre com HTML limpo, sem scripts de chat, com resumo de totais

---

### T-B05: Remover scripts duplicados no final do HTML

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** Os scripts `socket.io.js`, `chat-widget.js` e `user-dropdown.js` estão incluídos DUAS VEZES — uma vez no bloco principal de scripts e outra vez no final do `<body>`. Isso causa:
- Inicialização dupla do Socket.IO (2 conexões WebSocket)
- Widget de chat renderizado 2x
- Event listeners duplicados
**Solução:**
1. No final do arquivo, remover o bloco duplicado que contém:
   ```html
   <!-- Chat Corporativo (Teams) -->
   <script src="/socket.io/socket.io.js"></script>
   <script src="/chat-teams/chat-widget.js"></script>
   <script src="/js/user-dropdown.js"></script>
   ```
2. Manter apenas UMA cópia de cada script
3. Adicionar o script faltante do Chat Widget BOB AI (`/chat/widget.js`) que estava dentro do `document.write` erroneamente
**Teste:** Abrir DevTools → Network → verificar que cada script é carregado apenas 1x → Console sem warnings de dupla conexão Socket.IO

---

### T-B06: Tratamento de erros HTTP e feedback visual (UC-FIN-04 / R08)

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** A função `carregarFluxo()` faz `fetch()` mas NÃO trata erros — se a API retornar 401 (sessão expirada), 403 (sem permissão), ou 503 (circuit breaker / thundering herd), o usuário vê apenas uma tela em branco sem feedback.
**Solução:**
1. Tratar HTTP 401 → redirect para `/login.html?expired=1`
2. Tratar HTTP 403 → exibir alerta "Sem permissão para acessar o Fluxo de Caixa"
3. Tratar HTTP 503 → exibir banner amarelo "Serviço temporariamente indisponível. Tente novamente em instantes."
4. Tratar erro de rede (`catch`) → exibir "Erro de conexão. Verifique sua rede."
5. Adicionar loading spinner durante o fetch (já existe no tbody, mas não nos KPIs/gráfico)
6. Sanitizar parâmetros de URL com `encodeURIComponent()`: `/api/financeiro/fluxo-caixa?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`
**Teste:** Desconectar internet → mensagem de erro exibida. Forçar 503 → banner de serviço indisponível.

---

### T-B07: Alerta de lançamentos recorrentes não processados (UC-FIN-05)

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** UC-FIN-05 (Lançamentos Recorrentes) tem cenário excepcional: "projeção incompleta para o período se recorrências não processadas". Atualmente NÃO há indicação ao usuário de que a projeção pode estar incompleta.
**Solução:**
1. Ao carregar o fluxo, verificar se a API retorna flag `recorrencias_pendentes: true` no payload
2. Se verdadeiro, exibir banner de aviso: "⚠ Atenção: lançamentos recorrentes podem não ter sido processados para este período. A projeção pode estar incompleta."
3. Banner com fundo amarelo claro (`#fffbeb`) e borda amarela, ícone de warning
4. Se a API não retornar essa flag, pode-se alternativamente chamar `GET /api/financeiro/recorrencias/status` e verificar
**Teste:** Com recorrências pendentes → banner amarelo exibido. Sem recorrências pendentes → banner oculto.

---

### T-B08: Limite de exportação — proteção contra OOM (Risco R16)

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** Risco R16 da auditoria: "Excel/CSV export com >50k linhas causa OOM". A função `exportarFluxo()` (CSV) e `exportarFluxoPDF()` (impressão) processam TODOS os dados em memória sem limite.
**Solução:**
1. Em `exportarFluxo()`, verificar `fluxoData.length > 50000` antes de processar:
   - Se sim, exibir `confirm()`: "Atenção: X registros podem causar lentidão. Deseja filtrar um período menor ou continuar?"
   - Se o usuário cancelar, abortar a exportação
2. Em `exportarFluxoPDF()`, se >10000 registros, avisar que a impressão pode travar o navegador
3. No CSV, adicionar coluna "Saldo Acumulado" (hoje falta — o CSV não inclui essa informação importante que está na tabela visual)
4. Liberar `URL.revokeObjectURL()` após o download para evitar memory leak
**Teste:** Testar com dataset grande → warning exibido → export funciona ou aborta conforme escolha do usuário

---

### T-B09: Melhorar saldo projetado — diferenciar realizado vs. futuro

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** O KPI "Saldo Projetado" exibe o mesmo valor do "Saldo do Período" — é uma cópia sem utilidade. UC-FIN-04 exige "projeção de entradas e saídas futuras para apoiar decisões de liquidez".
**Solução:**
1. Na função `atualizarResumo()`, separar movimentações em:
   - **Realizadas:** `data <= hoje`
   - **Projetadas:** `data > hoje`
2. "Saldo do Período" = entradas realizadas - saídas realizadas
3. "Saldo Projetado" = saldo realizado + entradas futuras - saídas futuras
4. Mudar cor do KPI "Saldo Projetado" para vermelho se negativo (alerta de déficit futuro)
**Teste:** Inserir movimentações com datas futuras → "Saldo Projetado" inclui valores futuros → "Saldo do Período" mostra apenas o realizado

---

### T-B10: Validar idempotência no frontend de contas a pagar (UC-FIN-01)

**Arquivo:** `modules/Financeiro/public/contas_pagar.html`
**Problema:** UC-FIN-01 especifica que a criação de conta a pagar deve usar `X-Idempotency-Key` para prevenir duplicação. Verificar se o frontend envia esse header.
**Solução:**
1. Localizar a função que faz `POST /api/financeiro/contas-pagar`
2. Verificar se `X-Idempotency-Key` está presente nos headers
3. Se NÃO estiver, gerar UUID v4 no frontend: `crypto.randomUUID()` e enviar como header
4. Desabilitar botão "Confirmar" após primeiro clique para prevenir duplo envio (debounce)
**Teste:** Clicar 2x rápido no botão de criar → apenas UMA conta criada. Header `X-Idempotency-Key` presente no request.

---

### T-B11: Debounce no botão "Baixar" de contas a pagar (UC-FIN-02)

**Arquivo:** `modules/Financeiro/public/contas_pagar.html`
**Problema:** UC-FIN-02 cenário excepcional: "Conta já baixada (duplo clique ou dois usuários simultâneos) — sistema deve rejeitar a segunda baixa". O frontend deve prevenir duplo clique antes que chegue ao backend.
**Solução:**
1. Localizar o botão/função que faz `POST /api/financeiro/contas-pagar/:id/baixar`
2. Adicionar `disabled` ao botão após primeiro clique
3. Restaurar `disabled` apenas após resposta da API (sucesso ou erro)
4. Se API retornar 409 Conflict (já baixada), exibir mensagem amigável
**Teste:** Clicar 2x rápido no botão "Baixar" → botão fica desabilitado → segunda requisição não é enviada

---

### T-B12: Conferir popup bloqueado na impressão

**Arquivo:** `modules/Financeiro/public/fluxo_caixa.html`
**Problema:** `window.open()` pode ser bloqueado pelo navegador. Se bloqueado, `exportarFluxoPDF()` falha silenciosamente (retorna `null`).
**Solução:**
1. Após `const w = window.open('', '_blank')`, verificar `if (!w)`
2. Se bloqueado, exibir mensagem: "Popup bloqueado pelo navegador. Permita popups para este site e tente novamente."
3. Usar `alert()` ou modal do sistema (`ConfirmDialog.warning()`)
**Teste:** Bloquear popups no navegador → mensagem de alerta exibida → nenhum erro no console

---

## REGRAS DE EXECUÇÃO

1. **NÃO alterar** arquitetura, padrões de CSS global, ou sistema de autenticação
2. **Manter** padrão de `credentials: 'include'` em TODOS os `fetch()`
3. **Manter** sanitização XSS existente — usar `escHtml()` em TODOS os dados renderizados via `innerHTML`
4. **Manter** prepared statements em queries SQL (backend)
5. **Manter** padrão de cores Financeiro: entradas `#10b981`/`#059669`, saídas `#ef4444`, saldo `#3b82f6`, projetado `#8b5cf6`
6. **Usar** `encodeURIComponent()` em TODOS os parâmetros de URL passados via query string
7. **Testar** cada alteração verificando que não quebra funcionalidade existente
8. **Fazer git commit** com mensagem: `fix(financeiro): [PROMPT-B] <descrição>`
9. **Deploy VPS** via `pscp` + `pm2 restart aluforce-v2-production`

---

## TESTES REQUERIDOS

Para cada tarefa, criar teste em `tests/prompt-b-tests.js`:

```javascript
// tests/prompt-b-tests.js
const assert = require('assert');

describe('PROMPT-B Financeiro Fixes', () => {

    // T-B01: Período "Semana" existe e calcula corretamente
    it('T-B01: selecionarPeriodo("semana") define datas de domingo a sábado', () => {
        // Simular DOM + chamar selecionarPeriodo('semana')
        // Assert: data-inicio = último domingo, data-fim = próximo sábado
    });

    // T-B02: Linhas com saldo negativo têm classe 'saldo-negativo'
    it('T-B02: renderizarTabela() aplica classe saldo-negativo quando acumulado < 0', () => {
        // Simular fluxoData com saldo negativo
        // Assert: tr tem classList.contains('saldo-negativo')
    });

    // T-B03: XSS sanitizado em descrição
    it('T-B03: escHtml() sanitiza <script>alert(1)</script>', () => {
        // Assert: escHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;'
    });

    // T-B04: exportarFluxoPDF não contém scripts de chat
    it('T-B04: exportarFluxoPDF() gera HTML sem tags <script>', () => {
        // Simular window.open mock
        // Assert: document.write não contém 'widget.js' nem 'socket.io'
    });

    // T-B05: Scripts carregados apenas 1x
    it('T-B05: HTML não tem scripts duplicados', () => {
        // Parse HTML do arquivo
        // Assert: count('socket.io.js') === 1
        // Assert: count('chat-widget.js') === 1
    });

    // T-B06: fetch trata 401, 403, 503
    it('T-B06: carregarFluxo() redireciona para login em 401', () => {
        // Mock fetch retornando 401
        // Assert: window.location.href redirecionado
    });

    // T-B08: export warning para >50k
    it('T-B08: exportarFluxo() avisa quando fluxoData.length > 50000', () => {
        // Mock confirm()
        // Assert: confirm() chamado com mensagem de warning
    });

    // T-B10: POST contas-pagar envia X-Idempotency-Key
    it('T-B10: criação de conta a pagar envia header X-Idempotency-Key', () => {
        // Mock fetch(), interceptar headers
        // Assert: headers['X-Idempotency-Key'] existe e é UUID válido
    });

    // T-B12: window.open retornando null exibe alert
    it('T-B12: exportarFluxoPDF() trata popup bloqueado', () => {
        // Mock window.open retornando null
        // Assert: alert() chamado
    });
});
```

---

## CHECKLIST PRÉ-DEPLOY

- [ ] Todos os `innerHTML` usam `escHtml()` (XSS prevention)
- [ ] Todos os `fetch()` usam `credentials: 'include'` (auth cookies)
- [ ] Todos os parâmetros de URL usam `encodeURIComponent()` (injection prevention)
- [ ] Nenhum script duplicado no HTML final
- [ ] `exportarFluxoPDF()` gera HTML limpo sem scripts externos
- [ ] KPI "Saldo do Período" fica vermelho quando saldo < 0
- [ ] Linhas da tabela com saldo acumulado < 0 têm destaque visual
- [ ] Botão "Semana" funcional no seletor de período
- [ ] Export CSV inclui coluna "Saldo Acumulado"
- [ ] Export CSV/PDF avisa sobre datasets >50k linhas
- [ ] Erros HTTP (401/403/503) tratados com feedback visual
- [ ] Botões de ação (criar/baixar) têm debounce contra duplo clique
- [ ] `window.open()` tratado quando popup está bloqueado
