const express = require('express');
const router = express.Router();

// GET /api/compras/centros-custo
router.get('/', async (req, res) => {
    try {
        const { pool } = req.app.locals;
        const [rows] = await pool.query('SELECT id, codigo, nome, descricao FROM centros_custo WHERE ativo = 1 ORDER BY nome');
        res.json({ centros: rows });
    } catch (error) {
        console.error('[COMPRAS] Erro GET centros-custo:', error);
        res.status(500).json({ error: 'Erro ao buscar centros de custo' });
    }
});

module.exports = router;
