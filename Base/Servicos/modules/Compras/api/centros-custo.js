const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// GET /api/compras/centros-custo
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        const [rows] = await db.query('SELECT id, codigo, nome, descricao FROM centros_custo WHERE ativo = 1 ORDER BY nome');
        res.json({ centros: rows });
    } catch (error) {
        console.error('[COMPRAS] Erro GET centros-custo:', error);
        res.status(500).json({ error: 'Erro ao buscar centros de custo' });
    }
});

module.exports = router;
