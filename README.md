<p align="center">
  <img src="public/images/zyntra-branco.png" alt="Zyntra ERP" width="200" />
</p>

<h1 align="center">🏭 ZYNTRA ERP — Sistema de Gestão Empresarial</h1>

<p align="center">
  <strong>Plataforma ERP completa para gestão industrial</strong><br>
  Desenvolvido pela <a href="https://www.aluforce.com.br">Aluforce Indústria e Comércio</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versão-2.1.7-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/status-Produção-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
</p>

---

## 📋 Sobre

O **Zyntra ERP** (anteriormente Aluforce ERP) é um sistema de gestão empresarial completo, desenvolvido para a indústria de alumínio. Oferece **10+ módulos integrados** cobrindo todas as operações da empresa — do pedido de venda à emissão de NF-e, do controle de produção à gestão financeira.

### ✨ Destaques

- 🖥️ **Interface moderna** — Design dark profissional com sidebar lateral
- 📱 **PWA ready** — Funciona offline com sincronização automática
- 💬 **Chat corporativo** — Zyntra Teams com canais, DMs, áudio, arquivos e BOB I.A.
- 🔒 **Segurança enterprise** — JWT, ACL, CSRF, rate limiting, LGPD
- 📊 **85+ páginas** — Cobertura total de processos empresariais
- 🤖 **Assistente IA** — BOB I.A. integrado em todas as telas

---

## 🚀 Módulos

| Módulo | Descrição | Páginas |
|--------|-----------|---------|
| 📊 **Dashboard** | KPIs, gráficos, alertas, painel executivo | 3 |
| 🛒 **Vendas** | Pedidos, orçamentos, kanban, comissões, tabelas de preço | 12 |
| 📦 **Compras** | Requisições, cotações, pedidos, entrada de notas | 8 |
| 🏭 **PCP** | Ordens de produção, apontamentos, materiais, relatórios Excel | 10 |
| 💰 **Financeiro** | Contas a pagar/receber, fluxo de caixa, DRE, conciliação, integração bancária | 12 |
| 👥 **RH** | Funcionários, cargos, folha de pagamento, ponto, férias | 8 |
| 🧾 **Faturamento/NF-e** | Emissão NF-e/NFS-e, importação XML, impostos, manifestação | 10 |
| 📦 **Estoque** | Inventário, movimentações, requisições, rastreabilidade | 6 |
| 🏢 **Clientes** | Cadastro completo, análise de crédito, histórico | 4 |
| 🤝 **Fornecedores** | Cadastro, avaliação, condições de pagamento | 3 |
| 📞 **Logística** | Romaneio, expedição, rastreamento | 4 |
| ⚙️ **Configurações** | 50+ categorias: empresa, impostos, certificados, integrações | 5 |

---

## 💬 Zyntra Teams — Chat Corporativo

Chat empresarial integrado em **todas as 85+ páginas** do sistema:

- **Canais** — Canais de equipe com admin controls
- **Mensagens Diretas** — DMs com contatos recentes e status online
- **BOB I.A.** — Assistente virtual 24/7 integrado
- **Compartilhamento** — Arquivos, imagens, áudio e documentos
- **Áudio** — Gravação e envio de mensagens de voz
- **Emojis** — 200+ emojis organizados por categoria
- **Status** — Online, Em Almoço, Em Reunião, Offline
- **Tempo real** — Socket.IO com indicadores de digitação

---

## 🔗 Integrações

| Integração | Status |
|------------|--------|
| 🏦 **Integração Bancária** | ✅ Produção (Boletos, CNAB, Pagamentos) |
| 📧 **Email SMTP** | ✅ Produção |
| 📱 **WhatsApp Business** | ✅ Produção |
| 🔄 **Omie ERP** | ✅ Produção |
| 🧾 **SEFAZ (NF-e/NFS-e)** | ✅ Produção |
| 🤖 **OpenAI (BOB I.A.)** | ✅ Produção |
| 📊 **Open Finance** | 🔄 Em desenvolvimento |

---

## 🛠️ Stack Tecnológica

### Backend
- **Node.js** 18.x + **Express** 4.x
- **MySQL** 8.0 com mysql2/promise
- **Socket.IO** 4.x (chat real-time)
- **JWT** autenticação + bcrypt
- **PM2** process manager (produção)
- **Multer** upload de arquivos

### Frontend
- **HTML5** + **CSS3** (design system proprietário)
- **JavaScript** vanilla (sem frameworks)
- **Chart.js** gráficos e dashboards
- **Socket.IO Client** real-time
- **PWA** + Service Worker

### Infraestrutura
- **VPS** Ubuntu 22.04
- **Nginx** reverse proxy
- **Let's Encrypt** SSL
- **PM2** clustering e monitoramento
- **Docker** suporte (docker-compose.yml)

---

## 📥 Instalação

### Pré-requisitos
- Node.js 18.x+
- MySQL 8.0+
- npm ou yarn

### Setup rápido

```bash
# 1. Clone o repositório
git clone https://github.com/jovemegidio/Zyntra.git
cd Zyntra

# 2. Instale as dependências
npm install

# 3. Configure o banco
mysql -u root -p -e "CREATE DATABASE aluforce_vendas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 5. Inicie o sistema
npm start
```

O sistema estará disponível em: `http://localhost:3000`

### Variáveis de Ambiente

```env
PORT=3000
DB_HOST=localhost
DB_USER=aluforce
DB_PASSWORD=sua_senha
DB_NAME=aluforce_vendas
DB_CONN_LIMIT=20
JWT_SECRET=sua_chave_secreta
SESSION_SECRET=outra_chave_secreta
NODE_ENV=production
```

### Produção com PM2

```bash
pm2 start ecosystem.production.config.js
pm2 save
pm2 startup
```

---

## 📁 Estrutura do Projeto

```
Zyntra/
├── server.js                    # Servidor principal Express
├── package.json                 # Dependências
├── ecosystem.production.config.js
├── docker-compose.yml
│
├── src/
│   ├── routes/                  # Rotas de autenticação
│   └── middleware/              # Middlewares (auth, security)
│
├── routes/                      # Rotas de API
│   ├── index.js                 # Registro central de rotas
│   ├── chat-routes.js           # Chat Teams API + Socket.IO
│   ├── integracao-bancaria.js   # Integração bancária
│   ├── vendas-extended.js       # API vendas extendida
│   ├── nfe-routes.js            # NF-e/NFS-e
│   └── ...                      # +30 arquivos de rotas
│
├── modules/                     # Módulos do sistema
│   ├── Vendas/                  # Módulo de vendas
│   │   ├── public/              # HTMLs do módulo
│   │   └── server.js            # Servidor do módulo
│   ├── Compras/
│   ├── PCP/
│   ├── Financeiro/
│   ├── RH/
│   ├── NFe/
│   ├── Faturamento/
│   ├── Clientes/
│   ├── Fornecedores/
│   ├── Logistica/
│   └── _shared/                 # Design system compartilhado
│
├── public/                      # Assets estáticos
│   ├── chat-teams/              # Chat widget (JS, CSS, assets)
│   ├── css/                     # Estilos globais
│   ├── js/                      # Scripts globais
│   ├── images/                  # Logos e ícones
│   └── avatars/                 # Fotos de perfil
│
├── templates/                   # Templates PDF/Excel
├── tests/                       # Testes automatizados
├── docs/                        # Documentação técnica
└── backups/                     # Backups automáticos
```

---

## 🔐 Segurança

- **JWT** — Tokens de autenticação com expiração
- **ACL** — Controle de acesso por módulo e função
- **bcrypt** — Hash de senhas
- **CSRF Protection** — Tokens anti-CSRF
- **Rate Limiting** — Proteção contra brute force (Redis-backed)
- **XSS Prevention** — Sanitização de inputs
- **HTTPS** — SSL/TLS obrigatório em produção
- **LGPD** — Módulo de criptografia PII
- **Audit Trail** — Logs de todas as ações

### Perfis de Acesso

| Perfil | Descrição |
|--------|-----------|
| 🔴 **admin** | Acesso total ao sistema |
| 🟠 **gerente** | Acesso gerencial com aprovações |
| 🟡 **vendedor** | Módulo de vendas |
| 🟢 **comprador** | Módulo de compras |
| 🔵 **financeiro** | Módulo financeiro |
| 🟣 **producao** | Módulo PCP |
| ⚪ **visualizador** | Apenas consultas |

---

## 🧪 Testes

```bash
# Teste de login
node tests/test-login.js

# Teste E2E com Playwright
npx playwright test

# Todos os testes
npm run test:ci

# Lint
npm run lint
```

---

## 📊 Changelog Recente

### v2.1.7 — Março 2026
- ✅ **Chat Teams** — Widget injetado automaticamente em todas as páginas
- ✅ **Chat DM** — Lista de contatos inteligente (recentes + online + todos)
- ✅ **Nomes** — Exibição de primeiro nome em todo o chat
- ✅ **Integração Bancária** — API completa com boletos, CNAB e pagamentos
- ✅ **Auto-inject CSS** — CSS do chat carregado automaticamente pelo JS

### v2.1.6 — Fevereiro 2026
- ✅ BOB I.A. — Assistente virtual integrado ao chat
- ✅ Chat Teams — Canais, DMs, áudio, arquivos, emojis
- ✅ PWA — Suporte offline completo com sync
- ✅ Help Page — Central de ajuda

### v2.1.5 — Janeiro 2026
- ✅ NF-e completa — Emissão, manifestação, importação
- ✅ Módulo de Compras — Requisições, cotações, pedidos
- ✅ PCP — Ordens de produção com Excel
- ✅ Conciliação Bancária
- ✅ eSocial

---

## 📞 Suporte

| Canal | Detalhes |
|-------|----------|
| 🤖 **BOB I.A.** | Assistente integrado 24/7 |
| 💬 **Chat Teams** | Chat corporativo interno |
| 📧 **Email** | suporte@aluforce.com.br |
| 📱 **Telefone** | (11) 91793-9089 |

---

## 📄 Licença

Software proprietário da **Aluforce Indústria e Comércio de Condutores**.

© 2025-2026 Aluforce. Todos os direitos reservados.

---

<p align="center">
  <sub>Desenvolvido com ❤️ pela equipe Aluforce Tecnologia</sub><br>
  <sub>CNPJ: 68.192.475/0001-60 | www.aluforce.com.br</sub>
</p>
