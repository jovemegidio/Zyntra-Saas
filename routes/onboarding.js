/**
 * ONBOARDING ROUTE - Public signup endpoint for LP cadastro
 * Creates empresa_tenant + usuario + usuarios_empresas in one transaction
 * @module routes/onboarding
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

module.exports = function createOnboardingRouter(pool) {
    const router = express.Router();

    const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

    // Generate URL-friendly slug from company name
    function generateSlug(name) {
        return name
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }

    // POST /api/onboarding - Create account (public, no auth)
    router.post('/onboarding', [
        body('nome').trim().isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),
        body('email').isEmail().normalizeEmail().withMessage('E-mail inválido'),
        body('senha').isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),
        body('empresa_nome').trim().isLength({ min: 2 }).withMessage('Nome da empresa é obrigatório'),
        body('setor').isIn(['industria', 'comercio', 'servicos', 'agropecuario']).withMessage('Segmento inválido'),
        body('plano').optional().isIn(['starter', 'profissional', 'enterprise']).withMessage('Plano inválido'),
        body('telefone').optional().trim(),
        body('cnpj').optional().trim(),
        body('funcionarios').optional().trim()
    ], asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const first = errors.array()[0];
            return res.status(400).json({
                success: false,
                message: first.msg,
                field: first.path
            });
        }

        const { nome, email, senha, empresa_nome, setor, plano, telefone, cnpj, funcionarios } = req.body;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Check if email already exists
            const [existing] = await connection.query(
                'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
                [email]
            );
            if (existing.length > 0) {
                await connection.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
                    field: 'email'
                });
            }

            // 2. Check if CNPJ already exists (if provided)
            if (cnpj && cnpj.length >= 14) {
                const [existingCnpj] = await connection.query(
                    'SELECT id FROM empresas_tenant WHERE cnpj = ? LIMIT 1',
                    [cnpj]
                );
                if (existingCnpj.length > 0) {
                    await connection.rollback();
                    return res.status(409).json({
                        success: false,
                        message: 'Este CNPJ já está cadastrado.',
                        field: 'cnpj'
                    });
                }
            }

            // 3. Generate unique slug
            let slug = generateSlug(empresa_nome);
            const [slugCheck] = await connection.query(
                'SELECT id FROM empresas_tenant WHERE slug = ? LIMIT 1',
                [slug]
            );
            if (slugCheck.length > 0) {
                slug = `${slug}-${Date.now().toString(36)}`;
            }

            // 4. Create empresa_tenant
            const trialDays = 14;
            const trialAte = new Date();
            trialAte.setDate(trialAte.getDate() + trialDays);

            const [empresaResult] = await connection.query(
                `INSERT INTO empresas_tenant 
                    (slug, razao_social, nome_fantasia, cnpj, setor, plano, isolamento, email, telefone, ativo, trial_ate)
                 VALUES (?, ?, ?, ?, ?, ?, 'schema', ?, ?, 1, ?)`,
                [
                    slug,
                    empresa_nome,
                    empresa_nome,
                    cnpj || null,
                    setor,
                    plano || 'profissional',
                    email,
                    telefone || null,
                    trialAte
                ]
            );
            const empresaId = empresaResult.insertId;

            // 5. Hash password and create user
            const senhaHash = await bcrypt.hash(senha, 12);
            const login = email.split('@')[0];

            const [userResult] = await connection.query(
                `INSERT INTO usuarios 
                    (nome, email, senha_hash, password_hash, role, login, senha_temporaria, status, telefone, empresa_default_id)
                 VALUES (?, ?, ?, ?, 'admin', ?, 0, 'ativo', ?, ?)`,
                [nome, email, senhaHash, senhaHash, login, telefone || null, empresaId]
            );
            const userId = userResult.insertId;

            // 6. Link user to empresa as owner/admin
            await connection.query(
                `INSERT INTO usuarios_empresas (usuario_id, empresa_id, role, is_admin, is_default, ativo)
                 VALUES (?, ?, 'owner', 1, 1, 1)`,
                [userId, empresaId]
            );

            await connection.commit();

            console.log(`[ONBOARDING] ✅ Nova conta criada: ${empresa_nome} (${slug}) | Plano: ${plano || 'profissional'} | User: ${email} | EmpresaID: ${empresaId}`);

            res.status(201).json({
                success: true,
                message: 'Conta criada com sucesso!',
                data: {
                    empresa_id: empresaId,
                    slug,
                    plano: plano || 'profissional',
                    trial_ate: trialAte.toISOString().split('T')[0]
                }
            });

        } catch (err) {
            await connection.rollback();
            console.error('[ONBOARDING] ❌ Erro ao criar conta:', err.message);
            res.status(500).json({
                success: false,
                message: 'Erro interno ao criar conta. Tente novamente.'
            });
        } finally {
            connection.release();
        }
    }));

    return router;
};
