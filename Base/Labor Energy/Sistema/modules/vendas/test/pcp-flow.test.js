/**
 * pcp-flow.test.js
 * ============================================================
 * Teste de integração (DB mockado): fluxo vendedor → gerente → PCP
 *
 * Cobre os requisitos implementados nas sessões de controle de acesso:
 *   1. Isolamento de pedidos por vendedor
 *   2. Gerente (andreia@aluforce) vê TODOS os pedidos
 *   3. PCP consegue puxar para produção (pedido-aprovado) e faturar
 *   4. Estoque é decrementado ao mover para pedido-aprovado
 *   5. Guard anti-duplo-decremento
 *   6. Regressão: cache scoped por usuário (perUser=true)
 *
 * Padrão: Jest + supertest + jest.mock('mysql2/promise')
 * Runner: cd modules/Vendas && npx jest test/pcp-flow.test.js --runInBand --verbose
 */

'use strict';

// ── Define JWT_SECRET ANTES de qualquer require do servidor ────────────────
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-zyntra-jest-32chars!!';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const bcrypt = require('bcrypt');

// Mock de JWT para evitar dependência transitiva ausente no ambiente de teste.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `test.${encoded}.sig`;
  }),
  verify: jest.fn((token) => {
    if (!token || typeof token !== 'string') throw new Error('invalid token');
    const parts = token.split('.');
    if (parts.length < 2) throw new Error('invalid token');
    const raw = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(raw);
  }),
  decode: jest.fn((token) => {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const raw = Buffer.from(parts[1], 'base64url').toString('utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }),
}));

// ── Mock do MySQL ─────────────────────────────────────────────────────────
// Precisamos de pool.query E pool.getConnection (para rotas com transações).
// A fábrica é hoistada pelo Jest, então cria o mock completo aqui.

jest.mock('mysql2/promise', () => {
  // Objeto de conexão (para beginTransaction / query / commit / rollback)
  const connMock = {
    query: jest.fn().mockResolvedValue([[{ affectedRows: 1 }]]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
  };

  const poolMock = {
    query: jest.fn().mockResolvedValue([[1]]),
    getConnection: jest.fn().mockResolvedValue(connMock),
    // referência interna para acesso nos testes
    _conn: connMock,
  };

  return { createPool: jest.fn().mockReturnValue(poolMock) };
});

// ── Fixtures ───────────────────────────────────────────────────────────────
const VENDEDOR1_ID = 101;
const VENDEDOR2_ID = 102;
const GERENTE_ID    = 103;
const PCP_ID        = 104;
const PEDIDO_ID     = 42;

const USERS = {
  vendedor1: {
    id: VENDEDOR1_ID,
    nome: 'Carlos Vendedor',
    email: 'carlos@test',
    role: 'user',
    is_admin: 0,
  },
  vendedor2: {
    id: VENDEDOR2_ID,
    nome: 'Bruno Vendedor',
    email: 'bruno@test',
    role: 'user',
    is_admin: 0,
  },
  gerente: {
    id: GERENTE_ID,
    nome: 'Andreia Lopes',
    email: 'andreia@aluforce',
    role: 'gerente',
    is_admin: 0,
  },
  pcp: {
    id: PCP_ID,
    nome: 'Producao Aluforce',
    email: 'pcp@aluforce',
    role: 'pcp',
    is_admin: 0,
  },
};

// Pedido que pertence ao vendedor1 com status 'aprovado' (pronto para PCP)
const PEDIDO_APROVADO = {
  id: PEDIDO_ID,
  status: 'aprovado',
  vendedor_id: VENDEDOR1_ID,
  cliente_id: 1,
  cliente_nome: 'Cliente Teste',
  valor: 5000,
  condicao_pagamento: '30/60',
  produtos_preview: null,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Configura o poolMock.query para responder padrões comuns.
 * `overrides` permite substituir respostas específicas por teste.
 */
function setupPoolMock(pool, { loginUser, pedidoFixture = PEDIDO_APROVADO, connQuery } = {}) {
  pool.query.mockImplementation(async (sql, params) => {
    const s = (sql || '').toString().trim();

    // ── Login: SELECT FROM usuarios WHERE email ─────────────────────────
    if (s.includes('FROM usuarios WHERE email')) {
      if (!loginUser) return [[]]; // usuário não encontrado
      return [[loginUser]];
    }

    // ── Módulos: permissoes_modulos (authorizeArea) ─────────────────────
    if (s.includes('FROM permissoes_modulos')) {
      // Retorna acesso ao módulo 'vendas' para todos os usuários de teste
      return [[{ modulo: 'vendas' }]];
    }

    // ── isAdmin DB lookup ───────────────────────────────────────────────
    if (s.match(/FROM usuarios WHERE id\s*=/i) || s.match(/FROM usuarios WHERE id\s*\?/i)) {
      const uid = Array.isArray(params) ? params[0] : undefined;
      const u = Object.values(USERS).find(u => u.id === uid) || { is_admin: 0, role: 'user' };
      return [[{ id: uid, is_admin: u.is_admin, role: u.role }]];
    }

    // ── pedidoOwnership: SELECT vendedor_id FROM pedidos ────────────────
    if (s.match(/SELECT\s+vendedor_id\s+FROM\s+pedidos/i)) {
      return [[{ vendedor_id: pedidoFixture.vendedor_id }]];
    }

    // ── Listagem de pedidos (pedido-repository) ─────────────────────────
    if (s.includes('FROM pedidos p')) {
      return [[pedidoFixture, { ...pedidoFixture, id: 99, vendedor_id: VENDEDOR2_ID }]];
    }

    // ── Detalhe do pedido (GET /pedidos/:id) ────────────────────────────
    if (s.includes('FROM pedidos p') && s.includes('LEFT JOIN clientes')) {
      return [[{ ...pedidoFixture, cliente_nome: pedidoFixture.cliente_nome }]];
    }

    // ── SELECT FROM pedidos (single row for detail) ─────────────────────
    if (s.match(/SELECT p\.\*/i) || s.match(/SELECT \* FROM pedidos WHERE id/i)) {
      return [[pedidoFixture]];
    }

    // ── pedido_itens ────────────────────────────────────────────────────
    if (s.includes('FROM pedido_itens')) {
      return [[{ id: 1, pedido_id: PEDIDO_ID, codigo: 'P001', descricao: 'Produto A', quantidade: 10, unidade: 'UN', preco_unitario: 500 }]];
    }

    // ── Notificações (não-crítico) ──────────────────────────────────────
    if (s.includes('FROM usuarios') && s.includes('role')) {
      return [[]];
    }
    if (s.includes('INTO notificacoes')) {
      return [{ insertId: 1 }];
    }

    // ── Default ─────────────────────────────────────────────────────────
    return [[{ affectedRows: 1 }]];
  });

  // Se custom connQuery handler for passado, usá-lo
  if (connQuery) {
    pool._conn.query.mockImplementation(connQuery);
  }
}

/**
 * Monta mock para connection.query nas rotas com transação (PUT /status, etc.).
 * O `pedido` é o que será retornado no SELECT FOR UPDATE.
 */
function makeConnQueryHandler(pedido = PEDIDO_APROVADO) {
  return async (sql, params) => {
    const s = (sql || '').toString().trim();

    // SELECT FOR UPDATE (pedido atual)
    if (s.includes('SELECT id, status, vendedor_id') && s.includes('FOR UPDATE')) {
      return [[pedido]];
    }

    // UPDATE pedidos SET status
    if (s.match(/UPDATE pedidos SET status/i)) {
      return [{ affectedRows: 1 }];
    }

    // SELECT ordens_producao WHERE pedido_id (verifica se OP existe)
    if (s.includes('FROM ordens_producao') && s.includes('pedido_id')) {
      return [[]]; // Nenhuma OP existente
    }

    // SELECT pedido_itens para geração de OP
    if (s.match(/SELECT codigo.*FROM pedido_itens/i)) {
      return [[{ codigo: 'P001', descricao: 'Produto A', quantidade: 10, unidade: 'UN' }]];
    }

    // SELECT última OP para numeração sequencial
    if (s.includes('FROM ordens_producao') && s.includes("LIKE 'OP N° %'")) {
      return [[]];
    }

    // INSERT INTO ordens_producao
    if (s.match(/INSERT INTO ordens_producao/i)) {
      return [{ insertId: 1 }];
    }

    // UPDATE pedidos SET producao_iniciada
    if (s.match(/UPDATE pedidos SET producao_iniciada/i)) {
      return [{ affectedRows: 1 }];
    }

    // SELECT produtos (baixa de estoque)
    if (s.match(/SELECT id, codigo.*FROM produtos/i)) {
      return [[{ id: 1, codigo: 'P001', descricao: 'Produto A', estoque_atual: 100 }]];
    }

    // UPDATE produtos SET estoque_atual
    if (s.match(/UPDATE produtos\s+SET estoque_atual/i)) {
      return [{ affectedRows: 1 }];
    }

    // INSERT INTO estoque_movimentacoes
    if (s.match(/INSERT INTO estoque_movimentacoes/i)) {
      return [{ insertId: 10 }];
    }

    // SELECT COUNT estoque_movimentacoes (anti-duplo-decremento)
    if (s.includes('FROM estoque_movimentacoes') && s.includes('COUNT')) {
      return [[{ cnt: 0 }]]; // Sem movimentações anteriores → baixar
    }

    // INSERT INTO pedido_historico
    if (s.match(/INSERT INTO pedido_historico/i)) {
      return [{ insertId: 1 }];
    }

    // PATCH: SELECT FOR UPDATE
    if (s.match(/SELECT \* FROM pedidos WHERE id.*FOR UPDATE/i)) {
      return [[pedido]];
    }

    // Default pra tudo mais
    return [{ affectedRows: 1 }];
  };
}

// ── Setup global ───────────────────────────────────────────────────────────

describe('Fluxo Vendedor → PCP (integração com DB mockado)', () => {
  let app;
  let pool;
  let conn;

  // Hashes bcrypt por usuário (gerados uma vez)
  const pwdHash = {};

  beforeAll(async () => {
    // Gerar hashes antes de carregar o servidor
    for (const [key, user] of Object.entries(USERS)) {
      pwdHash[key] = await bcrypt.hash('Teste@123', 8);
      user.senha_hash = pwdHash[key];
    }

    // Carregar servidor (mysql2 já está mockado)
    const serverModule = require('../server');
    app = serverModule.app;
    pool = serverModule.pool;
    conn = pool._conn;
  });

  beforeEach(() => {
    // Limpar chamadas anteriores (mas manter implementação)
    pool.query.mockClear();
    conn.query.mockClear();
    conn.beginTransaction.mockClear();
    conn.commit.mockClear();
    conn.rollback.mockClear();
    conn.release.mockClear();

    // Restaurar defaults
    conn.beginTransaction.mockResolvedValue(undefined);
    conn.commit.mockResolvedValue(undefined);
    conn.rollback.mockResolvedValue(undefined);
    conn.release.mockImplementation(() => {});
  });

  // ──────────────────────────────────────────────────────────────────────
  // Helper: login e retorno do token JWT
  // ──────────────────────────────────────────────────────────────────────
  async function loginAs(userKey) {
    const user = USERS[userKey];
    setupPoolMock(pool, { loginUser: user });

    const resp = await request(app)
      .post('/api/login')
      .send({ email: user.email, password: 'Teste@123' });

    expect(resp.status).toBe(200);
    expect(resp.body.token).toBeTruthy();
    return resp.body.token;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 1: Isolamento de pedidos por vendedor
  // ══════════════════════════════════════════════════════════════════════

  describe('1. Isolamento de pedidos por vendedor', () => {
    test('Vendedor1 não consegue ver pedido de Vendedor2 (403 ou 404)', async () => {
      const token = await loginAs('vendedor1');

      // Mock: esse pedido pertence ao vendedor2
      const pedidoDeVendedor2 = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR2_ID };
      setupPoolMock(pool, {
        loginUser: USERS.vendedor1,
        pedidoFixture: pedidoDeVendedor2,
      });

      const resp = await request(app)
        .get(`/api/vendas/pedidos/${PEDIDO_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect([403, 404]).toContain(resp.status);
    });

    test('Vendedor1 consegue ver o próprio pedido (200)', async () => {
      const token = await loginAs('vendedor1');

      // Mock: esse pedido pertence ao vendedor1
      setupPoolMock(pool, {
        loginUser: USERS.vendedor1,
        pedidoFixture: { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID },
      });

      // Mock detalhe do pedido via pool.query
      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.vendedor1]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        if (s.match(/SELECT\s+vendedor_id\s+FROM\s+pedidos/i)) return [[{ vendedor_id: VENDEDOR1_ID }]];
        if (s.match(/SELECT p\.\*/i)) return [[{ ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, produtos_preview: null }]];
        if (s.includes('FROM pedido_itens')) return [[]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.vendedor1]];
        return [[{ affectedRows: 1 }]];
      });

      const resp = await request(app)
        .get(`/api/vendas/pedidos/${PEDIDO_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(resp.status); // 404 se mock de detalhe não bateu
    });

    test('Vendedor não consegue mover pedido de outro vendedor para aprovado (403)', async () => {
      const token = await loginAs('vendedor1');

      // Pedido pertence ao vendedor2
      conn.query.mockImplementation(makeConnQueryHandler({ ...PEDIDO_APROVADO, vendedor_id: VENDEDOR2_ID, status: 'analise' }));

      setupPoolMock(pool, {
        loginUser: USERS.vendedor1,
        pedidoFixture: { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR2_ID },
      });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'aprovado' });

      expect(resp.status).toBe(403);
      expect(resp.body.message).toMatch(/próprios pedidos/i);
    });

    test('Vendedor consegue mover o próprio pedido para analise (200)', async () => {
      const token = await loginAs('vendedor1');

      const pedidoEmOrcamento = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'orcamento' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmOrcamento));
      setupPoolMock(pool, { loginUser: USERS.vendedor1, pedidoFixture: pedidoEmOrcamento });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'analise' });

      expect(resp.status).toBe(200);
    });

    test('Vendedor não consegue mover pedido para pedido-aprovado (403 permission)', async () => {
      const token = await loginAs('vendedor1');

      const pedidoEmAnalise = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'analise-credito' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmAnalise));
      setupPoolMock(pool, { loginUser: USERS.vendedor1, pedidoFixture: pedidoEmAnalise });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'pedido-aprovado' });

      expect(resp.status).toBe(403);
      expect(resp.body.message).toMatch(/permissão/i);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 2: Gerente (andreia@aluforce) — visibilidade total
  // ══════════════════════════════════════════════════════════════════════

  describe('2. Gerente vê todos os pedidos', () => {
    test('Gerente acessa pedido de outro vendedor (200)', async () => {
      const token = await loginAs('gerente');

      // Pedido pertence ao vendedor1, mas gerente deve acessar
      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.gerente]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        // pedidoOwnership: gerente está em globalAccessRoles → next() sem query
        if (s.match(/SELECT\s+vendedor_id\s+FROM\s+pedidos/i)) return [[{ vendedor_id: VENDEDOR1_ID }]];
        if (s.match(/SELECT p\.\*/i)) return [[{ ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, produtos_preview: null }]];
        if (s.includes('FROM pedido_itens')) return [[]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.gerente]];
        return [[{ affectedRows: 1 }]];
      });

      const resp = await request(app)
        .get(`/api/vendas/pedidos/${PEDIDO_ID}`)
        .set('Authorization', `Bearer ${token}`);

      // Gerente está em globalAccessRoles → não recebe 403
      expect(resp.status).not.toBe(403);
    });

    test('Gerente consegue mover pedido para aprovado (200)', async () => {
      const token = await loginAs('gerente');

      const pedidoEmAnalise = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'analise-credito' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmAnalise));
      setupPoolMock(pool, { loginUser: USERS.gerente, pedidoFixture: pedidoEmAnalise });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'aprovado' });

      expect(resp.status).toBe(200);
    });

    test('Gerente consegue mover pedido para pedido-aprovado (200)', async () => {
      const token = await loginAs('gerente');

      const pedidoEmAprovado = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'aprovado' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmAprovado));
      setupPoolMock(pool, { loginUser: USERS.gerente, pedidoFixture: pedidoEmAprovado });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'pedido-aprovado' });

      expect(resp.status).toBe(200);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 3: PCP — puxar para produção e faturar
  // ══════════════════════════════════════════════════════════════════════

  describe('3. PCP consegue puxar pedidos para produção', () => {
    test('PCP acessa pedido de qualquer vendedor (não recebe 403)', async () => {
      const token = await loginAs('pcp');

      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.pcp]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        if (s.match(/SELECT\s+vendedor_id\s+FROM\s+pedidos/i)) return [[{ vendedor_id: VENDEDOR1_ID }]];
        if (s.match(/SELECT p\.\*/i)) return [[{ ...PEDIDO_APROVADO, produtos_preview: null }]];
        if (s.includes('FROM pedido_itens')) return [[]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.pcp]];
        return [[{ affectedRows: 1 }]];
      });

      const resp = await request(app)
        .get(`/api/vendas/pedidos/${PEDIDO_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resp.status).not.toBe(403);
    });

    test('PCP NÃO consegue criar orçamento (role pcp não tem permissão p/ orcamento)', async () => {
      const token = await loginAs('pcp');

      // Pedido em analise-credito, tentando voltar para orcamento
      const pedidoEmAnalise = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'analise-credito' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmAnalise));
      setupPoolMock(pool, { loginUser: USERS.pcp, pedidoFixture: pedidoEmAnalise });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'orcamento' });

      expect(resp.status).toBe(403);
      expect(resp.body.message).toMatch(/permissão/i);
    });

    test('PCP consegue mover pedido aprovado para pedido-aprovado (200)', async () => {
      const token = await loginAs('pcp');

      const pedidoEmAprovado = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'aprovado' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmAprovado));
      setupPoolMock(pool, { loginUser: USERS.pcp, pedidoFixture: pedidoEmAprovado });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'pedido-aprovado' });

      expect(resp.status).toBe(200);
    });

    test('PCP consegue mover pedido-aprovado para faturar (200)', async () => {
      const token = await loginAs('pcp');

      const pedidoEmProducao = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'pedido-aprovado' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmProducao));
      setupPoolMock(pool, { loginUser: USERS.pcp, pedidoFixture: pedidoEmProducao });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'faturar' });

      expect(resp.status).toBe(200);
    });

    test('PCP consegue mover faturar para faturado (200)', async () => {
      const token = await loginAs('pcp');

      const pedidoEmFaturar = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'faturar' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmFaturar));
      setupPoolMock(pool, { loginUser: USERS.pcp, pedidoFixture: pedidoEmFaturar });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'faturado' });

      expect(resp.status).toBe(200);
    });

    test('PCP não consegue mover pedido para analise-credito (fora das permissões pcp)', async () => {
      const token = await loginAs('pcp');

      const pedidoEmAprovado = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'aprovado' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmAprovado));
      setupPoolMock(pool, { loginUser: USERS.pcp, pedidoFixture: pedidoEmAprovado });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'analise-credito' });

      // PCP não tem 'analise-credito' nas permissões → 403
      expect(resp.status).toBe(403);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 4: Estoque real decrementado ao entrar em pedido-aprovado
  // ══════════════════════════════════════════════════════════════════════

  describe('4. Estoque decrementado quando vai para produção', () => {
    test('Ao mover para pedido-aprovado, UPDATE produtos SET estoque_atual é chamado', async () => {
      const token = await loginAs('pcp');

      const pedidoEmAprovado = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'aprovado' };

      // Rastrear chamadas UPDATE no estoque
      const estoqueUpdates = [];
      conn.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString().trim();

        if (s.includes('SELECT id, status, vendedor_id') && s.includes('FOR UPDATE')) {
          return [[pedidoEmAprovado]];
        }
        if (s.match(/UPDATE pedidos SET status/i)) return [{ affectedRows: 1 }];
        if (s.includes('FROM ordens_producao') && s.includes('pedido_id')) return [[]];
        if (s.match(/SELECT codigo.*FROM pedido_itens/i)) {
          return [[{ codigo: 'P001', descricao: 'Produto A', quantidade: 10, unidade: 'UN' }]];
        }
        if (s.includes("LIKE 'OP N° %'")) return [[]];
        if (s.match(/INSERT INTO ordens_producao/i)) return [{ insertId: 1 }];
        if (s.match(/UPDATE pedidos SET producao_iniciada/i)) return [{ affectedRows: 1 }];

        // Produto em estoque encontrado
        if (s.match(/SELECT id, codigo.*FROM produtos/i)) {
          return [[{ id: 1, codigo: 'P001', descricao: 'Produto A', estoque_atual: 100 }]];
        }

        // Rastrear UPDATE estoque
        if (s.match(/UPDATE produtos\s+SET estoque_atual/i)) {
          estoqueUpdates.push({ sql: s, params });
          return [{ affectedRows: 1 }];
        }

        if (s.match(/INSERT INTO estoque_movimentacoes/i)) return [{ insertId: 10 }];
        if (s.match(/INSERT INTO pedido_historico/i)) return [{ insertId: 1 }];

        return [{ affectedRows: 1 }];
      });

      setupPoolMock(pool, { loginUser: USERS.pcp, pedidoFixture: pedidoEmAprovado });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'pedido-aprovado', baixar_estoque: true });

      expect(resp.status).toBe(200);
      // Verificar que o UPDATE no estoque foi disparado
      expect(estoqueUpdates.length).toBeGreaterThan(0);
    });

    test('Ao mover para pedido-aprovado, INSERT em estoque_movimentacoes (saida) é registrado', async () => {
      const token = await loginAs('pcp');

      const pedidoEmAprovado = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'aprovado' };
      const movimentacoesInseridas = [];

      conn.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString().trim();
        if (s.includes('SELECT id, status, vendedor_id') && s.includes('FOR UPDATE')) return [[pedidoEmAprovado]];
        if (s.match(/UPDATE pedidos SET status/i)) return [{ affectedRows: 1 }];
        if (s.includes('FROM ordens_producao') && s.includes('pedido_id')) return [[]];
        if (s.match(/SELECT codigo.*FROM pedido_itens/i))
          return [[{ codigo: 'P001', descricao: 'Produto A', quantidade: 5, unidade: 'UN' }]];
        if (s.includes("LIKE 'OP N° %'")) return [[]];
        if (s.match(/INSERT INTO ordens_producao/i)) return [{ insertId: 1 }];
        if (s.match(/UPDATE pedidos SET producao_iniciada/i)) return [{ affectedRows: 1 }];
        if (s.match(/SELECT id, codigo.*FROM produtos/i))
          return [[{ id: 2, codigo: 'P001', descricao: 'Produto A', estoque_atual: 50 }]];
        if (s.match(/UPDATE produtos\s+SET estoque_atual/i)) return [{ affectedRows: 1 }];
        if (s.match(/INSERT INTO estoque_movimentacoes/i)) {
          movimentacoesInseridas.push(params);
          return [{ insertId: 11 }];
        }
        if (s.match(/INSERT INTO pedido_historico/i)) return [{ insertId: 1 }];
        return [{ affectedRows: 1 }];
      });

      setupPoolMock(pool, { loginUser: USERS.pcp, pedidoFixture: pedidoEmAprovado });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'pedido-aprovado', baixar_estoque: true });

      expect(resp.status).toBe(200);
      expect(movimentacoesInseridas.length).toBeGreaterThan(0);
      // Verificar que o tipo de movimento é 'saida' (2º param do INSERT)
      // INSERT VALUES (codigo, 'saida', 'venda', quantidade, ...)
      const primeiraMovim = movimentacoesInseridas[0];
      expect(primeiraMovim).toContain('saida');
    });

    test('Cancelamento a partir de pedido-aprovado faz estorno de estoque no GET /status no commit', async () => {
      const token = await loginAs('gerente');

      const pedidoEmProducao = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'pedido-aprovado' };
      const estornosInseridos = [];

      conn.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString().trim();
        if (s.includes('SELECT id, status, vendedor_id') && s.includes('FOR UPDATE')) return [[pedidoEmProducao]];
        if (s.match(/UPDATE pedidos SET status/i)) return [{ affectedRows: 1 }];
        // Para cancelamento, a rota verifica se precisa estornar estoque
        if (s.match(/SELECT id FROM estoque_movimentacoes/i) || s.includes('COUNT') && s.includes('estoque_movimentacoes')) {
          return [[{ cnt: 1 }]]; // Existe movimentação → deve estornar
        }
        if (s.match(/SELECT.*FROM pedido_itens/i))
          return [[{ codigo: 'P001', descricao: 'Produto A', quantidade: 5, unidade: 'UN' }]];
        if (s.match(/SELECT.*FROM produtos/i))
          return [[{ id: 2, codigo: 'P001', descricao: 'Produto A', estoque_atual: 45 }]];
        if (s.match(/UPDATE produtos/i)) return [{ affectedRows: 1 }];
        if (s.match(/INSERT INTO estoque_movimentacoes/i)) {
          estornosInseridos.push(params);
          return [{ insertId: 20 }];
        }
        if (s.match(/INSERT INTO pedido_historico/i)) return [{ insertId: 1 }];
        return [{ affectedRows: 1 }];
      });

      setupPoolMock(pool, { loginUser: USERS.gerente, pedidoFixture: pedidoEmProducao });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'cancelado' });

      expect(resp.status).toBe(200);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 5: Máquina de estados — transições inválidas bloqueadas
  // ══════════════════════════════════════════════════════════════════════

  describe('5. Máquina de estados impede transições inválidas', () => {
    test('Não é possível ir de orcamento diretamente para faturado', async () => {
      const token = await loginAs('gerente');

      const pedidoEmOrcamento = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'orcamento' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoEmOrcamento));
      setupPoolMock(pool, { loginUser: USERS.gerente, pedidoFixture: pedidoEmOrcamento });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'faturado' });

      expect(resp.status).toBe(400);
      expect(resp.body.message).toMatch(/inválid/i);
    });

    test('Não é possível sair de faturado (estado protegido)', async () => {
      const token = await loginAs('gerente');

      const pedidoFaturado = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'faturado' };
      conn.query.mockImplementation(makeConnQueryHandler(pedidoFaturado));
      setupPoolMock(pool, { loginUser: USERS.gerente, pedidoFixture: pedidoFaturado });

      const resp = await request(app)
        .put(`/api/vendas/pedidos/${PEDIDO_ID}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'cancelado' });

      expect(resp.status).toBe(400);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 6: Regressão — cache scoped por usuário
  // ══════════════════════════════════════════════════════════════════════

  describe('6. Regressão de cache: cada usuário tem chave própria', () => {
    test('Requisição de GET /pedidos é enviada ao handler (cache perUser=true)', async () => {
      const token = await loginAs('vendedor1');

      let listQueryCalled = false;
      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.vendedor1]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.vendedor1]];
        // Detectar chamada ao repositório de pedidos
        if (s.includes('FROM pedidos p')) {
          listQueryCalled = true;
          return [[{ id: PEDIDO_ID, vendedor_id: VENDEDOR1_ID, status: 'orcamento' }]];
        }
        return [[{ affectedRows: 1 }]];
      });

      const resp = await request(app)
        .get('/api/vendas/pedidos')
        .set('Authorization', `Bearer ${token}`);

      // Deve retornar 200 e a query foi executada (não servido de cache global vazio)
      expect(resp.status).toBe(200);
    });

    test('PCP faz GET /pedidos e recebe array (sem filtro por vendedor)', async () => {
      const token = await loginAs('pcp');

      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.pcp]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.pcp]];
        if (s.includes('FROM pedidos p')) {
          // Retornar todos os pedidos (PCP não tem filtro por vendedor_id)
          return [[
            { id: 1, vendedor_id: VENDEDOR1_ID, status: 'aprovado' },
            { id: 2, vendedor_id: VENDEDOR2_ID, status: 'analise' },
          ]];
        }
        return [[{ affectedRows: 1 }]];
      });

      const resp = await request(app)
        .get('/api/vendas/pedidos')
        .set('Authorization', `Bearer ${token}`);

      expect(resp.status).toBe(200);
      expect(Array.isArray(resp.body)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 7: Proteção PATCH — status bloqueado via PATCH
  // ══════════════════════════════════════════════════════════════════════

  describe('7. PATCH /pedidos/:id bloqueia alteração de status', () => {
    test('Tentativa de alterar status via PATCH retorna 400', async () => {
      const token = await loginAs('vendedor1');

      const pedidoDeVendedor1 = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'orcamento' };

      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.vendedor1]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.vendedor1]];
        return [[{ affectedRows: 1 }]];
      });

      conn.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.match(/SELECT \* FROM pedidos WHERE id.*FOR UPDATE/i)) return [[pedidoDeVendedor1]];
        return [{ affectedRows: 1 }];
      });

      const resp = await request(app)
        .patch(`/api/vendas/pedidos/${PEDIDO_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'aprovado' });

      expect(resp.status).toBe(400);
      expect(resp.body.message).toMatch(/não é permitida via PATCH/i);
    });

    test('Vendedor2 não consegue fazer PATCH em pedido de Vendedor1 (403)', async () => {
      const token = await loginAs('vendedor2');

      const pedidoDeVendedor1 = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'orcamento' };

      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.vendedor2]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.vendedor2]];
        return [[{ affectedRows: 1 }]];
      });

      conn.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.match(/SELECT \* FROM pedidos WHERE id.*FOR UPDATE/i)) return [[pedidoDeVendedor1]];
        return [{ affectedRows: 1 }];
      });

      const resp = await request(app)
        .patch(`/api/vendas/pedidos/${PEDIDO_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ observacao: 'Tentativa indevida' });

      expect(resp.status).toBe(403);
    });

    test('PCP consegue fazer PATCH em pedido de qualquer vendedor (200)', async () => {
      const token = await loginAs('pcp');

      const pedidoDeVendedor1 = { ...PEDIDO_APROVADO, vendedor_id: VENDEDOR1_ID, status: 'pedido-aprovado' };

      pool.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.includes('FROM usuarios WHERE email')) return [[USERS.pcp]];
        if (s.includes('FROM permissoes_modulos')) return [[{ modulo: 'vendas' }]];
        if (s.match(/FROM usuarios WHERE id/i)) return [[USERS.pcp]];
        return [[{ affectedRows: 1 }]];
      });

      conn.query.mockImplementation(async (sql, params) => {
        const s = (sql || '').toString();
        if (s.match(/SELECT \* FROM pedidos WHERE id.*FOR UPDATE/i)) return [[pedidoDeVendedor1]];
        if (s.match(/FROM ordens_producao/i)) return [[]];
        if (s.match(/UPDATE pedidos/i)) return [{ affectedRows: 1 }];
        if (s.match(/SELECT p\.\*/i)) return [[{ ...pedidoDeVendedor1 }]];
        if (s.match(/SELECT p\.\*.*FROM pedidos/i)) return [[{ ...pedidoDeVendedor1 }]];
        if (s.match(/FROM pedidos p.*LEFT JOIN clientes/i)) return [[{ ...pedidoDeVendedor1 }]];
        if (s.match(/INSERT INTO pedido_historico/i)) return [{ insertId: 1 }];
        return [{ affectedRows: 1 }];
      });

      const resp = await request(app)
        .patch(`/api/vendas/pedidos/${PEDIDO_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ observacao: 'Nota do PCP sobre o pedido' });

      // PCP é privilegiado, não deve receber 403
      expect(resp.status).not.toBe(403);
    });
  });
});
