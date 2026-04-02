# Auditoria de Lifecycle Frontend ↔ Backend

**Data:** 2025-07-14  
**Escopo:** Alinhamento de todo o frontend JS com o modelo de autenticação httpOnly cookie do backend  

---

## Contexto

O backend migrou para **autenticação via httpOnly cookies** (JWT 15min access, 7d refresh, cookie httpOnly/Secure/SameSite=Lax). O frontend precisava ser auditado para eliminar padrões legados incompatíveis:

- `localStorage.getItem('authToken')` → **não funciona** (token nunca é salvo no localStorage)
- `Authorization: Bearer <token>` via header manual → **redundante** (cookie é enviado automaticamente)
- `getCookie('authToken')` via `document.cookie` → **não funciona** (httpOnly = inacessível ao JS)
- Logout apenas limpando localStorage → **incompleto** (cookie httpOnly permanece válido no servidor)

O padrão correto é:
```js
fetch('/api/...', { credentials: 'include' })
```

---

## Findings & Correções

### CRÍTICO

| # | Arquivo | Problema | Correção |
|---|---------|----------|----------|
| C1 | `modules/Compras/public/js/dashboard-compras-novo.js` | `localStorage.getItem('token')` + `Authorization: Bearer` | Removido. Adicionado `credentials: 'include'` |
| C2 | `modules/Compras/public/js/pedidos-compras-novo.js` | Idem | Idem |
| C3 | `modules/Compras/public/js/fornecedores-compras-novo.js` | Idem | Idem |
| C4 | `modules/RH/public/app.js` — SSE | Token JWT longo (15min) enviado na URL do EventSource | Reescrito para handshake-first (POST `/api/avisos/sse-handshake` → token temporário 20s) |

### ALTO

| # | Arquivo | Problema | Correção |
|---|---------|----------|----------|
| H1 | `public/js/auth-unified.js` | `logout()` não chamava `/api/logout` — cookie httpOnly permanecia | Adicionado `POST /api/logout` com `credentials: 'include'` antes de `clearAuthData()` |
| H2 | `modules/RH/public/header-functionality.js` | Logout fazia apenas `localStorage.removeItem` + `/login.html` | Simplificado: `window.location.href = '/logout.html'` |
| H3 | `public/chat-teams/chat-widget.js` | `getAuthToken()` tentava `document.cookie` + localStorage → sempre null. Enviava `Authorization: Bearer null` | Removida `getAuthToken()`. `apiFetch()` usa apenas `credentials: 'include'` |
| H4 | `modules/RH/public/app.js` — `getAuthHeaders()` | Lia `localStorage.getItem('authToken')` e injetava `Authorization: Bearer` | Função esvaziada — retorna apenas headers adicionais passados como argumento |
| H5 | `modules/RH/public/script.js` — `getAuthHeaders()` | Mesmo padrão antigo | Idem — função esvaziada |
| H6 | `modules/RH/public/script.js` — `handleLogout()` | `localStorage.removeItem('authToken')` + redirect `/login.html` | Redirect para `/logout.html` (que chama POST /api/logout) |
| H7 | `modules/RH/public/script.js` — `initEmployeePage()` | Verificava `localStorage.getItem('authToken')` para auth check | Alterado para verificar `sessionStorage/localStorage.getItem('userData')` |
| H8 | `modules/RH/public/bootstrap.js` | `getCookie('authToken')` (httpOnly inacessível) + `localStorage.getItem('authToken')` + `Authorization: Bearer` header | Reescrito: verifica `userData` no storage, se ausente faz `fetch('/api/me', { credentials: 'include' })` |
| H9 | `modules/RH/public/rh-admin.js` | 3 fetch calls com `localStorage.getItem('authToken')` + `Authorization: Bearer` | Migrado para `credentials: 'include'` |
| H10 | `modules/RH/public/dashboard-data-fix.js` | `getAuthHeaders()` com localStorage + `isLoggedIn()` checando authToken | Removida `getAuthHeaders()`, fetch usa `credentials: 'include'`, `isLoggedIn()` checa `userData` |

### MODERADO

| # | Arquivo | Problema | Correção |
|---|---------|----------|----------|
| M1 | `public/js/aluforce-optimizer.js` | `fetchWithAuth()` lia localStorage + enviava `Authorization: ''` vazio | Simplificado para apenas `credentials: 'include'` |
| M2 | `modules/Financeiro/public/js/importar-xlsx.js` | `getCookie('authToken')` (httpOnly) + `Authorization: Bearer` | Removidos. Apenas `credentials: 'include'`. Removida função `getCookie()` morta |
| M3 | `modules/_shared/pcp-standard.js` | `apiRequest()` lia localStorage `authToken` + `Authorization: Bearer` | Migrado para `credentials: 'include'`, removido token manual |
| M4 | `modules/_shared/connection-monitor.js` | Interceptor de fetch injetava Authorization do localStorage redundantemente | Removida leitura de localStorage + injeção de Authorization. Mantido apenas `credentials: 'include'` |
| M5 | `modules/RH/public/app.js` — polling fallback | `startAvisosPolling()` usava `getAuthHeaders()` + bloqueava polling quando EventSource existia | Removida guard `if (window.EventSource) return`, fetch usa `credentials: 'include'` |
| M6 | `modules/RH/public/dashboard-data-fix.js` — debug log | `console.log('Token presente:', !!localStorage.getItem('authToken'))` expunha presença de token | Alterado para `console.log('UserData presente:', !!sessionStorage.getItem('userData'))` |

### ARQUIVAMENTO

| Arquivo | Motivo | Destino |
|---------|--------|---------|
| `modules/Compras/public/js/compras.js` | Legacy, não carregado por HTML | `_Zyntra_Legacy/modules/Compras/public/js/` |
| `modules/Compras/public/js/dashboard-compras.js` | Idem | Idem |
| `modules/Compras/public/js/dashboard.js` | Idem | Idem |
| `modules/Compras/public/js/pedidos-compras.js` | Idem | Idem |
| `modules/Compras/public/js/cotacoes-compras.js` | Idem | Idem |
| `modules/Compras/public/js/fornecedores-compras.js` | Idem | Idem |
| `modules/Compras/public/js/materiais-compras.js` | Idem | Idem |
| `modules/Compras/public/js/recebimento-compras.js` | Idem | Idem |
| `modules/Compras/public/js/estoque-compras.js` | Idem | Idem |
| `modules/Compras/public/js/relatorios-compras.js` | Idem | Idem |

---

## Arquitetura de Auth Resultante

```
Login:
  POST /api/login { credentials: 'include' }
  → Backend seta cookie httpOnly (access_token 15min + refresh_token 7d)
  → Frontend salva apenas userData (display) em sessionStorage

Chamadas API:
  fetch('/api/...', { credentials: 'include' })
  → Browser envia cookie httpOnly automaticamente
  → Sem Authorization header manual

SSE (Server-Sent Events):
  POST /api/avisos/sse-handshake { credentials: 'include' }
  → Backend valida cookie, retorna URL com token temporário (20s)
  GET /api/avisos/stream?token=<short-lived>
  → EventSource abre com token curto (não precisa de headers)

Token Refresh:
  auth-unified.js detecta 401 TOKEN_EXPIRED
  → POST /api/auth/refresh { credentials: 'include' }
  → Proativo a cada 13min (token dura 15min)

Logout:
  POST /api/logout { credentials: 'include' }
  → Backend limpa cookie httpOnly
  → Frontend limpa sessionStorage/localStorage
```

---

## Arquivos Não Alterados (Já OK ou Backups)

- `modules/RH/public_backup_/` — pasta de backup, não serve conteúdo
- `modules/RH/public_backup/` — idem
- Todos os arquivos `.js` em `modules/Compras/public/js/*-novo.js` (exceto os 3 corrigidos) já estavam sem localStorage/Authorization

---

## Total: 16 correções + 10 arquivos arquivados
