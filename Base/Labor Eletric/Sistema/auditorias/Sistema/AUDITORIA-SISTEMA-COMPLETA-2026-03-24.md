# AUDITORIA COMPLETA DO SISTEMA — 24/03/2026

**Arquiteto / QA:** GitHub Copilot (Claude Sonnet 4.6)  
**Commit:** `0b2aa0d`  
**Deploy:** VPS `31.97.64.102` — 4 arquivos — PM2 online  

---

## Escopo da Auditoria

| Área | Status |
|---|---|
| Auth / Permissões (auth-central.js, auth-rbac.js) | ✅ Auditado |
| Dashboard principal (public/index.html) | ✅ Auditado + corrigido |
| Header controls (header-controls.js) | ✅ Auditado |
| Chat corporativo (routes/chat-routes.js + widget) | ✅ Auditado |
| Modal de configurações (config-modals.js) | ✅ Auditado + corrigido |
| Usuários admin (public/admin/usuarios.html) | ✅ Auditado |
| Rotas de autenticação (auth-section-routes.js) | ✅ Auditado |
| Migração de tabelas do chat (chat-tables.js) | ✅ Corrigido |
| Tauri desktop (tauri.conf.json) | ✅ Auditado |
| Serviço de permissões (permission.service.js) | ✅ Auditado |
| Empresa/configuração (companySettings.js + configuracoes-routes.js) | ✅ Auditado |
| Ajuda (ajuda/index.html) | ✅ Auditado |

---

## Bugs Encontrados e Corrigidos

### BUG-1 — Duplo event listener de logout [MÉDIO] ✅ CORRIGIDO
**Arquivo:** `public/index.html`  
**Descrição:** O elemento `#logout-option` tinha dois `addEventListener('click')`:
- Um no inline script de `index.html` (L2076): só limpava localStorage e redirecionava
- Um em `public/js/header-controls.js` (L424): chamava `POST /api/logout` (invalida cookie) + limpava storage + redirecionava  

Ambos disparavam simultaneamente. O handler inline não invalidava o cookie httpOnly no servidor — risco de sessão fantasma.  
**Correção:** Handler inline substituído por comentário. Apenas o handler de `header-controls.js` permanece ativo.

---

### BUG-2 — Chave duplicada `credentials: 'include'` [BAIXO] ✅ CORRIGIDO
**Arquivo:** `public/index.html` (fetch de `/api/me`)  
**Descrição:** `fetch('/api/me', { credentials: 'include', credentials: 'include' })` — chave duplicada. Em JS o segundo valor simplesmente sobrescreve o primeiro, portanto funcionalmente inócuo, mas revela descuido de código.  
**Correção:** Removida a linha duplicada.

---

### BUG-3 — Chave duplicada `credentials: 'include'` em script.js [BAIXO] ✅ CORRIGIDO
**Arquivo:** `public/js/script.js` (L846)  
**Descrição:** `fetch('/api/logout', { credentials: 'include', method: 'POST', credentials: 'include' })` — mesma anomalia.  
**Correção:** Removida a chave duplicada; opções reordenadas para `{ method: 'POST', credentials: 'include' }`.

---

### BUG-4 — INSERT em chat_canais antes de colunas existirem [CRÍTICO] ✅ CORRIGIDO
**Arquivo:** `database/migrations/chat-tables.js`  
**Descrição:** Problema de ordenação na migração:
1. **Passo 1** — `CREATE TABLE chat_canais` sem colunas `departamento` e `somente_admin`
2. **Passo 4** — `INSERT INTO chat_canais (nome, descricao, departamento, somente_admin)` ← colunas inexistentes
3. **Passo 5** — `ALTER TABLE chat_canais ADD COLUMN IF NOT EXISTS departamento ...`

Em qualquer deploy limpo (banco zerado), o INSERT do passo 4 falharia com `Unknown column 'departamento'`, impedindo a criação dos canais padrão e quebrando o chat corporativo.  
**Correção:** As colunas `departamento VARCHAR(100) DEFAULT 'todos'` e `somente_admin TINYINT(1) DEFAULT 0` foram adicionadas diretamente no DDL do `CREATE TABLE`. Os `ALTER TABLE IF NOT EXISTS` do passo 5 continuam presentes para idempotência em bancos existentes (no-op seguro).

---

### BUG-5 — Branding "Aluforce" em títulos de página [BAIXO] ✅ CORRIGIDO
**Arquivo:** `public/js/config-modals.js`  
**Descrição:** 6 ocorrências de `document.title = 'Aluforce: Configurações…'` — produto já foi rebatizado para Zyntra.  
**Correção:** Substituídas por `'Zyntra: Configurações…'`, `'Zyntra: Sobre os Lançamentos'` e `'Zyntra: Histórico de Alterações'`.

---

## Análise — Componentes Sem Bugs

### Auth System (`middleware/auth-central.js`)
- JWT HS256 enforced, rejeita HS384/512
- Blacklist Redis com `jti` hash — invalida tokens imediatamente no logout
- Inatividade de 30min — fail-open se Redis indisponível (correto)  
- `requireAdmin`, `requireAdminOrRH`, `requireModule`, `requireAction` — todos corretos
- Consultoria → flags read-only automáticos ✅

### Rota de Logout (`routes/auth-rbac.js` — POST /api/auth/logout)
- Decodifica token → hash SHA-256 → `UPDATE sessoes_ativas SET ativo = FALSE`
- `res.clearCookie('authToken', { path: '/' })` + `res.clearCookie('rememberToken')`
- Sempre retorna 200 (correto para logout)  
- Registra `logAccess(pool, req.user.id, 'logout')` ✅

### Rota `/api/me` (`routes/auth-section-routes.js` — GET /me)
- Prioridade correta: Authorization header Bearer > cookie (suporte multi-dispositivo)
- Cache por userId + deviceId (MULTI-DEVICE) com TTL 5min
- Fallback: busca em `usuarios` → `funcionarios` se não encontrado
- Retorna permissões por módulo, cargo, departamento ✅

### Chat Corporativo (`routes/chat-routes.js`)
- Tabelas: `chat_canais`, `chat_mensagens_canal`, `chat_mensagens_diretas`
- Migração agora correta após BUG-4 fix
- Fallback `departamento` column com try/catch — graceful degradation ✅
- BOB I.A. assistente integrado ✅

### Serviço de Permissões (`services/permission.service.js`)
- Hierarquia clara: Admin check (JWT rápido) → DB (autoritativo) → hardcoded fallback
- Cache em memória com TTL 5min + cleanup automático a cada 2min
- `setInterval(...).unref()` — não bloqueia shutdown do Node ✅

### Settings Modal (`config-modals.js` + `configuracoes-routes.js`)
- `abrirConfiguracao(tipo)` mapeia 35+ tipos para modal IDs ✅
- Endpoints existem e estão corretamente protegidos por `authenticateToken` + `authorizeAdmin`
- Upload logo/favicon via multer em `/api/configuracoes/upload-logo|upload-favicon` ✅
- Fallback de 800ms se modais ainda não carregaram via fetch ✅

### Tauri Desktop (`desktop-app/src-tauri/tauri.conf.json`)
- Produto: `Zyntra v2.2.0`, id `com.zyntra.erp` ✅
- Janela: 1400×900, min 1024×700, decorations=true ✅
- Updater configurado com endpoint GitHub releases ✅
- **Observação:** CSP usa `'unsafe-inline' 'unsafe-eval'` — necessário para o ERP atual mas deveria ser endurecido progressivamente quando possível

---

## Itens de Atenção (Não Críticos — Não Corrigidos)

| # | Item | Arquivo | Prioridade |
|---|---|---|---|
| A1 | `emailPermissions` map hardcoded em index.html (25+ emails → módulos) — duplica lógica DB | `public/index.html` | Média |
| A2 | Middleware `auth.js` marcado DEPRECATED mas ainda importado por legacy code | `middleware/auth.js` | Baixa |
| A3 | CSP Tauri usa `unsafe-eval` | `tauri.conf.json` | Média |
| A4 | Citação motivacional na dashboard nunca muda | `public/index.html` | Mínima |
| A5 | 3 endpoints `/me` distintos (auth-section-routes.js L344, L817, auth-rbac.js L430) — podem entregar dados ligeiramente diferentes | Vários | Baixa |

---

## Resumo Executivo

**5 bugs corrigidos**, todos commited e deployados em produção.  
O bug de maior impacto foi o **BUG-4** (migração do chat) — em qualquer instalação limpa, os canais padrão do chat corporativo não seriam criados, bloqueando o módulo de comunicação desde o setup inicial.

O sistema de autenticação está sólido: JWT com blacklist Redis, inatividade detectada, permissões DB-driven com cache TTL, logout com invalidação server-side. Não foram encontradas vulnerabilidades de segurança (injeção SQL, XSS, CSRF) nas áreas auditadas.
