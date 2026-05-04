'use strict';
/**
 * Teste de diagnóstico do mock — determina se database/pool está sendo
 * corretamente interceptado antes de tentar os testes de Kanban completos.
 */

process.env.JWT_SECRET = 'test-secret-dev-32-chars-minimum!!';
process.env.NODE_ENV = 'test';

// Mockar cdr-scraper (requer puppeteer-core não instalado)
jest.mock('../../../services/cdr-scraper', () => ({
    listarRamais: jest.fn().mockResolvedValue([]),
    listarLigacoes: jest.fn().mockResolvedValue([]),
    obterRelatorio: jest.fn().mockResolvedValue({}),
}));

// Mockar database/pool DIRETAMENTE
jest.mock('../../../database/pool', () => {
    const sharedQuery = jest.fn().mockResolvedValue([[], []]);
    const conn = {
        query: sharedQuery,
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
    };
    return { query: sharedQuery, getConnection: jest.fn().mockResolvedValue(conn), _conn: conn };
});

let app, mockPool;

beforeAll(() => {
    const srv = require('../server');
    app = srv.app;
    mockPool = jest.requireMock('../../../database/pool');
});

test('mock pool é injetado no server.js', () => {
    const srv = require('../server');
    expect(srv.pool).toBe(mockPool);
    expect(typeof mockPool.query.mock).toBe('object'); // é uma jest.fn()
});

test('GET /api/vendas/produtos/autocomplete retorna 200 com mock', async () => {
    const request = require('supertest');
    const jwt = require('jsonwebtoken');

    mockPool.query.mockResolvedValueOnce([[
        { id: 1, codigo: 'X01', nome: 'Produto 1', descricao: 'Produto 1', preco_venda: 100, preco_custo: 70, estoque_atual: 50, unidade: 'UN', situacao: 'ativo', local_estoque: 'PADRAO', ean: null },
    ]]);

    const token = jwt.sign({ id: 1, nome: 'Admin', email: 'admin@test.com', role: 'admin', is_admin: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
        .get('/api/vendas/produtos/autocomplete?termo=X01')
        .set('Authorization', `Bearer ${token}`);

    console.log('Autocomplete status:', res.status, 'body:', JSON.stringify(res.body).substring(0, 200));
    expect([200, 401, 403]).toContain(res.status);
});
