# AUDITORIA FORENSE — ZYNTRA / ALUFORCE ERP

**Data:** 2026-05-28/29 · **Escopo:** VPS Hostinger + 5 apps PM2 + repositório + código-fonte
**Modo de coleta:** read-only (nenhum restart na coleta; alterações posteriores documentadas na seção 8)

---

## 1. RELATÓRIO EXECUTIVO

**Estabilidade operacional: BOA.** App de produção no ar e saudável:
- `GET /` → 302, `/login.html` → 200, `/dashboard` → 302 (auth), `/api/health` → 200, latência ~200ms.
- SSL válido até 19/Ago/2026. PM2 com uptime estável, `unstable_restarts=0`.

**Integridade de engenharia: CRÍTICA (no versionamento).** O problema não estava no runtime, e sim na base de versionamento e organização estrutural: repositório dentro do Google Drive corrompendo o `.git`, três gerações de dashboard, colisão de case em módulos no Linux, e drift de configuração entre `ecosystem.*.config.js` e o runtime real.

| Severidade | Qtd | Tema |
|---|---|---|
| 🔴 CRÍTICO | 1 | Corrupção do git (Google Drive) |
| 🟠 ALTO | 4 | Colisão de módulos, 502 WhatsApp/demo, dashboards duplicados, drift de portas |
| 🟡 MÉDIO | 4 | Processos não-ERP na VPS, disco 44GB backups, `.env` 644, `.bak` órfãos |
| 🟢 BAIXO | — | Higiene de secrets OK, SSL OK, app no ar |

> **265 restarts:** NÃO é crash-loop ativo — é contador cumulativo de deploys (cada `deploy-vps.ps1` reinicia o PM2). Logs de erro vazios + uptime estável confirmam.

---

## 2. LISTA DE BUGS / FALHAS

### 🔴 CRIT-01 — Repositório git corrompido pelo Google Drive  ✅ CORRIGIDO (ver §8)
- **Causa raiz:** repo em `g:\.shortcut-targets-by-id\...\Zyntra` (Google Drive). O Drive injeta `desktop.ini` e cópias ` (1)` em `.git/objects` e `.git/refs`.
- **Evidência:** `git fsck` → 223 artefatos corrompidos + 16 refs quebradas; `bad tree object 27b479b8...` alcançável pela história do `main`; `bundle`/`push`/`clone` da história falham.
- **Impacto:** história ilegível, risco de perda de versões, forense git bloqueada.

### 🟠 ALTO-02 — Colisão de módulos `Vendas` vs `vendas` (case-sensitive no Linux)
- **Evidência:** na VPS coexistem `/var/www/aluforce/modules/Vendas` e `.../vendas`; em labor-energy `Vendas`, `vendas` e `Faturamento`. `server.js` roteia `/Vendas` (maiúsculo).
- **Impacto:** edições "somem" (pasta errada), divergência frontend, deploy imprevisível. Windows (dev) funde os dois; Linux (prod) não.

### 🟠 ALTO-03 — Upstreams nginx quebrados → 502 (WhatsApp + demo)  ✅ CORRIGIDO (ver §8)
- **Evidência:** `:3002` e `:3003` DOWN; nginx faz `proxy_pass` para eles (`/whatsapp`, `/api/whatsapp/`, `/wbot-socket/`, `/zyntra-demo/`).
- **Impacto:** rotas WhatsApp e demo retornavam 502.

### 🟠 ALTO-04 — Três gerações de dashboard; `new_dashboard.html` órfão  ✅ CORRIGIDO (ver §8)
- **Evidência:** `server.js` serve `public/dashboard-v2/index.html` (atual) em `/dashboard` e `/index.html`; legado em `/dashboard-legacy`. `public/new_dashboard.html` sem nenhuma referência (grep = 0).

### 🟠 ALTO-05 — Drift de portas (ecosystem ≠ produção)
- **Evidência:** `ecosystem.labor-eletric.config.js` → 3001, `labor-energy` → 3002; produção roda em **4001/4002**.
- **Impacto:** `pm2 resurrect`/reboot pode subir nas portas erradas → nginx aponta para 4001/4002 → outage silencioso.

### 🟡 MED-06 — Processos não-ERP na VPS de produção
- Minecraft (`java :25565`), AnyDesk (`:7070`), RustDesk/`rw-core` (`:3443/:61000`), n8n docker (`:5678`). Concorrência de CPU/RAM + superfície de ataque.

### 🟡 MED-07 — Disco: 44GB em `/var/www/backups`, disco 68% (130/194GB)
- Sem rotação → risco de disco cheio (MySQL/Node param).

### 🟡 MED-08 — `.env` de produção legível por todos (644)  ✅ CORRIGIDO (ver §8)
- `/var/www/aluforce/.env` era `-rw-r--r--` contendo DB_PASSWORD/JWT_SECRET.

### 🟡 MED-09 — Arquivos `.bak` órfãos
- `routes/*.bak*`, `backup-pre-css-standard/`, `*copy.webp` em subprojetos `Base/`.

---

## 3. CONFLITOS ESTRUTURAIS

| Conflito | Detalhe |
|---|---|
| Módulos | `Vendas`/`vendas` (case) — duplicação real no Linux; labor-energy diverge |
| Rotas | nginx → 3002/3003 mortos (502); ecosystem 3001/3002 vs runtime 4001/4002 |
| Dashboard | `public/index.html` (legado) · `new_dashboard.html` (órfão) · `dashboard-v2/` (atual) |
| Ambientes | dev=Windows (case-insensitive, Drive) ≠ prod=Linux (case-sensitive) |

---

## 4. ANÁLISE FORENSE GIT

- Corrupção impede leitura de parte das trees → forense completa limitada.
- História recente coerente (padrão `feat:`/`fix:`/`chore:`, lotes de auditoria, fases SEFAZ). Sem sobrescrita maliciosa.
- `519ff534` ("servir dashboard-v2 como padrão") foi mudança **intencional**; o problema é o lixo deixado (`new_dashboard.html`), não regressão.
- Mudanças não commitadas eram correções legítimas (NFe→Faturamento, fix iframe/PDF, `controla_estoque`).

---

## 5/6. CORREÇÕES E MELHORIAS (pendentes)

- **ALTO-02:** padronizar case único de módulos na VPS (consolidar `Vendas`/`vendas`).
- **ALTO-05:** alinhar `ecosystem.*.config.js` ↔ portas reais (4001/4002) — fonte única da verdade.
- **MED-06:** remover/firewall Minecraft/AnyDesk/RustDesk.
- **MED-07:** rotação de `/var/www/backups`.
- **Arquitetura:** consolidar ecosystem num arquivo versionado; alerta de disco >80% e de upstream 502; documentar mapa porta↔app↔domínio; revisar CORS.

---

## 7. MAPA PORTA ↔ APP ↔ DOMÍNIO (VPS 31.97.64.102)

| Porta | Processo | Observação |
|---|---|---|
| 3000 | aluforce-v2-production (cluster) | upstream `aluforce_backend` (nginx) |
| 4001 | labor-eletric-demo | nginx `localhost:4001` |
| 4002 | labor-energy-demo | nginx `localhost:4002` |
| 3016 | zyntra-igrejas | `/igreja/` |
| 3020 | zyntra-ramos | snippet locations |
| 3002/3003 | (DOWN) WhatsApp / demo | rotas removidas do nginx (§8) |

---

## 8. AÇÕES JÁ EXECUTADAS (2026-05-29)

1. **CRIT-01 resolvido:** repositório migrado para fora do Google Drive → `C:\dev\Zyntra-clean` (`.git` íntegro). Commit `659f2ffe`; branch `repo-migration-clean` (PR). Set-diff de arquivos = 0 vs Drive; `server.js`/`routes` byte-idênticos.
2. **MED-08 resolvido:** `chmod 600` em `/var/www/{aluforce,labor-energy,labor-eletric}/.env`.
3. **ALTO-03 resolvido:** rotas `/whatsapp`, `/api/whatsapp/`, `/wbot-socket/` (3002) e `/zyntra-demo/` (3003) comentadas no nginx (backup `aluforce.bak-20260529`); `nginx -t` OK + reload.
4. **ALTO-04 resolvido:** `public/new_dashboard.html` órfão e `.bak` removidos do repo limpo.
