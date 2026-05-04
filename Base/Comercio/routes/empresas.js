/**
 * ROTAS API - MULTI-EMPRESAS
 * 
 * Endpoints:
 * GET    /api/empresas              → Listar empresas do usuário logado
 * GET    /api/empresas/:id          → Detalhes de uma empresa
 * POST   /api/empresas              → Criar nova empresa (admin)
 * PUT    /api/empresas/:id          → Atualizar empresa
 * POST   /api/empresas/:id/selecionar → Selecionar/trocar empresa ativa
 * GET    /api/empresas/:id/usuarios → Listar usuários da empresa
 * POST   /api/empresas/:id/usuarios → Vincular usuário à empresa
 * DELETE /api/empresas/:id/usuarios/:uid → Desvincular usuário
 * GET    /api/empresas/setores      → Listar setores disponíveis
 * GET    /api/empresas/planos       → Listar planos disponíveis
 *
 * Criado: 30/03/2026
 */

'use strict';

const express = require('express');
const { PLANOS, getEmpresaConfig, getEmpresasDoUsuario } = require('../config/empresa');
const { SECTOR_CONFIG } = require('../config/sector');
const { invalidateEmpresaCache } = require('../middleware/empresa');

function createEmpresaRouter(pool, authenticateToken) {
    const router = express.Router();

    // ─── Listar empresas do usuário logado ─────────────
    router.get('/empresas', authenticateToken, async (req, res) => {
        try {
            const empresas = await getEmpresasDoUsuario(pool, req.user.id);
            res.json({ success: true, empresas });
        } catch (err) {
            console.error('[EMPRESAS] Erro ao listar:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao listar empresas' });
        }
    });

    // ─── Detalhes de uma empresa ───────────────────────
    router.get('/empresas/:id', authenticateToken, async (req, res) => {
        try {
            const empresaId = parseInt(req.params.id);
            if (isNaN(empresaId)) return res.status(400).json({ success: false, message: 'ID inválido' });

            // Verificar se o usuário tem acesso a esta empresa
            const [acesso] = await pool.query(
                'SELECT 1 FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ? AND ativo = 1',
                [req.user.id, empresaId]
            );
            if (!acesso || acesso.length === 0) {
                return res.status(403).json({ success: false, message: 'Sem acesso a esta empresa' });
            }

            const config = await getEmpresaConfig(pool, empresaId);
            if (!config) {
                return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
            }

            res.json({ success: true, empresa: config });
        } catch (err) {
            console.error('[EMPRESAS] Erro ao buscar:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao buscar empresa' });
        }
    });

    // ─── Criar nova empresa (somente admin global) ────
    router.post('/empresas', authenticateToken, async (req, res) => {
        try {
            if (!req.user.is_admin) {
                return res.status(403).json({ success: false, message: 'Apenas administradores podem criar empresas' });
            }

            const { razaoSocial, nomeFantasia, cnpj, setor, plano, slug, isolamento } = req.body;

            if (!razaoSocial || !nomeFantasia) {
                return res.status(400).json({ success: false, message: 'Razão social e nome fantasia são obrigatórios' });
            }

            // Validar setor
            const setorValido = ['industria', 'comercio', 'servicos', 'agropecuario', 'completo'];
            const setorFinal = setorValido.includes(setor) ? setor : 'completo';

            // Validar plano
            const planoFinal = PLANOS[plano] ? plano : 'starter';

            // Gerar slug se não fornecido
            const slugFinal = (slug || nomeFantasia)
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 50);

            // Verificar slug único
            const [slugCheck] = await pool.query('SELECT id FROM empresas_tenant WHERE slug = ?', [slugFinal]);
            if (slugCheck.length > 0) {
                return res.status(409).json({ success: false, message: 'Slug já em uso. Escolha outro nome.' });
            }

            const [result] = await pool.query(
                `INSERT INTO empresas_tenant 
                    (slug, razao_social, nome_fantasia, cnpj, setor, plano, isolamento) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [slugFinal, razaoSocial, nomeFantasia, cnpj || null, setorFinal, planoFinal, isolamento || 'schema']
            );

            const novaEmpresaId = result.insertId;

            // Vincular o criador como owner
            await pool.query(
                `INSERT INTO usuarios_empresas (usuario_id, empresa_id, role, is_admin, is_default) 
                 VALUES (?, ?, 'owner', 1, 0)`,
                [req.user.id, novaEmpresaId]
            );

            res.status(201).json({
                success: true,
                message: 'Empresa criada com sucesso',
                empresa: {
                    id: novaEmpresaId,
                    slug: slugFinal,
                    nomeFantasia,
                    setor: setorFinal,
                    plano: planoFinal,
                }
            });

        } catch (err) {
            console.error('[EMPRESAS] Erro ao criar:', err.message);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'CNPJ ou slug já cadastrado' });
            }
            res.status(500).json({ success: false, message: 'Erro ao criar empresa' });
        }
    });

    // ─── Atualizar empresa ────────────────────────────
    router.put('/empresas/:id', authenticateToken, async (req, res) => {
        try {
            const empresaId = parseInt(req.params.id);
            if (isNaN(empresaId)) return res.status(400).json({ success: false, message: 'ID inválido' });

            // Verificar se é admin desta empresa
            const [acesso] = await pool.query(
                'SELECT is_admin FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ? AND ativo = 1',
                [req.user.id, empresaId]
            );
            if (!acesso.length || (!acesso[0].is_admin && !req.user.is_admin)) {
                return res.status(403).json({ success: false, message: 'Sem permissão para editar esta empresa' });
            }

            const updates = {};
            const allowed = ['nome_fantasia', 'razao_social', 'cnpj', 'setor', 'plano',
                'logo_url', 'favicon_url', 'cor_primaria', 'cor_secundaria', 'cor_accent',
                'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'modulos_override'];

            for (const key of allowed) {
                // Mapear camelCase do body para snake_case
                const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                if (req.body[camelKey] !== undefined) {
                    updates[key] = key === 'modulos_override'
                        ? JSON.stringify(req.body[camelKey])
                        : req.body[camelKey];
                } else if (req.body[key] !== undefined) {
                    updates[key] = key === 'modulos_override'
                        ? JSON.stringify(req.body[key])
                        : req.body[key];
                }
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
            }

            const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
            const values = Object.values(updates);

            await pool.query(
                `UPDATE empresas_tenant SET ${setClauses} WHERE id = ?`,
                [...values, empresaId]
            );

            // Invalidar cache
            invalidateEmpresaCache(empresaId);

            res.json({ success: true, message: 'Empresa atualizada com sucesso' });

        } catch (err) {
            console.error('[EMPRESAS] Erro ao atualizar:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao atualizar empresa' });
        }
    });

    // ─── Selecionar/trocar empresa ativa ──────────────
    router.post('/empresas/:id/selecionar', authenticateToken, async (req, res) => {
        try {
            const empresaId = parseInt(req.params.id);
            if (isNaN(empresaId)) return res.status(400).json({ success: false, message: 'ID inválido' });

            // Verificar se o usuário tem acesso
            const [acesso] = await pool.query(
                'SELECT role, is_admin FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ? AND ativo = 1',
                [req.user.id, empresaId]
            );
            if (!acesso.length) {
                return res.status(403).json({ success: false, message: 'Sem acesso a esta empresa' });
            }

            // Resetar default anterior e marcar nova
            await pool.query(
                'UPDATE usuarios_empresas SET is_default = 0 WHERE usuario_id = ?',
                [req.user.id]
            );
            await pool.query(
                'UPDATE usuarios_empresas SET is_default = 1 WHERE usuario_id = ? AND empresa_id = ?',
                [req.user.id, empresaId]
            );

            // Atualizar empresa_default_id no user
            await pool.query(
                'UPDATE usuarios SET empresa_default_id = ? WHERE id = ?',
                [empresaId, req.user.id]
            );

            const config = await getEmpresaConfig(pool, empresaId);

            res.json({
                success: true,
                message: 'Empresa selecionada',
                empresa: {
                    id: empresaId,
                    nomeFantasia: config ? config.nomeFantasia : null,
                    setor: config ? config.setor : 'completo',
                    empresaId: empresaId,
                }
            });

        } catch (err) {
            console.error('[EMPRESAS] Erro ao selecionar:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao selecionar empresa' });
        }
    });

    // ─── Listar usuários da empresa ───────────────────
    router.get('/empresas/:id/usuarios', authenticateToken, async (req, res) => {
        try {
            const empresaId = parseInt(req.params.id);
            if (isNaN(empresaId)) return res.status(400).json({ success: false, message: 'ID inválido' });

            // Verificar acesso
            const [acesso] = await pool.query(
                'SELECT is_admin FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ? AND ativo = 1',
                [req.user.id, empresaId]
            );
            if (!acesso.length) {
                return res.status(403).json({ success: false, message: 'Sem acesso a esta empresa' });
            }

            const [usuarios] = await pool.query(
                `SELECT u.id, u.nome, u.email, u.login, u.role AS global_role,
                        ue.role, ue.is_admin, ue.is_default, ue.ativo, ue.criado_em
                 FROM usuarios_empresas ue
                 INNER JOIN usuarios u ON u.id = ue.usuario_id
                 WHERE ue.empresa_id = ?
                 ORDER BY u.nome`,
                [empresaId]
            );

            res.json({ success: true, usuarios });

        } catch (err) {
            console.error('[EMPRESAS] Erro ao listar usuários:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
        }
    });

    // ─── Vincular usuário à empresa ───────────────────
    router.post('/empresas/:id/usuarios', authenticateToken, async (req, res) => {
        try {
            const empresaId = parseInt(req.params.id);
            if (isNaN(empresaId)) return res.status(400).json({ success: false, message: 'ID inválido' });

            // Verificar se é admin desta empresa
            const [acesso] = await pool.query(
                'SELECT is_admin FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ? AND ativo = 1',
                [req.user.id, empresaId]
            );
            if (!acesso.length || (!acesso[0].is_admin && !req.user.is_admin)) {
                return res.status(403).json({ success: false, message: 'Sem permissão' });
            }

            const { usuarioId, role } = req.body;
            if (!usuarioId) return res.status(400).json({ success: false, message: 'usuarioId é obrigatório' });

            const roleValido = ['viewer', 'operator', 'manager', 'admin', 'owner'];
            const roleFinal = roleValido.includes(role) ? role : 'operator';

            await pool.query(
                `INSERT INTO usuarios_empresas (usuario_id, empresa_id, role, is_admin) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE role = VALUES(role), is_admin = VALUES(is_admin), ativo = 1`,
                [usuarioId, empresaId, roleFinal, roleFinal === 'admin' || roleFinal === 'owner' ? 1 : 0]
            );

            res.json({ success: true, message: 'Usuário vinculado à empresa' });

        } catch (err) {
            console.error('[EMPRESAS] Erro ao vincular:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao vincular usuário' });
        }
    });

    // ─── Desvincular usuário ──────────────────────────
    router.delete('/empresas/:id/usuarios/:uid', authenticateToken, async (req, res) => {
        try {
            const empresaId = parseInt(req.params.id);
            const uid = parseInt(req.params.uid);

            // Verificar se é admin desta empresa
            const [acesso] = await pool.query(
                'SELECT is_admin FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ? AND ativo = 1',
                [req.user.id, empresaId]
            );
            if (!acesso.length || (!acesso[0].is_admin && !req.user.is_admin)) {
                return res.status(403).json({ success: false, message: 'Sem permissão' });
            }

            // Não pode remover a si mesmo se for o único owner
            const [owners] = await pool.query(
                "SELECT COUNT(*) as c FROM usuarios_empresas WHERE empresa_id = ? AND role = 'owner' AND ativo = 1",
                [empresaId]
            );
            if (uid === req.user.id && owners[0].c <= 1) {
                return res.status(400).json({ success: false, message: 'Não é possível remover o último owner' });
            }

            await pool.query(
                'UPDATE usuarios_empresas SET ativo = 0 WHERE usuario_id = ? AND empresa_id = ?',
                [uid, empresaId]
            );

            res.json({ success: true, message: 'Usuário desvinculado' });

        } catch (err) {
            console.error('[EMPRESAS] Erro ao desvincular:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao desvincular usuário' });
        }
    });

    // ─── Listar setores disponíveis ───────────────────
    router.get('/empresas/setores', authenticateToken, (req, res) => {
        const setores = Object.entries(SECTOR_CONFIG).map(([key, val]) => ({
            key,
            label: val.label,
            description: val.description,
            icon: val.icon,
        }));
        res.json({ success: true, setores });
    });

    // ─── Listar planos disponíveis ────────────────────
    router.get('/empresas/planos', authenticateToken, (req, res) => {
        const planos = Object.entries(PLANOS).map(([key, val]) => ({
            key,
            label: val.label,
            preco: val.preco,
            maxUsuarios: val.maxUsuarios,
            maxEmpresas: val.maxEmpresas,
            suporte: val.suporte,
            armazenamento: val.armazenamento,
        }));
        res.json({ success: true, planos });
    });

    return router;
}

module.exports = createEmpresaRouter;
