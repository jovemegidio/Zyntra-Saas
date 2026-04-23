# Relatório de Auditoria — Sistema Zyntra ERP
**Data**: 2026-07  
**Escopo**: Login → Endpoints → Módulos (HTML, JS, Backend)  
**Método**: Revisão estática de código-fonte  

---

## Resumo Executivo

| Severidade | Qtd |
|------------|-----|
| 🔴 Crítico  | 0   |
| 🟠 Alto     | 1   |
| 🟡 Médio    | 5   |
| 🟢 Baixo    | 5   |

Nenhuma vulnerabilidade crítica identificada. O sistema possui uma base de segurança sólida (JWT httpOnly, bcrypt, rotação de refresh tokens com detecção de roubo, lockout por tentativas, CORS restrito, sanitização de input). As falhas encontradas são de manutenção de código legado, inconsistências entre frontend e backend, e riscos de info-disclosure nos logs.

---

## 🟠 ALTO

### A1 — Info Disclosure em Logs de Produção
**Arquivo**: `routes/logistica-routes.js`, L152–153  
**CWE-532: Insertion of Sensitive Information into Log File**

```js
console.log('[LOGISTICA/PEDIDOS] Query:', query);   // L152 — expõe estrutura SQL completa
console.log('[LOGISTICA/PEDIDOS] Params:', params); // L153 — expõe dados fornecidos pelo usuário
```

Outros 6 `console.log` nas linhas 19, 29, 35, 65, 82 e 156 expõem contagens de linhas e sinais operacionais (risco menor, mas desnecessários em produção).

**Por que é alto**: O silenciamento de `console.log` feito em `server.js` 30 segundos após o boot **não afeta módulos filhos** (`routes/*.js` têm sua própria referência ao `console`). Esses logs ficam ativos em produção, expondo a estrutura das queries SQL e os parâmetros de busca dos usuários para qualquer acesso ao sistema de logs do servidor.

**Fix recomendado**:
```js
// Envolver em guarda de ambiente
if (process.env.NODE_ENV !== 'production') {
    console.log('[LOGISTICA/PEDIDOS] Query:', query);
    console.log('[LOGISTICA/PEDIDOS] Params:', params);
}
// OU remover completamente — não agregam valor em produção
```

---

## 🟡 MÉDIO

### M1 — Mínimo de Senha Inconsistente: Frontend 6 chars vs Backend 10 chars
**Arquivos**: `public/js/login.js` L562, L595 / `utils/password-validator.js`

**Problema duplo**:

1. O handler do botão "Alterar senha" (step 3 do modal de recuperação) valida: `if (newPassword.length < 6)` — aprovando senhas de 6 a 9 caracteres.
2. O medidor de força em `checkPasswordStrength()` conta como força normal senhas com `length >= 8`.
3. O backend (`validatePasswordStrength`) **rejeita** qualquer senha com menos de 10 caracteres + requisitos de complexidade.

**Resultado**: O usuário recebe feedback visual "Senha boa" ao digitar uma senha de 8 caracteres no modal, clica em "Alterar", e recebe um erro genérico do servidor sem entender o motivo.

**Fix**:
```js
// login.js L562 — no medidor de força:
if (password.length >= 10) strength++;  // era: >= 8

// login.js L595 — no handler do botão:
if (newPassword.length < 10) {
    showModalMessage('A senha deve ter pelo menos 10 caracteres.', 'error');
    return;
}
```

---

### M2 — Steps 2 e 3 do Modal de Recuperação de Senha: Código Morto com API Desatualizada
**Arquivo**: `public/js/login.js` L507–628 / `public/login.html`

**Situação atual**:
- Step 1 chama `POST /api/auth/forgot-password` → gera senha aleatória → envia por email → mostra toast de sucesso → **fecha o modal via `setTimeout(closeForgotPasswordModal, 3000)`**. Steps 2 e 3 **nunca são atingidos** pelo fluxo normal.
- Se steps 2/3 fossem atingíveis (via manipulação de DOM), as chamadas falhariam porque:
  - Step 2 envia `userId: userVerificationData.userId` — nunca atribuído → `undefined`. O backend agora espera `email` (não `userId`).
  - Step 3 envia `userId: undefined` e `email: undefined` (`userVerificationData.email` também nunca é atribuído). O backend agora espera `resetToken`.
- O `resetToken` gerado pelo backend em `verify-user-data` também nunca é armazenado no `userVerificationData`.

**Impacto**: UI confusa (modal com 3 steps mas apenas 1 funciona). Código de 120+ linhas sem função. Se alguém tentar usar steps 2/3 (ex: navegação com teclado para steps ocultos), o fluxo falha silenciosamente com erros 400.

**Fix**: Remover os steps 2 e 3 do `login.html` e `login.js`. O modal deve ter apenas o campo de email + botão de envio. O processo `forgot-password` atual (1-step por email) já é suficiente e mais seguro.

---

### M3 — Verificação de Identidade por Nome + Departamento (KBA Fraco)
**Arquivo**: `src/routes/auth.js` — endpoint `POST /auth/verify-user-data`

O endpoint autentica a identidade do usuário verificando se `nome_completo` e `setor` correspondem ao informado. Esses dados são:
- Conhecidos por qualquer colega do mesmo departamento
- Frequentemente visíveis em sistemas de RH, listas de ramais, organogramas
- Guessáveis por engenharia social

Adicionalmente, o `resetToken` gerado em caso de sucesso é retornado **no corpo da resposta JSON** (`data.resetToken`), tornando-o visível no DevTools Network tab, proxies corporativos e logs de acesso.

**Nota**: Como o fluxo 3-step está atualmente inacessível (M2 acima), esse endpoint não é atingível pelo frontend padrão — mas permanece ativo como endpoint não documentado.

**Fix recomendado**: Desativar ou remover `POST /auth/verify-user-data` e `POST /auth/change-password`. O endpoint `POST /auth/forgot-password` (1-step por email) já implementa um fluxo seguro com senha temporária. Se for manter o 3-step: substituir KBA por verificação via email (enviar link de reset), e entregar o `resetToken` via cookie httpOnly.

---

### M4 — Módulo `auth-unified.js` Ainda Importado em `server.js`
**Arquivo**: `server.js` L79, L2203, L2205

```js
// L79
const authUnified = require('./middleware/auth-unified');
// L2203-2205
checkOwnership: authUnified.checkOwnership,
writeGuard: authUnified.writeGuard,
```

O módulo `auth-unified.js` foi marcado como depreciado em favor de `auth-central.js`. O server.js ainda importa e usa duas funções dele: `checkOwnership` e `writeGuard`.

**Impacto**: Manutenção paralela de dois módulos de autenticação. Risco de divergência silenciosa se `auth-central.js` for atualizado sem atualizar `auth-unified.js` também.

**Fix**: Verificar se `auth-central.js` exporta equivalentes (ou implementar). Migrar as duas referências e remover o `require('./middleware/auth-unified')`.

---

### M5 — `checkFinanceiroPermission` Duplica Verificação de JWT
**Arquivo**: `routes/financeiro-core.js`

A função `checkFinanceiroPermission` executa `jwt.verify(token, JWT_SECRET)` internamente, duplicando a verificação que o middleware `authenticateToken` (do `auth-central.js`) já realizou antes de chegar nessa função. Isso cria:
- Dois pontos de verificação que podem divergir (secrets diferentes? algoritmos diferentes?)
- Código mais difícil de auditar — a verificação de auth está "escondida" dentro de uma função de permissão
- Comparação de role com múltiplas strings: `role === 'admin' || role === 'Admin' || role === 'administrador' || role === 'Administrador'`

**Fix**: Remover o `jwt.verify()` interno e usar `req.user` (populado por `authenticateToken`). Centralizar a verificação de admin em `auth-central.isAdmin(req.user.role)`.

---

## 🟢 BAIXO

### B1 — Comparação de Role Admin com Múltiplas Variações de String
**Padrão encontrado em**: `routes/financeiro-core.js`, `routes/rh-routes.js`, outros

```js
role === 'admin' || role === 'Admin' || role === 'administrador' || role === 'Administrador'
```

Se um novo módulo checar apenas `'admin'` e o banco tiver `'Admin'`, o acesso será negado silenciosamente.

**Fix**:
```js
// utils/roles.js (criar)
function isAdmin(role) {
    return ['admin', 'administrador'].includes((role || '').toLowerCase().trim());
}
```

---

### B2 — Pool MySQL com 200 Conexões em `server.js`
**Arquivo**: `server.js`

```js
connectionLimit: 200,
queueLimit: 500
```

O `max_connections` padrão do MySQL é 151. Tentar abrir 200 conexões causará erros `ER_CON_COUNT_ERROR` nos últimos workers do pool.

**Fix**: Reduzir para `connectionLimit: 25` (ou sincronizar com `max_connections` do servidor MySQL, reservando ~30 conexões para processos administrativos).

---

### B3 — Typo em Comentário HTML: `RECUPERAÇÁO`
**Arquivo**: `public/login.html`

```html
<!-- ===== MODAL DE RECUPERAÇÁO DE SENHA ===== -->
```

`RECUPERAÇÁO` usa acento agudo (Á) em vez de til (Ã). Deveria ser `RECUPERAÇÃO`.

**Fix**: Trivial — substituir o texto do comentário.

---

### B4 — Modal `#forgot-password-modal` sem Atributos ARIA
**Arquivo**: `public/login.html` L273

```html
<div id="forgot-password-modal" class="modal-overlay">
```

Não tem `role="dialog"`, `aria-modal="true"` nem `aria-labelledby`. Leitores de tela não identificam o elemento como diálogo modal.

**Fix**:
```html
<div id="forgot-password-modal" class="modal-overlay"
     role="dialog" aria-modal="true" aria-labelledby="modal-recovery-title">
```

---

### B5 — `countSql` em `compras-routes.js` Construído por Substituição de Regex
**Arquivo**: `routes/compras-routes.js`

O total de registros para paginação é calculado substituindo o início do SQL principal via regex:
```js
const countSql = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
```

Se o SQL principal mudar (adicionar subquery, CTE, ou alias de coluna com FROM), a substituição produz SQL inválido silenciosamente.

**Fix**: Definir o `countSql` como string separada e explícita. Não derivar COUNT via manipulação de string do SQL principal.

---

## ✅ Pontos Positivos Identificados

Os itens abaixo funcionam corretamente e representam boas práticas implementadas:

- **JWT httpOnly cookies** com `secure` + `sameSite: strict` em produção
- **Rotação de refresh token** com detecção de reuso (revoga todos os tokens do usuário em caso de ataque)
- **bcrypt com salt rounds=12** + migração automática de senhas em texto plano no primeiro login
- **Account lockout** após N tentativas falhas, com contagem por email
- **2FA por email** com código de 6 dígitos, TTL de 5 min, máximo 5 tentativas, dispositivos confiáveis (30 dias)
- **CORS com allowlist restrita** — `null` origin bloqueado em produção
- **Sanitização de input** via middleware global (`sanitizeInput`)
- **Mensagem genérica de erro de login** (`'Login ou senha incorretos'`) — impede enumeração de usuários
- **`validatePasswordStrength` centralizado** (`utils/password-validator.js`) com 10 chars + complexidade
- **Pool de conexões injetado** via `authRouter.setPool(pool)` — auth.js usa o mesmo pool do server.js
- **`ensurePasswordResetTokensTable`** com token hasheado (SHA-256) e TTL de 15 min
- **`POST /auth/force-change-password`** valida `senha_temporaria` no banco antes de aceitar troca
- **Audit log** (`auditoria_logs`) em ações críticas (login, logout, password change, password reset)
- **Rate limiting** global + Redis com fallback em memória
- **HTTPS redirect** + `securityHeaders` middleware
- **`req.connection.remoteAddress` e `req.headers['x-forwarded-for']`** para logging de IP real

---

## Roadmap de Correções Sugerido

| Prioridade | Item | Esforço |
|-----------|------|---------|
| 1 | A1 — Remover console.logs de produção em `logistica-routes.js` | 5 min |
| 2 | M1 — Corrigir mínimo de senha no frontend (6→10 chars) | 5 min |
| 3 | M2 — Remover steps 2 e 3 do modal de recuperação (código morto) | 30 min |
| 4 | M3 — Desativar `POST /auth/verify-user-data` e `POST /auth/change-password` (endpoints inativos mas expostos) | 10 min |
| 5 | M4 — Migrar `checkOwnership`/`writeGuard` para `auth-central.js` | 1-2h |
| 6 | M5 — Refatorar `checkFinanceiroPermission` para usar `req.user` | 30 min |
| 7 | B1 — Criar `isAdmin()` utilitário e substituir comparações manuais | 1h |
| 8 | B2 — Reduzir `connectionLimit` para 25 | 2 min |
| 9 | B4 — Adicionar ARIA no modal de recuperação | 2 min |
| 10 | B5 — Reescrever `countSql` como query explícita | 15 min |
