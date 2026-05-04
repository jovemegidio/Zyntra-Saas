'use strict';

/**
 * pcp-flow.smoke.test.js — Smoke test corrigido v6
 * 
 * Rotas reais (verificadas no server.js):
 *   GET  /api/vendas/pedidos/:id          → detalhes pedido (auth via apiVendasRouter.use(authenticateToken))
 *   PUT  /api/vendas/pedidos/:id/status   → transição de status
 * 
 * Login: token em cookie httpOnly, não no JSON body.
 * Solução: gerar tokens via jwt.sign() direto (mesmo secret).
 * 
 * Status válidos: orcamento, analise, analise-credito, aprovado,
 *   pedido-aprovado, faturar, faturado, entregue, cancelado, recibo
 * 
 * Transições de 'aprovado': [faturar, cancelado]
 */

// Env ANTES de qualquer require
process.env.JWT_SECRET = 'test-secret-zyntra-jest-32chars!!';
process.env.NODE_ENV = 'test';

// ── Mocks de módulos ROOT que server.js importa ─────────────────────────

// 1. database/pool — evita conexão real ao MySQL
const mockConn = {
  query: jest.fn(),
  beginTransaction: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
};

const mockPool = {
  query: jest.fn().mockResolvedValue([[{ 1: 1 }]]),
  getConnection: jest.fn().mockResolvedValue(mockConn),
  end: jest.fn().mockResolvedValue(undefined),
  _conn: mockConn,
};

jest.mock('../../../database/pool', () => mockPool);

// 2. security-middleware — evita requires de rate-limit-redis, helmet, etc.
jest.mock('../../../security-middleware', () => ({
  generalLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
  sanitizeInput: (req, res, next) => next(),
  securityHeaders: () => (req, res, next) => next(),
  cleanExpiredSessions: jest.fn(),
}));

// 3. lgpd-crypto — opcional, evita file-not-found
jest.mock('../../../lgpd-crypto', () => ({ decryptPII: (v) => v }), { virtual: true });

// 4. permission.service — evita setInterval cleanup e DB calls
jest.mock('../../../services/permission.service', () => ({
  hasModuleAccess: jest.fn().mockResolvedValue(true),
  hasActionPermission: jest.fn().mockResolvedValue(true),
  isAdmin: jest.fn().mockResolvedValue(false),
}));

// 5. services/cache — evita redis
jest.mock('../../../services/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

// 6. cdr-scraper — evita require de puppeteer-core
jest.mock('../../../services/cdr-scraper', () => ({
  scrape: jest.fn().mockResolvedValue(null),
}));

// 7. pdfkit — mock virtual caso nao esteja instalado
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    end: jest.fn(),
    on: jest.fn(),
  }));
}, { virtual: true });

// 8. ioredis — mock para evitar conexão
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// ── Fixtures ─────────────────────────────────────────────────────────────

const USERS = {
  vendedor1: { id: 101, nome: 'Carlos Vendedor', email: 'carlos@test', role: 'user', is_admin: 0 },
  vendedor2: { id: 102, nome: 'Maria Vendedor', email: 'maria@test', role: 'user', is_admin: 0 },
  admin:     { id: 103, nome: 'Admin Geral',    email: 'admin@aluforce', role: 'admin', is_admin: 1 },
};

const PEDIDO = {
  id: 42,
  vendedor_id: 101,
  status: 'aprovado',
  cliente_nome: 'Cliente Teste',
  valor: 1500,
};

// ── Helpers ──────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const request = require('supertest');

function makeToken(user) {
  return jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, role: user.role, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function setupPoolQuery(overrides = {}) {
  mockPool.query.mockImplementation(async (sql) => {
    const s = String(sql || '');

    // Pedido por ID
    if (s.match(/SELECT.*FROM pedidos WHERE id/i)) {
      return [[overrides.pedido || PEDIDO]];
    }
    // Itens
    if (s.includes('FROM pedido_itens')) {
      return [[{ codigo: 'P001', descricao: 'Produto A', quantidade: 10, unidade: 'UN' }]];
    }
    // INSERT
    if (s.match(/INSERT INTO/i)) {
      return [{ insertId: 1 }];
    }
    // UPDATE
    if (s.match(/UPDATE/i)) {
      return [{ affectedRows: 1 }];
    }
    // DELETE
    if (s.match(/DELETE FROM/i)) {
      return [{ affectedRows: 0 }];
    }
    // Default
    return [[]];
  });
}

function setupConnForTransaction(conn, pedido) {
  conn.query.mockImplementation(async (sql) => {
    const s = String(sql || '');

    if (s.match(/SELECT.*FROM pedidos WHERE id/i)) {
      return [[pedido]];
    }
    if (s.match(/UPDATE pedidos SET status/i)) {
      return [{ affectedRows: 1 }];
    }
    if (s.match(/INSERT INTO/i)) {
      return [{ insertId: 1 }];
    }
    if (s.match(/SELECT.*estoque_movimentacoes/i)) {
      return [[]]; // sem movimentações
    }
    return [{ affectedRows: 1 }];
  });
}

// ── Test Suite ───────────────────────────────────────────────────────────

describe('Smoke: fluxo vendas — visibilidade e transição de status', () => {
  let app;

  beforeAll(async () => {
    // Carregar server (mocks já estão ativos via jest.mock hoisting)
    const serverModule = require('../server');
    app = serverModule.app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.getConnection.mockResolvedValue(mockConn);
    mockPool.query.mockResolvedValue([[]]);
  });

  test('1. Vendedor não vê pedido de outro vendedor (403)', async () => {
    const token = makeToken(USERS.vendedor2); // id=102
    setupPoolQuery({ pedido: { ...PEDIDO, vendedor_id: 101 } });

    const resp = await request(app)
      .get('/api/vendas/pedidos/42')
      .set('Authorization', `Bearer ${token}`);

    expect(resp.status).toBe(403);
  });

  test('2. Admin vê pedido de qualquer vendedor (200)', async () => {
    const token = makeToken(USERS.admin); // is_admin=1
    setupPoolQuery({ pedido: { ...PEDIDO, vendedor_id: 101 } });

    const resp = await request(app)
      .get('/api/vendas/pedidos/42')
      .set('Authorization', `Bearer ${token}`);

    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('id', 42);
  });

  test('3. Admin transiciona aprovado → faturar (200)', async () => {
    const token = makeToken(USERS.admin);
    // pool.query para buscar pedido com status atual
    setupPoolQuery({ pedido: { ...PEDIDO, status: 'aprovado' } });
    // connection para a transação
    setupConnForTransaction(mockConn, { ...PEDIDO, status: 'aprovado' });

    const resp = await request(app)
      .put('/api/vendas/pedidos/42/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'faturar' });

    expect([200, 201]).toContain(resp.status);
  });

  test('4. Transição inválida aprovado → entregue (400)', async () => {
    const token = makeToken(USERS.admin);
    setupPoolQuery({ pedido: { ...PEDIDO, status: 'aprovado' } });

    const resp = await request(app)
      .put('/api/vendas/pedidos/42/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'entregue' });

    // 'entregue' não está em TRANSICOES_PERMITIDAS['aprovado'] = ['faturar', 'cancelado']
    expect(resp.status).toBe(400);
  });
});
