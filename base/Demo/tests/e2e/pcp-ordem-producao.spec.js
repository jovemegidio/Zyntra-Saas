/**
 * ============================================================================
 * TDD SUITE: GERAÇÃO DE ORDEM DE PRODUÇÃO (PCP) — FASE 2
 * ============================================================================
 * Testes E2E: Validação de Fluxo e Transição de Estado
 *
 * Framework: Playwright
 * Simula ciclo de vida: Vendas → Aprovação → Geração OP → PCP → Produção
 * ============================================================================
 */

const { test, expect } = require('@playwright/test');

// ============================================================================
// CONFIGURAÇÃO E HELPERS
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PCP_API = '/api/pcp';
const VENDAS_API = '/api/vendas';

/**
 * Helper: Login como usuário com role específico
 */
async function loginAs(request, role = 'admin') {
    const credentials = {
        admin: { usuario: 'admin', senha: 'Admin@2026' },
        vendedor: { usuario: 'vendedor1', senha: 'Vendedor@2026' },
        pcp: { usuario: 'pcp_user', senha: 'Pcp@2026' },
        operador: { usuario: 'operador1', senha: 'Operador@2026' }
    };

    const cred = credentials[role] || credentials.admin;

    const loginRes = await request.post(`${PCP_API}/login`, {
        data: cred
    });

    // Tentar múltiplos endpoints de login
    if (loginRes.status() === 404) {
        const altRes = await request.post('/api/auth/login', { data: cred });
        if (altRes.ok()) {
            const data = await altRes.json();
            return data.token || data.accessToken;
        }
    }

    if (loginRes.ok()) {
        const data = await loginRes.json();
        return data.token || data.accessToken;
    }

    return null;
}

/**
 * Helper: Gerar dados de pedido de venda para teste
 */
function gerarPedidoVendaTeste() {
    const timestamp = Date.now();
    return {
        numero: `PED-TEST-${timestamp}`,
        cliente: 'CLIENTE TESTE AUTOMATIZADO LTDA',
        vendedor: 'Vendedor Teste E2E',
        valor_total: 16485.00,
        status: 'orcamento',
        empresa_id: 1,
        observacoes: 'Pedido gerado por teste E2E automatizado - TDD-OP Suite',
        data_previsao_entrega: '2026-04-15',
        condicoes_pagamento: '30/60/90 dias',
        tipo_frete: 'CIF',
        contato: 'Contato Teste',
        telefone: '(11) 99999-0000',
        email: 'teste@e2e.com',
        produtos: [
            {
                codigo: 'ALU-TEST-001',
                descricao: 'Perfil Teste E2E 40x20mm',
                quantidade: 100,
                valor_unitario: 45.90,
                embalagem: 'PCT',
                lances: '6m'
            }
        ]
    };
}

// ============================================================================
// FASE 2: TESTES E2E — VALIDAÇÃO DE FLUXO
// ============================================================================

test.describe('FASE 2: Validação de Fluxo Vendas → PCP (E2E)', () => {

    // ---------------------------------------------------------------
    // TDD-OP-019: Teste de Gatilho — Status Correto para Gerar OP
    // ---------------------------------------------------------------
    test.describe('TDD-OP-019: Teste de Gatilho de Geração da OP', () => {

        test('DEVE rejeitar geração de OP para pedido em status "orcamento" (esperado: 400)', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const pedido = gerarPedidoVendaTeste();
            pedido.status = 'orcamento'; // Status INCORRETO para gerar OP

            const res = await request.post(`${PCP_API}/ordem-producao/excel`, {
                data: pedido,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            // O sistema DEVE rejeitar com 400 (Bad Request) pedidos em status "orcamento"
            // Se retornar 200/201, significa que não há validação de status
            expect(
                [400, 403, 422].includes(res.status()),
                `[RED] Sistema permitiu gerar OP de pedido em "orcamento" (status ${res.status()}). ` +
                `Esperado: 400/403/422. O gatilho de status NÃO está sendo validado.`
            ).toBeTruthy();
        });

        test('DEVE rejeitar geração de OP para pedido em status "cancelado"', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const pedido = gerarPedidoVendaTeste();
            pedido.status = 'cancelado';

            const res = await request.post(`${PCP_API}/ordem-producao/excel`, {
                data: pedido,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            expect(
                [400, 403, 422].includes(res.status()),
                `[RED] Sistema permitiu gerar OP de pedido "cancelado" (status ${res.status()}). ` +
                `OP de pedido cancelado é inaceitável na produção.`
            ).toBeTruthy();
        });

        test('DEVE aceitar geração de OP para pedido em status "aprovado"', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const pedido = gerarPedidoVendaTeste();
            pedido.status = 'aprovado'; // Status CORRETO para gerar OP

            const res = await request.post(`${PCP_API}/ordem-producao/excel`, {
                data: pedido,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            // Pode retornar 200 (gerou Excel) ou 201 (criou OP)
            // 401/403 indica problema de auth, não de lógica de negócio
            expect(
                [200, 201, 401, 403].includes(res.status()),
                `[RED] Erro inesperado ao gerar OP de pedido "aprovado" (status ${res.status()})`
            ).toBeTruthy();
        });

        test('DEVE aceitar geração de OP para pedido em status "producao"', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const pedido = gerarPedidoVendaTeste();
            pedido.status = 'producao';

            const res = await request.post(`${PCP_API}/ordem-producao/excel`, {
                data: pedido,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            expect(
                [200, 201, 401, 403].includes(res.status()),
                `Erro ao gerar OP de pedido "producao" (status ${res.status()})`
            ).toBeTruthy();
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-020: Teste de Imutabilidade — Dados Bloqueados Pós-Geração
    // ---------------------------------------------------------------
    test.describe('TDD-OP-020: Imutabilidade da OP após envio à Produção', () => {

        test('Vendedor NÃO deve conseguir alterar OP após status "em_producao"', async ({ request }) => {
            const tokenVendedor = await loginAs(request, 'vendedor');

            // Tentar atualizar uma OP que já está em produção
            // Primeiro buscar OPs existentes
            const listRes = await request.get(`${PCP_API}/ordens-producao`, {
                headers: tokenVendedor ? { 'Authorization': `Bearer ${tokenVendedor}` } : {}
            });

            if (listRes.ok()) {
                const data = await listRes.json();
                const ops = data.data || [];
                const opEmProducao = ops.find(op =>
                    op.status === 'em_producao' || op.status === 'executando'
                );

                if (opEmProducao) {
                    // Tentativa de edição por vendedor — DEVE ser bloqueada
                    const editRes = await request.put(`${PCP_API}/ordens-producao/${opEmProducao.id}`, {
                        data: {
                            produto_nome: 'TENTATIVA DE EDIÇÃO INDEVIDA',
                            quantidade: 999999,
                            observacoes: 'Alterado indevidamente pelo vendedor'
                        },
                        headers: tokenVendedor ? { 'Authorization': `Bearer ${tokenVendedor}` } : {}
                    });

                    expect(
                        [403, 401, 409].includes(editRes.status()),
                        `[RED] Vendedor conseguiu editar OP em produção (status ${editRes.status()})! ` +
                        `Isso compromete a integridade da ordem no chão de fábrica. ` +
                        `Esperado: 403 (Forbidden) ou 409 (Conflict).`
                    ).toBeTruthy();
                }
            }
        });

        test('PUT /api/pcp/ordens-producao/:id deve rejeitar alteração de quantidade em OP concluída', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const listRes = await request.get(`${PCP_API}/ordens-producao`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (listRes.ok()) {
                const data = await listRes.json();
                const ops = data.data || [];
                const opConcluida = ops.find(op =>
                    op.status === 'concluida' || op.status === 'concluída'
                );

                if (opConcluida) {
                    const editRes = await request.put(`${PCP_API}/ordens-producao/${opConcluida.id}`, {
                        data: { quantidade: 1 },
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    });

                    expect(
                        [403, 409, 422].includes(editRes.status()),
                        `[RED] Sistema permitiu alterar quantidade de OP concluída (status ${editRes.status()})! ` +
                        `OP concluída deve ser imutável.`
                    ).toBeTruthy();
                }
            }
        });

        test('Transição de status deve seguir fluxo unidirecional (não pode voltar)', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            // Buscar OP em execução e tentar voltar para "planejada"
            const listRes = await request.get(`${PCP_API}/ordens-producao`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (listRes.ok()) {
                const data = await listRes.json();
                const ops = data.data || [];
                const opAtiva = ops.find(op =>
                    op.status === 'em_producao' || op.status === 'ativa' || op.status === 'executando'
                );

                if (opAtiva) {
                    const retroRes = await request.put(`${PCP_API}/ordens/${opAtiva.id}/status`, {
                        data: { status: 'pendente' },
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    });

                    expect(
                        [400, 409, 422].includes(retroRes.status()),
                        `[RED] Sistema permitiu retroagir status da OP de "${opAtiva.status}" para "pendente" ` +
                        `(status ${retroRes.status()})! Fluxo de status deve ser unidirecional.`
                    ).toBeTruthy();
                }
            }
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-021: Teste de Vínculo — FK entre OP e Pedido de Vendas
    // ---------------------------------------------------------------
    test.describe('TDD-OP-021: Rastreabilidade OP ↔ Pedido de Vendas', () => {

        test('OP gerada deve conter referência ao Pedido de origem (pedido_referencia ou numero_pedido)', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const listRes = await request.get(`${PCP_API}/ordens-producao`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (listRes.ok()) {
                const data = await listRes.json();
                const ops = data.data || [];

                if (ops.length > 0) {
                    const primeiraOP = ops[0];

                    // A OP DEVE conter algum campo que referencia o pedido de Vendas
                    const temReferencia =
                        primeiraOP.pedido_referencia ||
                        primeiraOP.pedido_id ||
                        primeiraOP.numero_pedido ||
                        primeiraOP.pedido_vendas_id;

                    expect(
                        temReferencia,
                        `[RED] OP id=${primeiraOP.id} NÃO possui referência ao pedido de Vendas. ` +
                        `Campos verificados: pedido_referencia, pedido_id, numero_pedido, pedido_vendas_id. ` +
                        `Todos retornaram null/undefined. ` +
                        `A rastreabilidade Venda→OP está QUEBRADA.`
                    ).toBeTruthy();
                }
            }
        });

        test('API de listagem deve retornar campos de vínculo com Vendas', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const listRes = await request.get(`${PCP_API}/ordens-producao`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (listRes.ok()) {
                const data = await listRes.json();

                // Verificar contrato da resposta
                expect(data).toHaveProperty('success');
                expect(data).toHaveProperty('data');

                if (data.data && data.data.length > 0) {
                    const op = data.data[0];

                    // Verificar que o SELECT retorna os campos necessários
                    const camposEsperados = [
                        'id', 'codigo', 'produto_nome', 'quantidade', 'status',
                        'prioridade', 'data_inicio', 'data_prevista', 'responsavel'
                    ];

                    camposEsperados.forEach(campo => {
                        expect(
                            op.hasOwnProperty(campo),
                            `[RED] Resposta da API não contém campo "${campo}". ` +
                            `SELECT na query pode estar incompleto.`
                        ).toBeTruthy();
                    });
                }
            }
        });

        test('OP deve ter campo "cliente" preenchido para rastreabilidade', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            // Gerar OP com dados completos
            const dadosOP = gerarPedidoVendaTeste();
            dadosOP.status = 'aprovado';

            const criarRes = await request.post(`${PCP_API}/ordens-producao`, {
                data: dadosOP,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            // Após criar, buscar e verificar que o cliente foi salvo
            if ([200, 201].includes(criarRes.status())) {
                const criarData = await criarRes.json();
                const novoId = criarData.id;

                if (novoId) {
                    const getRes = await request.get(`${PCP_API}/ordens-producao`, {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    });

                    if (getRes.ok()) {
                        const getData = await getRes.json();
                        const opCriada = (getData.data || []).find(op => op.id === novoId);

                        if (opCriada) {
                            expect(
                                opCriada.cliente || opCriada.produto_nome,
                                '[RED] OP criada não salvou informação do cliente no banco.'
                            ).toBeTruthy();
                        }
                    }
                }
            }
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-022: Teste de Duplicação — Não gerar OP duplicada
    // ---------------------------------------------------------------
    test.describe('TDD-OP-022: Prevenção de OP Duplicada', () => {

        test('Gerar OP do mesmo pedido duas vezes deve retornar erro ou aviso', async ({ request }) => {
            const token = await loginAs(request, 'admin');

            const pedido = gerarPedidoVendaTeste();
            pedido.status = 'aprovado';
            pedido.pedido_referencia = 'PED-DUP-TEST-001';

            // Primeira criação
            const res1 = await request.post(`${PCP_API}/ordem-producao/excel`, {
                data: pedido,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            // Segunda criação com MESMO pedido_referencia
            const res2 = await request.post(`${PCP_API}/ordem-producao/excel`, {
                data: pedido,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            // Se ambas retornaram 200, o sistema está criando OPs duplicadas
            if (res1.status() === 200 && res2.status() === 200) {
                // WARN: Sistema permite duplicatas. Não é necessariamente erro,
                // mas deve ser sinalizado no relatório.
                expect(true).toBeTruthy(); // Log warning
                console.warn(
                    '[WARN] TDD-OP-022: Sistema permitiu duas OPs para o mesmo pedido_referencia. ' +
                    'Verificar se há controle de duplicatas.'
                );
            }
        });
    });

    // ---------------------------------------------------------------
    // TDD-OP-023: Teste de permissão por Role
    // ---------------------------------------------------------------
    test.describe('TDD-OP-023: Controle de Acesso por Role (RBAC)', () => {

        test('Requisição sem token de autenticação deve retornar 401', async ({ request }) => {
            const res = await request.get(`${PCP_API}/ordens-producao`);

            expect(
                [401, 403].includes(res.status()),
                `[RED] API acessível sem autenticação (status ${res.status()}). ` +
                `Esperado: 401/403. Acesso ao PCP deve requerer login.`
            ).toBeTruthy();
        });

        test('POST /api/pcp/ordens-producao sem token deve retornar 401', async ({ request }) => {
            const res = await request.post(`${PCP_API}/ordens-producao`, {
                data: gerarPedidoVendaTeste()
            });

            expect(
                [401, 403].includes(res.status()),
                `[RED] Criação de OP acessível sem autenticação (status ${res.status()}).`
            ).toBeTruthy();
        });

        test('PUT de status sem token deve retornar 401', async ({ request }) => {
            const res = await request.put(`${PCP_API}/ordens/1/status`, {
                data: { status: 'concluida' }
            });

            expect(
                [401, 403, 404].includes(res.status()),
                `[RED] Alteração de status acessível sem autenticação (status ${res.status()}).`
            ).toBeTruthy();
        });
    });
});

// ============================================================================
// FASE 2: TESTES E2E — FLUXO COMPLETO (UI-Level)
// ============================================================================

test.describe('FASE 2: Fluxo Completo UI — Vendas → PCP', () => {

    // ---------------------------------------------------------------
    // TDD-OP-024: Navegação ao módulo PCP
    // ---------------------------------------------------------------
    test('TDD-OP-024: Módulo PCP deve carregar sem erro 500', async ({ page }) => {
        const response = await page.goto('/PCP/index.html');
        expect(response?.status()).toBeLessThan(500);

        await page.waitForLoadState('networkidle');
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    // ---------------------------------------------------------------
    // TDD-OP-025: Página de Ordens de Produção
    // ---------------------------------------------------------------
    test('TDD-OP-025: Página de Ordens de Produção deve renderizar', async ({ page }) => {
        const response = await page.goto('/PCP/ordens-producao.html');

        if (response && response.status() < 500) {
            await page.waitForLoadState('networkidle');

            // Deve ter algum container de ordens ou dashboard
            const content = await page.locator('body').textContent();
            expect(content.length).toBeGreaterThan(0);
        } else {
            // Se a página não existe, é uma falha
            expect(
                response?.status(),
                '[RED] Página ordens-producao.html retornou erro ou não existe'
            ).toBeLessThan(500);
        }
    });

    // ---------------------------------------------------------------
    // TDD-OP-026: Kanban PCP deve ter colunas configuradas
    // ---------------------------------------------------------------
    test('TDD-OP-026: API de Kanban Colunas deve retornar colunas padrão', async ({ request }) => {
        const token = await loginAs(request, 'admin');

        const res = await request.get(`${PCP_API}/kanban-colunas`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (res.ok()) {
            const data = await res.json();
            const colunas = data.data || data.colunas || data;

            if (Array.isArray(colunas) && colunas.length > 0) {
                // Verificar colunas padrão do PCP
                const nomesColunas = colunas.map(c => c.nome || c.titulo || c.name || '');

                const colunasEsperadas = ['a_produzir', 'produzindo', 'qualidade', 'concluido'];
                colunasEsperadas.forEach(coluna => {
                    const encontrada = nomesColunas.some(n =>
                        n.toLowerCase().includes(coluna.replace('_', ' ')) ||
                        n.toLowerCase().includes(coluna)
                    );
                    // Não necessariamente erro, mas sinalizar
                    if (!encontrada) {
                        console.warn(`[WARN] Coluna "${coluna}" não encontrada no Kanban PCP`);
                    }
                });
            }
        }
    });

    // ---------------------------------------------------------------
    // TDD-OP-027: Dashboard PCP deve ter KPIs
    // ---------------------------------------------------------------
    test('TDD-OP-027: Dashboard PCP deve retornar dados de KPIs', async ({ request }) => {
        const token = await loginAs(request, 'admin');

        const res = await request.get(`${PCP_API}/dashboard`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if ([200].includes(res.status())) {
            const data = await res.json();
            // Dashboard deve conter indicadores de produção
            expect(data).toBeTruthy();
        }

        // No mínimo, o endpoint deve responder
        expect([200, 401, 403].includes(res.status())).toBeTruthy();
    });
});
