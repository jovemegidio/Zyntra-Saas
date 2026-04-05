# 📋 RELATÓRIO DE ACESSOS - ALUFORCE
### 🗓 Gerado em: 05/04/2026

---

## 🔐 ADMINISTRADORES

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 1 | Antônio Egidio Neto | ti@aluforce.com.br | ✅ Ativo |
| 2 | Andréia Trovão | andreia@aluforce.com.br | ✅ Ativo |
| 3 | Douglas Scarcella | douglas@aluforce.com.br | ✅ Ativo |
| 4 | Fernando Kofugi | fernando.kofugi@aluforce.com.br | ✅ Ativo |

### ⚠️ Administradores com problemas de login:

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 5 | Diego Lucena | diego.lucena@lumiere... | ⚠️ Erro de login |
| 6 | Maurício Torrolho | mauricio.torrolho@lumiere... | ⚠️ Erro de login |
| 7 | Jamerson Ribeiro | jamerson.ribeiro@lumiere... | ⚠️ Erro de login |

> **Nota:** Contas Lumiere apresentavam erro de login (domínio externo). Rate-limit de autenticação foi ajustado de 5 para 20 tentativas/15min. Login agora aceita campo `email` ou `login` (CPF).

---

## 💼 COMERCIAL

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 1 | Augusto Ladeira | augusto.ladeira@aluforce.com.br | ✅ Ativo |
| 2 | Fabiano Marques | fabiano.oliveira@aluforce.com.br | ✅ Ativo |
| 3 | Fabíola de Souza | fabiola.santos@aluforce.com.br | ✅ Ativo |
| 4 | Márcia Scarcella | marcia.scarcella@aluforce.com.br | ✅ Ativo |
| 5 | Renata Maria Batista | renata.nascimento@aluforce.com.br | ✅ Ativo |

---

## 🏭 PRODUÇÃO

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 1 | Ana Paula Ferreira | ana.nascimento@aluforce.com.br | ✅ Ativo |
| 2 | Bruno Felipe | bruno.freitas@aluforce.com.br | ✅ Ativo |
| 3 | Christian Alves | christian.santos@aluforce.com.br | ✅ Ativo |
| 4 | Clayton Rodrigo | clayton.costa@aluforce.com.br | ✅ Ativo |
| 5 | Clemerson Leandro | clemerson.silva@aluforce.com.br | ✅ Ativo |
| 6 | Guilherme Dantas | guilherme.bastos@aluforce.com.br | ✅ Ativo |
| 7 | Lucas de Souza | leonardo.freitas@aluforce.com.br | ✅ Ativo |
| 8 | Marcos Alexandre Filho | marcos.filho@aluforce.com.br | ✅ Ativo |
| 9 | Ramon de Oliveira | ramon.lima@aluforce.com.br | ✅ Ativo |
| 10 | Robson Gonçalves | robson.goncalves@aluforce.com.br | ✅ Ativo |
| 11 | Ronaldo Santana | ronaldo.santana@aluforce.com.br | ✅ Ativo |
| 12 | Thiago Scarcella | thiago.scarcella@aluforce.com.br | ✅ Ativo |
| 13 | Willian Cardoso | willian.silva@aluforce.com.br | ✅ Ativo |

---

## 💰 FINANCEIRO

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 1 | Eldir Tolentino Jr | junior@aluforce.com.br | ✅ Ativo |
| 2 | Helen Cristina | hellen.nascimento@aluforce.com.br | ✅ Ativo |

---

## 👥 RH

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 1 | Isabela Ramos | rh@aluforce.com.br | ✅ Ativo |

---

## 🏢 ADMINISTRATIVO

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 1 | Paula Regina | paula.souza@aluforce.com.br | ✅ Ativo |
| 2 | Regina Balotti | regina.ballotti@aluforce.com.br | ✅ Ativo |

---

## 🧹 CONSERVAÇÃO

| # | Nome | Login (E-mail) | Status |
|---|------|----------------|--------|
| 1 | Vera Lucia | vera.souza@aluforce.com.br | ✅ Ativo |

---

## ⚠️ INATIVOS

| # | Nome | Status |
|---|------|--------|
| 1 | Ariel da Silva | ❌ Inativo |
| 2 | Felipe Simões | ❌ Inativo |
| 3 | Flávio dos Reis | ❌ Inativo |
| 4 | Laís da Silva | ❌ Inativo |
| 5 | Nicolas Daniel | ❌ Inativo |
| 6 | Thainá Cabral | ❌ Inativo |
| 7 | Kissia / Sarah (Ex-colab.) | ❌ Inativo |

---

## 📝 RESUMO GERAL

| Métrica | Valor |
|---------|-------|
| 👥 Total de usuários | 40 |
| ✅ Ativos | 32 |
| ❌ Inativos | 7 |
| ⚠️ Com erro de login | 3 (Lumiere) |

---

## 🔑 ACESSO AO SISTEMA

| Item | Detalhe |
|------|---------|
| 🔗 Link | https://aluforce.api.br |
| 🔓 Senha Padrão | `alu0103` |
| 📧 Login | E-mail corporativo ou CPF |
| 📜 Política | Trocar senha no 1º acesso |

---

## 🔧 CORREÇÕES APLICADAS (05/04/2026)

### Módulo Vendas:
- ✅ Condição de pagamento "À Vista" agora é preenchida automaticamente ao abrir novo pedido
- ✅ Rota de baixa de estoque (`/api/vendas/pedidos/:id/baixar-estoque`) adicionada — corrige erro 404 ao aprovar pedido
- ✅ Numeração de pedidos (`numero_pedido`) incluída na consulta — exibição correta em todas as views
- ✅ Erro 500 ao criar pedido corrigido (fallback de `empresa_id` para empresa padrão)

### Módulo PCP:
- ✅ Ordens locais obsoletas não são mais sincronizadas com o servidor (corrige PUT 404)

### Autenticação:
- ✅ Rate-limit de login ajustado de 5 para 20 tentativas por 15 min
- ✅ Login agora aceita campo `email` OU `login` (CPF) para autenticação

---

*Documento gerado automaticamente — Zyntra ERP v2.0*
