# GloryBank — Internet Banking Digital

<p align="center">
  <a href="https://jovemegidio.github.io/GloryBank"><img src="https://img.shields.io/badge/Landing%20Page-GitHub%20Pages-0f172a?style=for-the-badge&logo=github" alt="Landing Page"/></a>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/jovemegidio/GloryBank&env=JWT_SECRET,DEMO_MODE,NEXT_PUBLIC_APP_URL&envDescription=Configure%20a%20URL%20online%20da%20apresenta%C3%A7%C3%A3o%20e%20publique%20em%20modo%20demo&project-name=glorybank"><img src="https://vercel.com/button" alt="Deploy with Vercel"/></a>
  <img src="https://img.shields.io/badge/Presentation%20Mode-Online-red?style=for-the-badge" alt="Presentation Mode"/>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js 16"/>
</p>

<p align="center">
  Repositório preparado para apresentação online de um internet banking profissional.<br/>
  O foco aqui é demonstração visual e navegação em modo demo, sem fluxo local documentado no git.
</p>

---

## Apresentação online

| Item | Link |
|---|---|
| Landing institucional | https://jovemegidio.github.io/GloryBank |
| Código-fonte | https://github.com/jovemegidio/GloryBank |
| Deploy online | via Vercel com modo demo |

Credenciais de apresentação:

| Campo | Valor |
|---|---|
| Login | `demo@glorybank.com` |
| Senha | `Demo@123456` |

> O botão "Entrar como Demo" na tela de login faz o acesso com um clique.

---

## Publicação online em 1 clique

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jovemegidio/GloryBank&env=JWT_SECRET,DEMO_MODE,NEXT_PUBLIC_APP_URL&envDescription=Configure%20somente%20a%20URL%20online%20da%20apresenta%C3%A7%C3%A3o&project-name=glorybank&demo-title=GloryBank&demo-description=Internet%20Banking%20Digital%20para%20apresenta%C3%A7%C3%A3o)

Variáveis mínimas para a apresentação online:

| Variável | Valor |
|---|---|
| `DEMO_MODE` | `true` |
| `JWT_SECRET` | string aleatória com 64+ caracteres |
| `NEXT_PUBLIC_APP_URL` | URL pública do deploy |

---

## O que está pronto para demo

| Funcionalidade | Status |
|---|---|
| Login / Logout | ✅ |
| Dashboard com saldo | ✅ |
| Extrato com transações | ✅ |
| PIX simulado | ✅ |
| Boleto simulado | ✅ |
| Transferências simuladas | ✅ |
| Visual mobile | ✅ |
| Navegação institucional | ✅ |

---

## Direção do projeto

- Apresentação visual de internet banking com identidade premium
- Navegação em modo demo, sem dependência de infraestrutura local descrita no repositório
- Landing em GitHub Pages para showcase
- Aplicação Next.js pronta para publicação online em modo demonstração

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.2 |
| Linguagem | TypeScript 5 |
| UI | Tailwind CSS v4 |
| Formulários | react-hook-form + Zod |
| Autenticação demo | JWT HttpOnly |
| Integração futura | Prisma + Asaas |

---

## Segurança

| Medida | Descrição |
|---|---|
| JWT HttpOnly | Cookie não acessível via JavaScript |
| bcrypt 12 rounds | Hash seguro de senhas |
| Rate Limiting | Proteção de rotas críticas |
| Security Headers | Cabeçalhos defensivos em todas as respostas |
| Middleware | Verificação de sessão nas rotas protegidas |
| Zod | Validação de entrada nas APIs |

---

## GitHub Pages

A landing page estática de apresentação está em `docs/index.html`.

Publicação: **Settings → Pages → Source → branch `main` → `/docs`**

---

## Licença

MIT
