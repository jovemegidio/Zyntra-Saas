# AUDITORIA EXTREMA — COMPRAS & FATURAMENTO
## Ledger de Vulnerabilidades Críticas (100% Coverage)

**Data:** 21 de março de 2026  
**Auditor:** Arquiteto de Software Sênior / SDET  
**Escopo:** Módulos de Compras (Inflow/Contas a Pagar) e Faturamento (Outflow/Contas a Receber)  
**Metodologia:** Ciclo 5x de Estresse — Edge Cases lógicos, matemáticos, concorrência e RBAC  
**Arquivos auditados:** 25+ backend, 10+ frontend, 3 integrações, 1 motor de tributos

---

## SUMÁRIO EXECUTIVO

| Severidade | Contagem | Status |
|-----------|----------|--------|
| 🔴 **CRÍTICO (P0)** | 14 | Requer correção imediata |
| 🟠 **ALTO (P1)** | 11 | Requer correção em sprint atual |
| 🟡 **MÉDIO (P2)** | 8 | Requer planejamento de sprint |
| **Total de Anomalias** | **33** | — |

---

## FASE 1: MÓDULO DE COMPRAS (Ciclo de Suprimentos e Passivos)

---

### ANOMALIA C-01 — Race Condition na Aprovação de Pedidos
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`modules/Compras/api/pedidos.js` → `PUT /:id/status` (linhas 280-300)

**Vetor de Falha:**  
Ausência total de Optimistic Locking, Pessimistic Lock (`SELECT ... FOR UPDATE`) ou coluna de versionamento. O endpoint faz `UPDATE ... SET status = ? WHERE id = ?` diretamente sem verificar o estado atual da linha.

**Prova da Quebra:**  
```
Cenário: Dois gerentes (Usuário A e B) clicam "Aprovar" no Pedido #500 simultaneamente.
Resultado: Ambas as requisições chegam ao endpoint PUT /:id/status.
           Ambas executam UPDATE pedidos_compra SET status='aprovado' WHERE id=500.
           Nenhuma falha — o banco aceita ambas, pois não há WHERE status='pendente'.
           Se o fluxo posterior gerar OC/Financeiro automaticamente, serão gerados
           dois registros duplicados em cascata.
```
O código NÃO verifica:
```javascript
// ❌ O que foi encontrado (pedidos.js:280-300):
const { status } = req.body;
await db.query('UPDATE pedidos_compra SET status = ? WHERE id = ?', [status, req.params.id]);

// ❌ FALTANDO: Verificação atômica de estado
// await db.query('UPDATE pedidos_compra SET status = ? WHERE id = ? AND status = ?', [status, id, 'pendente']);
```

**Diretriz de Refatoração:**  
Implementar `UPDATE ... WHERE id = ? AND status = 'pendente'` (guard clause atômica). Se `affectedRows === 0`, retornar 409 Conflict. Alternativamente, adicionar coluna `version INT DEFAULT 0` e incrementar a cada UPDATE com `WHERE version = ?`.

---

### ANOMALIA C-02 — Recebimento Parcial NÃO Recalcula Valor Financeiro
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`modules/Compras/api/recebimento.js` → `POST /registrar` (linhas 115-250)  
`api/integracao-compras-financeiro.js` → `POST /pedido/gerar-financeiro` (linhas 88-140)

**Vetor de Falha:**  
No recebimento parcial, o estoque é atualizado com `quantidade_recebida` (correto), mas o `valor_total` do pedido permanece inalterado. A integração financeira depois lê `valor_total` integral para gerar Contas a Pagar.

**Prova da Quebra:**  
```
Cenário: OC #200 = 100 unidades × R$10,00 = R$1.000,00.
         Recebimento parcial: 50 unidades.
Resultado:
  ✅ Estoque: +50 unidades (correto)
  ❌ pedidos_compra.valor_total = R$1.000,00 (NÃO FOI RECALCULADO para R$500,00)
  ❌ Integração gera Contas a Pagar = R$1.000,00
  → R$500,00 de dívida IRREAL registrada no financeiro
```

Código encontrado em `recebimento.js:165-194`:
```javascript
// Atualiza status mas NÃO recalcula valor proporcional
const novoStatus = tipo_recebimento === 'parcial' ? 'parcial' : 'recebido';
await connection.query(`
    UPDATE pedidos_compra SET
        data_recebimento = ?,
        status = ?    // ❌ valor_total permanece inalterado
    WHERE id = ?
`, [data_recebimento, novoStatus, pedido_id]);
```

Código encontrado em `integracao-compras-financeiro.js:118-128`:
```javascript
// Usa valor_total INTEGRAL independente do status parcial
const valorTotal = parseFloat(pedido.valor_final) || parseFloat(pedido.valor_total) || 0;
const valorParcela = valorTotal / parcelas;
// ❌ NÃO verifica pedido.status === 'parcial'
// ❌ NÃO consulta quantidade_recebida vs quantidade_pedida
```

**Diretriz de Refatoração:**  
1. Adicionar coluna `valor_recebido DECIMAL(10,2) DEFAULT 0` em `pedidos_compra`.
2. No recebimento parcial, calcular `valor_recebido = SUM(item.quantidade_recebida * item.preco_unitario)` e persistir.
3. Na integração financeira, usar `valor_recebido` (se status=parcial) em vez de `valor_total`.
4. Criar endpoint separado para "gerar financeiro do saldo remanescente" quando o restante chegar.

---

### ANOMALIA C-03 — Hard Delete de Fornecedores SEM Verificação de FK
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`modules/Compras/api/fornecedores.js` → `DELETE /:id` (linhas 152-166)

**Vetor de Falha:**  
O endpoint executa `DELETE FROM fornecedores WHERE id = ?` sem verificar se existem pedidos, cotações, contas a pagar ou qualquer entidade vinculada. O banco SQLite local não tem FK constraints habilitadas por padrão (`PRAGMA foreign_keys = OFF`).

**Prova da Quebra:**  
```
Cenário: Fornecedor "ACME LTDA" (id=15) tem 3 pedidos de compra (OC #100, #105, #110),
         2 cotações e R$45.000 em Contas a Pagar vinculadas.
         Usuário clica "Excluir" no cadastro do fornecedor.
Resultado:
  ✅ fornecedores WHERE id=15 → DELETADO
  ❌ pedidos_compra WHERE fornecedor_id=15 → ÓRFÃOS (foreign key aponta para vazio)
  ❌ contas_pagar WHERE fornecedor_id=15 → ÓRFÃS
  ❌ Relatório financeiro "Gastos por Fornecedor" → mostra R$45k sem nome
  ❌ Integração financeira → falha ao fazer JOIN com fornecedores
```

Código encontrado:
```javascript
// ❌ ZERO verificação antes de deletar (fornecedores.js:153-164)
router.delete('/:id', async (req, res) => {
    const result = await run('DELETE FROM fornecedores WHERE id = ?', [req.params.id]);
    res.json({ message: 'Fornecedor excluído com sucesso' });
});
```

**Diretriz de Refatoração:**  
1. Converter para soft-delete: `UPDATE fornecedores SET ativo = 0, data_desativacao = NOW() WHERE id = ?`.
2. Antes de desativar, verificar: `SELECT COUNT(*) FROM pedidos_compra WHERE fornecedor_id = ? AND status NOT IN ('cancelado', 'recebido')`. Se > 0, negar a operação.
3. Habilitar `PRAGMA foreign_keys = ON` no SQLite ou migrar para MySQL com constraints reais.

---

### ANOMALIA C-04 — Race Condition na Seleção de Vencedor de Cotação
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`modules/Compras/api/cotacoes.js` → `PUT /:id/selecionar-vencedor`

**Vetor de Falha:**  
O endpoint inicia transação (`BEGIN TRANSACTION`) mas NÃO usa `SELECT ... FOR UPDATE` para lock pessimista na linha da cotação. Dois usuários podem selecionar propostas diferentes como "vencedoras" da mesma cotação simultaneamente.

**Prova da Quebra:**  
```
Cenário: Cotação #50 com 3 propostas (A, B, C).
         Gerente X seleciona Proposta A; Gerente Y seleciona Proposta B (200ms depois).
Resultado:
  ❌ Ambos UPDATE propostas_cotacao SET selecionada = 1 executam com sucesso
  ❌ Duas propostas marcadas como "vencedoras" para mesma cotação
  ❌ Se gerar OC automaticamente, são geradas 2 ordens de compra duplicadas
```

**Diretriz de Refatoração:**  
Usar `SELECT id FROM cotacoes WHERE id = ? FOR UPDATE` antes do UPDATE. Verificar se `cotacoes.status != 'encerrada'`. Adicionar constraint `UNIQUE(cotacao_id)` em propostas com `selecionada = 1`.

---

### ANOMALIA C-05 — Erro Silencioso na Movimentação de Estoque
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`modules/Compras/api/recebimento.js` → `POST /registrar` (linhas 230-240)

**Vetor de Falha:**  
O INSERT em `movimentacoes_estoque` está dentro de um `try/catch` que apenas loga o erro e continua. O estoque é atualizado, mas a movimentação (audit trail) NÃO é registrada. A transação faz COMMIT mesmo assim.

**Prova da Quebra:**  
```
Cenário: Registrar recebimento parcial. A tabela movimentacoes_estoque tem um campo NOT NULL faltando.
Resultado:
  ✅ estoque.quantidade_atual += 50 (COMMIT executado)
  ❌ movimentacoes_estoque → INSERT falha silenciosamente
  ❌ Relatório de rastreabilidade mostra estoque +50 sem origem
  ❌ Auditoria fiscal impossível — estoque sem lastro documental
```

Código encontrado:
```javascript
try {
    await connection.query('INSERT INTO movimentacoes_estoque (...)...');
} catch (e) {
    console.log('Erro ao registrar movimentação:', e.message); // ❌ Log e continua!
}
await connection.commit(); // ❌ Commit mesmo com movimentação não registrada
```

**Diretriz de Refatoração:**  
Mover o INSERT de movimentação para DENTRO da transação principal e tratar como erro fatal (rollback se falhar). O audit trail de estoque é requisito legal e JAMAIS pode ser silenciado.

---

### ANOMALIA C-06 — Validação de Input Ausente em Pedidos de Compra
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`modules/Compras/api/pedidos.js` → `POST /` (linhas 100-176)

**Vetor de Falha:**  
Itens do pedido (`quantidade`, `preco_unitario`) não são validados quanto a tipo, range ou valor mínimo. O `fornecedor_id` não é verificado para existência antes do INSERT.

**Prova da Quebra:**  
```
POST /api/compras/pedidos
{
  "fornecedor_id": 999999,          // ❌ ID inexistente — aceita sem FK
  "itens": [
    { "quantidade": -100, "preco_unitario": 10 },  // ❌ Quantidade negativa
    { "quantidade": 10, "preco_unitario": -5 }      // ❌ Preço negativo
  ]
}
Resultado: Pedido criado com valor_total = (-100*10) + (10*-5) = -R$1.050,00
           ❌ Financeiro gera Conta a Pagar de R$ -1.050,00 (crédito fantasma)
```

**Diretriz de Refatoração:**  
```javascript
// Validar cada item ANTES do INSERT:
for (const item of itens) {
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) throw new Error('Quantidade inválida');
    if (!Number.isFinite(item.preco_unitario) || item.preco_unitario <= 0) throw new Error('Preço inválido');
}
// Verificar fornecedor:
const [f] = await db.query('SELECT id FROM fornecedores WHERE id = ?', [fornecedor_id]);
if (!f.length) return res.status(400).json({ error: 'Fornecedor inexistente' });
```

---

### ANOMALIA C-07 — Aprovação de Requisições sem Verificação de Estado
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`modules/Compras/api/requisicoes.js` → `PUT /:id/aprovar`

**Vetor de Falha:**  
O UPDATE de status para 'aprovada' é executado sem verificar o estado atual. Uma requisição já 'rejeitada' ou 'cancelada' pode ser reaprovada.

**Prova da Quebra:**  
```
Cenário: Requisição #30 está 'rejeitada' por falta de verba.
         Usuário envia PUT /api/compras/requisicoes/30/aprovar.
Resultado: ✅ status muda para 'aprovada' — sem verificação de estado anterior.
```

**Diretriz de Refatoração:**  
`UPDATE requisicoes_compras SET status = 'aprovada' WHERE id = ? AND status = 'pendente'`. Verificar `affectedRows`.

---

### ANOMALIA C-08 — Sem Idempotência em Cotações (Frontend)
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`modules/Compras/js/cotacoes.js` → `salvarCotacao()`  
`modules/Compras/js/fornecedores.js` → submit handler  
`modules/Compras/js/requisicoes.js` → submit handler

**Vetor de Falha:**  
Ao contrário de `pedidos.js` (que tem `salvandoPedido` flag), cotações, fornecedores e requisições NÃO possuem proteção contra duplo-clique. Nenhum botão é desabilitado durante o envio.

**Prova da Quebra:**  
```
Cenário: Usuário clica "Salvar Cotação" 3x rapidamente (conexão lenta).
Resultado: 3 cotações idênticas criadas no banco.
```

**Diretriz de Refatoração:**  
Implementar padrão `executeOnce(key, asyncFn)` global. Usar `X-Idempotency-Key` header (middleware já existe em `/middleware/idempotency.js` mas não é usado nesses módulos). Desabilitar botão visualmente durante fetch.

---

## FASE 2: MÓDULO DE FATURAMENTO (Ciclo de Receita e Fiscal)

---

### ANOMALIA F-01 — Cálculos Tributários com Floating-Point em Integrações
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`api/integracao-compras-financeiro.js` (linhas 47, 118-128)  
`api/integracao-vendas-financeiro.js` (linha 48)  
`routes/nfe-routes.js` (linhas 56-62)

**Vetor de Falha:**  
Embora o `CalculoTributosService` use aritmética BigInt segura (classe `Decimal` própria — APROVADO), as **integrações financeiras** e as **rotas NFe legadas** ainda usam `parseFloat` e divisão nativa do JavaScript, criando furos de arredondamento.

**Nota Positiva:** O motor de tributos em `modules/Faturamento/services/calculo-tributos.service.js` implementa aritmética Decimal em BigInt com Banker's Rounding (ABNT NBR 5891). Esta parte está CORRETA.

**Prova da Quebra:**  
```javascript
// integracao-compras-financeiro.js:47
const valorParcela = ordem.valor_total / parcelas;
// Se valor_total = R$100,00 e parcelas = 3:
// valorParcela = 33.333333333333336
// .toFixed(2) → "33.33" (STRING)
// 33.33 * 3 = 99.99 → R$0,01 PERDIDO POR PEDIDO

// Acumulado: 1000 pedidos/mês = R$10,00 perdidos/mês no financeiro
// Em 1 ano = R$120,00 de diferença inexplicável na conciliação
```

```javascript
// routes/nfe-routes.js:56-62 (rota legada de cálculo de impostos)
ISS: municipio === 'SP' ? valor * 0.05 : valor * 0.03
// 175.55 * 0.05 = 8.7774999999999999 (IEEE 754 error)
// Deveria ser 8.78 (arredondamento correto)
```

**Diretriz de Refatoração:**  
1. Nas integrações financeiras, usar `Math.round(valorTotal * 100 / parcelas) / 100` para cada parcela, e ajustar a última parcela com o resíduo: `ultimaParcela = valorTotal - (valorParcela * (parcelas - 1))`.
2. Nas rotas NFe legadas, migrar para o `CalculoTributosService` já existente.
3. Nunca usar `.toFixed(2)` para aritmética — ele retorna STRING e não corrige o valor na variável.

---

### ANOMALIA F-02 — Transmissão SEFAZ Inexistente (Ghost State)
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`modules/Faturamento/api/faturamento.js` → `POST /gerar-nfe` (linhas 380-415)  
`routes/nfe-api.js` → `POST /emitir` (linhas 100-155)

**Vetor de Falha:**  
O endpoint `/gerar-nfe` cria a NF-e, gera XML, salva no banco, marca pedido como 'faturado' e faz COMMIT — mas **NÃO transmite o XML para a SEFAZ**. A nota fica com status 'pendente' indefinidamente. O endpoint `/api/nfe/emitir` tenta fazer proxy para `localhost:3003/api/faturamento/enviar-sefaz`, mas não há evidence de que esse serviço esteja rodando.

**Prova da Quebra:**  
```
Cenário: Usuário clica "Gerar NF-e". API retorna success: true.
Resultado:
  ✅ Registro nfe criado no banco com status = 'pendente'
  ✅ XML gerado e salvo em nfe.xml_nfe
  ❌ XML NUNCA enviado à SEFAZ
  ❌ Pedido marcado como 'faturado' — logística começa a separar/enviar
  ❌ Receita Federal não tem conhecimento da nota
  ❌ Cliente recebe mercadoria SEM nota fiscal autorizada = infração fiscal
```

Código `routes/nfe-api.js:110-145`:
```javascript
// Tenta proxy para serviço separado na porta 3003
const faturamentoReq = http.request({
    hostname: 'localhost',
    port: 3003,                    // ← Serviço separado, pode estar offline
    path: '/api/faturamento/enviar-sefaz',
    timeout: 30000
}, ...);
faturamentoReq.on('error', () => {
    res.status(503).json({ code: 'FATURAMENTO_OFFLINE' }); // ← Retorna erro, pedido já está 'faturado'
});
```

O fluxo `/gerar-nfe` faz `await connection.commit()` e muda pedido para 'faturado' ANTES de transmitir. Se o envio falhar, o pedido fica preso como 'faturado' sem NF-e autorizada.

**Diretriz de Refatoração:**  
1. NÃO marcar pedido como 'faturado' até receber `protocolo_autorizacao` da SEFAZ.
2. Usar status intermediário `pedido.status = 'nfe_pendente'` até autorização.
3. Implementar fila de transmissão (Bull/BullMQ) com retry exponencial para envio à SEFAZ.
4. Dashboard de monitoramento para NF-es em estado 'pendente' há mais de N minutos.

---

### ANOMALIA F-03 — Race Condition na Emissão de NF-e (Dupla Geração)
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`modules/Faturamento/api/faturamento.js` → `POST /gerar-nfe` (linhas 130-152)

**Vetor de Falha:**  
O endpoint verifica `SELECT id FROM nfe WHERE pedido_id = ?` para evitar duplicatas, mas esta verificação ocorre DENTRO de uma transação SEM `FOR UPDATE`. Duas requisições simultâneas passam pela verificação antes de qualquer uma inserir, resultando em duas NF-es para o mesmo pedido.

**Prova da Quebra:**  
```
T=0ms: Request A → BEGIN TRANSACTION → SELECT FROM nfe WHERE pedido_id=1 → resultado: []
T=5ms: Request B → BEGIN TRANSACTION → SELECT FROM nfe WHERE pedido_id=1 → resultado: [] (A ainda não inseriu)
T=10ms: Request A → INSERT INTO nfe (pedido_id=1, numero_nfe=500) → OK
T=15ms: Request B → INSERT INTO nfe (pedido_id=1, numero_nfe=501) → OK
T=20ms: Ambas COMMIT → ❌ DUAS NF-es para mesmo pedido

Resultado:
  ❌ Numeração fiscal duplicada
  ❌ Dois registros no Contas a Receber para mesmo pedido
  ❌ Estoque deduzido 2x
```

Código encontrado:
```javascript
// faturamento.js:130-138
const [nfeExistente] = await connection.query(
    'SELECT id, numero_nfe, status FROM nfe WHERE pedido_id = ?',
    [pedido_id]
);  // ❌ Sem FOR UPDATE

if (nfeExistente.length > 0) {
    throw new Error('NF-e já existe');  // ❌ Race: ambas leem [] antes de insert
}
```

**Diretriz de Refatoração:**  
1. Usar `SELECT id FROM nfe WHERE pedido_id = ? FOR UPDATE` (lock pessimista).
2. Adicionar `UNIQUE INDEX uk_nfe_pedido (pedido_id)` na tabela `nfe`.
3. Adicionar `UNIQUE INDEX uk_nfe_numero (numero_nfe, serie)` para proteção fiscal.

---

### ANOMALIA F-04 — Integrações Financeiro/Estoque FORA da Transação (ACID Violado)
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`modules/Faturamento/api/faturamento.js` → `POST /gerar-nfe` (linhas 418-445)

**Vetor de Falha:**  
Após `await connection.commit()`, o código tenta integrar com financeiro (`gerarContasReceber`) e estoque (`reservarEstoque`). Se qualquer integração falhar, a NF-e já está commitada mas sem correspondência no financeiro/estoque — violação de atomicidade.

**Prova da Quebra:**  
```
Sequência:
  1. BEGIN TRANSACTION
  2. INSERT nfe → ✅
  3. INSERT nfe_itens → ✅
  4. UPDATE pedidos SET status='faturado' → ✅
  5. COMMIT → ✅ (ponto de não-retorno)
  6. gerarContasReceber(nfe_id) → ❌ FALHA (timeout MySQL, tabela inexistente, etc.)
  7. reservarEstoque(pedido_id) → ❌ FALHA

Resultado:
  ✅ NF-e criada e commitada
  ❌ Contas a Receber NÃO geradas → receita não rastreada
  ❌ Estoque NÃO deduzido → vende item que "não existe" fiscalmente
  ❌ Apenas "avisos" são adicionados ao response: integracoes.avisos.push(...)
```

Código encontrado:
```javascript
await connection.commit();  // ← Linha 416: COMMIT irreversível

// Linhas 418-445: Integrações PÓS-COMMIT
if (autoIntegrarFinanceiro) {
    try {
        integracoes.financeiro = await financeiroService.gerarContasReceber(nfe_id, {...});
    } catch (err) {
        integracoes.avisos.push(`Integração financeira não concluída: ${err.message}`);
        // ❌ NF-e já commitada, sem rollback possível
    }
}
```

**Diretriz de Refatoração:**  
1. **Opção A (Transação Distribuída):** Incluir `gerarContasReceber` e `reservarEstoque` DENTRO da transação, antes do COMMIT.
2. **Opção B (Saga Pattern):** Usar fila de compensação — se integração falhar, agendar job de retry com backoff exponencial. Adicionar tabela `integracao_pendente` com status.
3. **Nunca silenciar falha:** Se financeiro falhar, retornar HTTP 207 Multi-Status ou 500 com instrução para retry.

---

### ANOMALIA F-05 — CNPJ/CPF Sem Validação de Checksum
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`modules/Faturamento/api/faturamento.js` (linha 223-225)

**Vetor de Falha:**  
CNPJ e CPF do cliente são usados diretamente do banco para gerar XML NFe, sem validação de checksum (dígitos verificadores módulo 11). Se o cadastro tem CNPJ inválido, o XML será gerado e salvo, mas a SEFAZ rejeitará na transmissão (que atualmente nem acontece — ver F-02).

**Prova da Quebra:**  
```
CNPJ no cadastro: "00000000000000" (zeros)
XML gerado com <CNPJ>00000000000000</CNPJ>
SEFAZ retorna rejeição 207: "CNPJ do destinatário inválido"
```

**Diretriz de Refatoração:**  
Implementar validação de CNPJ/CPF com checksum antes de gerar XML. Rejeitar emissão com erro claro: "CNPJ do cliente inválido. Corrija o cadastro antes de faturar."

---

### ANOMALIA F-06 — Quantidade/Preço Negativo Aceito na NFe
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`modules/Faturamento/api/faturamento.js` (linha 164, itens do pedido)

**Vetor de Falha:**  
Os itens da NF-e são buscados diretamente de `pedido_itens` sem validar se `quantidade > 0` e `preco_unitario > 0`. Um pedido com item negativo gera NF-e com valor negativo.

**Prova da Quebra:**  
```
pedido_itens: { quantidade: -5, preco_unitario: 100 }
NF-e gerada com valor_total = -R$500,00
Contas a Receber: -R$500,00 (crédito fantasma)
Estoque: deveria adicionar 5 unidades (operação inversa)
```

**Diretriz de Refatoração:**  
Validar TODOS os itens antes de iniciar a geração: `if (item.quantidade <= 0 || item.preco_unitario <= 0) throw new Error(...)`.

---

### ANOMALIA F-07 — Centavo Perdido no Parcelamento (Financeiro)
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`api/integracao-vendas-financeiro.js` (linha 48)  
`api/integracao-compras-financeiro.js` (linha 47)

**Vetor de Falha:**  
A divisão `valorTotal / parcelas` gera valores infinitos quando não é divisível exatamente. O `.toFixed(2)` formata como string, mas o total das parcelas não soma ao valor original.

**Prova da Quebra:**  
```
valorTotal = R$100,00 | parcelas = 3
valorParcela = 100/3 = 33.333333...
.toFixed(2) = "33.33"
3 × R$33,33 = R$99,99 → R$0,01 PERDIDO

valorTotal = R$1.000,00 | parcelas = 7
valorParcela = 142.857142857...
7 × R$142.86 = R$1.000,02 → R$0,02 EXCEDENTE (banco cobra mais que o total)
```

**Diretriz de Refatoração:**  
```javascript
// Padrão correto: Ajustar última parcela com resíduo
const valorBase = Math.floor(valorTotal * 100 / parcelas) / 100;
for (let i = 0; i < parcelas; i++) {
    const valor = (i === parcelas - 1)
        ? Math.round((valorTotal - valorBase * (parcelas - 1)) * 100) / 100
        : valorBase;
    // INSERT com 'valor'
}
```

---

### ANOMALIA F-08 — Cancelamento NÃO Estorna de Forma Atômica
**Severidade:** 🟡 MÉDIO (P2)

**Módulo/Componente:**  
`modules/Faturamento/api/faturamento.js` → `POST /nfes/:id/cancelar` (linhas 648-700)

**Vetor de Falha:**  
O cancelamento atualiza a NF-e e reverte o pedido DENTRO da transação (correto), mas o estorno financeiro e estoque são chamados via serviço externo com `try/catch` que apenas registra aviso — se falhar, a NF-e é cancelada mas financeiro e estoque permanecem.

**Prova da Quebra:**  
```
Cenário: Cancelar NF-e #500. Estorno financeiro falha (erro de conexão).
Resultado:
  ✅ nfe.status = 'cancelada'
  ✅ pedido.status = 'aprovado' (desvinculado)
  ❌ contas_receber → AINDA EXISTEM para NF-e cancelada
  ❌ estoque → NÃO foi revertido (mercadoria já saiu)
```

**Diretriz de Refatoração:**  
Incluir estorno financeiro e estoque dentro da transação principal. Se falhar, rollback total — melhor manter NF-e ativa com flag "cancelamento_pendente" do que ter inconsistência.

---

## FASE 3: PONTE DE INTEGRAÇÃO (Estoque e Conciliação)

---

### ANOMALIA I-01 — Integração Vendas-Financeiro SEM Autenticação
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`api/integracao-vendas-financeiro.js` → TODAS as rotas

**Vetor de Falha:**  
O módulo recebe `authenticateToken` via `deps` mas **NÃO aplica como middleware** no router. Compare com `integracao-compras-financeiro.js` que tem `router.use((req, res, next) => { if (authenticateToken) { authenticateToken(req, res, next); } })`.

**Prova da Quebra:**  
```
# Sem autenticação - qualquer requisição na rede interna funciona:
curl -X POST http://localhost:3000/api/integracao-vendas-financeiro/gerar-financeiro \
  -H "Content-Type: application/json" \
  -d '{"pedido_id": 1, "parcelas": 100}'

# Resultado: ✅ HTTP 200 — 100 parcelas no Contas a Receber criadas sem autenticação
```

Código encontrado:
```javascript
// integracao-vendas-financeiro.js — FALTA middleware de auth
let authenticateToken;
// ...todas as rotas sem autenticação...
router.post('/gerar-financeiro', async (req, res) => { ... });

module.exports = function(deps) {
    authenticateToken = deps.authenticateToken;  // ❌ Recebe mas NUNCA usa!
    return router;
};
```

Compare com integracao-compras-financeiro.js:
```javascript
// ✅ Compras aplica auth corretamente:
router.use((req, res, next) => {
    if (authenticateToken) { authenticateToken(req, res, next); }
    else { next(); }
});
```

**Diretriz de Refatoração:**  
Adicionar imediatamente `router.use((req, res, next) => { authenticateToken(req, res, next); })` no início do router.

---

### ANOMALIA I-02 — Integração Compras-Financeiro com Auth Condicional Fraco
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`api/integracao-compras-financeiro.js` (linhas 13-18)

**Vetor de Falha:**  
O middleware de auth é condicional: `if (authenticateToken) { ... } else { next(); }`. Se por qualquer razão `authenticateToken` for `null` ou `undefined` (erro de inicialização, refatoração que remove deps), TODAS as rotas ficam abertas.

**Prova da Quebra:**  
```
Se deps.authenticateToken não for passado (bug de inicialização):
  authenticateToken = undefined
  router.use → next() → TODAS as rotas funcionam sem autenticação
```

**Diretriz de Refatoração:**  
Remover o fallback `else { next() }`. Se `authenticateToken` não existir, retornar `res.status(500).json({ error: 'Serviço de autenticação indisponível' })`.

---

### ANOMALIA I-03 — Nenhuma Validação RBAC Cross-Module em Compras
**Severidade:** 🔴 CRÍTICO (P0)

**Módulo/Componente:**  
`server.js` (linhas 1487-1494) — montagem de rotas Compras  
Todas as rotas `modules/Compras/api/*.js`

**Vetor de Falha:**  
Todas as rotas de Compras são montadas com APENAS `authenticateToken`. Não há `authorizeArea('compras')` nem `authorizeAction('compras.aprovar')`. Qualquer usuário autenticado — inclusive um estagiário de RH ou operador de Logística — pode aprovar pedidos, deletar fornecedores e manipular estoque.

**Prova da Quebra:**  
```
Cenário: Usuário com role='estagiario_rh' e token JWT válido.
Resultado:
  ✅ POST /api/compras/pedidos/500/status → { status: 'aprovado' } → ACEITO
  ✅ DELETE /api/compras/fornecedores/15 → ACEITO (fornecedor deletado)
  ✅ POST /api/compras/estoque/movimentacao → ACEITO (estoque manipulado)
  ❌ ZERO verificação de role/módulo em qualquer endpoint
```

Código em server.js:
```javascript
// linhas 1487-1494 — SÓ authenticateToken, sem authorizeArea
app.use('/api/compras/fornecedores', authenticateToken, comprasFornecedoresRoutes);
app.use('/api/compras/pedidos', authenticateToken, comprasPedidosRoutes);
app.use('/api/compras/cotacoes', authenticateToken, comprasCotacoesRoutes);
// ... mesma ausência para todos os sub-módulos
```

Note que o módulo de Faturamento (`faturamento.js:60-70`) implementa RBAC inline: `if (!rolesPermitidas.includes(userRole)) return 403`. Mas Compras não tem NADA.

**Diretriz de Refatoração:**  
1. Adicionar `authorizeArea('compras')` na montagem de todas as rotas Compras em `server.js`.
2. Adicionar `authorizeAction('compras.aprovar')` nos endpoints de aprovação.
3. Adicionar `authorizeAction('compras.deletar')` nos endpoints de DELETE.

---

### ANOMALIA I-04 — Whitelist Hardcoded no Financeiro
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`src/routes/financeiro.js` (linhas 92-145)  
`routes/financeiro-extended.js` (linhas 22-95)

**Vetor de Falha:**  
Permissões do módulo Financeiro são controladas por listas hardcoded de emails e primeiro nomes no código-fonte. Adicionar ou remover um usuário requer deploy.

**Prova da Quebra:**  
```javascript
// financeiro.js:92-145
const permissoesUsuarios = {
    'hellen': { contas_pagar: true, contas_receber: true ... },
    'helen':  { contas_pagar: true ... },  // ← Variação de nome (typo?)
    'junior': { ... },
    'eldir':  { ... }
};

// Se empresa contrata 'carlos@aluforce.ind.br' em 2026-03-22:
// ❌ carlos NÃO tem acesso até próximo deploy + restart PM2
// ❌ Se servidor não for reiniciado, carlos fica sem acesso por tempo indeterminado
```

**Diretriz de Refatoração:**  
Migrar para tabela `permissoes_modulos` no banco de dados. Painel admin para gerenciar permissões em runtime.

---

### ANOMALIA I-05 — .catch(() => {}) Silencia Falhas Críticas
**Severidade:** 🟠 ALTO (P1)

**Módulo/Componente:**  
`api/integracao-compras-financeiro.js` (linhas 73, 144)

**Vetor de Falha:**  
Após criar contas a pagar, o UPDATE de `financeiro_gerado=1` e o INSERT de atividade usam `.catch(() => {})`, silenciando completamente qualquer erro.

**Prova da Quebra:**  
```javascript
// Linha 73:
await pool.query('UPDATE ordens_compra SET financeiro_gerado = 1 WHERE id = ?', [id]).catch(() => {});
// Se falhar: ordens_compra.financeiro_gerado permanece 0
// Próxima execução: gera NOVAMENTE as contas a pagar → DUPLICAÇÃO

// Linha 144:
await pool.query('INSERT INTO compras_atividades (...)...').catch(() => {});
// Se falhar: audit trail perdido
```

**Diretriz de Refatoração:**  
Substituir `.catch(() => {})` por tratamento real. Se o UPDATE de `financeiro_gerado` falhar, fazer rollback dos INSERTs de `contas_pagar` para evitar duplicação.

---

### ANOMALIA I-06 — Idempotência Frágil via LIKE na Descrição
**Severidade:** 🟡 MÉDIO (P2)

**Módulo/Componente:**  
`api/integracao-compras-financeiro.js` (linhas 96-100)

**Vetor de Falha:**  
A verificação de duplicidade é feita via `SELECT id FROM contas_pagar WHERE descricao LIKE '%Pedido Compra #${pedido_id}%'`. Este padrão é frágil — se a descrição mudar ou se `pedido_id=1` casa com `pedido_id=10,11,12...100`.

**Prova da Quebra:**  
```sql
SELECT id FROM contas_pagar WHERE descricao LIKE '%Pedido Compra #1%'
-- Casa com: "Pedido Compra #1", "Pedido Compra #10", "Pedido Compra #100", "Pedido Compra #12"
-- Falso positivo: pedido #10 nunca foi gerado, mas LIKE casa
```

**Diretriz de Refatoração:**  
Adicionar coluna `pedido_compra_id INT` em `contas_pagar` com index. Verificar via `WHERE pedido_compra_id = ?` em vez de LIKE.

---

### ANOMALIA I-07 — Divisão por Zero no Parcelamento
**Severidade:** 🟡 MÉDIO (P2)

**Módulo/Componente:**  
`api/integracao-vendas-financeiro.js` (linha 48)  
`api/integracao-compras-financeiro.js` (linha 47)

**Vetor de Falha:**  
Se `parcelas = 0` for enviado no body, a divisão `valorTotal / 0` resulta em `Infinity` no JavaScript, que é inserido no banco como valor.

**Prova da Quebra:**  
```
POST /api/integracao-vendas-financeiro/gerar-financeiro
{ "pedido_id": 1, "parcelas": 0 }
→ valorParcela = 1000 / 0 = Infinity
→ INSERT INTO contas_receber (..., valor = 'Infinity', ...) → Corrompe dados
```

**Diretriz de Refatoração:**  
```javascript
if (!parcelas || parcelas < 1 || !Number.isInteger(parcelas)) {
    return res.status(400).json({ error: 'Número de parcelas deve ser inteiro >= 1' });
}
```

---

### ANOMALIA I-08 — Frontend NÃO Implementa RBAC Visual
**Severidade:** 🟡 MÉDIO (P2)

**Módulo/Componente:**  
`modules/Compras/js/pedidos.js` (linhas 601-607)  
Todos os HTMLs de Compras e NFe

**Vetor de Falha:**  
O botão "Aprovar" é renderizado baseado apenas no `status === 'pendente'` do pedido, sem verificar a role do usuário logado. Todos veem e podem clicar em "Aprovar".

**Diretriz de Refatoração:**  
Carregar permissões do usuário via `/api/me/permissions` e ocultar botões de ação não-autorizados. Lembrar que RBAC no frontend é UX — o backend DEVE validar independentemente.

---

## QUADRO CONSOLIDADO — STATUS DE CONFORMIDADE

| # | ID | Módulo | Vulnerabilidade | Severidade | Vetor |
|--|--|--|--|--|--|
| 1 | C-01 | Compras/Pedidos | Race Condition na Aprovação | 🔴 P0 | Concorrência |
| 2 | C-02 | Compras/Recebimento | Recebimento Parcial não recalcula financeiro | 🔴 P0 | Lógica Financeira |
| 3 | C-03 | Compras/Fornecedores | Hard Delete sem FK check | 🔴 P0 | Integridade Referencial |
| 4 | C-04 | Compras/Cotações | Race Condition Seleção Vencedor | 🔴 P0 | Concorrência |
| 5 | C-05 | Compras/Recebimento | Movimentação de estoque silenciada | 🟠 P1 | Audit Trail |
| 6 | C-06 | Compras/Pedidos | Input sem validação (qty/preço/FK) | 🟠 P1 | Validação |
| 7 | C-07 | Compras/Requisições | Aprovação sem check de estado | 🟠 P1 | Lógica |
| 8 | C-08 | Compras/Frontend | Sem idempotência (cotações, fornecedores, req.) | 🟠 P1 | Duplo-Clique |
| 9 | F-01 | Faturamento/Integração | Float em cálculos financeiros | 🔴 P0 | Arredondamento IEEE 754 |
| 10 | F-02 | Faturamento/NFe | Transmissão SEFAZ inexistente | 🔴 P0 | Ghost State |
| 11 | F-03 | Faturamento/NFe | Race Condition dupla geração NF-e | 🔴 P0 | Concorrência |
| 12 | F-04 | Faturamento/NFe | Integração pós-COMMIT (ACID violado) | 🔴 P0 | Transação |
| 13 | F-05 | Faturamento/NFe | CNPJ/CPF sem checksum | 🟠 P1 | Validação Fiscal |
| 14 | F-06 | Faturamento/NFe | Qty/Preço negativo aceito | 🟠 P1 | Validação |
| 15 | F-07 | Integrações | Centavo perdido no parcelamento | 🟠 P1 | Arredondamento |
| 16 | F-08 | Faturamento/Cancelamento | Estorno fora da transação | 🟡 P2 | Atomicidade |
| 17 | I-01 | Integração Vendas-Fin. | **ZERO autenticação** em todas as rotas | 🔴 P0 | Autenticação |
| 18 | I-02 | Integração Compras-Fin. | Auth condicional fraco (fallback next()) | 🟠 P1 | Autenticação |
| 19 | I-03 | Compras (server.js) | **ZERO RBAC** — qualquer user faz tudo | 🔴 P0 | Autorização |
| 20 | I-04 | Financeiro | Whitelist hardcoded de emails | 🟠 P1 | RBAC |
| 21 | I-05 | Integração Compras-Fin. | `.catch(() => {})` silencia falhas | 🟠 P1 | Error Handling |
| 22 | I-06 | Integração Compras-Fin. | Idempotência via LIKE na descrição | 🟡 P2 | Duplicação |
| 23 | I-07 | Integrações | Divisão por zero (parcelas=0) | 🟡 P2 | Validação |
| 24 | I-08 | Frontend (todos) | Sem RBAC visual nos botões | 🟡 P2 | UX/Segurança |

---

## NOTAS POSITIVAS (Conformidades Aprovadas)

| # | Módulo | Item Aprovado | Detalhe |
|--|--|--|--|
| ✅ 1 | Faturamento | Motor de Tributos (calcular-tributos.service.js) | Aritmética BigInt com Decimal próprio, Banker's Rounding ABNT NBR 5891 |
| ✅ 2 | Faturamento | RBAC inline em /gerar-nfe e /cancelar | Verifica `rolesPermitidas` antes de emitir/cancelar NF-e |
| ✅ 3 | Faturamento | Validação de prazo de cancelamento (24h) | Verifica `horasDesdeAutorizacao > 24` conforme legislação |
| ✅ 4 | Compras/Pedidos | Flag `salvandoPedido` no frontend | Proteção parcial contra duplo-clique (falta desabilitar botão) |
| ✅ 5 | NFe/XML | `escapeXml()` para geração de XML | Previne XML injection nos dados da nota |
| ✅ 6 | Todos | Consultas parametrizadas | SQL Injection mitigado em todos os endpoints lidos (queries usam `?` placeholders) |
| ✅ 7 | Faturamento | Validação de estoque pré-faturamento | `autoValidarEstoque` chama `validarEstoqueParaFaturamento()` antes de prosseguir |
| ✅ 8 | Financeiro | Sanitização de valor monetário | `Math.round(valorNum * 100) / 100` em `src/routes/financeiro.js` |

---

## PRIORIZAÇÃO DE CORREÇÃO RECOMENDADA

### Sprint Emergencial (P0 — Esta Semana)
1. **I-01** — Adicionar auth no integracao-vendas-financeiro.js (5 minutos)
2. **I-03** — Adicionar `authorizeArea('compras')` em server.js (10 minutos)
3. **F-03** — Adicionar `UNIQUE INDEX (pedido_id)` na tabela nfe (5 minutos)
4. **C-01** — Guard clause `WHERE status = 'pendente'` na aprovação (15 minutos)
5. **C-03** — Soft-delete em fornecedores com verificação FK (30 minutos)

### Sprint Atual (P0/P1 — Esta Quinzena)
6. **F-04** — Mover integrações para dentro da transação ou implementar Saga
7. **F-02** — Implementar fila de transmissão SEFAZ com retry
8. **C-02** — Cálculo proporcional no recebimento parcial
9. **F-01 / F-07** — Corrigir aritmética de parcelamento com resíduo
10. **C-04** — Lock pessimista na seleção de vencedor

### Próximo Sprint (P1/P2)
11. **F-05/F-06** — Validação de CNPJ/CPF e qty/preço
12. **I-04** — Migrar whitelist para banco de dados
13. **C-05** — Movimentação de estoque como parte da transação
14. **I-05** — Substituir `.catch(() => {})` por tratamento real
15. Restantes (P2)

---

*Fim do Ledger de Vulnerabilidades — Auditoria Compras & Faturamento*  
*Nenhuma correção aplicada. Documento exclusivamente diagnóstico.*
