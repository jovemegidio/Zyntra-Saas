/**
 * PCP Domain Module: Diario de Producao (registro diario, CRUD)
 * Extraido de pcp-routes.js em 10/03/2026
 * Padrao Mixin: registra rotas no router compartilhado do PCP
 * @module routes/pcp/diario-producao-routes
 */

module.exports = function registerDiarioProducaoRoutes(router, deps) {
    const { pool, authenticateToken } = deps;

    // ==========================================
    // API DIÁRIO DE PRODUÇÃO - CRUD
    // ==========================================

    // GET - Listar registros do diário de produção
    router.get('/diario-producao', authenticateToken, async (req, res) => {
        try {
            const { data, operador_id, status, setor } = req.query;

            let query = `
                SELECT dp.*, u.nome as operador_nome
                FROM diario_producao dp
                LEFT JOIN usuarios u ON dp.operador_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (data) {
                query += ' AND dp.data = ?';
                params.push(data);
            }
            if (operador_id) {
                query += ' AND dp.operador_id = ?';
                params.push(operador_id);
            }
            if (status) {
                query += ' AND dp.status = ?';
                params.push(status);
            }
            if (setor) {
                query += ' AND dp.setor = ?';
                params.push(setor);
            }

            const limit = Math.min(parseInt(req.query.limit) || 100, 500);
            const page = Math.max(parseInt(req.query.page) || 1, 1);
            const offset = (page - 1) * limit;

            // Count query
            const countQuery = query.replace('SELECT dp.*, u.nome as operador_nome', 'SELECT COUNT(*) as total');
            const [[{ total }]] = await pool.query(countQuery, params);

            query += ' ORDER BY dp.data DESC, dp.hora_inicio DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows] = await pool.query(query, params);
            res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
        } catch (error) {
            console.error('❌ Erro ao listar diário de produção:', error);
            res.status(500).json({ message: 'Erro ao listar registros', error: error.message });
        }
    });

    // GET - Buscar registro específico
    router.get('/diario-producao/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const [rows] = await pool.query(`
                SELECT dp.*, u.nome as operador_nome
                FROM diario_producao dp
                LEFT JOIN usuarios u ON dp.operador_id = u.id
                WHERE dp.id = ?
            `, [id]);

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Registro não encontrado' });
            }
            res.json(rows[0]);
        } catch (error) {
            console.error('❌ Erro ao buscar registro:', error);
            res.status(500).json({ message: 'Erro ao buscar registro', error: error.message });
        }
    });

    // POST - Criar novo registro
    router.post('/diario-producao', authenticateToken, async (req, res) => {
        try {
            const { titulo, descricao, data, hora_inicio, hora_fim, maquina_id, observacoes, pedido, producao, refugo, setor, tipo_registro } = req.body;
            const operador_id = req.user?.id;

            const [result] = await pool.query(`
                INSERT INTO diario_producao
                (titulo, descricao, data, operador_id, hora_inicio, hora_fim, maquina_id, observacoes, pedido, producao, refugo, setor, tipo_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                titulo || 'Registro de Produção',
                descricao,
                data || new Date().toISOString().split('T')[0],
                operador_id,
                hora_inicio,
                hora_fim,
                maquina_id,
                observacoes,
                pedido,
                producao,
                refugo,
                setor || 'producao',
                tipo_registro || 'producao'
            ]);

            res.status(201).json({
                message: 'Registro criado com sucesso',
                id: result.insertId
            });
        } catch (error) {
            console.error('❌ Erro ao criar registro:', error);
            res.status(500).json({ message: 'Erro ao criar registro', error: error.message });
        }
    });

    // PUT - Atualizar registro
    router.put('/diario-producao/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { titulo, descricao, data, hora_inicio, hora_fim, status, maquina_id, observacoes, pedido, producao, refugo, setor, tipo_registro } = req.body;

            const [result] = await pool.query(`
                UPDATE diario_producao SET
                    titulo = COALESCE(?, titulo),
                    descricao = COALESCE(?, descricao),
                    data = COALESCE(?, data),
                    hora_inicio = COALESCE(?, hora_inicio),
                    hora_fim = COALESCE(?, hora_fim),
                    status = COALESCE(?, status),
                    maquina_id = COALESCE(?, maquina_id),
                    observacoes = COALESCE(?, observacoes),
                    pedido = COALESCE(?, pedido),
                    producao = COALESCE(?, producao),
                    refugo = COALESCE(?, refugo),
                    setor = COALESCE(?, setor),
                    tipo_registro = COALESCE(?, tipo_registro)
                WHERE id = ?
            `, [titulo, descricao, data, hora_inicio, hora_fim, status, maquina_id, observacoes, pedido, producao, refugo, setor, tipo_registro, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Registro não encontrado' });
            }
            res.json({ message: 'Registro atualizado com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao atualizar registro:', error);
            res.status(500).json({ message: 'Erro ao atualizar registro', error: error.message });
        }
    });

    // DELETE - Excluir registro
    router.delete('/diario-producao/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const [result] = await pool.query('DELETE FROM diario_producao WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Registro não encontrado' });
            }
            res.json({ message: 'Registro excluído com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao excluir registro:', error);
            res.status(500).json({ message: 'Erro ao excluir registro', error: error.message });
        }
    });

    // API para buscar materiais/produtos

};
