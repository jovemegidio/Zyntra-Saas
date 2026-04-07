// =================================================================
// ROTAS API PRODUTOS - ALUFORCE v2.0
// CRUD de produtos
// =================================================================
'use strict';

const express = require('express');
const router = express.Router();

function createProdutosRouter(pool, authenticateToken, io) {
    
    // GET /api/produtos - Listar produtos
    router.get('/', authenticateToken, async (req, res) => {
        try {
            console.log('✅ Buscando produtos...');
            
            const { termo } = req.query;
            const rawLimit = req.query.limit;
            let limitParam = typeof rawLimit !== 'undefined' ? parseInt(rawLimit) : 1000;
            if (isNaN(limitParam) || limitParam < 0) limitParam = 1000;

            let query = `
                SELECT 
                    id, codigo, nome, variacao, marca, descricao, 
                    gtin, sku, custo_unitario, estoque_atual, estoque_minimo,
                    preco_venda, preco_custo,
                    ncm, origem, cest, unidade_medida, categoria,
                    cfop_saida_interna, cfop_saida_interestadual,
                    cfop_entrada_interna, cfop_entrada_interestadual,
                    cst_icms, csosn_icms, aliquota_icms, reducao_bc_icms, aliquota_credito_sn,
                    calcular_icms_st, mva_st,
                    cst_ipi, aliquota_ipi, calcular_ipi,
                    cst_pis, aliquota_pis, cst_cofins, aliquota_cofins,
                    peso_liquido, peso_bruto, largura, altura, comprimento,
                    info_adicional_produto, numero_fci,
                    classe_tributaria_ibs, classe_tributaria_cbs, ex_tipi
                FROM produtos WHERE 1=1
            `;
            let params = [];
            
            if (termo && termo.length >= 1) {
                query += ` AND (codigo LIKE ? OR nome LIKE ? OR descricao LIKE ?)`;
                const termoLike = `%${termo}%`;
                params = [termoLike, termoLike, termoLike];
            }
            
            if (limitParam === 0) {
                query += ' ORDER BY nome';
            } else {
                query += ' ORDER BY nome LIMIT ?';
                params.push(limitParam);
            }
            
            const [produtos] = await pool.query(query, params);
            
            const produtosFormatados = produtos.map(produto => ({
                id: produto.id,
                codigo: produto.codigo || '',
                nome: produto.nome || '',
                descricao: produto.descricao || produto.nome || '',
                variacao: produto.variacao || '',
                marca: produto.marca || '',
                gtin: produto.gtin || '',
                sku: produto.sku || '',
                preco: parseFloat(produto.custo_unitario) || 0,
                preco_unitario: parseFloat(produto.custo_unitario) || 0,
                preco_venda: parseFloat(produto.preco_venda) || 0,
                preco_custo: parseFloat(produto.preco_custo) || 0,
                estoque_atual: produto.estoque_atual || 0,
                estoque_minimo: produto.estoque_minimo || 0,
                categoria: produto.categoria || produto.marca || 'Produto',
                // Campos fiscais
                ncm: produto.ncm || '',
                origem: produto.origem || '0',
                cest: produto.cest || null,
                unidade_medida: produto.unidade_medida || 'UN',
                cfop_saida_interna: produto.cfop_saida_interna || '5102',
                cfop_saida_interestadual: produto.cfop_saida_interestadual || '6102',
                cfop_entrada_interna: produto.cfop_entrada_interna || '1102',
                cfop_entrada_interestadual: produto.cfop_entrada_interestadual || '2102',
                cst_icms: produto.cst_icms || '00',
                csosn_icms: produto.csosn_icms || '102',
                aliquota_icms: produto.aliquota_icms != null ? parseFloat(produto.aliquota_icms) : null,
                reducao_bc_icms: parseFloat(produto.reducao_bc_icms) || 0,
                aliquota_credito_sn: produto.aliquota_credito_sn != null ? parseFloat(produto.aliquota_credito_sn) : null,
                calcular_icms_st: !!produto.calcular_icms_st,
                mva_st: produto.mva_st != null ? parseFloat(produto.mva_st) : null,
                cst_ipi: produto.cst_ipi || '99',
                aliquota_ipi: parseFloat(produto.aliquota_ipi) || 0,
                calcular_ipi: !!produto.calcular_ipi,
                cst_pis: produto.cst_pis || '01',
                aliquota_pis: produto.aliquota_pis != null ? parseFloat(produto.aliquota_pis) : null,
                cst_cofins: produto.cst_cofins || '01',
                aliquota_cofins: produto.aliquota_cofins != null ? parseFloat(produto.aliquota_cofins) : null,
                peso_liquido: parseFloat(produto.peso_liquido) || 0,
                peso_bruto: parseFloat(produto.peso_bruto) || 0,
                largura: produto.largura != null ? parseFloat(produto.largura) : null,
                altura: produto.altura != null ? parseFloat(produto.altura) : null,
                comprimento: produto.comprimento != null ? parseFloat(produto.comprimento) : null,
                info_adicional_produto: produto.info_adicional_produto || null,
                numero_fci: produto.numero_fci || null,
                classe_tributaria_ibs: produto.classe_tributaria_ibs || null,
                classe_tributaria_cbs: produto.classe_tributaria_cbs || null,
                ex_tipi: produto.ex_tipi || null
            }));
            
            res.json({
                rows: produtosFormatados,
                items: produtosFormatados,
                total: produtosFormatados.length
            });
            
        } catch (error) {
            console.error('❌ Erro ao buscar produtos:', error);
            res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
    });

    // GET /api/produtos/buscar - Buscar produtos para autocomplete
    router.get('/buscar', authenticateToken, async (req, res) => {
        try {
            const { termo, limit } = req.query;
            const limiteResultados = parseInt(limit) || 20;
            
            let query = `
                SELECT id, codigo, nome, descricao, custo_unitario as preco, preco_venda, preco_custo
                FROM produtos WHERE 1=1
            `;
            let params = [];
            
            if (termo && termo.length >= 2) {
                query += ` AND (codigo LIKE ? OR nome LIKE ?)`;
                const termoLike = `%${termo}%`;
                params = [termoLike, termoLike];
            }
            
            query += ` ORDER BY nome LIMIT ?`;
            params.push(limiteResultados);
            
            const [produtos] = await pool.query(query, params);
            
            res.json(produtos);
            
        } catch (error) {
            console.error('❌ Erro ao buscar produtos:', error);
            res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
    });

    async function ensureProdutoConfigTables() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS produto_tabelas_preco (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(120) NOT NULL,
                tipo VARCHAR(50) DEFAULT 'padrao',
                validade DATE NULL,
                descricao TEXT NULL,
                status VARCHAR(20) DEFAULT 'ativo',
                ativo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS produto_unidades_medida (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sigla VARCHAR(10) NOT NULL,
                nome VARCHAR(100) NOT NULL,
                tipo VARCHAR(50) DEFAULT 'quantidade',
                ativo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS produto_ncm (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(20) NOT NULL,
                descricao VARCHAR(255) NOT NULL,
                aliquota_ipi DECIMAL(10,2) NULL,
                categoria VARCHAR(100) NULL,
                ativo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
    }

    // GET /api/produtos/ncm - Lista códigos NCM configurados
    router.get('/ncm', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const [rows] = await pool.query(`
                SELECT id, codigo, descricao, aliquota_ipi, categoria
                FROM produto_ncm
                WHERE ativo = 1 OR ativo IS NULL
                ORDER BY codigo
                LIMIT 500
            `);

            if (rows.length > 0) {
                return res.json({ success: true, data: rows });
            }

            return res.json({
                success: true,
                data: [
                    { id: 1, codigo: '76141000', descricao: 'Cabos de alumínio com alma de aço para uso elétrico', aliquota_ipi: 0, categoria: 'cabos' },
                    { id: 2, codigo: '85444900', descricao: 'Outros condutores elétricos para tensão <= 1000V', aliquota_ipi: 0, categoria: 'condutores' },
                    { id: 3, codigo: '74081900', descricao: 'Fios de cobre refinado', aliquota_ipi: 0, categoria: 'metais' }
                ]
            });
        } catch (error) {
            console.error('❌ Erro ao listar NCM:', error);
            res.status(500).json({ error: 'Erro ao listar códigos NCM' });
        }
    });

    // GET /api/produtos/tabelas-preco
    router.get('/tabelas-preco', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const [rows] = await pool.query(`
                SELECT id, nome, tipo, validade, descricao, status,
                       0 AS total_produtos,
                       created_at, updated_at
                FROM produto_tabelas_preco
                WHERE ativo = 1 OR ativo IS NULL
                ORDER BY nome
            `);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('❌ Erro ao listar tabelas de preço:', error);
            res.status(500).json({ error: 'Erro ao listar tabelas de preço' });
        }
    });

    router.post('/tabelas-preco', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const { nome, tipo, validade, descricao, status } = req.body || {};
            if (!nome || !String(nome).trim()) {
                return res.status(400).json({ message: 'Nome da tabela é obrigatório.' });
            }
            const [result] = await pool.query(`
                INSERT INTO produto_tabelas_preco (nome, tipo, validade, descricao, status, ativo)
                VALUES (?, ?, ?, ?, ?, 1)
            `, [String(nome).trim(), tipo || 'padrao', validade || null, descricao || null, status || 'ativo']);
            res.status(201).json({ success: true, id: result.insertId, message: 'Tabela de preço criada com sucesso.' });
        } catch (error) {
            console.error('❌ Erro ao criar tabela de preço:', error);
            res.status(500).json({ error: 'Erro ao criar tabela de preço' });
        }
    });

    router.put('/tabelas-preco/:id', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const { id } = req.params;
            const { nome, tipo, validade, descricao, status } = req.body || {};
            const [result] = await pool.query(`
                UPDATE produto_tabelas_preco
                SET nome = ?, tipo = ?, validade = ?, descricao = ?, status = ?, updated_at = NOW()
                WHERE id = ?
            `, [String(nome || '').trim(), tipo || 'padrao', validade || null, descricao || null, status || 'ativo', id]);
            if (!result.affectedRows) return res.status(404).json({ message: 'Tabela não encontrada.' });
            res.json({ success: true, message: 'Tabela de preço atualizada com sucesso.' });
        } catch (error) {
            console.error('❌ Erro ao atualizar tabela de preço:', error);
            res.status(500).json({ error: 'Erro ao atualizar tabela de preço' });
        }
    });

    router.delete('/tabelas-preco/:id', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const [result] = await pool.query('UPDATE produto_tabelas_preco SET ativo = 0, updated_at = NOW() WHERE id = ?', [req.params.id]);
            if (!result.affectedRows) return res.status(404).json({ message: 'Tabela não encontrada.' });
            res.json({ success: true, message: 'Tabela de preço excluída com sucesso.' });
        } catch (error) {
            console.error('❌ Erro ao excluir tabela de preço:', error);
            res.status(500).json({ error: 'Erro ao excluir tabela de preço' });
        }
    });

    // GET /api/produtos/unidades-medida
    router.get('/unidades-medida', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const [rows] = await pool.query(`
                SELECT id, sigla, nome, tipo, created_at, updated_at
                FROM produto_unidades_medida
                WHERE ativo = 1 OR ativo IS NULL
                ORDER BY sigla
            `);

            if (rows.length > 0) {
                return res.json({ success: true, data: rows });
            }

            return res.json({
                success: true,
                data: [
                    { id: 1, sigla: 'UN', nome: 'Unidade', tipo: 'quantidade' },
                    { id: 2, sigla: 'KG', nome: 'Quilograma', tipo: 'peso' },
                    { id: 3, sigla: 'M', nome: 'Metro', tipo: 'comprimento' },
                    { id: 4, sigla: 'CX', nome: 'Caixa', tipo: 'quantidade' }
                ]
            });
        } catch (error) {
            console.error('❌ Erro ao listar unidades de medida:', error);
            res.status(500).json({ error: 'Erro ao listar unidades de medida' });
        }
    });

    router.post('/unidades-medida', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const { sigla, nome, tipo } = req.body || {};
            if (!sigla || !nome) {
                return res.status(400).json({ message: 'Sigla e nome são obrigatórios.' });
            }
            const [result] = await pool.query(`
                INSERT INTO produto_unidades_medida (sigla, nome, tipo, ativo)
                VALUES (?, ?, ?, 1)
            `, [String(sigla).trim().toUpperCase(), String(nome).trim(), tipo || 'quantidade']);
            res.status(201).json({ success: true, id: result.insertId, message: 'Unidade criada com sucesso.' });
        } catch (error) {
            console.error('❌ Erro ao criar unidade de medida:', error);
            res.status(500).json({ error: 'Erro ao criar unidade de medida' });
        }
    });

    router.put('/unidades-medida/:id', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const { id } = req.params;
            const { sigla, nome, tipo } = req.body || {};
            const [result] = await pool.query(`
                UPDATE produto_unidades_medida
                SET sigla = COALESCE(?, sigla),
                    nome = COALESCE(?, nome),
                    tipo = COALESCE(?, tipo),
                    updated_at = NOW()
                WHERE id = ?
            `, [sigla ? String(sigla).trim().toUpperCase() : null, nome ? String(nome).trim() : null, tipo || null, id]);
            if (!result.affectedRows) return res.status(404).json({ message: 'Unidade não encontrada.' });
            res.json({ success: true, message: 'Unidade atualizada com sucesso.' });
        } catch (error) {
            console.error('❌ Erro ao atualizar unidade de medida:', error);
            res.status(500).json({ error: 'Erro ao atualizar unidade de medida' });
        }
    });

    router.delete('/unidades-medida/:id', authenticateToken, async (req, res) => {
        try {
            await ensureProdutoConfigTables();
            const [result] = await pool.query('UPDATE produto_unidades_medida SET ativo = 0, updated_at = NOW() WHERE id = ?', [req.params.id]);
            if (!result.affectedRows) return res.status(404).json({ message: 'Unidade não encontrada.' });
            res.json({ success: true, message: 'Unidade excluída com sucesso.' });
        } catch (error) {
            console.error('❌ Erro ao excluir unidade de medida:', error);
            res.status(500).json({ error: 'Erro ao excluir unidade de medida' });
        }
    });

    // POST /api/produtos - Criar produto
    router.post('/', authenticateToken, async (req, res) => {
        try {
            console.log('✅ Criando novo produto...');
            const dados = req.body;
            
            if (!dados.codigo || !dados.nome) {
                return res.status(400).json({ error: 'Código e Nome são obrigatórios' });
            }
            
            // Verificar se código já existe
            const [existe] = await pool.query('SELECT id FROM produtos WHERE codigo = ?', [dados.codigo]);
            if (existe.length > 0) {
                return res.status(400).json({ error: 'Código já existe' });
            }
            
            const [result] = await pool.query(`
                INSERT INTO produtos (
                    codigo, nome, descricao, gtin, sku, marca, variacao, custo_unitario,
                    unidade_medida, ncm, categoria, estoque_atual, estoque_minimo,
                    origem, cest, cfop_saida_interna, cfop_saida_interestadual,
                    cfop_entrada_interna, cfop_entrada_interestadual, ex_tipi,
                    cst_icms, csosn_icms, aliquota_icms, reducao_bc_icms, aliquota_credito_sn,
                    calcular_icms_st, mva_st,
                    cst_ipi, aliquota_ipi, calcular_ipi,
                    cst_pis, aliquota_pis, cst_cofins, aliquota_cofins,
                    peso_liquido, peso_bruto, largura, altura, comprimento,
                    info_adicional_produto, numero_fci,
                    classe_tributaria_ibs, classe_tributaria_cbs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                dados.codigo,
                dados.nome,
                dados.descricao || '',
                dados.gtin || '',
                dados.sku || '',
                dados.marca || 'Aluforce',
                dados.variacao || '',
                parseFloat(dados.preco || dados.custo_unitario || 0),
                dados.unidade_medida || 'UN',
                dados.ncm || '',
                dados.categoria || '',
                parseFloat(dados.estoque_atual || 0),
                parseFloat(dados.estoque_minimo || 0),
                dados.origem || '0',
                dados.cest || null,
                dados.cfop_saida_interna || '5102',
                dados.cfop_saida_interestadual || '6102',
                dados.cfop_entrada_interna || '1102',
                dados.cfop_entrada_interestadual || '2102',
                dados.ex_tipi || null,
                dados.cst_icms || '00',
                dados.csosn_icms || '102',
                dados.aliquota_icms != null ? parseFloat(dados.aliquota_icms) : null,
                parseFloat(dados.reducao_bc_icms || 0),
                dados.aliquota_credito_sn != null ? parseFloat(dados.aliquota_credito_sn) : null,
                dados.calcular_icms_st ? 1 : 0,
                dados.mva_st != null ? parseFloat(dados.mva_st) : null,
                dados.cst_ipi || '99',
                parseFloat(dados.aliquota_ipi || 0),
                dados.calcular_ipi ? 1 : 0,
                dados.cst_pis || '01',
                dados.aliquota_pis != null ? parseFloat(dados.aliquota_pis) : null,
                dados.cst_cofins || '01',
                dados.aliquota_cofins != null ? parseFloat(dados.aliquota_cofins) : null,
                parseFloat(dados.peso_liquido || 0),
                parseFloat(dados.peso_bruto || 0),
                dados.largura != null ? parseFloat(dados.largura) : null,
                dados.altura != null ? parseFloat(dados.altura) : null,
                dados.comprimento != null ? parseFloat(dados.comprimento) : null,
                dados.info_adicional_produto || null,
                dados.numero_fci || null,
                dados.classe_tributaria_ibs || null,
                dados.classe_tributaria_cbs || null
            ]);
            
            // Emitir evento WebSocket
            if (io) {
                io.emit('produto:criado', { id: result.insertId, codigo: dados.codigo, nome: dados.nome });
            }
            
            res.json({
                success: true,
                id: result.insertId,
                message: 'Produto criado com sucesso'
            });
            
        } catch (error) {
            console.error('❌ Erro ao criar produto:', error);
            res.status(500).json({ error: 'Erro interno no servidor. Tente novamente.' });
        }
    });

    // PUT /api/produtos/:id - Atualizar produto
    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const dados = req.body;
            
            // Verificar se produto existe
            const [produto] = await pool.query('SELECT id FROM produtos WHERE id = ?', [id]);
            if (produto.length === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            const [result] = await pool.query(`
                UPDATE produtos SET
                    codigo = ?, nome = ?, descricao = ?, gtin = ?, sku = ?,
                    marca = ?, variacao = ?, custo_unitario = ?,
                    unidade_medida = ?, ncm = ?, categoria = ?,
                    estoque_atual = ?, estoque_minimo = ?,
                    origem = ?, cest = ?, cfop_saida_interna = ?, cfop_saida_interestadual = ?,
                    cfop_entrada_interna = ?, cfop_entrada_interestadual = ?, ex_tipi = ?,
                    cst_icms = ?, csosn_icms = ?, aliquota_icms = ?, reducao_bc_icms = ?,
                    aliquota_credito_sn = ?, calcular_icms_st = ?, mva_st = ?,
                    cst_ipi = ?, aliquota_ipi = ?, calcular_ipi = ?,
                    cst_pis = ?, aliquota_pis = ?, cst_cofins = ?, aliquota_cofins = ?,
                    peso_liquido = ?, peso_bruto = ?, largura = ?, altura = ?, comprimento = ?,
                    info_adicional_produto = ?, numero_fci = ?,
                    classe_tributaria_ibs = ?, classe_tributaria_cbs = ?
                WHERE id = ?
            `, [
                dados.codigo,
                dados.nome,
                dados.descricao || '',
                dados.gtin || '',
                dados.sku || '',
                dados.marca || '',
                dados.variacao || '',
                parseFloat(dados.preco || dados.custo_unitario || 0),
                dados.unidade_medida || 'UN',
                dados.ncm || '',
                dados.categoria || '',
                parseFloat(dados.estoque_atual || 0),
                parseFloat(dados.estoque_minimo || 0),
                dados.origem || '0',
                dados.cest || null,
                dados.cfop_saida_interna || '5102',
                dados.cfop_saida_interestadual || '6102',
                dados.cfop_entrada_interna || '1102',
                dados.cfop_entrada_interestadual || '2102',
                dados.ex_tipi || null,
                dados.cst_icms || '00',
                dados.csosn_icms || '102',
                dados.aliquota_icms != null ? parseFloat(dados.aliquota_icms) : null,
                parseFloat(dados.reducao_bc_icms || 0),
                dados.aliquota_credito_sn != null ? parseFloat(dados.aliquota_credito_sn) : null,
                dados.calcular_icms_st ? 1 : 0,
                dados.mva_st != null ? parseFloat(dados.mva_st) : null,
                dados.cst_ipi || '99',
                parseFloat(dados.aliquota_ipi || 0),
                dados.calcular_ipi ? 1 : 0,
                dados.cst_pis || '01',
                dados.aliquota_pis != null ? parseFloat(dados.aliquota_pis) : null,
                dados.cst_cofins || '01',
                dados.aliquota_cofins != null ? parseFloat(dados.aliquota_cofins) : null,
                parseFloat(dados.peso_liquido || 0),
                parseFloat(dados.peso_bruto || 0),
                dados.largura != null ? parseFloat(dados.largura) : null,
                dados.altura != null ? parseFloat(dados.altura) : null,
                dados.comprimento != null ? parseFloat(dados.comprimento) : null,
                dados.info_adicional_produto || null,
                dados.numero_fci || null,
                dados.classe_tributaria_ibs || null,
                dados.classe_tributaria_cbs || null,
                id
            ]);
            
            // Emitir evento WebSocket
            if (io) {
                io.emit('produto:atualizado', { id, ...dados });
            }
            
            res.json({ success: true, message: 'Produto atualizado com sucesso' });
            
        } catch (error) {
            console.error('❌ Erro ao atualizar produto:', error);
            res.status(500).json({ error: 'Erro ao atualizar produto' });
        }
    });

    // DELETE /api/produtos/:id - Excluir produto
    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            
            // FIX-100: Soft-delete instead of hard DELETE (preserves historical data)
            const [result] = await pool.query('UPDATE produtos SET ativo = 0, updated_at = NOW() WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            // Emitir evento WebSocket
            if (io) {
                io.emit('produto:excluido', { id });
            }
            
            res.json({ success: true, message: 'Produto excluído com sucesso' });
            
        } catch (error) {
            console.error('❌ Erro ao excluir produto:', error);
            res.status(500).json({ error: 'Erro ao excluir produto' });
        }
    });

    // GET /api/produtos/:id - Buscar produto por ID
    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            
            const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [id]);
            
            if (produtos.length === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            res.json(produtos[0]);
            
        } catch (error) {
            console.error('❌ Erro ao buscar produto:', error);
            res.status(500).json({ error: 'Erro ao buscar produto' });
        }
    });

    return router;
}

module.exports = createProdutosRouter;
