# Faturamento Parcial (Meia Nota) - Entrega Futura

## 📋 Visão Geral

O sistema de **Faturamento Parcial (Meia Nota)** permite dividir o faturamento de um pedido em múltiplas etapas com percentuais flexíveis:

- **10%**, **20%**, **30%**, **40%** ou **50%** no faturamento inicial
- **Restante** na entrega (remessa)

Este fluxo é comum em vendas com entrega futura, onde o cliente paga uma parte na aprovação do pedido e o restante na entrega.

---

## 🔄 Fluxo do Processo

```
┌─────────────────────────────────────────────────────────────────┐
│                    PEDIDO APROVADO                              │
│                   (Valor: R$ 10.000)                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 1: SIMPLES FATURAMENTO (MEIA NOTA)           │
│ ─────────────────────────────────────────────────────────────── │
│  • Valor: 10% a 50% (ex: R$ 5.000 para 50%)                     │
│  • CFOP: 5922 (interno) ou 6922 (interestadual)                 │
│  • NF-e: Emitida                                                │
│  • Estoque: NÃO BAIXA                                           │
│  • Financeiro: Gera conta a receber                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│     COLUNA "PARCIAL" - AGUARDANDO ENTREGA / REMESSA             │
│  Status: "parcial" | Card mostra barra de progresso             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 2: REMESSA / ENTREGA                         │
│ ─────────────────────────────────────────────────────────────── │
│  • Valor: Restante (ex: R$ 5.000 para 50% inicial)              │
│  • CFOP: 5117 (interno) ou 6117 (interestadual)                 │
│  • NF-e: Emitida                                                │
│  • Estoque: BAIXA ✓                                             │
│  • Financeiro: Gera conta a receber do restante                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PEDIDO COMPLETO                               │
│  Status: "faturado" | Percentual: 100% | Estoque: Baixado       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Percentuais Disponíveis

| Percentual | Exemplo (Pedido R$ 10.000) | Uso Comum |
|------------|----------------------------|-----------|
| **10%** | R$ 1.000 | Sinal pequeno |
| **20%** | R$ 2.000 | Entrada padrão |
| **30%** | R$ 3.000 | Entrada maior |
| **40%** | R$ 4.000 | Quase metade |
| **50%** | R$ 5.000 | Meia nota tradicional |

---

## 📊 CFOPs Utilizados

### Faturamento (Não baixa estoque)
| CFOP | Descrição | Uso |
|------|-----------|-----|
| **5922** | Simples Faturamento - Operação Interna | Vendas dentro do estado |
| **6922** | Simples Faturamento - Operação Interestadual | Vendas para outros estados |

### Remessa (Baixa estoque)
| CFOP | Descrição | Uso |
|------|-----------|-----|
| **5117** | Remessa Entrega Futura - Operação Interna | Entrega dentro do estado |
| **6117** | Remessa Entrega Futura - Operação Interestadual | Entrega para outros estados |

---

## 🎯 Kanban de Vendas

### Nova Coluna "Parcial (Meia Nota)"

O Kanban agora possui uma coluna especial entre "Faturar" e "Faturado":

```
┌──────────┬──────────┬──────────┬──────────┬─────────────┬──────────┬──────────┐
│Orçamento │ Análise  │ Aprovado │ Faturar  │   PARCIAL   │ Faturado │  Recibo  │
│          │          │          │          │ (Meia Nota) │          │          │
└──────────┴──────────┴──────────┴──────────┴─────────────┴──────────┴──────────┘
```

### Cards com Indicador Visual

Pedidos na coluna "Parcial" mostram:
- **Badge roxa** com percentual faturado (ex: "30% Faturado")
- **Barra de progresso** visual
- **Ícone** de percentagem

---

## 🖥️ Como Usar no Kanban

### 1. Clicar em "Faturar" no Card
Ao clicar no botão "Faturar" de um pedido na coluna "Faturar", aparece um modal com duas opções:

```
┌─────────────────────────────────────────┐
│  FATURAR PEDIDO #123                    │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ✅ FATURAMENTO NORMAL (100%)    │    │
│  │ Emite NF completa e baixa       │    │
│  │ estoque imediatamente           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📊 MEIA NOTA (10% a 50%)        │    │
│  │ Faturamento parcial - NÃO      │    │
│  │ baixa estoque até remessa       │    │
│  └─────────────────────────────────┘    │
│                                         │
│              [Cancelar]                 │
└─────────────────────────────────────────┘
```

### 2. Escolher "Meia Nota"
Ao selecionar "Meia Nota", aparece o modal de percentuais:

```
┌─────────────────────────────────────────┐
│  MEIA NOTA - FATURAMENTO PARCIAL        │
├─────────────────────────────────────────┤
│  Valor Total: R$ 10.000,00              │
│                                         │
│  Selecione o percentual:                │
│  ┌─────┬─────┬─────┬─────┬─────┐        │
│  │ 10% │ 20% │ 30% │ 40% │ 50% │        │
│  └─────┴─────┴─────┴─────┴─────┘        │
│                                         │
│  Ou digite: [____] %                    │
│                                         │
│  Valor desta NF: R$ 5.000,00            │
│                                         │
│  CFOP: [5922 - Simples Faturamento] ▼   │
│                                         │
│  ☑ Gerar Conta a Receber                │
│                                         │
│  [Cancelar]  [Faturar Meia Nota]        │
└─────────────────────────────────────────┘
```

### 3. Emitir Remessa
Quando o produto for entregue, clique no card na coluna "Parcial" e selecione "Emitir Remessa":
- Baixa o estoque
- Move o pedido para "Faturado"
- Abra o pedido (status "parcial")
- Clique em **"Faturar"** novamente
- O sistema reconhece que é parcial e oferece **"Emitir Remessa"**
- Confirme para baixar o estoque

---

## 🔌 Endpoints da API

### 1. Faturamento Parcial (Etapa 1)
```http
POST /api/vendas/pedidos/{id}/faturamento-parcial

Body:
{
    "tipo_faturamento": "parcial_50",
    "percentual": 50,
    "cfop": "5922",
    "gerarFinanceiro": true,
    "gerarNFe": false,
    "observacoes": "Faturamento inicial"
}

Response:
{
    "success": true,
    "message": "Faturamento parcial de 50% realizado!",
    "dados": {
        "pedido_id": 123,
        "nf_numero": "00001234",
        "cfop": "5922",
        "percentual_faturado": 50,
        "valor_faturado": 5000.00,
        "valor_pendente": 5000.00,
        "baixa_estoque": false,
        "proximo_passo": "Aguardando remessa"
    }
}
```

### 2. Remessa/Entrega (Etapa 2)
```http
POST /api/vendas/pedidos/{id}/remessa-entrega

Body:
{
    "cfop": "5117",
    "gerarFinanceiro": true,
    "gerarNFe": false,
    "baixarEstoque": true,
    "observacoes": "Entrega realizada"
}

Response:
{
    "success": true,
    "message": "Remessa emitida com sucesso!",
    "dados": {
        "pedido_id": 123,
        "nf_remessa": "00001235",
        "cfop": "5117",
        "percentual_faturado": 100,
        "estoque_baixado": true,
        "status": "Faturamento completo"
    }
}
```

### 3. Consultar Status
```http
GET /api/vendas/pedidos/{id}/faturamento-status

Response:
{
    "success": true,
    "pedido": {
        "id": 123,
        "tipo_faturamento": "parcial_50",
        "percentual_faturado": 50,
        "valor_faturado": 5000.00,
        "valor_pendente": 5000.00,
        "estoque_baixado": false,
        "nfe_faturamento": "00001234",
        "nfe_remessa": null
    },
    "proxima_acao": "aguardando_remessa",
    "cfop_sugerido": "5117"
}
```

### 4. Listar Pendentes
```http
GET /api/vendas/faturamento/parciais-pendentes

Response:
{
    "success": true,
    "total": 5,
    "pedidos": [
        {
            "id": 123,
            "numero": "2024001234",
            "empresa": "Cliente ABC",
            "percentual_faturado": 50,
            "valor_pendente": 5000.00,
            "proxima_acao": "Emitir Remessa"
        }
    ]
}
```

---

## 🗄️ Estrutura do Banco de Dados

### Campos adicionados na tabela `pedidos`
```sql
tipo_faturamento      ENUM('normal','parcial_50','entrega_futura','consignado')
percentual_faturado   DECIMAL(5,2)  -- Ex: 50.00, 100.00
valor_faturado        DECIMAL(15,2) -- Valor já faturado
valor_pendente        DECIMAL(15,2) -- Valor restante
estoque_baixado       TINYINT(1)    -- 0 ou 1
nfe_faturamento_numero VARCHAR(50)  -- NF de faturamento
nfe_faturamento_cfop  VARCHAR(10)   -- CFOP usado
nfe_remessa_numero    VARCHAR(50)   -- NF de remessa
nfe_remessa_cfop      VARCHAR(10)   -- CFOP da remessa
```

### Tabela `pedido_faturamentos` (histórico)
```sql
id              INT PRIMARY KEY
pedido_id       INT
sequencia       INT          -- 1 = faturamento, 2 = remessa
tipo            ENUM         -- 'faturamento', 'remessa'
percentual      DECIMAL(5,2)
valor           DECIMAL(15,2)
nfe_numero      VARCHAR(50)
nfe_cfop        VARCHAR(10)
baixa_estoque   TINYINT(1)
conta_receber_id INT         -- Link com financeiro
created_at      TIMESTAMP
```

---

## ✅ Checklist de Implementação

- [x] Migration SQL para novos campos
- [x] Rotas de API para faturamento parcial
- [x] Rota para remessa/entrega
- [x] Rota para consulta de status
- [x] Rota para listar pendentes
- [x] Modal de interface no frontend
- [x] Funções JavaScript de controle
- [x] Integração com financeiro (contas a receber)
- [x] Baixa de estoque na remessa
- [x] Histórico de faturamentos
- [x] Documentação

---

## 🚀 Executar Migration

Para aplicar as alterações no banco de dados:

```bash
# Via MySQL diretamente
mysql -u usuario -p aluforce_vendas < modules/vendas/migrations/2026-02-04-add-faturamento-parcial.sql

# Ou via Node.js
node -e "require('./modules/vendas/server.js')"
# As tabelas serão criadas automaticamente na primeira requisição
```

---

## 📞 Suporte

Em caso de dúvidas sobre o funcionamento fiscal do faturamento parcial, consulte:
- Seu contador
- SEFAZ do seu estado
- Documentação do CFOP (Código Fiscal de Operações)

---

*Documentação criada em 04/02/2026 - Sistema ALUFORCE v2*
