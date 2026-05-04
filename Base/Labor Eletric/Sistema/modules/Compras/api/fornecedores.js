const express = require('express');
const router = express.Router();
const { query, run, get } = require('../database');

// ============ LISTAR FORNECEDORES ============
router.get('/', async (req, res) => {
    try {
        const { search, ativo, limit = 50, offset = 0 } = req.query;
        
        let sql = 'SELECT * FROM fornecedores WHERE 1=1';
        const params = [];
        const searchParam = search ? `%${search}%` : null;
        
        if (search) {
            sql += ' AND (razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ?)';
            params.push(searchParam, searchParam, searchParam);
        }
        
        if (ativo !== undefined) {
            sql += ' AND ativo = ?';
            params.push(ativo === 'true' ? 1 : 0);
        }
        
        sql += ' ORDER BY razao_social LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const fornecedores = await query(sql, params);
        
        const countSql = 'SELECT COUNT(*) as total FROM fornecedores WHERE 1=1' + 
            (search ? ' AND (razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ?)' : '') +
            (ativo !== undefined ? ' AND ativo = ?' : '');
        const countParams = search ? [searchParam, searchParam, searchParam] : [];
        if (ativo !== undefined) countParams.push(ativo === 'true' ? 1 : 0);
        
        const { total } = await get(countSql, countParams);
        
        res.json({
            fornecedores,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Erro ao listar fornecedores:', error);
        res.status(500).json({ error: 'Erro ao buscar fornecedores' });
    }
});

// ============ OBTER FORNECEDOR ============
router.get('/:id', async (req, res) => {
    try {
        const fornecedor = await get('SELECT * FROM fornecedores WHERE id = ?', [req.params.id]);
        
        if (!fornecedor) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }
        
        res.json(fornecedor);
    } catch (error) {
        console.error('Erro ao obter fornecedor:', error);
        res.status(500).json({ error: 'Erro ao buscar fornecedor' });
    }
});

// ============ CRIAR FORNECEDOR ============
router.post('/', async (req, res) => {
    try {
        const {
            razao_social, nome_fantasia, cnpj,
            ie, inscricao_estadual,
            endereco, bairro, cidade, estado, cep,
            telefone, email, contato_principal, contato,
            condicoes_pagamento, prazo_entrega_padrao, prazo_entrega,
            observacoes, ativo = 1,
            categoria, avaliacao, chave_pix, nome
        } = req.body;
        
        if (!razao_social || !cnpj) {
            return res.status(400).json({ error: 'Razão social e CNPJ são obrigatórios' });
        }
        
        // Verificar se CNPJ já existe
        const existente = await get('SELECT id FROM fornecedores WHERE cnpj = ?', [cnpj]);
        if (existente) {
            return res.status(400).json({ error: 'CNPJ já cadastrado' });
        }
        
        const result = await run(`
            INSERT INTO fornecedores (
                razao_social, nome_fantasia, cnpj, ie,
                endereco, bairro, cidade, estado, cep,
                telefone, email, contato_principal, contato, nome,
                condicoes_pagamento, prazo_entrega_padrao,
                observacoes, ativo, categoria, avaliacao, chave_pix
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            razao_social, nome_fantasia, cnpj, ie || inscricao_estadual || null,
            endereco, bairro || null, cidade, estado, cep,
            telefone, email, contato_principal, contato || contato_principal || null, nome || razao_social,
            condicoes_pagamento, prazo_entrega_padrao || prazo_entrega || 0,
            observacoes, ativo, categoria || 'Geral', avaliacao || 0, chave_pix || null
        ]);
        
        res.status(201).json({
            id: result.id,
            message: 'Fornecedor criado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao criar fornecedor' });
    }
});

// ============ ATUALIZAR FORNECEDOR ============
router.put('/:id', async (req, res) => {
    try {
        const {
            razao_social, nome_fantasia, cnpj,
            ie, inscricao_estadual,
            endereco, bairro, cidade, estado, cep,
            telefone, email, contato_principal, contato,
            condicoes_pagamento, prazo_entrega_padrao, prazo_entrega,
            observacoes, ativo,
            categoria, avaliacao, chave_pix, nome
        } = req.body;
        
        const result = await run(`
            UPDATE fornecedores SET
                razao_social = ?, nome_fantasia = ?, cnpj = ?, ie = ?,
                endereco = ?, bairro = ?, cidade = ?, estado = ?, cep = ?,
                telefone = ?, email = ?, contato_principal = ?, contato = ?, nome = ?,
                condicoes_pagamento = ?, prazo_entrega_padrao = ?,
                observacoes = ?, ativo = ?,
                categoria = ?, avaliacao = ?, chave_pix = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            razao_social, nome_fantasia, cnpj, ie || inscricao_estadual || null,
            endereco, bairro || null, cidade, estado, cep,
            telefone, email, contato_principal, contato || contato_principal || null, nome || razao_social,
            condicoes_pagamento, prazo_entrega_padrao || prazo_entrega || 0,
            observacoes, ativo,
            categoria || 'Geral', avaliacao || 0, chave_pix || null,
            req.params.id
        ]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }
        
        res.json({ message: 'Fornecedor atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    }
});

// ============ EXCLUIR FORNECEDOR (SOFT-DELETE) ============
router.delete('/:id', async (req, res) => {
    try {
        // Verificar se há pedidos de compra ativos vinculados
        const pedidosVinculados = await get(
            `SELECT COUNT(*) as total FROM pedidos_compra 
             WHERE fornecedor_id = ? AND status NOT IN ('cancelado', 'recebido')`,
            [req.params.id]
        );
        
        if (pedidosVinculados && pedidosVinculados.total > 0) {
            return res.status(400).json({ 
                error: `Fornecedor possui ${pedidosVinculados.total} pedido(s) de compra ativo(s). Finalize ou cancele antes de excluir.` 
            });
        }
        
        // Soft-delete: desativa em vez de remover fisicamente
        const result = await run(
            'UPDATE fornecedores SET ativo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [req.params.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }
        
        res.json({ message: 'Fornecedor desativado com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir fornecedor:', error);
        res.status(500).json({ error: 'Erro ao excluir fornecedor' });
    }
});

module.exports = router;
