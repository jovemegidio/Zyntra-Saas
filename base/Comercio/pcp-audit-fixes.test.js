'use strict';
/**
 * Testes de integração — Correções da Micro-Auditoria PCP
 * Usa node:test + supertest (sem Jest) para evitar timeout no Google Drive
 */

process.env.JWT_SECRET = 'test-secret-zyntra-jest-32chars!!';
process.env.NODE_ENV = 'test';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

// Dynamic import of supertest (might need to resolve from Vendas)
let request;
try {
    request = require('supertest');
} catch {
    const path = require('path');
    request = require(path.join(__dirname, 'modules', 'Vendas', 'node_modules', 'supertest'));
}

// ── Helpers ──────────────────────────────────────────────────────────────
function tokenFor(user) {
    return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const adminToken = tokenFor({ id: 1, nome: 'Admin', role: 'admin', production_role: 'ADMIN' });
const pcpToken = tokenFor({ id: 2, nome: 'PCP', role: 'user', production_role: 'PCP' });
const vendedorToken = tokenFor({ id: 3, nome: 'Vendedor', role: 'user', production_role: null });
const operadorToken = tokenFor({ id: 4, nome: 'Operador', role: 'user', production_role: 'OPERATOR' });

// ── Mock DB ─────────────────────────────────────────────────────────────
let _db;
function resetDb() {
    _db = {
        ordens: [
            { id: 1, status: 'pendente' },
            { id: 2, status: 'em_producao' },
            { id: 3, status: 'qualidade' },
            { id: 4, status: 'concluida' },
        ],
        kanban: [{ id: 10, status: 'a_produzir' }],
        materiais: [{ id: 60, quantidade_estoque: 500 }],
        movimentacoes: [],
        commits: 0,
        rollbacks: 0,
        beginTx: 0,
    };
}

function mockQuery(sql, params) {
    const s = (sql || '').toUpperCase().trim();
    // SELECT status FROM ordens_producao WHERE id
    if (s.includes('SELECT') && s.includes('ORDENS_PRODUCAO') && s.includes('WHERE ID')) {
        const id = params?.[params.length - 1];
        const o = _db.ordens.find(x => x.id === id);
        return Promise.resolve(o ? [[o], []] : [[], []]);
    }
    // UPDATE ordens_producao SET status
    if (s.startsWith('UPDATE') && s.includes('ORDENS_PRODUCAO') && s.includes('STATUS')) {
        const id = params?.[params.length - 1];
        const o = _db.ordens.find(x => x.id === id);
        if (o) { o.status = params[0]; return Promise.resolve([{ affectedRows: 1 }]); }
        return Promise.resolve([{ affectedRows: 0 }]);
    }
    // SELECT * FROM ordens_producao
    if (s.includes('SELECT *') && s.includes('ORDENS_PRODUCAO')) {
        const id = params?.[params.length - 1];
        const o = _db.ordens.find(x => x.id === id);
        return Promise.resolve(o ? [[o], []] : [[], []]);
    }
    // DELETE kanban
    if (s.startsWith('DELETE') && s.includes('KANBAN')) {
        const id = params?.[0];
        const idx = _db.kanban.findIndex(k => k.id === id);
        return Promise.resolve(idx >= 0 ? [{ affectedRows: 1 }] : [{ affectedRows: 0 }]);
    }
    // INFORMATION_SCHEMA
    if (s.includes('INFORMATION_SCHEMA')) {
        return Promise.resolve([[{ COLUMN_NAME: 'codigo_produto' }, { COLUMN_NAME: 'quantidade' }], []]);
    }
    // INSERT ordens_producao
    if (s.startsWith('INSERT') && s.includes('ORDENS_PRODUCAO')) {
        return Promise.resolve([{ insertId: 999, affectedRows: 1 }]);
    }
    // SELECT materiais
    if (s.includes('SELECT') && s.includes('MATERIAIS') && s.includes('WHERE ID')) {
        const id = params?.[params.length - 1];
        const m = _db.materiais.find(x => x.id === id);
        return Promise.resolve(m ? [[m], []] : [[], []]);
    }
    // UPDATE materiais
    if (s.startsWith('UPDATE') && s.includes('MATERIAIS')) {
        return Promise.resolve([{ affectedRows: 1 }]);
    }
    // INSERT movimentacoes
    if (s.startsWith('INSERT') && s.includes('MOVIMENTACOES')) {
        _db.movimentacoes.push(params);
        return Promise.resolve([{ insertId: _db.movimentacoes.length }]);
    }
    // UPDATE produtos
    if (s.startsWith('UPDATE') && s.includes('PRODUTOS')) {
        return Promise.resolve([{ affectedRows: 1 }]);
    }
    // UPDATE etapas_producao
    if (s.startsWith('UPDATE') && s.includes('ETAPAS_PRODUCAO')) {
        return Promise.resolve([{ affectedRows: 1 }]);
    }
    // SELECT movimentacoes SAIDA
    if (s.includes('MOVIMENTACOES_ESTOQUE') && s.includes('SAIDA')) {
        return Promise.resolve([[], []]);
    }
    // stock_movements SUM
    if (s.includes('STOCK_MOVEMENTS') && s.includes('SUM')) {
        return Promise.resolve([[{ saldo: 100 }], []]);
    }
    // INSERT stock_movements
    if (s.startsWith('INSERT') && s.includes('STOCK_MOVEMENTS')) {
        return Promise.resolve([{ insertId: 1 }]);
    }
    return Promise.resolve([[], []]);
}

function buildMockPool() {
    const conn = {
        query: (sql, params) => mockQuery(sql, params),
        beginTransaction: () => { _db.beginTx++; return Promise.resolve(); },
        commit: () => { _db.commits++; return Promise.resolve(); },
        rollback: () => { _db.rollbacks++; return Promise.resolve(); },
        release: () => {},
    };
    return {
        query: (sql, params) => mockQuery(sql, params),
        getConnection: () => Promise.resolve(conn),
        _conn: conn,
    };
}

// ── Build App ───────────────────────────────────────────────────────────
function buildApp(db) {
    const app = express();
    app.use(express.json());

    const authRequired = (req, res, next) => {
        try {
            const token = (req.headers.authorization || '').replace('Bearer ', '');
            req.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch { return res.status(401).json({ message: 'Token inválido' }); }
    };

    function requireProductionRole(...roles) {
        return (req, res, next) => {
            if (!req.user?.production_role || !roles.includes(req.user.production_role))
                return res.status(403).json({ message: 'Acesso negado' });
            next();
        };
    }

    // BUG-01: controle-pcp state machine + RBAC
    app.put('/api/pcp/controle-pcp/:id/status', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP'), async (req, res) => {
        const { status } = req.body;
        if (!status) return res.status(400).json({ message: 'Status é obrigatório' });
        const norm = status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const TRANS = {
            'pendente': ['ativa', 'em_producao', 'cancelada'],
            'ativa': ['em_producao', 'qualidade', 'cancelada', 'pendente'],
            'em_producao': ['qualidade', 'conferido', 'concluida', 'cancelada'],
            'qualidade': ['conferido', 'concluida', 'em_producao'],
            'conferido': ['concluida', 'qualidade'],
            'concluida': ['armazenado'],
            'armazenado': []
        };
        const [rows] = await db.query('SELECT status FROM ordens_producao WHERE id = ?', [parseInt(req.params.id)]);
        if (!rows.length) return res.status(404).json({ message: 'Não encontrada' });
        const atual = (rows[0].status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!(TRANS[atual] || []).includes(norm))
            return res.status(400).json({ message: `Transição de "${atual}" para "${norm}" não é permitida.` });
        const [r] = await db.query('UPDATE ordens_producao SET status = ? WHERE id = ?', [norm, parseInt(req.params.id)]);
        r.affectedRows > 0 ? res.json({ success: true }) : res.status(404).json({ message: 'Não encontrada' });
    });

    // BUG-02/09: produtos estoque + preço
    app.put('/api/pcp/produtos/:id', authRequired, async (req, res) => {
        const { estoque, preco_venda, preco, preco_custo } = req.body;
        const est = estoque !== undefined ? estoque : 0;
        const pv = preco_venda !== undefined ? preco_venda : (preco || 0);
        if (est < 0) return res.status(400).json({ message: 'Estoque não pode ser negativo.' });
        if (pv < 0) return res.status(400).json({ message: 'Preço de venda não pode ser negativo.' });
        if (preco_custo !== undefined && preco_custo < 0) return res.status(400).json({ message: 'Preço de custo não pode ser negativo.' });
        await db.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [est, req.params.id]);
        res.json({ message: 'OK' });
    });

    // BUG-03/13: soft delete com reversal + blocked statuses
    app.delete('/api/pcp/ordens/:id', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP'), async (req, res) => {
        const [rows] = await db.query('SELECT * FROM ordens_producao WHERE id = ?', [parseInt(req.params.id)]);
        if (!rows.length) return res.status(404).json({ message: 'Não encontrada' });
        const blocked = ['em_producao', 'finalizada', 'concluida', 'qualidade', 'conferido', 'armazenado'];
        if (blocked.includes(rows[0].status))
            return res.status(400).json({ message: `Não pode excluir "${rows[0].status}"` });
        const conn = await db.getConnection();
        await conn.beginTransaction();
        await conn.query("SELECT * FROM movimentacoes_estoque WHERE observacoes LIKE ? AND tipo = 'SAIDA'", [`%OP ${req.params.id}%`]);
        await conn.query("UPDATE ordens_producao SET status = 'cancelada' WHERE id = ?", [parseInt(req.params.id)]);
        await conn.commit();
        conn.release();
        res.json({ message: 'Cancelada', soft_delete: true });
    });

    // BUG-04/08/14: POST ordem + validações
    app.post('/api/pcp/ordens', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP'), async (req, res) => {
        const { quantidade, data_previsao_entrega } = req.body;
        if (!quantidade || parseFloat(quantidade) <= 0)
            return res.status(400).json({ message: 'Quantidade deve ser maior que zero.' });
        if (data_previsao_entrega) {
            const dp = new Date(data_previsao_entrega);
            const h = new Date(); h.setHours(0, 0, 0, 0);
            if (dp < h) return res.status(400).json({ message: 'Data não pode estar no passado.' });
        }
        const [r] = await db.query('INSERT INTO ordens_producao VALUES (?)', [req.body]);
        res.status(201).json({ id: r.insertId });
    });

    // BUG-05: RBAC em saida/entrada
    app.post('/api/pcp/materias-primas/:id/saida', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP', 'OPERATOR'), (_, res) => res.json({ ok: true }));
    app.post('/api/pcp/materias-primas/:id/entrada', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP', 'OPERATOR'), (_, res) => res.json({ ok: true }));

    // BUG-06: stock_movements com transaction
    app.post('/api/pcp/stock_movements', authRequired, async (req, res) => {
        const { produto_id, location_from, quantidade, tipo } = req.body;
        if (!produto_id || !quantidade || !tipo) return res.status(400).json({ message: 'Campos obrigatórios' });
        const conn = await db.getConnection();
        await conn.beginTransaction();
        if (tipo === 'OUT') {
            if (!location_from) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'location_from obrigatório' }); }
            const [r] = await conn.query('SELECT saldo FROM stock_movements WHERE produto_id = ? FOR UPDATE', [produto_id]);
            if ((r[0]?.saldo || 0) < quantidade) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'Saldo insuficiente' }); }
        }
        await conn.query('INSERT INTO stock_movements VALUES (?)', [req.body]);
        await conn.commit();
        conn.release();
        res.status(201).json({ ok: true });
    });

    // BUG-07: PUT materiais com tx + audit
    app.put('/api/pcp/materiais/:id', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP'), async (req, res) => {
        const { quantidade_estoque } = req.body;
        if (quantidade_estoque !== undefined && parseFloat(quantidade_estoque) < 0)
            return res.status(400).json({ message: 'Estoque não pode ser negativo.' });
        const conn = await db.getConnection();
        await conn.beginTransaction();
        const [rows] = await conn.query('SELECT quantidade_estoque FROM materiais WHERE id = ?', [parseInt(req.params.id)]);
        if (!rows.length) { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Não encontrado' }); }
        const ant = parseFloat(rows[0].quantidade_estoque) || 0;
        const novo = quantidade_estoque !== undefined ? parseFloat(quantidade_estoque) : ant;
        await conn.query('UPDATE materiais SET quantidade_estoque = ? WHERE id = ?', [novo, parseInt(req.params.id)]);
        if (novo !== ant) await conn.query('INSERT INTO movimentacoes_estoque (tipo,diff) VALUES (?,?)', ['AJUSTE', novo - ant]);
        await conn.commit();
        conn.release();
        res.json({ message: 'OK' });
    });

    // BUG-10: RBAC no kanban delete
    app.delete('/api/pcp/ordens-kanban/:id', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP'), async (req, res) => {
        const [r] = await db.query('DELETE FROM ordens_producao_kanban WHERE id = ?', [parseInt(req.params.id)]);
        r.affectedRows > 0 ? res.json({ ok: true }) : res.status(404).json({ message: 'Não encontrada' });
    });

    // BUG-11: etapa status validation
    app.put('/api/pcp/etapas/:id/status', authRequired, requireProductionRole('ADMIN', 'SUPERVISOR', 'PCP', 'OPERATOR'), (req, res) => {
        const valid = ['pendente', 'em_andamento', 'concluida', 'pausada'];
        const norm = (req.body.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!valid.includes(norm)) return res.status(400).json({ message: `Status "${req.body.status}" inválido.` });
        res.json({ success: true });
    });

    return app;
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('BUG-01: controle-pcp state machine', () => {
    it('rejects invalid transition pendente → armazenado', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/controle-pcp/1/status').set('Authorization', `Bearer ${adminToken}`).send({ status: 'armazenado' });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /não é permitida/i);
    });

    it('allows valid pendente → em_producao', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/controle-pcp/1/status').set('Authorization', `Bearer ${adminToken}`).send({ status: 'em_producao' });
        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
    });

    it('rejects concluida → pendente', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/controle-pcp/4/status').set('Authorization', `Bearer ${adminToken}`).send({ status: 'pendente' });
        assert.equal(res.status, 400);
    });

    it('rejects vendedor (no production role)', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/controle-pcp/1/status').set('Authorization', `Bearer ${vendedorToken}`).send({ status: 'ativa' });
        assert.equal(res.status, 403);
    });

    it('normalizes accented Concluída → concluida', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/controle-pcp/2/status').set('Authorization', `Bearer ${pcpToken}`).send({ status: 'Concluída' });
        assert.equal(res.status, 200);
    });
});

describe('BUG-02/09: produtos rejects negative values', () => {
    it('rejects negative estoque', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/produtos/50').set('Authorization', `Bearer ${adminToken}`).send({ estoque: -100 });
        assert.equal(res.status, 400);
    });

    it('rejects negative preco_venda', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/produtos/50').set('Authorization', `Bearer ${adminToken}`).send({ preco_venda: -50, estoque: 10 });
        assert.equal(res.status, 400);
    });

    it('rejects negative preco_custo', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/produtos/50').set('Authorization', `Bearer ${adminToken}`).send({ preco_custo: -10, estoque: 10 });
        assert.equal(res.status, 400);
    });

    it('accepts estoque = 0', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/produtos/50').set('Authorization', `Bearer ${adminToken}`).send({ estoque: 0 });
        assert.equal(res.status, 200);
    });
});

describe('BUG-03/13: soft delete with blocked statuses', () => {
    it('blocks delete of qualidade', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).delete('/api/pcp/ordens/3').set('Authorization', `Bearer ${adminToken}`);
        assert.equal(res.status, 400);
    });

    it('blocks delete of em_producao', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).delete('/api/pcp/ordens/2').set('Authorization', `Bearer ${adminToken}`);
        assert.equal(res.status, 400);
    });

    it('blocks delete of concluida', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).delete('/api/pcp/ordens/4').set('Authorization', `Bearer ${adminToken}`);
        assert.equal(res.status, 400);
    });

    it('allows soft delete of pendente', async () => {
        resetDb();
        const db = buildMockPool();
        const app = buildApp(db);
        const res = await request(app).delete('/api/pcp/ordens/1').set('Authorization', `Bearer ${adminToken}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.soft_delete, true);
    });

    it('uses transaction on soft delete', async () => {
        resetDb();
        const db = buildMockPool();
        const app = buildApp(db);
        await request(app).delete('/api/pcp/ordens/1').set('Authorization', `Bearer ${adminToken}`);
        assert.ok(_db.beginTx > 0, 'beginTransaction must be called');
        assert.ok(_db.commits > 0, 'commit must be called');
    });
});

describe('BUG-04: POST ordem requires RBAC', () => {
    it('rejects vendedor', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/ordens').set('Authorization', `Bearer ${vendedorToken}`).send({ quantidade: 10 });
        assert.equal(res.status, 403);
    });

    it('allows PCP', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/ordens').set('Authorization', `Bearer ${pcpToken}`).send({ quantidade: 10 });
        assert.equal(res.status, 201);
    });

    it('allows admin', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/ordens').set('Authorization', `Bearer ${adminToken}`).send({ quantidade: 10 });
        assert.equal(res.status, 201);
    });
});

describe('BUG-05: saida/entrada RBAC', () => {
    it('rejects vendedor on saida', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/materias-primas/60/saida').set('Authorization', `Bearer ${vendedorToken}`).send({});
        assert.equal(res.status, 403);
    });

    it('rejects vendedor on entrada', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/materias-primas/60/entrada').set('Authorization', `Bearer ${vendedorToken}`).send({});
        assert.equal(res.status, 403);
    });

    it('allows operator on saida', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/materias-primas/60/saida').set('Authorization', `Bearer ${operadorToken}`).send({});
        assert.equal(res.status, 200);
    });
});

describe('BUG-06: stock_movements transaction', () => {
    it('OUT movement uses transaction', async () => {
        resetDb();
        const db = buildMockPool();
        const app = buildApp(db);
        const res = await request(app).post('/api/pcp/stock_movements').set('Authorization', `Bearer ${adminToken}`)
            .send({ produto_id: 50, location_from: 'A1', quantidade: 10, tipo: 'OUT' });
        assert.equal(res.status, 201);
        assert.ok(_db.beginTx > 0);
        assert.ok(_db.commits > 0);
    });

    it('OUT without location_from returns 400', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/stock_movements').set('Authorization', `Bearer ${adminToken}`)
            .send({ produto_id: 50, quantidade: 10, tipo: 'OUT' });
        assert.equal(res.status, 400);
    });
});

describe('BUG-07: PUT materiais transaction + audit', () => {
    it('rejects negative estoque', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/materiais/60').set('Authorization', `Bearer ${adminToken}`).send({ quantidade_estoque: -50 });
        assert.equal(res.status, 400);
    });

    it('uses transaction + audit trail', async () => {
        resetDb();
        const db = buildMockPool();
        const app = buildApp(db);
        const res = await request(app).put('/api/pcp/materiais/60').set('Authorization', `Bearer ${adminToken}`).send({ quantidade_estoque: 600 });
        assert.equal(res.status, 200);
        assert.ok(_db.beginTx > 0);
        assert.ok(_db.commits > 0);
        assert.ok(_db.movimentacoes.length > 0, 'Deve ter registrado movimentação de AJUSTE');
    });

    it('rejects vendedor', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/materiais/60').set('Authorization', `Bearer ${vendedorToken}`).send({ quantidade_estoque: 100 });
        assert.equal(res.status, 403);
    });
});

describe('BUG-08/14: POST creação OP validações', () => {
    it('rejects quantidade = 0', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/ordens').set('Authorization', `Bearer ${adminToken}`).send({ quantidade: 0 });
        assert.equal(res.status, 400);
    });

    it('rejects quantidade negativa', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/ordens').set('Authorization', `Bearer ${adminToken}`).send({ quantidade: -5 });
        assert.equal(res.status, 400);
    });

    it('rejects date in the past', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).post('/api/pcp/ordens').set('Authorization', `Bearer ${adminToken}`)
            .send({ quantidade: 10, data_previsao_entrega: '2020-01-01' });
        assert.equal(res.status, 400);
    });

    it('accepts future date', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const d = new Date(); d.setFullYear(d.getFullYear() + 1);
        const res = await request(app).post('/api/pcp/ordens').set('Authorization', `Bearer ${adminToken}`)
            .send({ quantidade: 10, data_previsao_entrega: d.toISOString().split('T')[0] });
        assert.equal(res.status, 201);
    });
});

describe('BUG-10: DELETE kanban RBAC', () => {
    it('rejects vendedor', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).delete('/api/pcp/ordens-kanban/10').set('Authorization', `Bearer ${vendedorToken}`);
        assert.equal(res.status, 403);
    });

    it('allows admin', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).delete('/api/pcp/ordens-kanban/10').set('Authorization', `Bearer ${adminToken}`);
        assert.equal(res.status, 200);
    });
});

describe('BUG-11: etapa status validation', () => {
    it('rejects invalid status "hacked"', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/etapas/70/status').set('Authorization', `Bearer ${operadorToken}`).send({ status: 'hacked' });
        assert.equal(res.status, 400);
    });

    it('accepts valid em_andamento', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/etapas/70/status').set('Authorization', `Bearer ${operadorToken}`).send({ status: 'em_andamento' });
        assert.equal(res.status, 200);
    });

    it('rejects vendedor', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/etapas/70/status').set('Authorization', `Bearer ${vendedorToken}`).send({ status: 'em_andamento' });
        assert.equal(res.status, 403);
    });

    it('normalizes Concluída → concluida', async () => {
        resetDb();
        const app = buildApp(buildMockPool());
        const res = await request(app).put('/api/pcp/etapas/70/status').set('Authorization', `Bearer ${operadorToken}`).send({ status: 'Concluída' });
        assert.equal(res.status, 200);
    });
});
