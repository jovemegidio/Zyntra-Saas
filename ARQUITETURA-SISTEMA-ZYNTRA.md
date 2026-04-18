# Arquitetura do Sistema Zyntra ERP
**Versão:** 1.0 — Abril 2026  
**Público-alvo:** Agentes de IA, novos desenvolvedores, revisores técnicos

---

## 1. Missão do Sistema

O **Zyntra ERP** é um sistema de gestão empresarial integrado, projetado para empresas brasileiras de manufatura e comércio. Sua missão é centralizar e automatizar os processos de Vendas, Produção (PCP), Compras, Recursos Humanos, Financeiro, Faturamento, Logística e Emissão de NF-e em uma única plataforma multi-tenant, com conformidade total à LGPD e às normas fiscais brasileiras (NFe 4.0, SPED).

**Princípios invioláveis:**
- Um único token de identidade (JWT HttpOnly) navega por todos os módulos.
- Nenhum dado pessoal (CPF, PIS) trafega ou repousa sem criptografia AES-256-GCM.
- Toda operação de escrita é rastreável por usuário, timestamp e empresa (tenant).

---

## 2. Padrões Arquiteturais Não-Negociáveis

### 2.1 Autenticação e Autorização (FONTE ÚNICA)

| Artefato | Arquivo canônico | Proibido |
|---|---|---|
| Middleware de auth | `middleware/auth-central.js` | Redefinir `authenticateToken` localmente em qualquer server.js |
| Verificação de permissões | `services/permission.service.js` | Checar permissões com SQL inline fora do service |
| Guardar segredo JWT | `process.env.JWT_SECRET` | Hardcode ou fallback `'secret'` |
| Controle de sessão | Cookie `HttpOnly; Secure; SameSite=Strict` | Armazenar JWT em localStorage ou query string |

**Middlewares disponíveis em auth-central.js:**

```
authenticateToken  →  verifica JWT + popula req.user
requireAdmin       →  bloqueia se !isAdmin
requireModule(mod) →  verifica acesso ao módulo
requireAction(act) →  verifica permissão granular (ler/escrever/deletar)
writeGuard         →  bloqueia métodos POST/PUT/DELETE sem permissão de escrita
checkOwnership     →  valida que req.user.id == registro.owner_id (parameterized SQL)
optionalAuth       →  popula req.user se token presente, não bloqueia se ausente
```

### 2.2 Banco de Dados (FONTE ÚNICA)

```
Pool canônico: database/pool.js
  connectionLimit : 15
  driver          : mysql2/promise
  charset         : utf8mb4
```

- **Proibido**: criar pool local nos servers de módulo (ex.: `mysql.createPool({ connectionLimit: 20 })`).
- **Proibido**: interpolação de variáveis em SQL — usar apenas `?` (placeholders posicionais) ou `??` (identificadores).
- **ORDER BY dinâmico**: sempre usar `ORDER_MAP` — whitelist de colunas permitidas antes de inserir na query.

### 2.3 CORS

```
Config canônica: config/cors.js  (corsOptions + allowedOrigins)
```

- Nenhum `res.header('Access-Control-Allow-Origin', '*')` inline.

### 2.4 Tratamento de Erros

```
Handler canônico: middleware/error-handler.js
  Trata: MulterError, CORSError, FileTypeError, erros genéricos
```

- Toda rota deve repassar erros para o handler via `next(err)` — não fazer `res.status(500).send(e.message)`.
- **Proibido**: expor stack traces em respostas de produção (`NODE_ENV=production`).

### 2.5 Isolamento de Tenant

Todas as queries SQL que acessam dados de negócio devem incluir filtro:

```sql
WHERE empresa_id = ?   -- parâmetro obrigatório, nunca interpolado
```

Exceções documentadas: tabelas de lookup global (estados, CFOP, NCM).

### 2.6 Criptografia de PII (LGPD)

```
Módulo canônico: lgpd-crypto.js
  Algoritmo : AES-256-GCM
  Chave     : process.env.PII_ENCRYPTION_KEY (obrigatório em prod)
```

**Campos obrigatoriamente criptografados antes de persistir:**

| Campo | Entidade |
|---|---|
| CPF | Funcionários, Clientes (pessoa física) |
| PIS/PASEP | Funcionários |

**Campos deliberadamente NÃO criptografados:**

| Campo | Motivo |
|---|---|
| CNPJ | Dado público — pessoa jurídica não é PII (LGPD Art. 5º, I) |
| Salário | Numérico — protegido por RBAC + audit log, não por criptografia |

**Helper padrão:**

```javascript
const _enc = (val) => (lgpdCrypto?.encryptPII) ? lgpdCrypto.encryptPII(val) : val;
```

---

## 3. Dicionário de Domínio (Modelo Canônico)

### Entidades Principais

| Termo de Domínio | Tabela MySQL | Descrição |
|---|---|---|
| **Empresa** | `empresas` | Tenant. Toda entidade de negócio tem `empresa_id`. |
| **Pedido** | `pedidos` | Ordem de venda. Criado em Vendas, faturado em Faturamento. |
| **Ordem de Produção (OP)** | `ordens_producao` | Gerada a partir do Pedido pelo PCP. |
| **Apontamento** | `apontamentos_producao` | Registro de execução de tarefa em uma OP. |
| **NF-e** | `notas_fiscais` | Documento fiscal eletrônico emitido via módulo NFe (SEFAZ). |
| **Fornecedor** | `fornecedores` | Pessoa jurídica fornecedora. CNPJ como chave natural. |
| **Cliente** | `clientes` | Pessoa física ou jurídica compradora. CPF criptografado se PF. |
| **Funcionário** | `funcionarios` | Empregado com CPF/PIS criptografados (LGPD). |
| **Holerite** | `holerites` | Contracheque mensal. Gerado em PDF pelo módulo RH. |
| **Produto** | `produtos` | SKU com NCM, unidade, estoque atual e custo médio. |
| **Lead** | `leads` | Prospect em pipeline CRM (Kanban de vendas). |
| **Usuário** | `usuarios` | Conta de acesso. `isAdmin` e permissões por módulo. |

### Status de Ciclo de Vida — Pedido

```
Orçamento → Em aberto → Aprovado → Em produção (OP criada) → Pronto → Faturado (NF-e emitida) → Entregue
```

### Status de Ciclo de Vida — Ordem de Produção

```
Aberta → Em andamento → Pausada → Concluída → Cancelada
```

---

## 4. Arquitetura de Módulos

### 4.1 Topologia de Processos

```
Processo PM2                  Porta    Responsabilidade
─────────────────────────────────────────────────────────
server.js (gateway/root)      3000     Auth global, rotas estáticas, /api/me, chat
modules/Vendas/server.js      3001     Pedidos, CRM/Leads, catálogo, NDFs
modules/PCP/server.js         3002     Ordens de Produção, Kanban, Apontamentos, Estoque
modules/RH/server.js          3003     Funcionários, Holerites, Contratos (PDF)
modules/Compras/server.js     3004     POs, Fornecedores, NF Entrada, Aprovações
modules/Faturamento/server.js 3005     Faturar pedidos, emissão XML/PDF, logística
modules/Financeiro/server.js  3006     Contas a pagar/receber, Fluxo de caixa, DRE
modules/NFe/server.js         3007     Comunicação SEFAZ, assinar/transmitir NF-e
modules/Logistica/server.js   3008     Rastreamento, transportadoras, entregas
```

### 4.2 Dependências Compartilhadas (Camada `/shared`)

```
database/pool.js              ← todos os módulos
middleware/auth-central.js    ← todos os módulos
middleware/error-handler.js   ← todos os módulos
config/cors.js                ← todos os módulos
services/permission.service.js ← auth-central internamente
lgpd-crypto.js                ← RH, Vendas, Compras
routes/pdf-template.js        ← RH (holerites), Faturamento (boletos/NF PDF)
```

### 4.3 Estrutura Interna de Cada Módulo

```
modules/<Modulo>/
  server.js          ← Express app do módulo, monta rotas, usa shared middleware
  public/            ← HTMLs e assets estáticos servidos pelo próprio módulo
    css/             ← CSS específico do módulo
    js/              ← JS específico do módulo
routes/
  <modulo>-routes.js     ← rotas principais (pode ser dividido em sub-arquivos)
  <modulo>/
    <dominio>-routes.js  ← sub-rotas extraídas (padrão Mixin: export function(router, deps))
```

---

## 5. Ciclo de Vida de uma Requisição — Ponta a Ponta

### 5.1 Fluxo Padrão (Requisição Autenticada)

```
Browser
  │  HTTP Request (Cookie: jwt=<token>)
  ▼
Nginx (reverse proxy)
  │  proxy_pass → localhost:<porta_do_modulo>
  ▼
Express (module server.js)
  │
  ├─ [1] cors(corsOptions)            ← config/cors.js
  ├─ [2] helmet()                     ← headers de segurança HTTP
  ├─ [3] express.json({ limit:'10mb'})
  ├─ [4] authenticateToken            ← middleware/auth-central.js
  │        ├─ extrai JWT do cookie
  │        ├─ verifica assinatura (JWT_SECRET)
  │        ├─ popula req.user = { id, email, empresa_id, isAdmin, permissions }
  │        └─ em falha: 401 + { code:'AUTH_EXPIRED' } → frontend tenta refresh
  │
  ├─ [5] requireModule('Vendas')      ← verifica permissions via permission.service.js
  │        └─ cache 5min TTL em memória
  │
  ├─ [6] Route Handler
  │        ├─ Validação de entrada (parseInt, whitelist, parameterized query)
  │        ├─ checkOwnership (se rota de recurso próprio)
  │        ├─ pool.query(SQL, [params])   ← database/pool.js
  │        └─ res.json(payload)
  │
  └─ [7] error-handler.js             ← captura next(err), formata resposta segura
```

### 5.2 Refresh de Token (auth-unified.js — Frontend)

```
Interceptor detecta 401 com code:'AUTH_EXPIRED'
  │
  ├─ POST /api/auth/refresh  (envia refreshToken cookie)
  │    └─ server.js emite novo accessToken (15min) + rotaciona refreshToken
  │
  └─ Reenvia requisição original com novo token
```

Se refresh falhar → `window.location.href = '/login'`

---

## 6. Pontos de Transformação de Dados

### 6.1 Ciclo Pedido → NF-e (Transformação JSON → XML)

```
Pedido (JSON, tabela `pedidos`)
  │
  ▼  [Faturamento/server.js] — montar objeto de nota
  NF-e Object (JS/JSON)
    { ide, emit, dest, det[], total, transp, cobr, infAdic }
    ↑ adaptado ao leiaute SEFAZ NF-e 4.0
  │
  ▼  [modules/NFe/server.js] — serializar
  XML assinado (xmlbuilder2 + certificado A1 .pfx)
  │
  ▼  HTTPS → SEFAZ (webservice SOAP)
  retorno XML com chave de acesso (44 dígitos) + protocolo
  │
  ▼  parsear resposta XML → JSON
  { chave, protocolo, status:'100', dhRecbto }
  │
  ▼  gravar em `notas_fiscais` + atualizar `pedidos.status = 'faturado'`
```

### 6.2 Holerite (Transformação JSON → PDF)

```
Dados do funcionário (JSON, tabela `funcionarios` + `holerites`)
  │
  ▼  lgpd-crypto.decryptPII(cpf)   ← desencripta para exibição
  │
  ▼  routes/pdf-template.js — defaultPDFHeader(doc, opts)
  Buffer PDF (pdfkit)
  │
  ▼  res.setHeader('Content-Type','application/pdf')
     res.send(buffer)
```

### 6.3 Importação de XML de NF de Entrada (Transformação XML → SQL)

```
XML da NF-e do fornecedor (upload multipart)
  │
  ▼  xml2js.parseStringPromise(xml)
  Objeto JS com estrutura SEFAZ
  │
  ▼  Extração: emit (fornecedor), dest (empresa), det[] (itens), total
  │
  ▼  Upsert em: `fornecedores`, `nf_entrada`, `nf_entrada_itens`
     empresa_id injetado em todos os registros
```

### 6.4 Autocomplete / Busca (JSON → SQL LIKE → JSON)

```
req.query.q  →  '%' + sanitize(q) + '%'
             →  SELECT ... WHERE nome LIKE ? LIMIT 20
             →  [ { id, nome, cnpj } ]   (sem SELECT *)
```

---

## 7. Adaptadores e Integrações Externas

| Adapter | Arquivo | Protocolo | Direção |
|---|---|---|---|
| SEFAZ NF-e | `modules/NFe/server.js` | HTTPS/SOAP | Saída (emissão) + Entrada (consulta) |
| SMTP (e-mail) | `email-service.js` | SMTP/TLS | Saída |
| WhatsApp (Evolution API) | `ecosystem.whatsapp.config.js` | HTTP/REST | Saída |
| n8n (automação) | `deploy-n8n.ps1` + webhooks | HTTP/REST | Entrada (webhook) + Saída (trigger) |
| Redis (rate-limit / cache) | `middleware/rate-limiter.js` | Redis protocol | Local |
| Receita Federal (CNPJ) | `enrich-cnpj.js` | HTTPS/REST | Saída (enrich) |

---

## 8. Variáveis de Ambiente Obrigatórias

```env
# Segurança
JWT_SECRET                  # 256-bit mínimo — usado por todos os módulos
PII_ENCRYPTION_KEY          # 32 bytes hex — AES-256-GCM para CPF/PIS
COOKIE_SECRET               # assinatura de cookies de sessão

# Banco de dados
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# NFe
NFE_CERT_PATH               # caminho do .pfx
NFE_CERT_PASSWORD           # senha do certificado A1
NFE_AMBIENTE                # '1' = produção, '2' = homologação

# E-mail
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

# URLs
FRONTEND_URL                # origem permitida em cors.js
```

**Em produção (`NODE_ENV=production`):**
- `PII_ENCRYPTION_KEY` ausente → processo recusa inicialização (`config/env.js`).
- `JWT_SECRET` ausente → processo recusa inicialização.
- Stack traces nunca expostos em respostas HTTP.

---

## 9. Convenções de Código

| Regra | Padrão |
|---|---|
| Imports de auth | `const { authenticateToken, requireModule } = require('../../middleware/auth-central')` |
| Imports de pool | `const pool = require('../../database/pool')` |
| Query parameterizada | `pool.query('SELECT * FROM x WHERE id = ?', [id])` |
| ORDER BY dinâmico | `const ORDER_MAP = { nome:'nome', data:'criado_em' }; const col = ORDER_MAP[req.query.sort] \|\| 'nome'` |
| Exportação de sub-rotas | `module.exports = function(router, deps) { router.get(...) }` (padrão Mixin) |
| bcrypt | **sempre `bcryptjs`** (puro JS, compatível cross-platform) |
| Identificadores de tabela | usar `??` em placeholders — nunca interpolação de string |

---

## 10. Decisões Arquiteturais Registradas (ADRs)

| ID | Decisão | Motivo |
|---|---|---|
| ADR-001 | Pool único `database/pool.js` (connectionLimit: 15) | Evitar esgotamento de conexões MySQL com 9 processos PM2 |
| ADR-002 | JWT em HttpOnly cookie + refresh token rotation | Mitigar XSS; token de acesso com TTL 15min |
| ADR-003 | CNPJ não criptografado | Pessoa jurídica não é dado pessoal (LGPD Art. 5º, I) |
| ADR-004 | Salário protegido por RBAC, não criptografia | Valor numérico usado em SUM/AVG — criptografar impediria queries |
| ADR-005 | bcryptjs em vez de bcrypt nativo | Deploy em VPS sem toolchain de compilação nativa |
| ADR-006 | Sub-rotas via padrão Mixin | Reduzir tamanho do god-object pcp-routes.js (12k → 8.9k linhas) sem alterar URLs |
| ADR-007 | `ORDER BY` sempre via `ORDER_MAP` | Prevenir SQL injection em colunas dinâmicas |
| ADR-008 | PII_ENCRYPTION_KEY obrigatória em produção | `config/env.js` recusa boot — impede deploy acidental sem chave |
