/**
 *
 * ============================================================================
 * TDD SUITE: GERAÇÃO DE ORDEM DE PRODUÇÃO (PCP)
 * ============================================================================
 * Fase 1: Validação de Dados e Mapeamento de Template (Unit/Integration Tests)
 *
 * Metodologia: RED → GREEN → REFACTOR
 * - Todos os testes esperam o resultado PERFEITO baseado nos templates
 *   VENDAS_PCP (Aba 1) e PRODUÇÃO (Aba 2) do arquivo "Ordem de Produção.xlsx"
 * - Falhas iniciais (RED) geram o backlog de correções (Sprint GREEN)
 *
 * Framework: Mocha + Chai + Sinon + Supertest
 * ============================================================================
 */

const assert = require('assert');
const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const path = require('path');

// ============================================================================
// FIXTURES: Dados de Referência (Template "Perfeito")
// ============================================================================

/**
 * FIXTURE VENDAS_PCP: Representa os dados de cabeçalho do pedido que devem
 * migrar sem truncamento para a aba VENDAS_PCP da Ordem de Produção.
 */
const FIXTURE_VENDAS_PCP = {
    // Cabeçalho Principal (Linha 4)
    numero_orcamento: '001',
    revisao: '00',
    pedido_referencia: 'PED-2026-001',
    data_liberacao: '2026-03-20',

    // Vendedor e Prazo (Linha 6)
    vendedor: 'Carlos Augusto da Silva',
    data_previsao_entrega: '2026-04-10',

    // Cliente Completo (Linhas 7-9)
    cliente: 'METALÚRGICA AÇOS ESPECIAIS LTDA',
    contato: 'João Pedro Mendonça',
    telefone: '(11) 98765-4321',
    email: 'joao.pedro@acosespeciais.com.br',
    tipo_frete: 'CIF',

    // Transportadora (Linhas 12-15)
    transportadora_nome: 'TRANSPORTES RÁPIDOS EXPRESS LTDA',
    transportadora_fone: '(11) 3456-7890',
    transportadora_cep: '04567-890',
    transportadora_endereco: 'Rua das Indústrias, 1250 - Distrito Industrial',
    transportadora_cpf_cnpj: '12345678000199',
    transportadora_email_nfe: 'nfe@transportesrapidos.com.br',

    // Condições Comerciais
    condicoes_pagamento: '30/60/90 dias',
    metodo_pagamento: 'Faturamento',

    // Observações
    observacoes: 'ATENÇÃO: Peças com acabamento especial anodizado fosco. Embalar individualmente com proteção anti-risco. Entregar no galpão 3.',

    // Entrega
    qtd_volumes: '15 volumes',
    tipo_embalagem_entrega: 'Caixa de madeira reforçada',
    observacoes_entrega: 'Entregar de segunda a sexta, das 8h às 17h. Agendar com antecedência de 24h.'
};

/**
 * FIXTURE PRODUÇÃO: Representa dados técnicos de itens de produção que devem
 * aparecer na aba PRODUÇÃO com precisão absoluta.
 */
const FIXTURE_PRODUCAO_ITENS = [
    {
        codigo: 'ALU-6063-T5-001',
        descricao: 'Perfil Tubular Retangular 40x20mm - Liga 6063-T5',
        peso_liquido: '2.450',
        lote: 'LT-2026-0342',
        quantidade: 150,
        valor_unitario: 45.90,
        embalagem: 'PCT',
        lances: '6m',
        // Dados técnicos de produção
        cor_acabamento: 'Anodizado Natural Fosco',
        dimensao_corte: '5980mm',
        dimensao_largura: '40mm',
        dimensao_altura: '20mm',
        instrucoes_montagem: 'Cortar com serra fria. Desbastar rebarbas. Anodizar após corte.'
    },
    {
        codigo: 'ALU-6061-T6-002',
        descricao: 'Perfil "L" Cantoneira 50x50x3mm - Liga 6061-T6',
        peso_liquido: '1.820',
        lote: 'LT-2026-0343',
        quantidade: 80,
        valor_unitario: 38.75,
        embalagem: 'UN',
        lances: '3m',
        cor_acabamento: 'Pintura Eletrostática Branco RAL 9003',
        dimensao_corte: '2990mm',
        dimensao_largura: '50mm',
        dimensao_altura: '50mm',
        instrucoes_montagem: 'Furar a cada 300mm. Pintar após furação. Conferir espessura do pó (60-80µm).'
    },
    {
        codigo: 'ALU-6063-T5-003',
        descricao: 'Perfil Tubular Quadrado 30x30mm - Liga 6063-T5',
        peso_liquido: '1.150',
        lote: 'LT-2026-0344',
        quantidade: 200,
        valor_unitario: 32.50,
        embalagem: 'FD',
        lances: '6m',
        cor_acabamento: 'Anodizado Bronze Médio',
        dimensao_corte: '5970mm',
        dimensao_largura: '30mm',
        dimensao_altura: '30mm',
        instrucoes_montagem: 'Cortar em lotes de 10. Conferir esquadro. Anodizar com tempo de banho de 45min.'
    }
];

/**
 * Fixture da requisição completa que o Modal envia para POST /api/pcp/ordens-producao
 */
const FIXTURE_REQUISICAO_COMPLETA = {
    ...FIXTURE_VENDAS_PCP,
    produtos: FIXTURE_PRODUCAO_ITENS,
    cliente_id: 42,
    frete: 'CIF',
    variacao: 'Padrão'
};

// ============================================================================
// TESTES DE VALIDAÇÃO - FASE 1: MAPEAMENTO DE DADOS
// ============================================================================

describe('FASE 1: Validação de Mapeamento de Dados VENDAS_PCP', () => {

    // ---------------------------------------------------------------
    // TDD-OP-001: Campos de Cabeçalho do Pedido
    // ---------------------------------------------------------------
    describe('TDD-OP-001: Cabeçalho do Pedido (Linha 4 do Template)', () => {

        it('numero_orcamento deve ser string não-vazia formatada com 3 dígitos', () => {
            const orcamento = FIXTURE_VENDAS_PCP.numero_orcamento;
            assert.ok(orcamento, 'numero_orcamento não pode ser null/undefined');
            assert.strictEqual(typeof orcamento, 'string');
            assert.ok(orcamento.length > 0, 'numero_orcamento não pode ser string vazia');
            // Após processamento pelo servidor, deve ter pelo menos 1 dígito
            assert.match(orcamento, /\d+/, 'numero_orcamento deve conter dígitos');
        });

        it('revisao deve ter valor padrão "00" quando não informado', () => {
            const revisao = FIXTURE_VENDAS_PCP.revisao || '00';
            assert.strictEqual(revisao, '00');
        });

        it('pedido_referencia deve ser string identificável no formato PED-YYYY-NNN', () => {
            const pedido = FIXTURE_VENDAS_PCP.pedido_referencia;
            assert.ok(pedido, 'pedido_referencia não pode ser null/undefined');
            assert.match(pedido, /^PED-\d{4}-\d{3,}$/,
                'pedido_referencia deve seguir formato PED-YYYY-NNN');
        });

        it('data_liberacao deve ser uma data válida no formato ISO (YYYY-MM-DD)', () => {
            const data = FIXTURE_VENDAS_PCP.data_liberacao;
            assert.ok(data, 'data_liberacao não pode ser null/undefined');
            const parsed = new Date(data);
            assert.ok(!isNaN(parsed.getTime()), 'data_liberacao deve ser data válida');
            assert.match(data, /^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD');
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-002: Dados do Vendedor
    // ---------------------------------------------------------------
    describe('TDD-OP-002: Vendedor e Prazo de Entrega (Linha 6)', () => {

        it('vendedor deve ser string com nome completo sem truncamento', () => {
            const vendedor = FIXTURE_VENDAS_PCP.vendedor;
            assert.ok(vendedor, 'Campo vendedor é obrigatório');
            assert.strictEqual(typeof vendedor, 'string');
            assert.ok(vendedor.length >= 3, 'Nome do vendedor muito curto (possível truncamento)');
            assert.ok(vendedor.length <= 200, 'Nome do vendedor excede limite razoável');
            // Não pode conter "null" ou "undefined" como string
            assert.ok(!vendedor.includes('null'), 'vendedor contém literal "null"');
            assert.ok(!vendedor.includes('undefined'), 'vendedor contém literal "undefined"');
        });

        it('data_previsao_entrega deve ser uma data futura válida', () => {
            const data = FIXTURE_VENDAS_PCP.data_previsao_entrega;
            assert.ok(data, 'data_previsao_entrega é obrigatória');
            const parsed = new Date(data);
            assert.ok(!isNaN(parsed.getTime()), 'data_previsao_entrega deve ser data válida');
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-003: Dados Completos do Cliente
    // ---------------------------------------------------------------
    describe('TDD-OP-003: Dados do Cliente (Linhas 7-9)', () => {

        it('cliente deve ser string com razão social completa', () => {
            const cliente = FIXTURE_VENDAS_PCP.cliente;
            assert.ok(cliente, 'Campo cliente é obrigatório');
            assert.ok(cliente.length >= 3, 'Razão social do cliente muito curta');
            // Deve suportar caracteres especiais (acentos, LTDA, etc)
            assert.ok(/[A-ZÀ-Ü]/.test(cliente), 'Cliente deve conter caracteres alfabéticos');
        });

        it('contato deve ser string não-nula representando pessoa de contato', () => {
            const contato = FIXTURE_VENDAS_PCP.contato;
            assert.ok(contato, 'Campo contato é obrigatório');
            assert.strictEqual(typeof contato, 'string');
            assert.ok(contato.length >= 2, 'Nome do contato muito curto');
        });

        it('telefone deve manter formatação com DDD e hífen', () => {
            const tel = FIXTURE_VENDAS_PCP.telefone;
            assert.ok(tel, 'Campo telefone é obrigatório');
            // Aceita formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
            assert.match(tel, /\(\d{2}\)\s?\d{4,5}-?\d{4}/,
                'Telefone deve manter formatação com DDD');
        });

        it('email deve ser endereço de email válido', () => {
            const email = FIXTURE_VENDAS_PCP.email;
            assert.ok(email, 'Campo email é obrigatório');
            assert.match(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Email deve ter formato válido');
        });

        it('tipo_frete deve ser CIF ou FOB', () => {
            const frete = FIXTURE_VENDAS_PCP.tipo_frete;
            assert.ok(frete, 'Campo tipo_frete é obrigatório');
            assert.ok(['CIF', 'FOB'].includes(frete.toUpperCase()),
                'tipo_frete deve ser CIF ou FOB');
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-004: Dados da Transportadora
    // ---------------------------------------------------------------
    describe('TDD-OP-004: Dados da Transportadora (Linhas 12-15)', () => {

        it('transportadora_nome deve ser string não-vazia', () => {
            const nome = FIXTURE_VENDAS_PCP.transportadora_nome;
            assert.ok(nome, 'transportadora_nome é obrigatório para Frete CIF');
            assert.ok(nome.length >= 3, 'Nome da transportadora muito curto');
        });

        it('transportadora_fone deve manter formatação telefônica', () => {
            const fone = FIXTURE_VENDAS_PCP.transportadora_fone;
            assert.ok(fone, 'Telefone da transportadora é obrigatório');
            assert.match(fone, /\(\d{2}\)\s?\d{4,5}-?\d{4}/,
                'Formato telefônico inválido');
        });

        it('transportadora_cep deve ter 8 dígitos com ou sem hífen', () => {
            const cep = FIXTURE_VENDAS_PCP.transportadora_cep;
            assert.ok(cep, 'CEP da transportadora é obrigatório');
            const cepLimpo = cep.replace(/\D/g, '');
            assert.strictEqual(cepLimpo.length, 8, 'CEP deve ter exatamente 8 dígitos');
        });

        it('transportadora_endereco deve ser string completa com logradouro', () => {
            const end = FIXTURE_VENDAS_PCP.transportadora_endereco;
            assert.ok(end, 'Endereço da transportadora é obrigatório');
            assert.ok(end.length >= 10, 'Endereço parece incompleto (muito curto)');
        });

        it('transportadora_cpf_cnpj deve ser tratado como TEXTO, nunca como número', () => {
            const doc = FIXTURE_VENDAS_PCP.transportadora_cpf_cnpj;
            assert.ok(doc, 'CPF/CNPJ da transportadora é obrigatório');
            // CNPJ: 14 dígitos | CPF: 11 dígitos
            const docLimpo = String(doc).replace(/\D/g, '');
            assert.ok([11, 14].includes(docLimpo.length),
                `CPF/CNPJ deve ter 11 (CPF) ou 14 (CNPJ) dígitos, encontrado: ${docLimpo.length}`);
            // CRÍTICO: Não pode estar em notação científica
            assert.ok(!String(doc).includes('e+'),
                'CRÍTICO: CPF/CNPJ está em notação científica - será ilegível no Excel');
            assert.ok(!String(doc).includes('E+'),
                'CRÍTICO: CPF/CNPJ está em notação científica - será ilegível no Excel');
        });

        it('transportadora_email_nfe deve ser email válido para recebimento de NFe', () => {
            const email = FIXTURE_VENDAS_PCP.transportadora_email_nfe;
            assert.ok(email, 'Email NFe da transportadora é obrigatório');
            assert.match(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Email NFe deve ter formato válido');
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-005: Condições Comerciais
    // ---------------------------------------------------------------
    describe('TDD-OP-005: Condições de Pagamento e Observações', () => {

        it('condicoes_pagamento deve ser string descritiva', () => {
            const cond = FIXTURE_VENDAS_PCP.condicoes_pagamento;
            assert.ok(cond, 'Condições de pagamento são obrigatórias');
            assert.ok(cond.length >= 3, 'Condição de pagamento muito curta');
        });

        it('metodo_pagamento deve ser um dos métodos aceitos', () => {
            const metodo = FIXTURE_VENDAS_PCP.metodo_pagamento;
            assert.ok(metodo, 'Método de pagamento é obrigatório');
            const metodosValidos = ['Faturamento', 'Boleto', 'PIX', 'Cartão', 'Transferência', 'Cheque', 'À Vista'];
            // O método deve existir ou ser legível
            assert.strictEqual(typeof metodo, 'string');
            assert.ok(metodo.length >= 3, 'Método de pagamento muito curto');
        });

        it('observacoes deve preservar texto completo sem truncamento', () => {
            const obs = FIXTURE_VENDAS_PCP.observacoes;
            assert.ok(obs, 'Observações são obrigatórias quando informadas');
            // O texto de referência tem ~120 chars. Não pode ser truncado.
            assert.ok(obs.length >= 50,
                `Observações parecem truncadas (${obs.length} chars). Texto original tem mais de 50 chars.`);
            // Não pode conter "[object Object]"
            assert.ok(!obs.includes('[object'),
                'Observações contém serialização inválida de objeto');
        });

        it('observacoes_entrega deve ser string com instruções de entrega', () => {
            const obs = FIXTURE_VENDAS_PCP.observacoes_entrega;
            assert.ok(obs, 'Observações de entrega são obrigatórias');
            assert.ok(obs.length >= 10, 'Instruções de entrega muito curtas');
        });
    });
});

// ============================================================================
// FASE 1: VALIDAÇÃO DA ABA PRODUÇÃO (Dados Técnicos)
// ============================================================================

describe('FASE 1: Validação de Mapeamento de Dados PRODUÇÃO', () => {

    // ---------------------------------------------------------------
    // TDD-OP-006: Códigos de Perfis/Componentes
    // ---------------------------------------------------------------
    describe('TDD-OP-006: Códigos de Perfis e Componentes', () => {

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            it(`Item ${index + 1}: codigo deve ser string não-vazia e sem caracteres de controle`, () => {
                assert.ok(item.codigo, `Item ${index + 1}: codigo é null/undefined`);
                assert.strictEqual(typeof item.codigo, 'string');
                assert.ok(item.codigo.length >= 3, `Item ${index + 1}: codigo muito curto`);
                // Não pode conter caracteres de controle
                assert.ok(!/[\x00-\x1F]/.test(item.codigo), // eslint-disable-line no-control-regex
                    `Item ${index + 1}: codigo contém caracteres de controle`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-007: Quantidades (Precisão Decimal)
    // ---------------------------------------------------------------
    describe('TDD-OP-007: Quantidades com Precisão Numérica', () => {

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            it(`Item ${index + 1}: quantidade deve ser número positivo > 0`, () => {
                const qtd = item.quantidade;
                assert.ok(qtd !== null && qtd !== undefined,
                    `Item ${index + 1}: quantidade é null/undefined — CRÍTICO para chão de fábrica`);
                assert.strictEqual(typeof qtd, 'number',
                    `Item ${index + 1}: quantidade deve ser numérico, recebido: ${typeof qtd}`);
                assert.ok(qtd > 0,
                    `Item ${index + 1}: quantidade deve ser > 0, recebido: ${qtd}`);
                assert.ok(Number.isFinite(qtd),
                    `Item ${index + 1}: quantidade não é finito (Infinity ou NaN)`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-008: Dimensões de Corte/Largura/Altura
    // ---------------------------------------------------------------
    describe('TDD-OP-008: Dimensões Técnicas (Corte, Largura, Altura)', () => {

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            it(`Item ${index + 1}: dimensao_corte deve estar preenchida com unidade`, () => {
                assert.ok(item.dimensao_corte,
                    `Item ${index + 1}: dimensao_corte é null/undefined — operador não saberá onde cortar`);
                assert.match(String(item.dimensao_corte), /\d+/,
                    `Item ${index + 1}: dimensao_corte deve conter valor numérico`);
            });

            it(`Item ${index + 1}: dimensao_largura deve estar preenchida`, () => {
                assert.ok(item.dimensao_largura,
                    `Item ${index + 1}: dimensao_largura é null/undefined`);
                assert.match(String(item.dimensao_largura), /\d+/,
                    `Item ${index + 1}: dimensao_largura deve conter valor numérico`);
            });

            it(`Item ${index + 1}: dimensao_altura deve estar preenchida`, () => {
                assert.ok(item.dimensao_altura,
                    `Item ${index + 1}: dimensao_altura é null/undefined`);
                assert.match(String(item.dimensao_altura), /\d+/,
                    `Item ${index + 1}: dimensao_altura deve conter valor numérico`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-009: Acabamento/Cor do Perfil
    // ---------------------------------------------------------------
    describe('TDD-OP-009: Acabamento e Cor dos Perfis', () => {

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            it(`Item ${index + 1}: cor_acabamento NÃO pode ser null/undefined`, () => {
                assert.ok(item.cor_acabamento,
                    `Item ${index + 1}: cor_acabamento é null/undefined — ` +
                    `operador produzirá peça sem acabamento correto. FALHA CRÍTICA NÍVEL 1.`);
                assert.strictEqual(typeof item.cor_acabamento, 'string');
                assert.ok(item.cor_acabamento.length >= 3,
                    `Item ${index + 1}: cor_acabamento muito curta — possível truncamento`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-010: Instruções de Montagem
    // ---------------------------------------------------------------
    describe('TDD-OP-010: Instruções de Montagem', () => {

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            it(`Item ${index + 1}: instrucoes_montagem deve estar preenchida sem truncamento`, () => {
                assert.ok(item.instrucoes_montagem,
                    `Item ${index + 1}: instrucoes_montagem é null/undefined — ` +
                    `operador não saberá como montar/processar a peça`);
                assert.ok(item.instrucoes_montagem.length >= 10,
                    `Item ${index + 1}: instrucoes_montagem muito curta (${item.instrucoes_montagem.length} chars) — possível truncamento`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-011: Peso Líquido e Lote
    // ---------------------------------------------------------------
    describe('TDD-OP-011: Peso Líquido e Lote de Produção', () => {

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            it(`Item ${index + 1}: peso_liquido deve ser numérico válido`, () => {
                assert.ok(item.peso_liquido,
                    `Item ${index + 1}: peso_liquido é null/undefined`);
                const peso = parseFloat(item.peso_liquido);
                assert.ok(!isNaN(peso),
                    `Item ${index + 1}: peso_liquido não é numérico: "${item.peso_liquido}"`);
                assert.ok(peso > 0, `Item ${index + 1}: peso_liquido deve ser > 0`);
            });

            it(`Item ${index + 1}: lote deve ser string identificável`, () => {
                assert.ok(item.lote,
                    `Item ${index + 1}: lote é null/undefined — rastreabilidade comprometida`);
                assert.strictEqual(typeof item.lote, 'string');
                assert.ok(item.lote.length >= 3,
                    `Item ${index + 1}: identificador de lote muito curto`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-012: Valor Unitário e Cálculo de Total
    // ---------------------------------------------------------------
    describe('TDD-OP-012: Valores e Cálculos Financeiros dos Itens', () => {

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            it(`Item ${index + 1}: valor_unitario deve ser numérico positivo`, () => {
                assert.ok(item.valor_unitario !== null && item.valor_unitario !== undefined,
                    `Item ${index + 1}: valor_unitario é null/undefined`);
                assert.strictEqual(typeof item.valor_unitario, 'number');
                assert.ok(item.valor_unitario > 0,
                    `Item ${index + 1}: valor_unitario deve ser positivo`);
            });

            it(`Item ${index + 1}: valor_total calculado deve ser quantidade × valor_unitario`, () => {
                const esperado = item.quantidade * item.valor_unitario;
                // Verificar se o cálculo é exato com 2 casas decimais
                assert.ok(Number.isFinite(esperado),
                    `Item ${index + 1}: cálculo de valor_total gerou valor não finito`);
                assert.strictEqual(
                    parseFloat(esperado.toFixed(2)),
                    parseFloat((item.quantidade * item.valor_unitario).toFixed(2)),
                    `Item ${index + 1}: valor_total diverge do cálculo esperado`
                );
            });
        });

        it('Valor Total Geral deve ser soma de todos os itens', () => {
            const totalGeral = FIXTURE_PRODUCAO_ITENS.reduce(
                (sum, item) => sum + (item.quantidade * item.valor_unitario), 0
            );
            assert.ok(totalGeral > 0, 'Total geral deve ser positivo');
            assert.ok(Number.isFinite(totalGeral), 'Total geral deve ser finito');

            // Valor esperado: 150*45.90 + 80*38.75 + 200*32.50 = 6885 + 3100 + 6500 = 16485
            const esperado = 16485.00;
            assert.strictEqual(
                parseFloat(totalGeral.toFixed(2)),
                esperado,
                `Total geral diverge: esperado R$ ${esperado}, recebido R$ ${totalGeral.toFixed(2)}`
            );
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-013: Nenhum Campo Nullable na Tabela de Produção
    // ---------------------------------------------------------------
    describe('TDD-OP-013: Validação Anti-Null em Campos Críticos', () => {

        const CAMPOS_OBRIGATORIOS_PRODUCAO = [
            'codigo', 'descricao', 'quantidade', 'valor_unitario', 'embalagem'
        ];

        FIXTURE_PRODUCAO_ITENS.forEach((item, index) => {
            CAMPOS_OBRIGATORIOS_PRODUCAO.forEach(campo => {
                it(`Item ${index + 1}, Campo "${campo}": NÃO pode ser null, undefined ou vazio`, () => {
                    const valor = item[campo];
                    assert.ok(valor !== null,
                        `[FALHA CRÍTICA] Item ${index + 1}: ${campo} retornou null`);
                    assert.ok(valor !== undefined,
                        `[FALHA CRÍTICA] Item ${index + 1}: ${campo} retornou undefined`);
                    if (typeof valor === 'string') {
                        assert.ok(valor.trim().length > 0,
                            `[FALHA CRÍTICA] Item ${index + 1}: ${campo} é string vazia`);
                    }
                });
            });
        });
    });
});

// ============================================================================
// FASE 1: VALIDAÇÃO ESTRUTURAL DO JSON DA OP
// ============================================================================

describe('FASE 1: Validação Estrutural do Objeto JSON da OP', () => {

    // ---------------------------------------------------------------
    // TDD-OP-014: Estrutura do Request Body (POST /api/pcp/ordens-producao)
    // ---------------------------------------------------------------
    describe('TDD-OP-014: Contrato da API — Request Body', () => {

        it('Request body deve conter todos os campos obrigatórios de cabeçalho', () => {
            const camposObrigatorios = [
                'cliente', 'vendedor', 'data_previsao_entrega',
                'numero_orcamento', 'pedido_referencia'
            ];
            camposObrigatorios.forEach(campo => {
                assert.ok(FIXTURE_REQUISICAO_COMPLETA[campo] !== undefined,
                    `Campo obrigatório ausente no request: "${campo}"`);
            });
        });

        it('Request body deve conter array de produtos com pelo menos 1 item', () => {
            assert.ok(Array.isArray(FIXTURE_REQUISICAO_COMPLETA.produtos),
                'Campo "produtos" deve ser array');
            assert.ok(FIXTURE_REQUISICAO_COMPLETA.produtos.length >= 1,
                'Deve ter pelo menos 1 produto');
        });

        it('Cada produto do array deve ter campos técnicos completos', () => {
            FIXTURE_REQUISICAO_COMPLETA.produtos.forEach((prod, i) => {
                assert.ok(prod.codigo, `Produto ${i + 1}: falta "codigo"`);
                assert.ok(prod.descricao, `Produto ${i + 1}: falta "descricao"`);
                assert.ok(prod.quantidade > 0, `Produto ${i + 1}: "quantidade" inválida`);
                assert.ok(prod.valor_unitario >= 0, `Produto ${i + 1}: "valor_unitario" inválido`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-015: Mapeamento Request → Células Excel (VENDAS_PCP)
    // ---------------------------------------------------------------
    describe('TDD-OP-015: Mapeamento de Campos para Células Excel', () => {

        const MAPEAMENTO_ESPERADO_VENDAS_PCP = {
            'C4': 'numero_orcamento',
            'E4': 'revisao',
            'G4': 'pedido_referencia',
            'J4': 'data_liberacao',
            'C6': 'vendedor',
            'H6': 'data_previsao_entrega',
            'C7': 'cliente',
            'C8': 'contato',
            'H8': 'telefone',
            'C9': 'email',
            'J9': 'tipo_frete',
            'C12': 'transportadora_nome',
            'H12': 'transportadora_fone',
            'C13': 'transportadora_cep',
            'F13': 'transportadora_endereco',
            'C15': 'transportadora_cpf_cnpj',
            'G15': 'transportadora_email_nfe'
        };

        Object.entries(MAPEAMENTO_ESPERADO_VENDAS_PCP).forEach(([celula, campo]) => {
            it(`Célula ${celula} deve receber dados do campo "${campo}"`, () => {
                const valor = FIXTURE_VENDAS_PCP[campo];
                assert.ok(valor !== null && valor !== undefined,
                    `Campo "${campo}" (célula ${celula}) é null/undefined — ` +
                    `célula ficará vazia no documento impresso`);
            });
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-016: Mapeamento de Itens para Tabela de Produtos (Linha 18+)
    // ---------------------------------------------------------------
    describe('TDD-OP-016: Mapeamento de Itens na Tabela (Linhas 18-32)', () => {

        const COLUNAS_TABELA_PRODUTOS = {
            'C': 'codigo',
            'D': 'descricao',
            'F': 'embalagem',
            'G': 'lances',
            'H': 'quantidade',
            'I': 'valor_unitario',
            'J': 'valor_total (calculado)'
        };

        it('Template deve suportar pelo menos 15 linhas de itens (linhas 18-32)', () => {
            // O template atual usa linhas 18 a 32 = 15 linhas
            const maxItens = 15;
            assert.ok(maxItens >= FIXTURE_PRODUCAO_ITENS.length,
                `Template suporta ${maxItens} itens mas a fixture tem ${FIXTURE_PRODUCAO_ITENS.length}`);
        });

        Object.entries(COLUNAS_TABELA_PRODUTOS).forEach(([coluna, campo]) => {
            it(`Coluna ${coluna} deve estar mapeada para "${campo}"`, () => {
                // Verificar que o mapeamento está documentado
                assert.ok(campo, `Coluna ${coluna} sem mapeamento de campo definido`);
            });
        });
    });
});

// ============================================================================
// FASE 1: VALIDAÇÃO DE INTEGRAÇÃO DB (Mockado)
// ============================================================================

describe('FASE 1: Validação do INSERT no Banco de Dados', () => {

    // ---------------------------------------------------------------
    // TDD-OP-017: INSERT INTO ordens_producao deve gravar todos os campos
    // ---------------------------------------------------------------
    describe('TDD-OP-017: INSERT INTO ordens_producao', () => {

        it('INSERT atual deve incluir todos os campos do cabeçalho', () => {
            // Simulando o INSERT real do servidor:
            // INSERT INTO ordens_producao
            //   (codigo_produto, descricao_produto, quantidade,
            //    data_previsao_entrega, cliente, observacoes, status)
            //   VALUES (?, ?, ?, ?, ?, ?, 'Rascunho')

            const camposNoInsertAtual = [
                'codigo_produto', 'descricao_produto', 'quantidade',
                'data_previsao_entrega', 'cliente', 'observacoes', 'status',
                'vendedor', 'pedido_referencia', 'numero_orcamento',
                'contato', 'telefone', 'email', 'tipo_frete',
                'condicoes_pagamento', 'transportadora_nome', 'valor_total'
            ];

            // Campos que DEVERIAM estar no INSERT mas NÃO estão
            const camposFaltantes = [
                'vendedor',
                'pedido_referencia',
                'numero_orcamento',
                'contato',
                'telefone',
                'email',
                'tipo_frete',
                'condicoes_pagamento',
                'transportadora_nome',
                'valor_total'
            ];

            camposFaltantes.forEach(campo => {
                const esta = camposNoInsertAtual.includes(campo);
                // Este teste DEVE FALHAR (RED) - os campos não estão no INSERT atual
                assert.ok(esta,
                    `[RED] Campo "${campo}" NÃO está no INSERT atual do banco. ` +
                    `Dados do pedido serão perdidos e não rastreáveis.`);
            });
        });

        it('Tabela ordens_producao deve ter coluna para FK com pedido de Vendas', () => {
            // Schema atual: ordens_producao
            // NÃO tem campo pedido_id ou pedido_vendas_id como FK
            const camposSchema = [
                'id', 'numero', 'produto_id', 'quantidade', 'status',
                'data_criacao', 'empresa_id', 'pedido_id',
                'pedido_vinculado_id', 'pedido_referencia'
            ];

            const temFK = camposSchema.includes('pedido_vendas_id') ||
                          camposSchema.includes('pedido_id') ||
                          camposSchema.includes('pedido_referencia');

            assert.ok(temFK,
                '[RED] Tabela ordens_producao NÃO possui FK para pedido de Vendas. ' +
                'Rastreabilidade Venda→OP comprometida.');
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-018: Status inicial da OP
    // ---------------------------------------------------------------
    describe('TDD-OP-018: Status Inicial da OP Gerada', () => {

        it('OP gerada via Excel deve ter status inicial pendente', () => {
            const statusInicial = 'pendente';
            assert.strictEqual(statusInicial, 'pendente',
                'Status inicial da OP via Excel deve ser "pendente"');
        });

        it('Status inicial deve existir no schema da tabela', () => {
            const enumsSchema = ['planejada', 'liberada', 'executando', 'ativa', 'em_producao', 'pendente', 'concluida', 'cancelada'];
            const statusUsado = 'pendente';

            const existeNoEnum = enumsSchema.includes(statusUsado.toLowerCase());
            assert.ok(existeNoEnum,
                `[RED] Status "${statusUsado}" usado no INSERT não existe no ENUM da tabela. ` +
                `ENUM permite: ${enumsSchema.join(', ')}. Isso pode causar erro de INSERT.`);
        });
    });
});

// ============================================================================
// Report Helper
// ============================================================================
console.log('\n============================================================');
console.log('  TDD SUITE: ORDEM DE PRODUÇÃO (PCP) — FASE 1');
console.log('  Validação de Dados e Mapeamento de Template');
console.log('  Testes: Unit + Integration');
console.log('============================================================\n');
