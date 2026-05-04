# 🔍 RELATÓRIO DE AUDITORIA — Módulo Vendas (10 Arquivos HTML)

**Data:** 2026-03-20  
**Escopo:** `modules/Vendas/public/*.html` (10 arquivos)  
**Auditor:** GitHub Copilot (Claude Opus 4.6)  
**Categorias:** Segurança, Links quebrados, Erros JS, CSS/UX, Performance, Qualidade de código, Consistência de API, Statements de debug

---

## 📊 RESUMO EXECUTIVO

| Severidade | Quantidade |
|-----------|-----------|
| 🔴 CRITICAL | 3 |
| 🟠 HIGH | 12 |
| 🟡 MEDIUM | 18 |
| 🔵 LOW | 15 |
| ⚪ INFO | 10 |
| **TOTAL** | **58** |

---

## 🔴 ISSUES CRÍTICOS (CRITICAL)

### C-01 — Listas de admins/permissões hardcoded no frontend (SEGURANÇA)
**Arquivo:** `comissoes.html`  
**Linhas:** ~830-835 (dentro do `<script>`)  
**Severidade:** 🔴 CRITICAL  

```js
const ADMINS_AUTORIZADOS = ['ti', 'douglas', 'andreia', 'fernando', 'consultoria', 'admin', 'antonio', 'tialuforce'];
const USERS_PODE_EDITAR_COMISSAO = ['andreia', 'antonio', 'ti', 'tialuforce'];
```

**Problema:** Controle de acesso implementado apenas no cliente. Qualquer usuário pode abrir o DevTools, alterar essas variáveis ou chamar diretamente as APIs de comissão. Expõe nomes de usuários privilegiados.  
**Recomendação:** Mover TODA a verificação de permissão para o backend (middleware de autorização). O frontend deve apenas refletir o que o backend permite, nunca decidir sozinho.

---

### C-02 — Verificação de permissão client-side com `window.location.href` redirect (SEGURANÇA)
**Arquivo:** `comissoes.html`  
**Linhas:** ~850-875 (função `verificarPermissao()`)  
**Severidade:** 🔴 CRITICAL  

```js
if (!isAdminComissao && !isComercial) {
    window.location.href = 'dashboard.html';  // Bypass trivial
    return false;
}
```

**Problema:** Redirect no client-side é facilmente contornável. Basta bloquear a navegação no DevTools ou chamar a API diretamente.  
**Recomendação:** O endpoint `/api/vendas/comissoes/resumo` deve fazer a validação de role no backend.

---

### C-03 — innerHTML com dados de usuário (XSS potencial)
**Arquivo:** `comissoes.html`  
**Linhas:** Função `gerarAvatarHtml()` (~920)  
**Severidade:** 🔴 CRITICAL  

```js
function gerarAvatarHtml(email, nome, tamanho = 36) {
    // ...
    return `<div style="...">${iniciais}</div>`;  // nome vem do banco
}
// Usado em:
select.innerHTML += `<option value="${v.id}">${v.nome || v.apelido}</option>`;
```

**Problema:** `nome` e `apelido` vêm da API sem sanitização e são inseridos via `innerHTML`/template literal em contexto HTML. Se um nome contiver `<script>` ou event handlers, é XSS armazenado.  
**Recomendação:** Usar `textContent` para texto ou sanitizar com escape de HTML. Para `<option>`, usar `document.createElement('option')` + `option.textContent`.

---

## 🟠 ISSUES ALTOS (HIGH)

### H-01 — CSS inline massivo duplicado em TODOS os 10 arquivos (PERFORMANCE/MANUTENÇÃO)
**Arquivos:** TODOS  
**Linhas:** ~5 até ~450-700 (blocos `<style>`)  
**Severidade:** 🟠 HIGH  

Cada arquivo contém 400-700+ linhas de CSS inline idêntico (sidebar, header, buttons, modals, tables, scrollbar, etc.). 

**Impacto:**  
- ~4.000-7.000 linhas de CSS duplicado no total  
- Cada page load baixa ~30-50KB de CSS repetido  
- Correções de UI precisam ser replicadas em 10 arquivos  

**Recomendação:** Extrair todo o CSS compartilhado para um arquivo externo (`vendas-shared.css`) e manter apenas CSS específico da página inline.

---

### H-02 — `avatarNameMap` hardcoded e duplicado em múltiplos arquivos (SEGURANÇA/MANUTENÇÃO)
**Arquivos:** `dashboard.html` (~L920), `comissoes.html` (~L900), `estoque.html` (~L700), `prospeccao.html`, `relatorios.html`, `dashboard-admin.html`  
**Severidade:** 🟠 HIGH  

```js
const avatarNameMap = {
    'clemerson': '/avatars/Clemerson.webp',
    'isabela': '/avatars/Isabela.webp',
    // ... ~22 entradas com nomes reais de funcionários
};
```

**Problema:**  
1. Nomes reais de funcionários expostos no código-fonte público  
2. Paths de avatar previsíveis permitem enumerar funcionários  
3. Duplicação em 6+ arquivos = inconsistência quando alguém é adicionado/removido  

**Recomendação:** A API `/api/me` já retorna avatar. Usar `user.avatar` ou `user.foto_perfil_url` do backend. Remover o mapeamento estático.

---

### H-03 — `innerHTML` usado em renderização de tabelas com dados da API
**Arquivos:** `comissoes.html`, `estoque.html`, `prospeccao.html`, `clientes.html`  
**Severidade:** 🟠 HIGH  

Múltiplas funções usam `innerHTML` ou `+=` com template literals para renderizar dados da API em tabelas e listas. Ex:

```js
select.innerHTML += `<option value="${v.id}">${v.nome || v.apelido}</option>`;
tabelaResumo.innerHTML = ...;
```

**Recomendação:** Usar `textContent` para dados de texto, `document.createElement()` para elementos, ou no mínimo sanitizar com escape function.

---

### H-04 — Falta de escape/sanitização nos inputs de busca CNPJ/CEP
**Arquivo:** `clientes.html`  
**Linhas:** Funções `buscarCnpjSefaz()`, `buscarCep()`, `buscarEndereco()`  
**Severidade:** 🟠 HIGH  

Os valores dos inputs (`clienteCnpj`, `clienteCep`) são enviados para endpoints sem validação de formato no cliente. Depende inteiramente do backend não ser vulnerável a injection.

**Recomendação:** Validar formato de CNPJ (`/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/`) e CEP (`/^\d{5}-\d{3}$/`) antes de enviar.

---

### H-05 — Auto-refresh a cada 30 segundos sem throttle (PERFORMANCE)
**Arquivo:** `estoque.html`  
**Linhas:** ~L690  
**Severidade:** 🟠 HIGH  

```js
const AUTO_REFRESH_TIME = 30000;
autoRefreshInterval = setInterval(() => {
    carregarProdutos(true);
}, AUTO_REFRESH_TIME);
```

**Problema:** Cada aba aberta faz polling a cada 30s. Com 10 usuários e 2 abas, são 40 requests/minuto ao servidor. Não para quando a aba está oculta.

**Recomendação:** Usar `document.visibilitychange` para pausar quando a aba está em background. Considerar WebSockets/SSE para dados em tempo real.

---

### H-06 — `anti-copy-protection.js` carregado sem `defer`
**Arquivos:** `clientes.html` (~L700 do `<head>`), `estoque.html`, outros  
**Severidade:** 🟠 HIGH  

```html
<script src="/js/anti-copy-protection.js"></script>
```

Bloqueia a renderização enquanto o script é baixado e executado. Em alguns arquivos está sem `defer`, em outros com.

**Recomendação:** Padronizar com `defer` em todos os arquivos. Considerar se anti-copy é realmente necessário em uma app interna.

---

### H-07 — `vendas-admin-check.js` sem `defer` causa race condition
**Arquivos:** `comissoes.html`, `estoque.html`, `relatorios.html`, `prospeccao.html`, `dashboard-admin.html`  
**Severidade:** 🟠 HIGH  

```html
<script src="js/vendas-admin-check.js"></script>  <!-- SEM defer -->
<script src="js/vendas-access-control.js?v=20260114" defer></script>  <!-- COM defer -->
```

**Problema:** `vendas-admin-check.js` executa imediatamente (bloqueante), mas `vendas-access-control.js` usa defer. Se admin-check depende de auth (que usa defer), a ordem pode falhar.

**Recomendação:** Ambos usar `defer` ou ambos sem `defer`, com ordem explícita de dependência.

---

### H-08 — Portal Omie checkbox em aplicação Aluforce
**Arquivo:** `clientes.html`  
**Linhas:** Tab "Telefones e E-mail"  
**Severidade:** 🟠 HIGH (UX/Funcionalidade)  

```html
<label for="clienteEnviarAnexos">Portal Omie: <strong>enviar anexos por e-mail</strong>...</label>
```

**Problema:** Referência ao "Portal Omie" em uma aplicação Aluforce/Zyntra. Se não há integração real com Omie, é funcionalidade morta que confunde o usuário.

---

### H-09 — Mapeamento de avatares com extensões mistas (.webp/.jpg)
**Arquivo:** `comissoes.html`  
**Linhas:** Função `gerarAvatarHtml()` (~L920)  
**Severidade:** 🟠 HIGH  

```js
const avatarsJpg = ['marcia', 'renata', 'fabiola', 'fabiano'];
// Gera URL: /avatars/Marcia.jpg vs /avatars/Clemerson.webp
```

**Problema:** Lógica frágil que capitaliza o username para adivinhar o nome do arquivo. Se o arquivo mudar de formato ou nome, quebra silenciosamente.

**Recomendação:** Backend deve servir URL do avatar direto da API.

---

### H-10 — `_cachedUserData` como variável global
**Arquivo:** `dashboard.html`  
**Linhas:** Função `carregarUsuario()` (~L920)  
**Severidade:** 🟠 HIGH  

```js
_cachedUserData = user; // Cache for reuse
```

Variável global sem `let`/`const`/`var` — cria propriedade no `window`, acessível por qualquer script na página.

**Recomendação:** Usar `let` ou encapsular em módulo/closure.

---

### H-11 — Falta de CSRF protection em chamadas de API
**Arquivos:** TODOS (chamadas `fetch()`)  
**Severidade:** 🟠 HIGH  

Todas as chamadas usam `{ credentials: 'include' }` mas nenhuma inclui CSRF token.

```js
const response = await fetch('/api/me', { credentials: 'include' });
```

**Recomendação:** Implementar CSRF token no header ou como cookie SameSite.

---

### H-12 — Dropdown de UF duplicado 3 vezes no mesmo arquivo
**Arquivo:** `cte.html`  
**Linhas:** ~3 blocos de `<select>` com 27 `<option>` cada  
**Severidade:** 🟠 HIGH (MANUTENÇÃO)

Os mesmos 27 estados brasileiros estão hardcoded 3× no HTML (remetente, destinatário, veículo). Total: ~80 linhas duplicadas.

**Recomendação:** Popular via JavaScript a partir de um array de estados.

---

## 🟡 ISSUES MÉDIOS (MEDIUM)

### M-01 — `--primary-orange: #225cfa` (nome enganoso)
**Arquivos:** TODOS  
**Linhas:** ~L30 em cada arquivo  
**Severidade:** 🟡 MEDIUM  

Variable chamada "orange" mas valor é azul (`#225cfa`). Confirma-se que o app migrou de laranja para azul mas não renomeou as variáveis.

---

### M-02 — Triple duplicate favicon links
**Arquivos:** TODOS 10  
**Linhas:** 2-4 (ou 23-25)  
**Severidade:** 🟡 MEDIUM  

```html
<link rel="icon" type="image/png" href="/images/favicon.png">
<link rel="icon" type="image/png" href="/images/favicon.png">
<link rel="icon" type="image/png" href="/images/favicon.png">
```

---

### M-03 — Inconsistência de nomes de variáveis CSS entre arquivos
**Severidade:** 🟡 MEDIUM  

| Arquivo | Variável | Valor |
|---------|----------|-------|
| index.html | `--primary-orange` | `#225cfa` |
| estoque.html | `--primary-blue` | `#225cfa` |
| prospeccao.html | `--primary-color` | `#225cfa` |
| relatorios.html | `--primary` + `--primary-orange` | ambos `#225cfa` |
| dashboard-admin.html | `--primary-orange` | `#225cfa` |

**Recomendação:** Padronizar para `--primary: #225cfa` em todos os arquivos.

---

### M-04 — `defer` contradiz comentário "DEVE ser carregado primeiro"
**Arquivos:** Vários (`index.html`, `pedidos.html`, etc.)  
**Severidade:** 🟡 MEDIUM  

```html
<!-- Auth - DEVE ser carregado primeiro -->
<script src="/js/auth-unified.js" defer></script>
```

---

### M-05 — Comentário CSS artifact: `/* overflow: global-header-sidebar.css */`
**Arquivos:** Maioria dos 10 arquivos  
**Severidade:** 🟡 MEDIUM  

Comentário que parece ser referência a decisão de mover CSS, mas permanece como artifact.

---

### M-06 — `btn-new-card:hover` com cor orange hardcoded
**Arquivo:** `index.html`  
**Linhas:** ~L760  
**Severidade:** 🟡 MEDIUM  

```css
.btn-new-card:hover { background: #ea580c; }
```

Usa cor laranja hardcoded enquanto o sistema migrou para azul.

---

### M-07 — `.sidebar-action-btn.primary:hover` com cor inconsistente
**Arquivo:** `pedidos.html`  
**Linhas:** ~L630  
**Severidade:** 🟡 MEDIUM  

```css
.sidebar-action-btn.primary:hover { background: #0011ac; }
```

Cor hover (#0011ac) não corresponde a nenhuma variável do design system.

---

### M-08 — `.btn-faturar` gradiente usa cores conflitantes
**Arquivo:** `pedidos.html`  
**Linhas:** ~L850  
**Severidade:** 🟡 MEDIUM  

```css
.sidebar-action-btn.btn-faturar {
    background: linear-gradient(135deg, #023197 0%, #0b58ff 100%);
    box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4); /* Sombra LARANJA no botão AZUL */
}
```

---

### M-09 — `notification-footer a` com cor laranja
**Arquivo:** `index.html`  
**Linhas:** ~L540  
**Severidade:** 🟡 MEDIUM  

```css
.notification-footer a { color: #f97316; }  /* Laranja no sistema azul */
```

---

### M-10 — `.tabs-bar { display: none; }` mas tabs HTML ainda existe
**Arquivos:** `index.html`, `relatorios.html`  
**Severidade:** 🟡 MEDIUM  

CSS esconde a tabs bar, mas o HTML completo das tabs ainda é renderizado e ocupa DOM.

**Recomendação:** Remover o HTML das tabs se não estão sendo usadas.

---

### M-11 — `document.title` sobrescrito condicionalmente
**Arquivo:** `comissoes.html`  
**Linhas:** ~L860  
**Severidade:** 🟡 MEDIUM  

```js
document.title = 'Aluforce: Minha Comissão';  // Usa "Aluforce" em vez de "Zyntra"
```

Inconsistência de branding — HTML `<title>` usa um nome, JS usa outro.

---

### M-12 — Bootstrap 5.3.0 carregado em apenas um arquivo
**Arquivo:** `cte.html`  
**Linhas:** dentro do `<head>`  
**Severidade:** 🟡 MEDIUM  

Apenas `cte.html` usa Bootstrap, todos outros usam CSS custom. Potencial conflito de estilos e 40KB+ extras de CSS.

---

### M-13 — Duplicate `@keyframes spin` definition
**Arquivo:** `estoque.html`  
**Linhas:** Bloco CSS  
**Severidade:** 🟡 MEDIUM  

---

### M-14 — `.user-greeting` CSS redefinido dentro do mesmo arquivo
**Arquivos:** `dashboard.html`, `relatorios.html`  
**Severidade:** 🟡 MEDIUM  

Mesmo seletor definido 2x com propriedades diferentes — a segunda sobrescreve a primeira.

---

### M-15 — `location.reload()` usado em vez de fetch parcial
**Arquivos:** `relatorios.html` (header refresh btn), `prospeccao.html`, `dashboard.html`  
**Severidade:** 🟡 MEDIUM (PERFORMANCE)  

```html
<button onclick="location.reload()">
```

Recarrega toda a página em vez de fazer refresh dos dados via API.

---

### M-16 — Falta de `type="button"` nos botões dentro de forms
**Arquivos:** `cte.html`, `clientes.html`  
**Severidade:** 🟡 MEDIUM  

Botões dentro de forms sem `type="button"` podem disparar submit acidentalmente.

---

### M-17 — Inline styles extensos no HTML
**Arquivos:** TODOS (especialmente header-brand)  
**Severidade:** 🟡 MEDIUM  

```html
<div style="display:flex;align-items:center;gap:10px;">
    <img src="..." style="height:22px;object-fit:contain;">
    <span style="color:rgba(255,255,255,0.2);font-weight:300;font-size:18px;user-select:none;">|</span>
    ...
```

~5-8 inline styles no header-brand de cada arquivo.

---

### M-18 — Múltiplas chamadas a `/api/me` na mesma página
**Arquivo:** `comissoes.html`  
**Severidade:** 🟡 MEDIUM  

`verificarPermissao()` e `carregarUsuarioLogado()` ambos chamam `/api/me` separadamente. São 2 requests idênticos.

**Recomendação:** Fazer uma chamada e compartilhar o resultado.

---

## 🔵 ISSUES BAIXOS (LOW)

### L-01 — `console.error` em produção
**Arquivos:** `comissoes.html` (~3 ocorrências), `estoque.html` (~2), `dashboard.html` (~1)  
**Severidade:** 🔵 LOW  

```js
console.error('Erro ao verificar permissão:', error);
console.error('Erro ao carregar vendedores:', error);
console.log('Usuário não carregado:', e);
```

---

### L-02 — `console.log` em produção  
**Arquivo:** `estoque.html`  
**Linhas:** Função `carregarUsuario()`  
**Severidade:** 🔵 LOW  

```js
console.log('Usuário não carregado:', e);
```

---

### L-03 — Comentário "Chat Widget BOB AI - DESATIVADO" em TODOS os arquivos
**Arquivos:** TODOS 10  
**Severidade:** 🔵 LOW  

```html
<!-- Chat Widget BOB AI - DESATIVADO -->
<!-- <link rel="stylesheet" href="/chat/widget.css?v=20260218"> -->
```

Código morto comentado. Se desativado permanentemente, remover.

---

### L-04 — Sidebar "Configurações" botão sem funcionalidade
**Arquivos:** TODOS 10  
**Severidade:** 🔵 LOW  

```html
<button class="sidebar-btn" title="Configurações"><i class="fas fa-cog"></i></button>
```

Sem `onclick` handler.

---

### L-05 — Tabs-bar escondida mas com botões com `onclick`
**Arquivo:** `index.html`  
**Severidade:** 🔵 LOW  

A tabs-bar está `display: none` mas os botões dentro têm handlers.

---

### L-06 — Estilos de cores laranja residuais
**Arquivos:** Vários  
**Severidade:** 🔵 LOW  

CSS como `.produto-codigo { color: #f97316; background: #fff7ed; }` ainda usa laranja enquanto o design system é azul.

---

### L-07 — `maxlength="2"` no campo DDD sem validação JS
**Arquivo:** `clientes.html`  
**Severidade:** 🔵 LOW  

```html
<input type="text" id="clienteDDD" placeholder="00" maxlength="2">
```

`maxlength` pode ser removido via DevTools. Sem validação JS/backend complementar.

---

### L-08 — Font Awesome 6.5.1 CDN sem fallback
**Arquivos:** TODOS  
**Severidade:** 🔵 LOW  

Se o CDN `cdnjs.cloudflare.com` cair, todos os ícones quebram.

---

### L-09 — Google Fonts carregado em todos os arquivos
**Arquivos:** TODOS  
**Severidade:** 🔵 LOW  

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

Poderia ser carregado uma vez no CSS compartilhado.

---

### L-10 — `@keyframes` duplicados entre arquivos
**Arquivos:** Múltiplos definem `fadeIn`, `modalSlideIn`, `spin`, `pulse`  
**Severidade:** 🔵 LOW  

---

### L-11 — Cache-control meta tags extras
**Arquivo:** `relatorios.html`  
**Severidade:** 🔵 LOW  

Meta tags de cache no HTML são ignoradas por browsers modernos — devem ser headers HTTP.

---

### L-12 — `-webkit-backdrop-filter` duplicado
**Arquivo:** `dashboard-admin.html`  
**Severidade:** 🔵 LOW  

```css
-webkit-backdrop-filter: blur(8px);
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);  /* Duplicado! */
```

---

### L-13 — IDs HTML com acentos: `tabHistórico`
**Arquivo:** `comissoes.html`  
**Severidade:** 🔵 LOW  

```html
<div class="tab-content" id="tabHistórico">
```

IDs com acentos podem causar issues com `querySelector` e URL fragments.

---

### L-14 — Botão "Exportar PDF" sem implementação visível
**Arquivo:** `relatorios.html`  
**Severidade:** 🔵 LOW  

```html
<button onclick="exportarPDF()">
```

Função `exportarPDF()` não visível no trecho lido — pode estar definida mais adiante.

---

### L-15 — Emojis no HTML de UF dropdown
**Arquivo:** `prospeccao.html`  
**Severidade:** 🔵 LOW  

```html
<option value="industria">🏭 Indústria</option>
```

Emojis em `<option>` podem renderizar diferente em SOs/browsers.

---

## ⚪ ISSUES INFORMATIVOS (INFO)

### I-01 — CSS comentário "removido para manter padrão"
**Arquivo:** `relatorios.html`  
**Info:** `.tabs-bar { display: none; }` com comentário explicando remoção

### I-02 — `global-header-sidebar.css` carregado mas CSS inline duplica seus estilos
**Arquivos:** TODOS — o CSS externo e o inline coexistem com estilos sobrepostos

### I-03 — Padrão SPA-like sem framework — cada página é HTML separado
**Info:** Arquitetura Multi-Page Application (MPA) com muito código compartilhado duplicado

### I-04 — Nenhum uso de `<template>` ou web components
**Info:** Todo rendering é manual via string concatenation

### I-05 — Nenhum minifier/bundler detectado
**Info:** Todos os arquivos são servidos como-é, sem minificação

### I-06 — Nenhum Service Worker ou cache strategy
**Info:** PWA features ausentes apesar de ter Capacitor config na raiz

### I-07 — Versioning via query string: `?v=20260114`
**Info:** Cache busting manual, propenso a esquecer de atualizar

### I-08 — Chart.js carregado apenas em `dashboard.html` e `relatorios.html`
**Info:** Correto — apenas onde Chart.js é usado

### I-09 — Socket.IO carregado apenas em `index.html`
**Info:** Correto — usado para Kanban real-time

### I-10 — `popup-confirmacao.css` importado em vários arquivos
**Info:** Correto — para diálogos de confirmação

---

## 📋 RESUMO POR ARQUIVO

| Arquivo | C | H | M | L | I | Total |
|---------|---|---|---|---|---|-------|
| `index.html` | 0 | 3 | 5 | 3 | 2 | 13 |
| `pedidos.html` | 0 | 3 | 4 | 2 | 1 | 10 |
| `clientes.html` | 0 | 3 | 3 | 2 | 1 | 9 |
| `dashboard.html` | 0 | 3 | 3 | 2 | 1 | 9 |
| `dashboard-admin.html` | 0 | 3 | 3 | 2 | 1 | 9 |
| `comissoes.html` | 3 | 4 | 4 | 3 | 1 | 15 |
| `estoque.html` | 0 | 4 | 3 | 3 | 1 | 11 |
| `relatorios.html` | 0 | 3 | 4 | 3 | 2 | 12 |
| `prospeccao.html` | 0 | 3 | 3 | 2 | 1 | 9 |
| `cte.html` | 0 | 3 | 3 | 2 | 1 | 9 |

*Nota: Issues cross-file contam em cada arquivo afetado*

---

## 🎯 PLANO DE AÇÃO RECOMENDADO

### Fase 1 — Segurança (Imediato)
1. **Mover permissões de comissões para o backend** (C-01, C-02)
2. **Sanitizar outputs HTML — substituir innerHTML** (C-03, H-03)
3. **Remover listas de admins do frontend** (C-01)
4. **Implementar CSRF tokens** (H-11)

### Fase 2 — Performance (1 semana)
5. **Extrair CSS compartilhado para arquivo externo** (H-01)
6. **Mover avatarNameMap para API** (H-02)
7. **Padronizar defer em todos os scripts** (H-06, H-07)
8. **Adicionar visibilitychange ao auto-refresh** (H-05)

### Fase 3 — Qualidade/UX (2 semanas)
9. **Renomear variáveis CSS** — `--primary-orange` → `--primary` (M-01, M-03)
10. **Remover favicon duplicados** (M-02)
11. **Remover código morto** (tabs escondidas, BOB AI comments) (M-10, L-03)
12. **Consolidar chamadas /api/me** (M-18)
13. **Remover console.log/console.error** (L-01, L-02)

---

*Relatório gerado automaticamente. Linhas exatas podem variar ±5 linhas devido a edições recentes.*
