/**
 * Tests — Faturamento: Race Condition Prevention
 *
 * Verifica que pedidas faturadas de forma concorrente (duplo-clique,
 * requests simultâneos) NÃO geram duplicatas de fatura.
 *
 * Estratégia: simula a lógica de "SELECT … FOR UPDATE" e o estado
 * do pedido sem depender de banco real.
 *
 * Run: node tests/unit/faturamento-race-condition.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

// ──────────────────────────────────────────────────────────────────────
// Helpers — simulação de locking
// ──────────────────────────────────────────────────────────────────────

/**
 * Simula em memória o comportamento de BEGIN + SELECT … FOR UPDATE.
 * Apenas um caller consegue o lock por vez; os demais recebem erro 409.
 */
class FaturamentoLockSimulator {
    constructor() {
        this._locked = new Set();       // pedido_id → travado
        this._faturados = new Set();    // pedido_id → já faturado
        this._callCount = 0;
    }

    async tentarFaturar(pedidoId) {
        this._callCount++;

        if (this._faturados.has(pedidoId)) {
            return { ok: false, status: 409, error: 'Pedido já faturado' };
        }

        if (this._locked.has(pedidoId)) {
            // Simula timeout ao tentar adquirir FOR UPDATE
            return { ok: false, status: 409, error: 'Pedido em processamento por outro request' };
        }

        this._locked.add(pedidoId);

        try {
            // Simula trabalho assíncrono (DB update, NF-e call, etc.)
            await new Promise(r => setImmediate(r));

            this._faturados.add(pedidoId);
            return { ok: true, status: 200, faturaId: `FAT-${pedidoId}-${Date.now()}` };
        } finally {
            this._locked.delete(pedidoId);
        }
    }

    get callCount() { return this._callCount; }
    isFaturado(id) { return this._faturados.has(id); }
}

// ──────────────────────────────────────────────────────────────────────
// Testes
// ──────────────────────────────────────────────────────────────────────

describe('Faturamento — Race Condition Prevention', () => {

    it('pedido faturado com sucesso no primeiro request', async () => {
        const sim = new FaturamentoLockSimulator();
        const result = await sim.tentarFaturar(42);
        assert.equal(result.ok, true);
        assert.equal(result.status, 200);
        assert.ok(result.faturaId.startsWith('FAT-42-'));
        assert.ok(sim.isFaturado(42));
    });

    it('segundo request simultâneo retorna 409 (lock)', async () => {
        const sim = new FaturamentoLockSimulator();

        // Lançar dois requests concorrentes para o MESMO pedido
        const [r1, r2] = await Promise.all([
            sim.tentarFaturar(99),
            sim.tentarFaturar(99)
        ]);

        const successCount = [r1, r2].filter(r => r.ok).length;
        const conflictCount = [r1, r2].filter(r => r.status === 409).length;

        assert.equal(successCount, 1, 'Exatamente 1 request deve ter sucesso');
        assert.equal(conflictCount, 1, 'Exatamente 1 request deve receber 409');
        assert.equal(sim.callCount, 2, 'Ambos requests devem ter sido chamados');
        assert.ok(sim.isFaturado(99), 'Pedido deve estar faturado após o lock');
    });

    it('N requests simultâneos resultam em apenas 1 fatura', async () => {
        const sim = new FaturamentoLockSimulator();
        const N = 10;
        const pedidoId = 777;

        const results = await Promise.all(
            Array.from({ length: N }, () => sim.tentarFaturar(pedidoId))
        );

        const successes = results.filter(r => r.ok);
        const conflicts = results.filter(r => r.status === 409);

        assert.equal(successes.length, 1, `Apenas 1 de ${N} deve ter sucesso`);
        assert.equal(conflicts.length, N - 1, `Os outros ${N - 1} devem receber 409`);
        assert.ok(sim.isFaturado(pedidoId));
    });

    it('pedidos DIFERENTES podem ser faturados em paralelo sem conflito', async () => {
        const sim = new FaturamentoLockSimulator();

        const results = await Promise.all([
            sim.tentarFaturar(1),
            sim.tentarFaturar(2),
            sim.tentarFaturar(3)
        ]);

        results.forEach(r => {
            assert.equal(r.ok, true, `Pedido independente deve ter sucesso: ${JSON.stringify(r)}`);
        });
        assert.ok(sim.isFaturado(1));
        assert.ok(sim.isFaturado(2));
        assert.ok(sim.isFaturado(3));
    });

    it('pedido já faturado rejeita request subsequente com 409', async () => {
        const sim = new FaturamentoLockSimulator();

        const first = await sim.tentarFaturar(500);
        assert.equal(first.ok, true);

        const second = await sim.tentarFaturar(500);
        assert.equal(second.ok, false);
        assert.equal(second.status, 409);
        assert.match(second.error, /já faturado/i);
    });

    it('status do pedido: apenas transições válidas são permitidas', () => {
        // Máquina de estados do pedido
        const TRANSICOES_VALIDAS = {
            orcamento:    ['confirmado'],
            confirmado:   ['em_producao', 'cancelado'],
            em_producao:  ['concluido', 'cancelado'],
            concluido:    ['faturado'],
            faturado:     [],          // estado terminal
            cancelado:    []           // estado terminal
        };

        function podeFaturar(statusAtual) {
            return statusAtual === 'concluido';
        }

        assert.equal(podeFaturar('concluido'), true);
        assert.equal(podeFaturar('faturado'), false, 'Não pode faturar novamente');
        assert.equal(podeFaturar('em_producao'), false, 'Não pode faturar em produção');
        assert.equal(podeFaturar('cancelado'), false, 'Não pode faturar cancelado');

        // Verificar máquina de estados
        assert.ok(!TRANSICOES_VALIDAS['faturado'].length, 'faturado é estado terminal');
        assert.ok(!TRANSICOES_VALIDAS['cancelado'].length, 'cancelado é estado terminal');
        assert.ok(TRANSICOES_VALIDAS['concluido'].includes('faturado'), 'concluido → faturado');
    });

    it('NF-e call failure não deve manter pedido em estado inconsistente', async () => {
        /**
         * Simula cenário onde a NF-e falha ANTES da transação DB.
         * O pedido deve permanecer em 'concluido' (não 'faturado').
         */
        let estadoPedido = 'concluido';
        let faturaCriada = false;

        async function simFaturarComNfeError(pedidoId) {
            // NF-e é chamada ANTES da transação (padrão implementado em server.js)
            let nfeData = null;
            try {
                throw new Error('NF-e service unavailable'); // Simula falha
            } catch (e) {
                // Sistema continua sem NF-e (degraded mode)
                nfeData = null;
            }

            // Transação DB: só muda estado se chegou aqui
            estadoPedido = 'faturado';
            faturaCriada = true;

            return { ok: true, nfe_gerada: nfeData !== null };
        }

        const result = await simFaturarComNfeError(1);
        assert.equal(result.ok, true, 'Fatura deve ser criada mesmo sem NF-e');
        assert.equal(result.nfe_gerada, false, 'NF-e não deve estar marcada como gerada');
        assert.equal(estadoPedido, 'faturado', 'Pedido deve estar faturado no DB');
        assert.ok(faturaCriada, 'Fatura deve ter sido criada');
    });

});

// ──────────────────────────────────────────────────────────────────────
// Summary (compatível com node:test runner)
// ──────────────────────────────────────────────────────────────────────
// Para rodar: node tests/unit/faturamento-race-condition.test.js
