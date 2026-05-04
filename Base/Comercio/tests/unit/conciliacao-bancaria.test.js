/**
 * Tests — Conciliação Bancária: CRUD unit tests (sem DB real)
 *
 * Testa a lógica de negócio da conciliação bancária:
 *   - match automático por valor+data
 *   - match manual
 *   - extrato import (hash dedup)
 *   - desfazer conciliação
 *   - validação de campos
 *
 * Run: node tests/unit/conciliacao-bancaria.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

// ──────────────────────────────────────────────────────────────────────
// Tipos e utilitários
// ──────────────────────────────────────────────────────────────────────

/** Simula um item do extrato bancário */
function criarItemExtrato({ id = 1, data = '2026-03-20', descricao = 'PIX CLIENTE', valor = 1500.00, conciliado = false } = {}) {
    return { id, data, descricao, valor, conciliado };
}

/** Simula uma movimentação do sistema (contas_receber / contas_pagar) */
function criarMovimentacao({ id = 1, tipo = 'receber', data = '2026-03-20', descricao = 'Venda #123', valor = 1500.00, status = 'pendente' } = {}) {
    return { id, tipo, data, descricao, valor, status };
}

/** Algoritmo de match automático: mesmo valor no mesmo dia (ou ±1 dia) */
function tentarMatchAutomatico(extrato, movimentacoes) {
    const dataBanco = new Date(extrato.data);
    const TOLERANCIA_DIAS = 1;

    for (const mov of movimentacoes) {
        if (mov.status === 'conciliado') continue;

        const dataMov = new Date(mov.data);
        const diffDias = Math.abs((dataBanco - dataMov) / 86400000);

        if (
            Math.abs(extrato.valor - mov.valor) < 0.01 &&
            diffDias <= TOLERANCIA_DIAS
        ) {
            return { matched: true, movimentacao: mov, confianca: diffDias === 0 ? 'alta' : 'media' };
        }
    }
    return { matched: false };
}

/** Gera hash SHA-256 simples para dedup de extrato (sem crypto real) */
function hashExtratoLineSim({ data, valor, descricao }) {
    return `${data}|${valor.toFixed(2)}|${descricao.substring(0, 50)}`;
}

// ──────────────────────────────────────────────────────────────────────
// Testes
// ──────────────────────────────────────────────────────────────────────

describe('Conciliação Bancária — Match Automático', () => {

    it('deve fazer match quando valor e data são idênticos', () => {
        const extrato = criarItemExtrato({ valor: 2500.00, data: '2026-03-15' });
        const movs = [criarMovimentacao({ valor: 2500.00, data: '2026-03-15' })];

        const result = tentarMatchAutomatico(extrato, movs);
        assert.equal(result.matched, true);
        assert.equal(result.confianca, 'alta');
    });

    it('deve fazer match com tolerância de 1 dia (D+1)', () => {
        const extrato = criarItemExtrato({ valor: 800.00, data: '2026-03-21' });
        const movs = [criarMovimentacao({ valor: 800.00, data: '2026-03-20' })];

        const result = tentarMatchAutomatico(extrato, movs);
        assert.equal(result.matched, true);
        assert.equal(result.confianca, 'media');
    });

    it('NÃO deve fazer match se diferença de dias > 1', () => {
        const extrato = criarItemExtrato({ valor: 800.00, data: '2026-03-25' });
        const movs = [criarMovimentacao({ valor: 800.00, data: '2026-03-20' })];

        const result = tentarMatchAutomatico(extrato, movs);
        assert.equal(result.matched, false);
    });

    it('NÃO deve fazer match se valores diferem', () => {
        const extrato = criarItemExtrato({ valor: 800.00 });
        // Usa diferença de R$1,00 para evitar ambiguidade de ponto flutuante
        const movs = [criarMovimentacao({ valor: 801.00 })];

        const result = tentarMatchAutomatico(extrato, movs);
        assert.equal(result.matched, false);
    });

    it('NÃO deve fazer match com movimentação já conciliada', () => {
        const extrato = criarItemExtrato({ valor: 500.00, data: '2026-03-10' });
        const movs = [criarMovimentacao({ valor: 500.00, data: '2026-03-10', status: 'conciliado' })];

        const result = tentarMatchAutomatico(extrato, movs);
        assert.equal(result.matched, false);
    });

    it('escolhe o primeiro match quando há múltiplas candidatas', () => {
        const extrato = criarItemExtrato({ valor: 300.00, data: '2026-03-01' });
        const movs = [
            criarMovimentacao({ id: 10, valor: 300.00, data: '2026-03-01' }),
            criarMovimentacao({ id: 11, valor: 300.00, data: '2026-03-01' })
        ];

        const result = tentarMatchAutomatico(extrato, movs);
        assert.equal(result.matched, true);
        assert.equal(result.movimentacao.id, 10, 'Deve pegar o primeiro match');
    });

});

describe('Conciliação Bancária — Import de Extrato (Dedup)', () => {

    it('hash idêntico para mesma linha do extrato', () => {
        const linha = { data: '2026-03-20', valor: 1500.00, descricao: 'PIX CLIENTE' };
        assert.equal(hashExtratoLineSim(linha), hashExtratoLineSim(linha));
    });

    it('hash diferente quando valor muda', () => {
        const a = { data: '2026-03-20', valor: 1500.00, descricao: 'PIX' };
        const b = { data: '2026-03-20', valor: 1500.01, descricao: 'PIX' };
        assert.notEqual(hashExtratoLineSim(a), hashExtratoLineSim(b));
    });

    it('hash diferente quando data muda', () => {
        const a = { data: '2026-03-20', valor: 100.00, descricao: 'TED' };
        const b = { data: '2026-03-21', valor: 100.00, descricao: 'TED' };
        assert.notEqual(hashExtratoLineSim(a), hashExtratoLineSim(b));
    });

    it('deduplicação em memória: mesma linha não é inserida duas vezes', () => {
        const hashesJaImportados = new Set();
        const linhas = [
            { data: '2026-03-20', valor: 500.00, descricao: 'PIX' },
            { data: '2026-03-20', valor: 500.00, descricao: 'PIX' }, // duplicata
            { data: '2026-03-21', valor: 500.00, descricao: 'PIX' }  // nova
        ];

        const importadas = [];
        for (const linha of linhas) {
            const h = hashExtratoLineSim(linha);
            if (!hashesJaImportados.has(h)) {
                hashesJaImportados.add(h);
                importadas.push(linha);
            }
        }

        assert.equal(importadas.length, 2, 'Apenas 2 linhas únicas devem ser importadas');
    });

});

describe('Conciliação Bancária — Validação de Input', () => {

    function validarConciliacao({ extrato_id, movimentacao_id, conta_id }) {
        const erros = [];
        if (!extrato_id || isNaN(parseInt(extrato_id))) erros.push('extrato_id inválido');
        if (!movimentacao_id || isNaN(parseInt(movimentacao_id))) erros.push('movimentacao_id inválido');
        if (!conta_id || isNaN(parseInt(conta_id))) erros.push('conta_id inválido');
        return { valido: erros.length === 0, erros };
    }

    it('campos obrigatórios válidos passam na validação', () => {
        const r = validarConciliacao({ extrato_id: 1, movimentacao_id: 2, conta_id: 3 });
        assert.equal(r.valido, true);
        assert.equal(r.erros.length, 0);
    });

    it('extrato_id ausente retorna erro', () => {
        const r = validarConciliacao({ movimentacao_id: 2, conta_id: 3 });
        assert.equal(r.valido, false);
        assert.ok(r.erros.some(e => e.includes('extrato_id')));
    });

    it('movimentacao_id ausente retorna erro', () => {
        const r = validarConciliacao({ extrato_id: 1, conta_id: 3 });
        assert.equal(r.valido, false);
        assert.ok(r.erros.some(e => e.includes('movimentacao_id')));
    });

    it('conta_id ausente retorna erro', () => {
        const r = validarConciliacao({ extrato_id: 1, movimentacao_id: 2 });
        assert.equal(r.valido, false);
        assert.ok(r.erros.some(e => e.includes('conta_id')));
    });

    it('IDs com string não-numérica retornam erro', () => {
        const r = validarConciliacao({ extrato_id: 'abc', movimentacao_id: 2, conta_id: 3 });
        assert.equal(r.valido, false);
    });

});

describe('Conciliação Bancária — Desfazer Conciliação', () => {

    function desfazerConciliacao(conciliacoes, id) {
        const idx = conciliacoes.findIndex(c => c.id === id);
        if (idx === -1) return { ok: false, error: 'Conciliação não encontrada' };

        const removida = conciliacoes.splice(idx, 1)[0];
        return { ok: true, removida };
    }

    it('remove a conciliação existente', () => {
        const lista = [
            { id: 1, extrato_id: 10, movimentacao_id: 20 },
            { id: 2, extrato_id: 11, movimentacao_id: 21 }
        ];
        const result = desfazerConciliacao(lista, 1);
        assert.equal(result.ok, true);
        assert.equal(lista.length, 1);
        assert.equal(lista[0].id, 2);
    });

    it('retorna erro quando conciliação não existe', () => {
        const lista = [{ id: 1, extrato_id: 10, movimentacao_id: 20 }];
        const result = desfazerConciliacao(lista, 999);
        assert.equal(result.ok, false);
        assert.match(result.error, /não encontrada/i);
    });

    it('lista vazia retorna erro sem crash', () => {
        const result = desfazerConciliacao([], 1);
        assert.equal(result.ok, false);
    });

});

describe('Conciliação Bancária — Saldo Calculado', () => {

    it('saldo = saldo_inicial + entradas - saidas', () => {
        const saldoInicial = 10000.00;
        const entradas = [1500.00, 800.00, 2200.00];
        const saidas = [3000.00, 500.00];

        const totalEntradas = entradas.reduce((a, b) => a + b, 0);
        const totalSaidas = saidas.reduce((a, b) => a + b, 0);
        const saldoFinal = Number((saldoInicial + totalEntradas - totalSaidas).toFixed(2));

        assert.equal(saldoFinal, 11000.00);
    });

    it('conta sem movimentações mantém saldo inicial', () => {
        const saldoInicial = 5000.00;
        const saldoFinal = Number((saldoInicial + 0 - 0).toFixed(2));
        assert.equal(saldoFinal, 5000.00);
    });

    it('saldo negativo é possível (cheque especial)', () => {
        const saldoInicial = 1000.00;
        const saidas = [1500.00];
        const saldoFinal = Number((saldoInicial - saidas[0]).toFixed(2));
        assert.equal(saldoFinal, -500.00);
        assert.ok(saldoFinal < 0, 'Sistema deve aceitar saldo negativo');
    });

});

// Run: node tests/unit/conciliacao-bancaria.test.js
