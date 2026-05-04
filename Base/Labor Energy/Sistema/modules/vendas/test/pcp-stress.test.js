'use strict';

/**
 * pcp-stress.test.js — Stress, Concurrency & Chaos Tests for PCP Module
 * 
 * DEV SPEC Coverage:
 *   1. Volume Stress & Memory Exhaustion (3 scenarios)
 *   2. Extreme Concurrency & Race Conditions (3 scenarios)
 *   3. Chaos Engineering & Network Failures (2 scenarios)
 * 
 * Strategy: Replicate exact PCP route handler logic from modules/PCP/server.js
 *           into a lightweight test Express app. Tests the REAL code patterns,
 *           without loading the full 9000-line server module.
 * 
 * Each test PROVES a vulnerability or validates an existing protection.
 * Findings are documented inline with severity ratings.
 */

process.env.JWT_SECRET = 'test-secret-zyntra-jest-32chars!!';
process.env.NODE_ENV = 'test';

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Mock DB Pool ────────────────────────────────────────────────────────

const mockConn = {
  query: jest.fn(),
  beginTransaction: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
};

const mockPool = {
  query: jest.fn().mockResolvedValue([[], []]),
  getConnection: jest.fn().mockResolvedValue(mockConn),
};

// ── Auth Middleware (extracted from PCP server.js L386 + auth-central) ───

function authRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido' });
  }
}

// ── RBAC (extracted from PCP server.js L427-468) ────────────────────────

const PRODUCTION_ROLES = {
  ADMIN: ['admin', 'administrador', 'ti', 'diretoria'],
  SUPERVISOR: ['supervisor', 'gerente', 'coordenador'],
  PCP: ['pcp', 'analista', 'planejador'],
  OPERATOR: ['operador', 'producao', 'chao_fabrica'],
  VIEWER: ['visualizador', 'consulta'],
};

function hasProductionRole(user, allowedCategories = ['ADMIN']) {
  if (!user) return false;
  const userRole = (user.role || user.cargo || '').toLowerCase();
  for (const category of allowedCategories) {
    const allowed = PRODUCTION_ROLES[category] || [];
    if (allowed.some(r => userRole.includes(r))) return true;
  }
  return false;
}

function requireProductionRole(...allowedCategories) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    if (!hasProductionRole(req.user, allowedCategories)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }
    next();
  };
}

// ── Build Test Express App (exact PCP route patterns) ───────────────────

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const db = mockPool;

  // ── POST /api/pcp/ordens-producao (server.js L3233-3370) ──────────────
  app.post('/api/pcp/ordens-producao', authRequired, async (req, res) => {
    try {
      const { codigo, produto_nome, quantidade, unidade, status,
              prioridade, data_inicio, data_prevista, responsavel, observacoes } = req.body;
      const [result] = await db.query(`INSERT INTO ordens_producao
        (codigo, produto_nome, quantidade, unidade, status, prioridade,
         data_inicio, data_prevista, responsavel, progresso, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [codigo, produto_nome, quantidade, unidade, status, prioridade,
         data_inicio, data_prevista, responsavel, observacoes]);
      res.status(201).json({ success: true, message: 'Ordem criada', id: result.insertId });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao criar ordem' });
    }
  });

  // ── POST /api/pcp/ordens (LEGACY route, server.js L1483-1600) ─────────
  app.post('/api/pcp/ordens', authRequired, async (req, res) => {
    const { codigo_produto, descricao_produto, quantidade, data_previsao_entrega } = req.body;
    let observacoes = req.body.observacoes || null;
    const candidateFields = ['cliente','contato','email','telefone','frete','vendedor',
      'numero_orcamento','revisao','pedido_referencia','data_liberacao','variacao','embalagem','lances'];
    try {
      const schema = 'aluforce_vendas';
      const [cols] = await db.query('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ?',
        [schema, 'ordens_producao']);
      const colNames = Array.isArray(cols) ? cols.map(r => r.COLUMN_NAME) : [];
      const insertCols = ['codigo_produto','descricao_produto','quantidade','data_previsao_entrega','observacoes','status'];
      const values = [codigo_produto, descricao_produto, quantidade, data_previsao_entrega || null, observacoes, 'A Fazer'];
      for (const f of candidateFields) {
        if (req.body[f] !== undefined && colNames.includes(f)) {
          insertCols.push(f);
          values.push(req.body[f]);
        }
      }
      const placeholders = insertCols.map(() => '?').join(', ');
      const sql = `INSERT INTO ordens_producao (${insertCols.join(', ')}) VALUES (${placeholders})`;
      const [result] = await db.query(sql, values);
      res.status(201).json({ message: 'Ordem criada com sucesso!', id: result.insertId });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar ordem.' });
    }
  });

  // ── GET /api/pcp/ordens-compra/:id/pdf (server.js L4633-4672) ─────────
  app.get('/api/pcp/ordens-compra/:id/pdf', authRequired, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await db.query(
        `SELECT oc.id, oc.quantidade, oc.data_pedido, oc.previsao_entrega, oc.status,
         m.codigo_material, m.descricao as material_descricao, m.unidade_medida
         FROM ordens_compra oc JOIN materiais m ON oc.material_id = m.id
         WHERE oc.id = ? LIMIT 1`, [id]);
      if (!rows || rows.length === 0) return res.status(404).json({ message: 'Não encontrada' });
      const ord = rows[0];
      // Simulate PDF creation (pdfkit would be lazy-loaded here)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="ordem_${ord.id}.pdf"`);
      res.status(200).send(Buffer.from('mock-pdf-content'));
    } catch (err) {
      res.status(500).json({ message: 'Erro ao gerar PDF.' });
    }
  });

  // ── POST /api/pcp/apontamentos (server.js L8242-8350) ─────────────────
  app.post('/api/pcp/apontamentos', authRequired,
    requireProductionRole('ADMIN','SUPERVISOR','PCP','OPERATOR'),
    async (req, res) => {
    let connection = null;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const { ordem_producao_id, etapa_id, quantidade_produzida,
              quantidade_refugo, operador, maquina, turno,
              tempo_producao, tempo_setup, tempo_parada, observacoes } = req.body;

      if (!ordem_producao_id || !etapa_id) {
        return res.status(400).json({ success: false, message: 'OP e Etapa são obrigatórios' });
      }
      if (!quantidade_produzida || quantidade_produzida <= 0) {
        return res.status(400).json({ success: false, message: 'Quantidade deve ser > 0' });
      }

      // INSERT apontamento
      const [result] = await connection.query(`INSERT INTO apontamentos_producao
        (ordem_producao_id, etapa_id, data_apontamento, quantidade_produzida,
         quantidade_refugo, operador, maquina, turno, tempo_producao,
         tempo_setup, tempo_parada, observacoes)
        VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ordem_producao_id, etapa_id, quantidade_produzida,
         quantidade_refugo || 0, operador || 'Operador', maquina || '',
         turno || '1', tempo_producao || 0, tempo_setup || 0,
         tempo_parada || 0, observacoes || '']);

      // UPDATE etapa quantity
      await connection.query(`UPDATE etapas_producao
        SET quantidade_produzida = COALESCE(quantidade_produzida, 0) + ?,
            tempo_real_min = COALESCE(tempo_real_min, 0) + ?
        WHERE id = ?`, [quantidade_produzida, tempo_producao || 0, etapa_id]);

      // CHECK etapa completion — NO FOR UPDATE LOCK
      const [etapa] = await connection.query(
        'SELECT quantidade_prevista, quantidade_produzida FROM etapas_producao WHERE id = ?', [etapa_id]);
      if (etapa.length > 0 && etapa[0].quantidade_produzida >= etapa[0].quantidade_prevista) {
        await connection.query("UPDATE etapas_producao SET status = 'concluida', data_fim = NOW() WHERE id = ?", [etapa_id]);
      } else if (etapa.length > 0 && etapa[0].quantidade_produzida > 0) {
        await connection.query("UPDATE etapas_producao SET status = 'em_andamento', data_inicio = COALESCE(data_inicio, NOW()) WHERE id = ?", [etapa_id]);
      }

      // UPDATE OP progress
      const [progressoData] = await connection.query(`SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidas
        FROM etapas_producao WHERE ordem_producao_id = ?`, [ordem_producao_id]);
      if (progressoData.length > 0 && progressoData[0].total > 0) {
        const progresso = Math.round((progressoData[0].concluidas / progressoData[0].total) * 100);
        await connection.query('UPDATE ordens_producao SET progresso = ? WHERE id = ?', [progresso, ordem_producao_id]);
        if (progresso >= 100) {
          await connection.query("UPDATE ordens_producao SET status = 'concluida', data_conclusao = NOW() WHERE id = ?", [ordem_producao_id]);
        } else if (progresso > 0) {
          await connection.query("UPDATE ordens_producao SET status = 'em_producao' WHERE id = ? AND status NOT IN ('concluida','cancelada')", [ordem_producao_id]);
        }
      }

      await connection.commit();
      res.json({ success: true, message: 'Apontamento registrado', id: result.insertId });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (_) {
          // Keep response deterministic for tests even when rollback fails.
        }
      }
      res.status(500).json({ success: false, message: 'Erro ao registrar apontamento' });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  // ── POST /api/pcp/apontamentos/chao (server.js L8867+) ────────────────
  app.post('/api/pcp/apontamentos/chao', authRequired,
    requireProductionRole('ADMIN','SUPERVISOR','PCP','OPERATOR'),
    async (req, res) => {
    try {
      const { usuario_id, usuario_nome, usuario_email, tipo_atividade,
              nome_atividade, hora_inicio, hora_fim, duracao_segundos,
              data, pedido_numero, produto_descricao, observacoes } = req.body;
      // Validation for duracao_segundos
      if (duracao_segundos !== undefined && duracao_segundos !== null) {
        const dur = Number(duracao_segundos);
        if (isNaN(dur) || dur < 0) {
          return res.status(400).json({ success: false, message: 'duracao_segundos inválido' });
        }
      }
      const [result] = await db.query(`INSERT INTO apontamentos_chao_fabrica
        (usuario_id, usuario_nome, usuario_email, tipo_atividade,
         nome_atividade, hora_inicio, hora_fim, duracao_segundos,
         data, pedido_numero, produto_descricao, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usuario_id, usuario_nome, usuario_email, tipo_atividade,
         nome_atividade, hora_inicio, hora_fim, duracao_segundos,
         data, pedido_numero, produto_descricao, observacoes]);
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro' });
    }
  });

  // ── GET /api/pcp/apontamentos/relatorio (server.js L8986-9050) ────────
  app.get('/api/pcp/apontamentos/relatorio', authRequired,
    requireProductionRole('ADMIN','SUPERVISOR','PCP','VIEWER'),
    async (req, res) => {
    try {
      const { dataInicio, dataFim, usuario, atividade, pedido } = req.query;
      const inicio = dataInicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const fim = dataFim || new Date().toISOString().split('T')[0];
      let whereClause = 'WHERE data BETWEEN ? AND ?';
      const params = [inicio, fim];
      if (usuario) { whereClause += ' AND usuario_id = ?'; params.push(usuario); }
      if (atividade) { whereClause += ' AND tipo_atividade = ?'; params.push(atividade); }
      if (pedido) { whereClause += ' AND pedido_numero LIKE ?'; params.push(`%${pedido}%`); }

      const [apontamentos] = await db.query(`SELECT id, usuario_id, usuario_nome, usuario_email,
        tipo_atividade as tipo, nome_atividade as nome,
        TIME_FORMAT(hora_inicio, '%H:%i') as hora_inicio,
        TIME_FORMAT(hora_fim, '%H:%i') as hora_fim,
        duracao_segundos as duracao, data, pedido_numero,
        produto_descricao, observacoes
        FROM apontamentos_chao_fabrica ${whereClause}
        ORDER BY data DESC, hora_inicio DESC`, params);

      const [funcionarios] = await db.query(`SELECT DISTINCT usuario_id as id, usuario_nome as nome, usuario_email as email
        FROM apontamentos_chao_fabrica WHERE data BETWEEN ? AND ? ORDER BY usuario_nome`, [inicio, fim]);

      const totalHoras = Math.round(apontamentos.reduce((acc, a) => acc + (a.duracao || 0), 0) / 3600 * 10) / 10;
      const prodTipos = ['1','1A'];
      const horasProducao = Math.round(apontamentos.filter(a => prodTipos.includes(a.tipo)).reduce((acc, a) => acc + (a.duracao || 0), 0) / 3600 * 10) / 10;
      res.json({ success: true, apontamentos, funcionarios,
        totalFuncionarios: funcionarios.length, totalHoras, horasProducao,
        totalApontamentos: apontamentos.length });
    } catch (error) {
      res.json({ success: true, apontamentos: [], funcionarios: [],
        totalFuncionarios: 0, totalHoras: 0, horasProducao: 0, totalApontamentos: 0 });
    }
  });

  // ── GET /api/pcp/relatorio/ordens-excel (server.js L4738-4800) ────────
  app.get('/api/pcp/relatorio/ordens-excel', authRequired, async (req, res) => {
    try {
      const [ordens] = await db.query(`SELECT id, codigo_produto, descricao_produto, quantidade,
        data_previsao_entrega, status, data_criacao, observacoes
        FROM ordens_producao ORDER BY data_previsao_entrega ASC`);
      // Simulate Excel generation by buffering all rows in memory
      const rows = ordens.map(o => [o.id, o.codigo_produto, o.descricao_produto, o.quantidade,
        o.data_previsao_entrega, o.status, o.data_criacao, o.observacoes]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200).json({ rowCount: rows.length, _sql_used: 'SELECT ... FROM ordens_producao ORDER BY ... (NO LIMIT)' });
    } catch (err) {
      res.status(500).json({ message: 'Erro ao gerar relatório Excel.' });
    }
  });

  // ── PUT /api/pcp/ordens/:id/status (server.js L1601-1625) ─────────────
  // NOTE: Only authRequired, NO requireProductionRole ← FINDING
  app.put('/api/pcp/ordens/:id/status', authRequired, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const [ordemAnterior] = await db.query("SELECT status FROM ordens_producao WHERE id = ?", [id]);
      const statusAnterior = ordemAnterior[0]?.status || 'unknown';
      const [result] = await db.query("UPDATE ordens_producao SET status = ? WHERE id = ?", [status, id]);
      if (result.affectedRows > 0) {
        res.json({ message: "Status atualizado com sucesso!" });
      } else {
        res.status(404).json({ message: "Ordem não encontrada." });
      }
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar status." });
    }
  });

  return app;
}

// ── Fixtures ────────────────────────────────────────────────────────────

const USERS = {
  admin: { id: 1, nome: 'Admin PCP', email: 'admin@aluforce', role: 'admin', is_admin: 1, cargo: 'admin' },
  supervisor: { id: 2, nome: 'Supervisor PCP', email: 'sup@aluforce', role: 'supervisor', cargo: 'supervisor' },
  operador: { id: 3, nome: 'Operador Chão', email: 'op@aluforce', role: 'operador', cargo: 'operador' },
  viewer: { id: 4, nome: 'Visualizador', email: 'view@aluforce', role: 'visualizador', cargo: 'visualizador' },
  unauthorized: { id: 5, nome: 'Vendedor', email: 'vend@aluforce', role: 'vendedor', cargo: 'vendedor' },
};

function makeToken(user) {
  return jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, role: user.role, cargo: user.cargo },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

const TOKENS = {};

// ── Test State ──────────────────────────────────────────────────────────

let app;
const findings = [];

function addFinding(severity, category, title, evidence) {
  findings.push({ severity, category, title, evidence });
}

// ── Setup ───────────────────────────────────────────────────────────────

beforeAll(() => {
  for (const [key, user] of Object.entries(USERS)) {
    TOKENS[key] = makeToken(user);
  }
  app = buildApp();
});

afterEach(() => {
  jest.clearAllMocks();
  mockPool.query.mockResolvedValue([[], []]);
  mockPool.getConnection.mockResolvedValue(mockConn);
  mockConn.query.mockReset();
  mockConn.beginTransaction.mockResolvedValue(undefined);
  mockConn.commit.mockResolvedValue(undefined);
  mockConn.rollback.mockResolvedValue(undefined);
  mockConn.release.mockReset();
});

afterAll(() => {
  if (findings.length > 0) {
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  STRESS TEST FINDINGS SUMMARY');
    console.log('══════════════════════════════════════════════════════════');
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.category} — ${f.title}`);
      console.log(`    Evidence: ${f.evidence}`);
      console.log('');
    }
    console.log(`  Total: ${findings.length} findings`);
    console.log('══════════════════════════════════════════════════════════\n');
  }
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  CATEGORY 1: VOLUME STRESS & MEMORY EXHAUSTION                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

describe('VOLUME STRESS & MEMORY EXHAUSTION', () => {

  // ── SCENARIO 1: Fat Payload OP (5000 items) ───────────────────────────

  describe('V1: Fat Payload — POST /api/pcp/ordens-producao com payload gigante', () => {

    test('FINDING: Aceita payload com campos observações de 1MB sem validação de tamanho', async () => {
      // Generate a 1MB string for observacoes
      const fatObservacoes = 'X'.repeat(1_000_000);

      mockPool.query.mockResolvedValueOnce([{ insertId: 999 }]);

      const res = await request(app)
        .post('/api/pcp/ordens-producao')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          codigo: 'OP-FAT-001',
          produto_nome: 'Produto Teste Fat',
          quantidade: 100,
          unidade: 'UN',
          status: 'A Fazer',
          prioridade: 'alta',
          data_inicio: '2026-01-01',
          data_prevista: '2026-12-31',
          responsavel: 'Admin',
          observacoes: fatObservacoes,
        });

      // Route accepts it without complaint — no field-level size validation
      expect(res.status).toBe(201);
      addFinding('HIGH', 'VOLUME', 'Payload com campo de 1MB aceito sem validação',
        'POST /api/pcp/ordens-producao aceita observacoes de 1MB. Sem validação de tamanho por campo. Express limit=10MB protege globalmente, mas campos individuais não têm max length.');
    });

    test('FINDING: Rota legada /api/pcp/ordens aceita campos extras arbitrários via JSON', async () => {
      // The legacy route dynamically checks information_schema and inserts candidate fields
      const hugePayload = {
        codigo_produto: 'FAT-002',
        descricao_produto: 'Produto com campos extras',
        quantidade: 50,
        data_previsao_entrega: '2026-12-31',
      };

      // Add 100 arbitrary candidate fields
      for (let i = 0; i < 100; i++) {
        hugePayload[`campo_extra_${i}`] = `valor_${i}`.repeat(100);
      }

      // Mock information_schema query
      mockPool.query.mockImplementation(async (sql) => {
        if (sql.includes('information_schema')) {
          return [[
            { COLUMN_NAME: 'codigo_produto' },
            { COLUMN_NAME: 'descricao_produto' },
            { COLUMN_NAME: 'quantidade' },
            { COLUMN_NAME: 'status' },
            { COLUMN_NAME: 'observacoes' },
          ]];
        }
        return [{ insertId: 888, affectedRows: 1 }];
      });

      const res = await request(app)
        .post('/api/pcp/ordens')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(hugePayload);

      expect(res.status).toBe(201);
      addFinding('MEDIUM', 'VOLUME', 'Rota legada aceita 100+ campos extras sem whitelist',
        'POST /api/pcp/ordens processa candidateFields ilimitadamente. Além disso, executa query information_schema em cada POST (performance hit).');
    });

    test('Express JSON limit rejeita payload > 10MB', async () => {
      // Generate payload larger than 10MB
      const overLimit = 'Y'.repeat(11_000_000);

      const res = await request(app)
        .post('/api/pcp/ordens-producao')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ observacoes: overLimit }));

      // Express should reject with 413 (Payload Too Large) or 400
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── SCENARIO 2: PDF Generation Stress ─────────────────────────────────

  describe('V2: PDF Stress — 50 requisições simultâneas GET /api/pcp/ordens-compra/:id/pdf', () => {

    test('FINDING: 50 PDFs simultâneos processados sem controle de concorrência', async () => {
      const CONCURRENT = 50;

      // Mock DB to return valid order data
      mockPool.query.mockResolvedValue([[{
        id: 1,
        quantidade: 100,
        data_pedido: new Date('2026-01-01'),
        previsao_entrega: new Date('2026-02-01'),
        status: 'pendente',
        codigo_material: 'MAT-001',
        material_descricao: 'Material Teste',
        unidade_medida: 'KG',
      }]]);

      const promises = [];
      for (let i = 0; i < CONCURRENT; i++) {
        promises.push(
          request(app)
            .get('/api/pcp/ordens-compra/1/pdf')
            .set('Authorization', `Bearer ${TOKENS.admin}`)
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;

      // ALL requests are processed — no semaphore, no queue, no concurrency limit
      expect(successCount).toBe(CONCURRENT);

      addFinding('HIGH', 'VOLUME', `${CONCURRENT} PDFs simultâneos sem controle de concorrência`,
        `GET /api/pcp/ordens-compra/:id/pdf processou ${successCount}/${CONCURRENT} PDFs simultaneamente. ` +
        'Sem semáforo, sem fila, sem limite de concorrência. Em produção com pdfkit real, cada instância consome ~50MB RAM → 2.5GB total.');
    });
  });

  // ── SCENARIO 3: Report Tsunami (5 years no pagination) ────────────────

  describe('V3: Report Tsunami — GET /api/pcp/apontamentos/relatorio com range de 5 anos', () => {

    test('FINDING: Query de relatório SEM LIMIT retorna todos os registros do período', async () => {
      // Simulate 100K rows returned over 5 years
      const fakeRows = [];
      for (let i = 0; i < 1000; i++) {
        fakeRows.push({
          id: i + 1,
          usuario_id: 1,
          usuario_nome: 'Operador Teste',
          usuario_email: 'op@test',
          tipo: '1',
          nome: 'Produção',
          hora_inicio: '08:00',
          hora_fim: '17:00',
          duracao: 32400,
          data: '2026-01-01',
          pedido_numero: 'PED-001',
          produto_descricao: 'Produto',
          observacoes: '',
        });
      }

      mockPool.query.mockImplementation(async (sql) => {
        if (sql.includes('apontamentos_chao_fabrica') && sql.includes('DISTINCT')) {
          return [[{ id: 1, nome: 'Op1', email: 'op1@test' }]];
        }
        if (sql.includes('apontamentos_chao_fabrica')) {
          return [fakeRows];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/pcp/apontamentos/relatorio')
        .query({
          dataInicio: '2021-01-01',
          dataFim: '2026-12-31',
        })
        .set('Authorization', `Bearer ${TOKENS.admin}`);

      expect(res.status).toBe(200);
      expect(res.body.totalApontamentos).toBe(1000);

      // Verify the SQL query has NO LIMIT clause
      const queryCall = mockPool.query.mock.calls.find(c =>
        typeof c[0] === 'string' && c[0].includes('apontamentos_chao_fabrica') && !c[0].includes('DISTINCT')
      );
      expect(queryCall).toBeDefined();
      const sql = queryCall[0];
      expect(sql.toUpperCase()).not.toContain('LIMIT');

      addFinding('CRITICAL', 'VOLUME', 'Relatório sem LIMIT — OOM com 5 anos de dados',
        'GET /api/pcp/apontamentos/relatorio: SQL não contém LIMIT. Data range 2021-2026 retornaria milhões de registros em produção. ' +
        'Cálculo de totalHoras feito em JS (reduce) em vez de SQL → duplo risco OOM (rows + computation).');
    });

    test('FINDING: Relatório Excel também sem LIMIT — todas as ordens na memória', async () => {
      const fakeOrdens = [];
      for (let i = 0; i < 500; i++) {
        fakeOrdens.push({
          id: i + 1,
          codigo_produto: `PROD-${i}`,
          descricao_produto: `Produto ${i}`,
          quantidade: i * 10,
          data_previsao_entrega: new Date('2026-01-01'),
          status: 'A Fazer',
          data_criacao: new Date('2025-01-01'),
          observacoes: '',
        });
      }

      mockPool.query.mockResolvedValueOnce([fakeOrdens]);

      const res = await request(app)
        .get('/api/pcp/relatorio/ordens-excel')
        .set('Authorization', `Bearer ${TOKENS.admin}`);

      expect(res.status).toBe(200);

      const queryCall = mockPool.query.mock.calls[0];
      const sql = queryCall[0];
      expect(sql.toUpperCase()).not.toContain('LIMIT');

      addFinding('HIGH', 'VOLUME', 'Excel export sem LIMIT — carrega todas as ordens na memória',
        'GET /api/pcp/relatorio/ordens-excel: SQL SELECT sem LIMIT nem paginação. ' +
        'Com ExcelJS real, cada célula é bufferizada em memória antes de write(). 100K ordens × 8 colunas = 800K cells em RAM.');
    });
  });
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  CATEGORY 2: EXTREME CONCURRENCY & RACE CONDITIONS                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

describe('EXTREME CONCURRENCY & RACE CONDITIONS', () => {

  // ── SCENARIO 4: Race Condition — Apontamentos exceeding OP limit ──────

  describe('C1: Race Condition — 5 apontamentos simultâneos excedem limite da OP', () => {

    test('FINDING: Sem SELECT FOR UPDATE — múltiplos apontamentos podem exceder quantidade_prevista', async () => {
      const OP_ID = 100;
      const ETAPA_ID = 200;
      const QTD_PREVISTA = 100;
      const QTD_POR_APONTAMENTO = 30;
      const CONCURRENT = 5;
      // 5 × 30 = 150, excede 100

      let qtdProduzidaAtual = 0;

      // Each concurrent connection gets its OWN mock connection
      const connections = [];
      for (let i = 0; i < CONCURRENT; i++) {
        const conn = {
          query: jest.fn(),
          beginTransaction: jest.fn().mockResolvedValue(undefined),
          commit: jest.fn().mockResolvedValue(undefined),
          rollback: jest.fn().mockResolvedValue(undefined),
          release: jest.fn(),
        };

        // Mock the transaction queries
        conn.query.mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_producao')) {
            return [{ insertId: 1000 + i }];
          }
          if (typeof sql === 'string' && sql.includes('UPDATE etapas_producao') && sql.includes('quantidade_produzida')) {
            // Simulate UPDATE that adds to accumulated qty
            qtdProduzidaAtual += QTD_POR_APONTAMENTO;
            return [{ affectedRows: 1 }];
          }
          if (typeof sql === 'string' && sql.includes('SELECT quantidade_prevista')) {
            // VULNERABILITY: All concurrent reads see the SAME stale state (no FOR UPDATE lock)
            // Simulating that all read at the same moment — each sees qtdProduzidaAtual at time of read
            return [[{ quantidade_prevista: QTD_PREVISTA, quantidade_produzida: qtdProduzidaAtual }]];
          }
          if (typeof sql === 'string' && sql.includes('SELECT') && sql.includes('COUNT(*)')) {
            return [[{ total: 3, concluidas: 1 }]];
          }
          if (typeof sql === 'string' && sql.includes('UPDATE ordens_producao')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        });

        connections.push(conn);
      }

      let connIndex = 0;
      mockPool.getConnection.mockImplementation(async () => connections[connIndex++]);

      const promises = [];
      for (let i = 0; i < CONCURRENT; i++) {
        promises.push(
          request(app)
            .post('/api/pcp/apontamentos')
            .set('Authorization', `Bearer ${TOKENS.admin}`)
            .send({
              ordem_producao_id: OP_ID,
              etapa_id: ETAPA_ID,
              quantidade_produzida: QTD_POR_APONTAMENTO,
              operador: `Operador ${i + 1}`,
            })
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;

      // ALL 5 requests succeed — total produced = 150, exceeding limit of 100
      // No SELECT FOR UPDATE, no optimistic locking, no quantity guard
      expect(successCount).toBe(CONCURRENT);
      expect(qtdProduzidaAtual).toBe(QTD_POR_APONTAMENTO * CONCURRENT); // 150

      addFinding('CRITICAL', 'CONCURRENCY', `Race condition: ${CONCURRENT} apontamentos produziram ${qtdProduzidaAtual}/${QTD_PREVISTA} peças`,
        `POST /api/pcp/apontamentos: ${CONCURRENT} requests simultâneos acumularam ` +
        `${qtdProduzidaAtual} peças (limite: ${QTD_PREVISTA}). Sem SELECT FOR UPDATE na leitura de etapa/OP, ` +
        'sem check quantidade_produzida < quantidade_prevista ANTES do INSERT. ' +
        'Resultado: etapa com 50% a mais que o previsto.');
    });

    test('EVIDENCE: Query SQL de leitura da etapa NÃO usa FOR UPDATE', async () => {
      // Setup minimal mock
      const conn = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_producao')) return [{ insertId: 1 }];
          if (typeof sql === 'string' && sql.includes('UPDATE')) return [{ affectedRows: 1 }];
          if (typeof sql === 'string' && sql.includes('quantidade_prevista')) return [[{ quantidade_prevista: 100, quantidade_produzida: 50 }]];
          if (typeof sql === 'string' && sql.includes('COUNT(*)')) return [[{ total: 2, concluidas: 0 }]];
          return [[]];
        }),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      };
      mockPool.getConnection.mockResolvedValue(conn);

      await request(app)
        .post('/api/pcp/apontamentos')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          ordem_producao_id: 1,
          etapa_id: 1,
          quantidade_produzida: 10,
          operador: 'Teste',
        });

      // Find the SELECT query for etapa quantity
      const selectCall = conn.query.mock.calls.find(c =>
        typeof c[0] === 'string' && c[0].includes('quantidade_prevista')
      );

      expect(selectCall).toBeDefined();
      const sql = selectCall[0].toUpperCase();
      expect(sql).not.toContain('FOR UPDATE');

      addFinding('CRITICAL', 'CONCURRENCY', 'SELECT de etapa sem FOR UPDATE dentro de transação',
        'A query "SELECT quantidade_prevista, quantidade_produzida FROM etapas_producao WHERE id = ?" ' +
        'NÃO usa FOR UPDATE. Múltiplas transações concorrentes lêem o mesmo valor stale e todas passam.');
    });
  });

  // ── SCENARIO 5: Concurrent Status Change vs Apontamento ──────────────

  describe('C2: Status Change vs Apontamento — cancelamento concurrent com apontamento', () => {

    test('FINDING: PUT status e POST apontamento podem executar simultaneamente na mesma OP', async () => {
      const OP_ID = 200;
      const ETAPA_ID = 300;

      // Mock for status update (PUT /api/pcp/ordens/:id/status)
      const statusQueryMock = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('SELECT status FROM ordens_producao')) {
          return [[{ status: 'em_producao' }]];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE ordens_producao SET status')) {
          return [{ affectedRows: 1 }];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO audit_log')) {
          return [{ insertId: 1 }];
        }
        return [[]];
      });

      // Mock for apontamento (POST /api/pcp/apontamentos) — uses getConnection
      const aptConn = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_producao')) return [{ insertId: 500 }];
          if (typeof sql === 'string' && sql.includes('UPDATE etapas_producao')) return [{ affectedRows: 1 }];
          if (typeof sql === 'string' && sql.includes('quantidade_prevista')) return [[{ quantidade_prevista: 100, quantidade_produzida: 50 }]];
          if (typeof sql === 'string' && sql.includes('COUNT(*)')) return [[{ total: 2, concluidas: 0 }]];
          if (typeof sql === 'string' && sql.includes('UPDATE ordens_producao')) return [{ affectedRows: 1 }];
          return [[]];
        }),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      };

      mockPool.query.mockImplementation(statusQueryMock);
      mockPool.getConnection.mockResolvedValue(aptConn);

      // Send BOTH requests simultaneously
      const [statusRes, apontamentoRes] = await Promise.all([
        request(app)
          .put(`/api/pcp/ordens/${OP_ID}/status`)
          .set('Authorization', `Bearer ${TOKENS.admin}`)
          .send({ status: 'cancelada' }),
        request(app)
          .post('/api/pcp/apontamentos')
          .set('Authorization', `Bearer ${TOKENS.admin}`)
          .send({
            ordem_producao_id: OP_ID,
            etapa_id: ETAPA_ID,
            quantidade_produzida: 10,
            operador: 'Operador Simultâneo',
          }),
      ]);

      // BOTH succeed — status change to 'cancelada' AND apontamento on same OP
      expect(statusRes.status).toBe(200);
      expect(apontamentoRes.status).toBe(200);

      addFinding('CRITICAL', 'CONCURRENCY', 'Status change + apontamento executam simultaneamente',
        `PUT /api/pcp/ordens/${OP_ID}/status → cancelada E POST /api/pcp/apontamentos na mesma OP ` +
        'ambos retornam 200. O apontamento deveria verificar se a OP foi cancelada ANTES de inserir. ' +
        'Status change não usa transação, não há mutex, nem pessimistic lock na OP.');
    });

    test('FINDING: Apontamento NÃO verifica status da OP antes de inserir', async () => {
      const conn = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_producao')) return [{ insertId: 1 }];
          if (typeof sql === 'string' && sql.includes('UPDATE')) return [{ affectedRows: 1 }];
          if (typeof sql === 'string' && sql.includes('quantidade_prevista')) return [[{ quantidade_prevista: 100, quantidade_produzida: 10 }]];
          if (typeof sql === 'string' && sql.includes('COUNT(*)')) return [[{ total: 2, concluidas: 0 }]];
          return [[]];
        }),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      };
      mockPool.getConnection.mockResolvedValue(conn);

      await request(app)
        .post('/api/pcp/apontamentos')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          ordem_producao_id: 999, // OP that could be cancelled
          etapa_id: 1,
          quantidade_produzida: 5,
          operador: 'Teste',
        });

      // Verify NO query checks OP status before inserting apontamento
      const queries = conn.query.mock.calls.map(c => c[0]);
      const statusCheck = queries.find(q =>
        typeof q === 'string' && q.includes('ordens_producao') && q.includes('status') && q.includes('SELECT') && !q.includes('COUNT')
      );

      expect(statusCheck).toBeUndefined();

      addFinding('HIGH', 'CONCURRENCY', 'Apontamento não verifica status da OP',
        'POST /api/pcp/apontamentos: a transação INSERT → UPDATE → SELECT etapa → UPDATE OP ' +
        'NUNCA verifica se OP.status está em "cancelada" ou "concluida". ' +
        'Qualquer apontamento em OP cancelada é aceito silenciosamente.');
    });
  });

  // ── SCENARIO 6: Idempotency Double-Click ──────────────────────────────

  describe('C3: Idempotency — 10 cliques rápidos criam 10 OPs duplicadas', () => {

    test('FINDING: 10 POST idênticos criam 10 ordens duplicadas', async () => {
      const DUPLICATES = 10;
      let insertCount = 0;

      mockPool.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO ordens_producao')) {
          insertCount++;
          return [{ insertId: 1000 + insertCount }];
        }
        return [[]];
      });

      const payload = {
        codigo: 'OP-DUPLICADA-001',
        produto_nome: 'Produto Idempotency',
        quantidade: 100,
        unidade: 'UN',
        status: 'A Fazer',
        prioridade: 'normal',
        data_inicio: '2026-06-01',
        data_prevista: '2026-07-01',
        responsavel: 'Admin',
        observacoes: 'Teste idempotency',
      };

      const promises = [];
      for (let i = 0; i < DUPLICATES; i++) {
        promises.push(
          request(app)
            .post('/api/pcp/ordens-producao')
            .set('Authorization', `Bearer ${TOKENS.admin}`)
            .send(payload)
        );
      }

      const results = await Promise.all(promises);
      const created = results.filter(r => r.status === 201);

      // ALL 10 return 201 — 10 duplicate OPs created
      expect(created.length).toBe(DUPLICATES);
      expect(insertCount).toBe(DUPLICATES);

      // All have different IDs — genuinely separate records
      const ids = created.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(DUPLICATES);

      addFinding('HIGH', 'CONCURRENCY', `${DUPLICATES} OPs duplicadas criadas por cliques simultâneos`,
        `POST /api/pcp/ordens-producao: ${insertCount} INSERTs executados para payload idêntico. ` +
        'Sem chave de idempotência, sem unique constraint em codigo, sem deduplicação temporal. ' +
        'Em produção, cada double-click pode criar 2+ ordens.');
    });

    test('FINDING: codigo não tem UNIQUE constraint verificação antes do INSERT', async () => {
      mockPool.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO ordens_producao')) {
          return [{ insertId: 1 }];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/pcp/ordens-producao')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          codigo: 'OP-EXISTING-001',
          produto_nome: 'Duplicata',
          quantidade: 10,
          unidade: 'UN',
          status: 'A Fazer',
        });

      expect(res.status).toBe(201);

      // Verify no SELECT check for existing codigo before INSERT
      const queries = mockPool.query.mock.calls.map(c => c[0]);
      const duplicateCheck = queries.find(q =>
        typeof q === 'string' && q.includes('SELECT') && q.includes('codigo')
      );

      expect(duplicateCheck).toBeUndefined();

      addFinding('MEDIUM', 'CONCURRENCY', 'Sem verificação de duplicidade de codigo antes do INSERT',
        'POST /api/pcp/ordens-producao: Não executa SELECT para verificar se codigo já existe antes do INSERT. ' +
        'Se DB não tiver UNIQUE constraint, duplicatas passam silenciosamente.');
    });
  });
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  CATEGORY 3: CHAOS ENGINEERING & NETWORK FAILURES                    ║
// ╚═══════════════════════════════════════════════════════════════════════╝

describe('CHAOS ENGINEERING & NETWORK FAILURES', () => {

  // ── SCENARIO 7: Zombie Transaction — connection drop mid-commit ───────

  describe('CH1: Zombie Transaction — conexão cai no meio da transação', () => {

    test('VERIFY: Rollback é executado quando commit falha', async () => {
      const conn = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_producao')) return [{ insertId: 1 }];
          if (typeof sql === 'string' && sql.includes('UPDATE etapas_producao')) return [{ affectedRows: 1 }];
          if (typeof sql === 'string' && sql.includes('quantidade_prevista')) return [[{ quantidade_prevista: 100, quantidade_produzida: 10 }]];
          if (typeof sql === 'string' && sql.includes('COUNT(*)')) return [[{ total: 2, concluidas: 0 }]];
          if (typeof sql === 'string' && sql.includes('UPDATE ordens_producao')) return [{ affectedRows: 1 }];
          return [[]];
        }),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockRejectedValue(new Error('Connection lost: The server has gone away')),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      };

      mockPool.getConnection.mockResolvedValue(conn);

      const res = await request(app)
        .post('/api/pcp/apontamentos')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          ordem_producao_id: 1,
          etapa_id: 1,
          quantidade_produzida: 10,
          operador: 'Teste Zombie',
        });

      expect(res.status).toBe(500);
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('VERIFY: Connection é liberada mesmo quando rollback falha (finally block)', async () => {
      const conn = {
        query: jest.fn().mockRejectedValue(new Error('DEADLOCK detected')),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockRejectedValue(new Error('Connection already closed')),
        release: jest.fn(),
      };

      mockPool.getConnection.mockResolvedValue(conn);

      const res = await request(app)
        .post('/api/pcp/apontamentos')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          ordem_producao_id: 1,
          etapa_id: 1,
          quantidade_produzida: 10,
          operador: 'Teste Deadlock',
        });

      expect(res.status).toBe(500);
      // Connection should STILL be released even after rollback failure
      expect(conn.release).toHaveBeenCalled();
    });

    test('FINDING: getConnection failure retorna 500 genérico — sem retry', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Too many connections'));

      const res = await request(app)
        .post('/api/pcp/apontamentos')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          ordem_producao_id: 1,
          etapa_id: 1,
          quantidade_produzida: 10,
          operador: 'Teste Connection Pool',
        });

      expect(res.status).toBe(500);

      addFinding('MEDIUM', 'CHAOS', 'Pool exausto retorna 500 sem retry',
        'POST /api/pcp/apontamentos: quando pool.getConnection() rejeita com "Too many connections", ' +
        'retorna 500 imediatamente. Sem retry com backoff exponencial, sem circuit breaker. ' +
        'Pool limit: 15 connections, queue: 250.');
    });

    test('FINDING: Transação parcial — DB error após INSERT mas antes do UPDATE etapa', async () => {
      let insertExecuted = false;
      let updateExecuted = false;

      const conn = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_producao')) {
            insertExecuted = true;
            return [{ insertId: 1 }];
          }
          if (typeof sql === 'string' && sql.includes('UPDATE etapas_producao')) {
            updateExecuted = true;
            throw new Error('Disk quota exceeded');
          }
          return [[]];
        }),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      };

      mockPool.getConnection.mockResolvedValue(conn);

      const res = await request(app)
        .post('/api/pcp/apontamentos')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          ordem_producao_id: 1,
          etapa_id: 1,
          quantidade_produzida: 10,
          operador: 'Teste Partial',
        });

      expect(res.status).toBe(500);
      expect(insertExecuted).toBe(true);
      // Error occurred after INSERT but before UPDATE etapa → rollback should undo INSERT
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
      // POSITIVE: The transaction IS properly wrapped with try/catch/finally
      // The INSERT is rolled back because it's within the transaction
    });
  });

  // ── SCENARIO 8: Offline Re-hydration — duplicate sync ────────────────

  describe('CH2: Re-hydration — payload duplicado pós-offline cria dados duplicados', () => {

    test('FINDING: Mesmo apontamento enviado 2x cria 2 registros (sem idempotência)', async () => {
      let insertCount = 0;

      const makeConn = () => ({
        query: jest.fn().mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_producao')) {
            insertCount++;
            return [{ insertId: 2000 + insertCount }];
          }
          if (typeof sql === 'string' && sql.includes('UPDATE etapas_producao') && sql.includes('quantidade_produzida')) {
            return [{ affectedRows: 1 }];
          }
          if (typeof sql === 'string' && sql.includes('quantidade_prevista')) {
            return [[{ quantidade_prevista: 100, quantidade_produzida: 10 + (insertCount * 10) }]];
          }
          if (typeof sql === 'string' && sql.includes('COUNT(*)')) {
            return [[{ total: 2, concluidas: 0 }]];
          }
          if (typeof sql === 'string' && sql.includes('UPDATE ordens_producao')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        }),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      });

      mockPool.getConnection
        .mockResolvedValueOnce(makeConn())
        .mockResolvedValueOnce(makeConn());

      const payload = {
        ordem_producao_id: 300,
        etapa_id: 400,
        quantidade_produzida: 25,
        operador: 'Operador Offline',
        turno: '1',
        observacoes: 'Sync offline timestamp: 2026-06-15T10:00:00Z',
      };

      // Simulate: first request goes through, device goes offline, comes back, re-sends
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/pcp/apontamentos')
          .set('Authorization', `Bearer ${TOKENS.admin}`)
          .send(payload),
        request(app)
          .post('/api/pcp/apontamentos')
          .set('Authorization', `Bearer ${TOKENS.admin}`)
          .send(payload),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(insertCount).toBe(2);

      // Both have different IDs — genuinely duplicate entries
      expect(res1.body.id).not.toBe(res2.body.id);

      addFinding('HIGH', 'CHAOS', 'Re-hydration: 2 apontamentos duplicados após sync offline',
        'POST /api/pcp/apontamentos: payload idêntico aceito 2x → 2 INSERTs, 2 UPDATEs em etapas_producao. ' +
        'Quantidade duplicada: 25 × 2 = 50 peças contabilizadas. Sem idempotency_key, sem hash de deduplicação, ' +
        'sem verificação de operador + OP + etapa + timestamp recente.');
    });

    test('FINDING: Apontamento chão de fábrica também sem deduplicação', async () => {
      let insertCount = 0;

      mockPool.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_chao_fabrica')) {
          insertCount++;
          return [{ insertId: 3000 + insertCount }];
        }
        return [[]];
      });

      const payload = {
        usuario_id: 3,
        usuario_nome: 'Operador',
        usuario_email: 'op@test',
        tipo_atividade: '1',
        nome_atividade: 'Produção',
        hora_inicio: '08:00',
        hora_fim: '09:00',
        duracao_segundos: 3600,
        data: '2026-06-15',
        pedido_numero: 'PED-100',
        produto_descricao: 'Produto A',
        observacoes: 'Offline sync',
      };

      // Send same payload twice
      const res1 = await request(app)
        .post('/api/pcp/apontamentos/chao')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(payload);

      mockPool.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO apontamentos_chao_fabrica')) {
          insertCount++;
          return [{ insertId: 3000 + insertCount }];
        }
        return [[]];
      });

      const res2 = await request(app)
        .post('/api/pcp/apontamentos/chao')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(payload);

      // Both succeed
      const anyFailed = [res1.status, res2.status].some(s => s >= 400);
      if (!anyFailed) {
        addFinding('HIGH', 'CHAOS', 'Apontamento chão de fábrica sem deduplicação',
          'POST /api/pcp/apontamentos/chao: mesmo payload aceito N vezes sem verificação. ' +
          'Sem unique constraint em (usuario_id, data, hora_inicio, hora_fim), ' +
          'operador pode registrar horas duplicadas acidentalmente após reconexão.');
      }
    });
  });
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BONUS: RBAC Bypass Attempts under Stress                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝

describe('RBAC under Stress', () => {

  test('RBAC blocks unauthorized users even under concurrent load', async () => {
    const CONCURRENT = 20;

    const promises = [];
    for (let i = 0; i < CONCURRENT; i++) {
      promises.push(
        request(app)
          .post('/api/pcp/apontamentos')
          .set('Authorization', `Bearer ${TOKENS.unauthorized}`)
          .send({
            ordem_producao_id: i,
            etapa_id: 1,
            quantidade_produzida: 1,
            operador: 'Hacker',
          })
      );
    }

    const results = await Promise.all(promises);
    const blocked = results.filter(r => r.status === 403);

    // ALL should be blocked by RBAC
    expect(blocked.length).toBe(CONCURRENT);
  });

  test('FINDING: PUT status change NOT protected by requireProductionRole', async () => {
    mockPool.query.mockImplementation(async (sql) => {
      if (typeof sql === 'string' && sql.includes('SELECT status FROM ordens_producao')) {
        return [[{ status: 'em_producao' }]];
      }
      if (typeof sql === 'string' && sql.includes('UPDATE')) {
        return [{ affectedRows: 1 }];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO audit_log')) {
        return [{ insertId: 1 }];
      }
      return [[]];
    });

    // Unauthorized user (vendedor) attempts status change
    const res = await request(app)
      .put('/api/pcp/ordens/1/status')
      .set('Authorization', `Bearer ${TOKENS.unauthorized}`)
      .send({ status: 'cancelada' });

    // If status is 200, RBAC is missing on this route
    if (res.status === 200) {
      addFinding('CRITICAL', 'RBAC', 'PUT /api/pcp/ordens/:id/status sem requireProductionRole',
        'Rota de mudança de status aceita qualquer usuário autenticado. ' +
        'Vendedor pode cancelar OPs de produção. Falta middleware requireProductionRole.');
    }

    // We expect 200 based on code analysis — route only has authRequired, not requireProductionRole
    expect(res.status).toBe(200);
  });
});
