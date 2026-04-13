# PCP - Kanban Feature

## Objetivo
Adicionar um menu de três pontos (⋮) nos cards do Kanban de Ordens de Produção, permitindo ações rápidas (Gerar PDF, XML, Imprimir, Editar, Excluir) apenas para usuários do PCP com acesso máximo, com registro de todas as alterações.

---

## 1. Levantamento e Análise

### a) Localização dos Cards
- Os cards do Kanban estão em `modules/PCP/ordens-producao.html`.
- Classe principal dos cards: `.kanban-card`.
- Renderização provavelmente dinâmica via JS.

### b) RBAC (Controle de Acesso)
- Permissões PCP são controladas por coluna `permissoes` na tabela `usuarios`.
- Usuários com `permissoes` contendo `pcp,admin` têm acesso máximo.
- O frontend deve checar o nível de permissão do usuário logado antes de exibir as opções.

### c) Registro de Alterações
- Toda ação (Editar, Excluir, etc.) deve ser registrada (log/auditoria).
- Ideal: endpoint backend para registrar logs de ações dos cards.

### d) UI/UX
- O menu de três pontos deve ser discreto, acessível e não interferir no drag & drop do Kanban.
- Modal ou menu dropdown para as opções.

---

## 2. Passos para Implementação

1. **Identificar o ponto de renderização dos cards**
   - Localizar no JS responsável onde os cards `.kanban-card` são criados.

2. **Adicionar o botão/menu de três pontos**
   - Inserir o botão ⋮ em cada card.
   - Criar o menu/modal com as opções: Gerar PDF, Gerar XML, Imprimir, Editar, Excluir.

3. **Controle de Permissão (RBAC)**
   - No carregamento da página, obter as permissões do usuário logado.
   - Exibir o menu apenas para usuários com permissão máxima (ex: `pcp,admin`).

4. **Implementar Handlers das Ações**
   - Cada opção do menu deve chamar a função correspondente (PDF, XML, etc.).
   - Editar e Excluir devem abrir modais de confirmação.

5. **Registrar as Ações (Auditoria)**
   - Toda ação deve ser registrada via chamada a um endpoint de log/auditoria.
   - Registrar: usuário, ação, data/hora, id da ordem.

6. **Testes**
   - Testar com usuários de diferentes permissões.
   - Garantir que o menu só aparece para quem deve.
   - Validar registro de logs.

---

## 3. Pontos de Atenção
- Não quebrar o funcionamento do Kanban (drag & drop).
- Garantir acessibilidade do menu.
- Garantir segurança: não permitir ações via manipulação de DOM/JS para usuários sem permissão.
- UI consistente com o restante do sistema.

---

## 4. Sugestão de Estrutura do Menu

- Botão ⋮ no canto superior direito do card.
- Menu dropdown ou modal com:
  - Gerar PDF
  - Gerar XML
  - Imprimir
  - Editar
  - Excluir

---

## 5. Checklist para Implementação
- [ ] Identificar renderização dos cards
- [ ] Adicionar botão/menu ⋮
- [ ] Criar menu/modal de opções
- [ ] Integrar RBAC no frontend
- [ ] Implementar handlers das ações
- [ ] Integrar registro de logs/auditoria
- [ ] Testar permissões e logs

---

## 6. Referências
- `modules/PCP/ordens-producao.html` (HTML/CSS dos cards)
- `modules/PCP/configurar_acesso_pcp.js` (lógica de permissões)
- Backend: endpoint de auditoria/log (a ser criado ou utilizado)

---

> Este README serve como guia para implementação da feature de menu de ações nos cards do Kanban do PCP.
