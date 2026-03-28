# Changelog — Zyntra ERP

Todas as alterações notáveis do projeto serão documentadas neste arquivo.

---

## [2.3.2] — 2026-03-28

### Corrigido (Auditoria Compras + PCP)
- **[CRITICAL] cotacoes.html**: Corrigido accent mismatch `cotaçãoId` → `cotacaoId` que impedia o toast de sucesso e a atualização da tabela após salvar cotação
- **[CRITICAL] cotacoes.html**: Corrigido accent mismatch `cotaçõesManager` → `cotacoesManager` (4 refs) — tabela não recarregava após save
- **[CRITICAL] relatorios.html**: Corrigido `RelatóriosCompras` → `RelatoriosCompras` — todas as 9 onclick dos cards de relatório PDF estavam quebradas (ReferenceError)
- **[CRITICAL] gestao-estoque.html**: Corrigido `fecharModal('modal-histórico')` → `modal-historico` — modal de histórico não fechava (user ficava preso)
- **[CRITICAL] faturamento.html (PCP)**: Adicionados 4 `<div class="metric-value">` com IDs (`fat-programados`, `fat-emitidos`, `fat-pendentes`, `fat-cancelados`) — cards de estatísticas crashavam com TypeError
- **[CRITICAL] estoque.html (PCP)**: Removidos acentos de 6 IDs HTML (`view-estoque-mínimo` → `minimo`, `máximo` → `maximo`, `est-mínimo`, `est-máximo`) + 4 refs no inline JS — ficha do produto exibia valores sempre zerados
- **[CRITICAL] gestao-producao.html (PCP)**: Corrigido `m.código` → `m.codigo` (2 refs) — tabela de máquinas renderizava `undefined` no campo código
- **[CRITICAL] ordem-compra.html (PCP)**: Adicionados 4 `<div class="metric-value">` com IDs (`oc-abertas`, `oc-aprovadas`, `oc-aguardando`, `oc-valor`) — cards de estatísticas crashavam
- **[CRITICAL] ordem-compra.html (PCP)**: Corrigido `item.código`/`item.descrição` → `item.codigo`/`item.descricao` — itens OC renderizavam `undefined`
- **[HIGH] relatorios.html**: Corrigido encoding corrupto `Diferena` → `Diferença`, `Atenão` → `Atenção` nos relatórios PDF de materiais críticos
- **[HIGH] relatorios.html**: Corrigido encoding PDF: `é` → `—` (em dashes), `s` → `às` no cabeçalho/rodapé do relatório
- **[HIGH] fornecedores.html**: Corrigida vulnerabilidade XSS — adicionada função `esc()` para sanitizar todos os campos da API antes de innerHTML no modal de visualização
- **[HIGH] fornecedores.html**: Corrigido accent fallback `f.avaliação` → `f.avaliacao || f.avaliação` na avaliação por estrelas
- **[HIGH] pedidos.js**: Adicionado `Authorization: Bearer` header em `carregarPedidos()` e `carregarFornecedores()` — requests falhavam com 401
- **[MEDIUM] requisicoes.html**: Corrigido encoding corrupto `requisiães` → `requisições`, `edião` → `edição` (toast + console)

### Auditoria
- 75 issues identificadas (13 CRITICAL, 19 HIGH, 27 MEDIUM, 15 LOW) nos módulos Compras (9 páginas) e PCP (7 páginas + 4 JS)
- 15 fixes aplicados cobrindo todos os CRITICAL e principais HIGH
- 10 arquivos modificados: 6 Compras + 4 PCP

### Implantação
- 10 arquivos deployados na VPS via SCP
- PM2 reiniciado com validação

---

## [2.3.1] — 2026-03-28

### Alterado
- **QR Code Integrado (Compras + PCP + RH)**: Funcionalidade de QR Code refatorada como painel inline interno ao módulo Compras (gestão de estoque), deixando de ser uma página separada (`qrcode-estoque.html`). Agora busca automaticamente em todos os módulos: Compras (matérias-primas), PCP (produtos acabados e materiais), RH (identificação de funcionário). Ação sugerida automática: matéria-prima → Entrada, produto acabado → Baixa/Saída
- **Sidebar Compras**: Todos os 7 botões QR Code na sidebar (index, fornecedores, requisições, cotações, recebimento, relatórios, gestao-estoque) agora redirecionam para o painel inline em `gestao-estoque.html?qr=1` ao invés da página standalone
- **Dashboard Compras**: Quick-action "QR Code Estoque" aponta para o painel integrado
- **QR Code Format**: Novo formato padronizado `ZYNTRA:MP:<código>` (matéria-prima), `ZYNTRA:PROD:<código>` (produto PCP), `ZYNTRA:MAT:<código>` (material PCP), `ZYNTRA:RH:<matrícula>` (funcionário). Compatível com formato antigo e labels PCP (JSON)
- **Filtro por Módulo**: Pills de filtro no painel QR (Todos, Compras MP, PCP Produtos, PCP Materiais, RH) para refinar buscas
- **Geração QR Multi-Módulo**: Tab "Gerar QR" busca e gera etiquetas para itens de Compras + PCP com prefixo de módulo

### Implantação
- 8 arquivos HTML deployados na VPS via SCP
- PM2 reiniciado

---

## [2.3.0] — 2026-03-27

### Adicionado
- **Contas a Receber — Módulo Completo**: Status dropdown (pendente/liquidada/parcial/vencida/protestada/cartório), campo pago_no_dia, aceita_troca_factory, upload de comprovante de pagamento, aba de rastreamento, simulador PM, aba FUNDOS, workbook switching (CR / CR Especiais / FUNDOS)
- **CNAB 240 — Contas a Pagar**: Multi-seleção de despesas com barra de ações, geração de remessa CNAB 240 (.REM) com Header/Lote/Segmento A+B/Trailers, importação de retorno CNAB (.RET) com parsing de Segmento A, baixa automática em lote, pagamento batch
- **Central de Relatórios PCP — 5ª Aba**: Relatórios de Apontamentos incorporados como aba "Apontamentos" na Central de Relatórios unificada — 5 KPIs (Funcionários Ativos, Horas Trabalhadas, Horas Produção, Total Apontamentos, Eficiência Geral), filtros (período, funcionário, atividade com 17 tipos, pedido), tabela detalhada, resumo por funcionário, distribuição por atividade (barra + legenda + tabela), indicadores de eficiência (produtivo, parada, manutenção, média/dia)
- **Migration DB**: `002-financeiro-schema-cr.js` — 7 novas colunas: pago_no_dia, aceita_troca_factory, comprovante_url, origem_integracao, dia_recomprado, data_para_cartorio, data_protestado
- **Catálogo de Relatórios**: 72+ relatórios mapeados e documentados em 8 módulos

### Alterado
- **Sidebar PCP Unificada**: Dois links separados de relatórios (Relatórios + Central) consolidados em único link "Relatórios" apontando para a Central unificada, em todas as 5 páginas PCP (index, ordens-producao, apontamentos, relatorios, relatorios-apontamentos)
- **Financeiro Server**: Novas rotas e suporte a colunas adicionais de Contas a Receber
- **package.json**: Versão atualizada para 2.3.0

### Implantação
- 46 arquivos deployados na VPS via SCP
- Migration DB executada com sucesso
- PM2 reiniciado (aluforce-v2-production + aluforce-pcp)

---

## [2.2.2] — 2026-03-25

### Adicionado
- **Condição de Pagamento**: Modal redesenhado com visual profissional (dark header, inputs focáveis), salva e carrega condições do banco de dados
- **Parcelas Automáticas**: Número de parcelas e tabela de vencimentos calculados automaticamente ao selecionar condição de pagamento
- **Contadores Padronizados**: Módulo NFe atualizado com footer links e padrão visual Compras (stat-card + stat-footer)
- **QR Code Estoque**: Integrado como funcionalidade no dashboard e sidebar do módulo Compras (ação rápida + botão lateral)
- **Ligações CDR**: Endpoints /ligacoes/cdr e /ligacoes/resumo com fallback gracioso

### Corrigido
- **Fix PDF Vendas**: Corrigido `token is not defined` na geração de PDF e `número is not defined` no nome do documento

---

## [2.2.1] — 2026-03-25

### Adicionado
- **Permissões logistica@**: Usuário de logística visualiza cards "Faturamento & Logística" e "Vendas" no dashboard
- **Novo Pedido de Venda**: Autocomplete de produtos exibe todos os itens (com e sem estoque)
- **Deploy VPS**: Pipeline de deploy funcional com pscp/plink

### Corrigido
- **Bug parsePermissao**: Corrigido parsing JSON do campo `areas` no `/api/me` (valores como `["nfe","vendas"]` eram corrompidos por split de vírgula antes do JSON.parse)

---

## [2.2.0] — 2026-03 (Março)

### Adicionado
- **QR Code Estoque**: Sistema de entrada/saída de materiais via QR Code no celular
- **Auto-Import Ponto**: Importação automática de marcações de ponto (Control iD)
- **Auditoria RH**: Correções de segurança (access control, XSS, validação)

### Alterado
- **Rebranding**: Nova identidade visual (Agência do Japa), remoção de referências concorrentes
- **Login**: Nova logo e rodapé atualizado

---

## [2.1.7] — 2026-03 (Março)

### Adicionado
- **Login Fix**: Correção no fluxo de autenticação (refresh tokens, CSRF, rate limiting)
- **Top Vendedores**: Ranking filtrado apenas por usuários com role `comercial`
- **Template Financeiro**: Novo template XLSX de importação de Contas a Pagar (62 colunas)
- **Padronização CSS**: 88 arquivos padronizados com design system unificado
- **Chat Teams**: Widget injetado automaticamente em todas as 85+ páginas
- **Chat DM**: Lista de contatos inteligente (recentes + online + todos)
- **Integração Bancária**: API completa com boletos, CNAB e pagamentos
- **Segurança**: Migração automática de schema, refresh tokens com rastreamento
- **Auditoria de Produção**: 53/53 verificações passando, dados reais validados

---

## [2.1.6] — 2026-02 (Fevereiro)

### Adicionado
- **BOB I.A.**: Assistente virtual integrado ao chat
- **Chat Teams**: Canais, DMs, áudio, arquivos, emojis
- **PWA**: Suporte offline completo com sync
- **Help Page**: Central de ajuda

---

## [2.1.5] — 2026-01 (Janeiro)

### Adicionado
- **NF-e completa**: Emissão, manifestação, importação XML
- **Módulo de Compras**: Requisições, cotações, pedidos de compra
- **PCP**: Ordens de produção com importação/exportação Excel
- **Conciliação Bancária**: Importação OFX/CNAB e conciliação automática
- **eSocial**: Integração com obrigações trabalhistas
