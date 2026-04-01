/**
 * Testes de Transações e Integridade de Dados
 * ALUFORCE ERP v2.0 - Enterprise Audit
 * 
 * Testa transações multi-tabela, validação de status e integridade
 * Executar: node --test tests/transactions.test.js
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

console.log('🧪 Executando testes de transações e integridade...');

// Mapa de transições válidas de status
const VALID_STATUS_TRANSITIONS = {
    'orcamento': ['analise', 'analise-credito', 'cancelado'],
    'orçamento': ['analise', 'analise-credito', 'cancelado'],
    'analise': ['analise-credito', 'aprovado', 'orcamento', 'cancelado'],
    'analise-credito': ['aprovado', 'pedido-aprovado', 'orcamento', 'cancelado'],
    'aprovado': ['pedido-aprovado', 'faturar', 'cancelado'],
    'pedido-aprovado': ['faturar', 'faturado', 'cancelado'],
    'faturar': ['faturado', 'cancelado'],
    'faturado': ['entregue', 'recibo'],
    'entregue': ['recibo'],
    'recibo': [],
    'cancelado': []
};

/**
 * Verifica se uma transição de status é válida
 */
function isValidTransition(statusAtual, statusNovo) {
    const transicoesValidas = VALID_STATUS_TRANSITIONS[statusAtual] || [];
    return transicoesValidas.includes(statusNovo);
}

/**
 * Simula operação de transação com rollback
 */
class MockConnection {
    constructor() {
        this.queries = [];
        this.transactionStarted = false;
        this.committed = false;
        this.rolledBack = false;
    }

    async beginTransaction() {
        this.transactionStarted = true;
        this.queries = [];
    }

    async query(sql, params = []) {
        if (!this.transactionStarted) {
            throw new Error('Query executada fora de transação');
        }
        this.queries.push({ sql, params });
        return [{ insertId: 1, affectedRows: 1 }, null];
    }

    async commit() {
        if (!this.transactionStarted) {
            throw new Error('Commit sem beginTransaction');
        }
        this.committed = true;
    }

    async rollback() {
        if (!this.transactionStarted) {
            throw new Error('Rollback sem beginTransaction');
        }
        this.rolledBack = true;
        this.queries = [];
    }

    release() {
        // Cleanup
    }
}

describe('Validação de Transições de Status', () => {
    
    describe('Transições Válidas', () => {
        it('deve permitir orçamento → análise', () => {
            assert.strictEqual(isValidTransition('orcamento', 'analise'), true);
        });

        it('deve permitir análise → aprovado', () => {
            assert.strictEqual(isValidTransition('analise', 'aprovado'), true);
        });

        it('deve permitir aprovado → faturar', () => {
            assert.strictEqual(isValidTransition('aprovado', 'faturar'), true);
        });

        it('deve permitir faturado → entregue', () => {
            assert.strictEqual(isValidTransition('faturado', 'entregue'), true);
        });

        it('deve permitir cancelamento de orçamento', () => {
            assert.strictEqual(isValidTransition('orcamento', 'cancelado'), true);
        });
    });

    describe('Transições Inválidas', () => {
        it('não deve permitir orçamento → faturado (pular etapas)', () => {
            assert.strictEqual(isValidTransition('orcamento', 'faturado'), false);
        });

        it('não deve permitir faturado → cancelado (precisa cancelar NF-e)', () => {
            assert.strictEqual(isValidTransition('faturado', 'cancelado'), false);
        });

        it('não deve permitir entregue → orcamento (voltar)', () => {
            assert.strictEqual(isValidTransition('entregue', 'orcamento'), false);
        });

        it('não deve permitir cancelado → qualquer coisa (estado final)', () => {
            assert.strictEqual(isValidTransition('cancelado', 'orcamento'), false);
            assert.strictEqual(isValidTransition('cancelado', 'faturado'), false);
        });

        it('não deve permitir recibo → qualquer coisa (estado final)', () => {
            assert.strictEqual(isValidTransition('recibo', 'entregue'), false);
        });
    });

    describe('Fluxo Completo', () => {
        it('deve validar todo o fluxo normal de venda', () => {
            const fluxoNormal = ['orcamento', 'analise', 'analise-credito', 'aprovado', 'pedido-aprovado', 'faturar', 'faturado', 'entregue', 'recibo'];
            
            for (let i = 0; i < fluxoNormal.length - 1; i++) {
                const atual = fluxoNormal[i];
                const proximo = fluxoNormal[i + 1];
                assert.strictEqual(
                    isValidTransition(atual, proximo), 
                    true, 
                    `Transição ${atual} → ${proximo} deveria ser válida`
                );
            }
        });
    });
});

describe('Transações Multi-Tabela', () => {
    
    describe('MockConnection', () => {
        it('deve iniciar transação corretamente', async () => {
            const conn = new MockConnection();
            await conn.beginTransaction();
            assert.strictEqual(conn.transactionStarted, true);
        });

        it('deve registrar queries dentro da transação', async () => {
            const conn = new MockConnection();
            await conn.beginTransaction();
            await conn.query('INSERT INTO tabela1 VALUES (?)', [1]);
            await conn.query('UPDATE tabela2 SET x = ?', [2]);
            
            assert.strictEqual(conn.queries.length, 2);
        });

        it('deve fazer commit corretamente', async () => {
            const conn = new MockConnection();
            await conn.beginTransaction();
            await conn.query('INSERT INTO tabela1 VALUES (?)', [1]);
            await conn.commit();
            
            assert.strictEqual(conn.committed, true);
            assert.strictEqual(conn.rolledBack, false);
        });

        it('deve fazer rollback e limpar queries', async () => {
            const conn = new MockConnection();
            await conn.beginTransaction();
            await conn.query('INSERT INTO tabela1 VALUES (?)', [1]);
            await conn.query('INSERT INTO tabela2 VALUES (?)', [2]);
            await conn.rollback();
            
            assert.strictEqual(conn.rolledBack, true);
            assert.strictEqual(conn.committed, false);
            assert.strictEqual(conn.queries.length, 0);
        });

        it('deve lançar erro se query sem transação', async () => {
            const conn = new MockConnection();
            await assert.rejects(
                async () => await conn.query('SELECT 1'),
                { message: 'Query executada fora de transação' }
            );
        });
    });

    describe('Padrão de Transação', () => {
        it('deve seguir padrão try/commit/catch/rollback/finally', async () => {
            const conn = new MockConnection();
            let released = false;
            
            try {
                await conn.beginTransaction();
                await conn.query('INSERT INTO pedidos VALUES (?)', [1]);
                await conn.query('INSERT INTO contas_receber VALUES (?)', [1]);
                await conn.commit();
            } catch (error) {
                await conn.rollback();
            } finally {
                conn.release();
                released = true;
            }
            
            assert.strictEqual(conn.committed, true);
            assert.strictEqual(released, true);
        });

        it('deve fazer rollback em caso de erro', async () => {
            const conn = new MockConnection();
            let errorCaught = false;
            
            try {
                await conn.beginTransaction();
                await conn.query('INSERT INTO pedidos VALUES (?)', [1]);
                throw new Error('Erro simulado');
                await conn.commit();
            } catch (error) {
                errorCaught = true;
                await conn.rollback();
            } finally {
                conn.release();
            }
            
            assert.strictEqual(errorCaught, true);
            assert.strictEqual(conn.rolledBack, true);
            assert.strictEqual(conn.committed, false);
        });
    });
});

describe('Validação de Integridade', () => {
    
    describe('Verificação de FK antes de DELETE', () => {
        const mockPedido = {
            id: 1,
            status: 'orcamento',
            nfe_chave: null,
            contas_receber: 0,
            ordens_producao: 0
        };

        const mockPedidoFaturado = {
            id: 2,
            status: 'faturado',
            nfe_chave: '35210408456789000123550010000001231234567890',
            contas_receber: 1,
            ordens_producao: 2
        };

        function canDeletePedido(pedido) {
            // Não pode excluir se faturado ou com NF-e
            if (pedido.status === 'faturado' || pedido.nfe_chave) {
                return { allowed: false, reason: 'Pedido faturado ou com NF-e' };
            }
            // Não pode excluir se tem contas a receber
            if (pedido.contas_receber > 0) {
                return { allowed: false, reason: `Possui ${pedido.contas_receber} conta(s) a receber` };
            }
            // Não pode excluir se tem ordens de produção
            if (pedido.ordens_producao > 0) {
                return { allowed: false, reason: `Possui ${pedido.ordens_producao} ordem(ns) de produção` };
            }
            return { allowed: true };
        }

        it('deve permitir excluir pedido em orçamento sem vínculos', () => {
            const result = canDeletePedido(mockPedido);
            assert.strictEqual(result.allowed, true);
        });

        it('não deve permitir excluir pedido faturado', () => {
            const result = canDeletePedido(mockPedidoFaturado);
            assert.strictEqual(result.allowed, false);
            assert.ok(result.reason.includes('faturado'));
        });

        it('não deve permitir excluir pedido com contas a receber', () => {
            const pedido = { ...mockPedido, contas_receber: 3 };
            const result = canDeletePedido(pedido);
            assert.strictEqual(result.allowed, false);
            assert.ok(result.reason.includes('3 conta(s)'));
        });

        it('não deve permitir excluir pedido com ordens de produção', () => {
            const pedido = { ...mockPedido, ordens_producao: 2 };
            const result = canDeletePedido(pedido);
            assert.strictEqual(result.allowed, false);
            assert.ok(result.reason.includes('2 ordem(ns)'));
        });
    });

    describe('Validação de Vendedor', () => {
        function canDeleteVendedor(vendedor) {
            if (vendedor.pedidos > 0) {
                return { 
                    allowed: false, 
                    reason: `Possui ${vendedor.pedidos} pedido(s). Inative em vez de excluir.` 
                };
            }
            return { allowed: true };
        }

        it('deve permitir excluir vendedor sem pedidos', () => {
            const result = canDeleteVendedor({ id: 1, pedidos: 0 });
            assert.strictEqual(result.allowed, true);
        });

        it('não deve permitir excluir vendedor com pedidos', () => {
            const result = canDeleteVendedor({ id: 1, pedidos: 15 });
            assert.strictEqual(result.allowed, false);
            assert.ok(result.reason.includes('15 pedido(s)'));
        });
    });

    describe('Validação de Cliente', () => {
        function canDeleteCliente(cliente) {
            if (cliente.pedidos > 0) {
                return { 
                    allowed: false, 
                    reason: `Possui ${cliente.pedidos} pedido(s). Inative em vez de excluir.` 
                };
            }
            if (cliente.contas_receber > 0) {
                return { 
                    allowed: false, 
                    reason: `Possui ${cliente.contas_receber} conta(s) a receber.` 
                };
            }
            return { allowed: true };
        }

        it('deve permitir excluir cliente sem vínculos', () => {
            const result = canDeleteCliente({ id: 1, pedidos: 0, contas_receber: 0 });
            assert.strictEqual(result.allowed, true);
        });

        it('não deve permitir excluir cliente com pedidos', () => {
            const result = canDeleteCliente({ id: 1, pedidos: 5, contas_receber: 0 });
            assert.strictEqual(result.allowed, false);
        });

        it('não deve permitir excluir cliente com contas a receber', () => {
            const result = canDeleteCliente({ id: 1, pedidos: 0, contas_receber: 3 });
            assert.strictEqual(result.allowed, false);
        });
    });
});

describe('Integração Faturamento-Estoque', () => {
    
    describe('Verificação de Estoque Suficiente', () => {
        function verificarEstoqueSuficiente(estoqueAtual, quantidadeSolicitada) {
            if (estoqueAtual < quantidadeSolicitada) {
                return {
                    suficiente: false,
                    disponivel: estoqueAtual,
                    faltante: quantidadeSolicitada - estoqueAtual
                };
            }
            return { suficiente: true };
        }

        it('deve aprovar quando há estoque suficiente', () => {
            const result = verificarEstoqueSuficiente(100, 50);
            assert.strictEqual(result.suficiente, true);
        });

        it('deve rejeitar quando não há estoque suficiente', () => {
            const result = verificarEstoqueSuficiente(30, 50);
            assert.strictEqual(result.suficiente, false);
            assert.strictEqual(result.disponivel, 30);
            assert.strictEqual(result.faltante, 20);
        });

        it('deve aprovar quando estoque igual à quantidade', () => {
            const result = verificarEstoqueSuficiente(50, 50);
            assert.strictEqual(result.suficiente, true);
        });

        it('deve rejeitar quando estoque zero', () => {
            const result = verificarEstoqueSuficiente(0, 10);
            assert.strictEqual(result.suficiente, false);
        });
    });

    describe('Movimentação de Estoque', () => {
        function criarMovimentacao(tipo, quantidade, referencia) {
            if (!['entrada', 'saida', 'ajuste'].includes(tipo)) {
                throw new Error('Tipo de movimentação inválido');
            }
            if (quantidade <= 0) {
                throw new Error('Quantidade deve ser positiva');
            }
            return {
                tipo,
                quantidade,
                referencia_tipo: referencia.tipo,
                referencia_id: referencia.id,
                data_movimentacao: new Date().toISOString()
            };
        }

        it('deve criar movimentação de entrada', () => {
            const mov = criarMovimentacao('entrada', 100, { tipo: 'nf_compra', id: 1 });
            assert.strictEqual(mov.tipo, 'entrada');
            assert.strictEqual(mov.quantidade, 100);
        });

        it('deve criar movimentação de saída', () => {
            const mov = criarMovimentacao('saida', 50, { tipo: 'nfe', id: 123 });
            assert.strictEqual(mov.tipo, 'saida');
            assert.strictEqual(mov.referencia_tipo, 'nfe');
        });

        it('deve rejeitar tipo inválido', () => {
            assert.throws(
                () => criarMovimentacao('invalido', 10, { tipo: 'teste', id: 1 }),
                { message: 'Tipo de movimentação inválido' }
            );
        });

        it('deve rejeitar quantidade zero ou negativa', () => {
            assert.throws(
                () => criarMovimentacao('entrada', 0, { tipo: 'teste', id: 1 }),
                { message: 'Quantidade deve ser positiva' }
            );
            assert.throws(
                () => criarMovimentacao('entrada', -10, { tipo: 'teste', id: 1 }),
                { message: 'Quantidade deve ser positiva' }
            );
        });
    });
});

describe('Cancelamento de NF-e', () => {
    
    describe('Validação de Cancelamento', () => {
        function validarCancelamento(nfe, motivo) {
            if (nfe.status === 'cancelada') {
                return { valido: false, erro: 'NF-e já está cancelada' };
            }
            if (!motivo || motivo.length < 15) {
                return { valido: false, erro: 'Motivo deve ter no mínimo 15 caracteres' };
            }
            return { valido: true };
        }

        it('deve permitir cancelar NF-e autorizada com motivo válido', () => {
            const result = validarCancelamento(
                { id: 1, status: 'autorizada' },
                'Erro no cadastro do cliente - dados incorretos'
            );
            assert.strictEqual(result.valido, true);
        });

        it('não deve permitir cancelar NF-e já cancelada', () => {
            const result = validarCancelamento(
                { id: 1, status: 'cancelada' },
                'Motivo qualquer'
            );
            assert.strictEqual(result.valido, false);
            assert.ok(result.erro.includes('já está cancelada'));
        });

        it('não deve permitir motivo curto', () => {
            const result = validarCancelamento(
                { id: 1, status: 'autorizada' },
                'Motivo curto'
            );
            assert.strictEqual(result.valido, false);
            assert.ok(result.erro.includes('15 caracteres'));
        });
    });

    describe('Estorno de Estoque', () => {
        function calcularEstorno(movimentacoes) {
            const estornos = [];
            for (const mov of movimentacoes) {
                if (mov.tipo === 'saida' && mov.referencia_tipo === 'nfe') {
                    estornos.push({
                        material_id: mov.material_id,
                        quantidade: mov.quantidade,
                        tipo: 'entrada',
                        referencia_tipo: 'nfe_cancelamento',
                        referencia_id: mov.referencia_id
                    });
                }
            }
            return estornos;
        }

        it('deve criar estornos para todas movimentações de saída', () => {
            const movimentacoes = [
                { material_id: 1, quantidade: 10, tipo: 'saida', referencia_tipo: 'nfe', referencia_id: 123 },
                { material_id: 2, quantidade: 5, tipo: 'saida', referencia_tipo: 'nfe', referencia_id: 123 }
            ];
            
            const estornos = calcularEstorno(movimentacoes);
            
            assert.strictEqual(estornos.length, 2);
            assert.strictEqual(estornos[0].tipo, 'entrada');
            assert.strictEqual(estornos[0].referencia_tipo, 'nfe_cancelamento');
        });

        it('deve ignorar movimentações que não são de NF-e', () => {
            const movimentacoes = [
                { material_id: 1, quantidade: 10, tipo: 'saida', referencia_tipo: 'producao', referencia_id: 456 },
                { material_id: 2, quantidade: 5, tipo: 'entrada', referencia_tipo: 'nf_compra', referencia_id: 789 }
            ];
            
            const estornos = calcularEstorno(movimentacoes);
            
            assert.strictEqual(estornos.length, 0);
        });
    });
});

console.log('✅ Testes de transações e integridade concluídos!');
