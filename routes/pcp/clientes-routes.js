/**
 * PCP Domain Module: Gestao de Clientes (CRUD, autocomplete, historico)
 * Extraido de pcp-routes.js em 10/03/2026
 * Padrao Mixin: registra rotas no router compartilhado do PCP
 * @module routes/pcp/clientes-routes
 */

module.exports = function registerClientesRoutes(router, deps) {
    const { pool, authenticateToken } = deps;

    let lgpdCrypto = null;
    try { lgpdCrypto = require('../../lgpd-crypto'); } catch (_) {}

    // =================== APIS PARA AUTOCOMPLETE DO MODAL PCP ===================

    // API para buscar clientes (suporta modo gestão com todos os campos)
    // SECURITY: Requer autenticação
    router.get('/api/clientes', authenticateToken, async (req, res) => {
        try {
            const { termo, busca, gestao, limite } = req.query;
            const termoBusca = termo || busca; // Suporta ambos os parâmetros
            // SECURITY: Limitar range de resultados para evitar abuso (1-500)
            const limiteResultados = Math.min(Math.max(parseInt(limite) || 50, 1), 500);

            // Modo gestão: retorna todos os campos para a página de gestão de clientes
            if (gestao === 'true' || gestao === '1') {
                let query = `SELECT id, nome, razao_social, nome_fantasia, cnpj, cnpj_cpf, cpf, inscricao_estadual, contato, email, telefone, endereco, bairro, cidade, estado, cep, vendedor_responsavel, ativo, observacoes, created_at, data_ultima_alteracao as updated_at FROM clientes ORDER BY nome LIMIT ?`;

                const [clientes] = await pool.query(query, [limiteResultados]);

                // Descriptografar campos PII (LGPD)
                const _dec = lgpdCrypto ? lgpdCrypto.decryptPII : (v => v);

                const clientesFormatados = clientes.map(cliente => {
                    // Descriptografar campos que podem estar criptografados
                    const cnpjRaw = cliente.cnpj || cliente.cnpj_cpf || '';
                    const cpfRaw = cliente.cpf || '';
                    const cnpjDecrypted = _dec(cnpjRaw);
                    const cpfDecrypted = _dec(cpfRaw);
                    const ieRaw = cliente.inscricao_estadual || '';
                    const ieDecrypted = _dec(ieRaw);

                    return {
                    id: cliente.id,
                    nome: cliente.nome || cliente.razao_social || cliente.nome_fantasia || '',
                    contato: cliente.contato || '',
                    cnpj: cnpjDecrypted,
                    cpf: cpfDecrypted,
                    inscricao_estadual: ieDecrypted,
                    telefone: cliente.telefone || '',
                    celular: '',
                    email: cliente.email || '',
                    email_nfe: cliente.email || '',
                    cep: cliente.cep || '',
                    endereco: cliente.endereco || '',
                    numero: '',
                    bairro: cliente.bairro || '',
                    cidade: cliente.cidade || '',
                    uf: cliente.estado || '',
                    ativo: cliente.ativo === 1 || cliente.ativo === true,
                    data_criacao: cliente.data_cadastro || cliente.created_at,
                    data_atualizacao: cliente.data_ultima_alteracao || cliente.updated_at
                }});  // fecha return + map

                console.log(`✅ Gestão: Encontrados ${clientesFormatados.length} clientes`);
                return res.json(clientesFormatados);
            }

            // Modo autocomplete: retorna apenas campos básicos
            console.log('📋 Buscando clientes para autocomplete...');

            let query = `SELECT id,
                COALESCE(razao_social, nome) as razao_social,
                COALESCE(nome_fantasia, nome) as nome,
                COALESCE(cnpj_cpf, cnpj, cpf, '') as cnpj_cpf,
                COALESCE(cidade, '') as cidade,
                COALESCE(estado, '') as uf,
                telefone, email,
                COALESCE(contato, nome_contato, '') as contato,
                COALESCE(endereco, logradouro, '') as endereco,
                COALESCE(bairro, '') as bairro,
                COALESCE(cep, '') as cep,
                COALESCE(email_nfe, '') as email_nfe,
                COALESCE(nome_fantasia, '') as nome_fantasia
                FROM clientes WHERE (ativo = 1 OR ativo IS NULL)`;
            let params = [];

            if (termoBusca && termoBusca.length >= 2) {
                query += ` AND (
                    razao_social LIKE ? OR
                    nome_fantasia LIKE ? OR
                    nome LIKE ? OR
                    cnpj_cpf LIKE ? OR
                    cnpj LIKE ?
                )`;
                const termoLike = `%${termoBusca}%`;
                params = [termoLike, termoLike, termoLike, termoLike, termoLike];
            }

            query += ` ORDER BY COALESCE(razao_social, nome) LIMIT ${limiteResultados}`;

            const [clientes] = await pool.query(query, params);

            // Formatar resposta (descriptografar PII)
            const _dec2 = lgpdCrypto ? lgpdCrypto.decryptPII : (v => v);
            const clientesFormatados = clientes.map(cliente => ({
                id: cliente.id,
                razao_social: cliente.razao_social || cliente.nome || '',
                nome: cliente.nome || cliente.razao_social || '',
                nome_fantasia: cliente.nome_fantasia || '',
                cnpj_cpf: _dec2(cliente.cnpj_cpf || cliente.cnpj || cliente.cpf || ''),
                contato: cliente.contato || '',
                cidade: cliente.cidade || '',
                uf: cliente.uf || '',
                telefone: cliente.telefone || '',
                email: cliente.email || '',
                endereco: cliente.endereco || '',
                bairro: cliente.bairro || '',
                cep: cliente.cep || '',
                email_nfe: cliente.email_nfe || cliente.email || ''
            }));

            console.log(`✅ Encontrados ${clientesFormatados.length} clientes`);
            res.json({ success: true, data: clientesFormatados, total: clientesFormatados.length });

        } catch (error) {
            console.error('❌ Erro ao buscar clientes:', error.message || error, 'Code:', error.code || 'N/A', 'SQL:', error.sql || 'N/A');
            console.error('Stack:', error.stack || 'N/A');
            res.status(500).json({ error: 'Erro ao buscar clientes', message: error.message || String(error) });
        }
    });

    // API para criar novo cliente
    // SECURITY: Requer autenticação
    router.post('/api/clientes', authenticateToken, async (req, res) => {
        try {
            console.log('📋 Criando novo cliente...');
            const {
                nome, contato, cnpj, cpf, inscricao_estadual,
                telefone, celular, email, email_nfe,
                cep, endereco, numero, bairro, cidade, uf, ativo
            } = req.body;

            if (!nome) {
                return res.status(400).json({ error: 'Nome é obrigatório' });
            }

            const [result] = await pool.query(`
                INSERT INTO clientes (
                    nome, contato, cnpj, cpf, inscricao_estadual,
                    telefone, celular, email, email_nfe,
                    cep, endereco, logradouro, numero, bairro, cidade, uf, estado, ativo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                nome, contato || null, cnpj || null, cpf || null, inscricao_estadual || null,
                telefone || null, celular || null, email || null, email_nfe || null,
                cep || null, endereco || null, endereco || null, numero || null, bairro || null, cidade || null, uf || null, uf || null,
                ativo !== undefined ? (ativo ? 1 : 0) : 1
            ]);

            console.log(`✅ Cliente criado com ID: ${result.insertId}`);
            res.status(201).json({ id: result.insertId, message: 'Cliente criado com sucesso' });

        } catch (error) {
            console.error('❌ Erro ao criar cliente:', error);
            res.status(500).json({ error: 'Erro ao criar cliente' });
        }
    });

    // API para buscar cliente por ID
    // SECURITY: Requer autenticação
    router.get('/api/clientes/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const [rows] = await pool.query(
                `SELECT id, COALESCE(nome_fantasia, nome, razao_social) as nome_display,
                        razao_social, nome_fantasia, nome, contato,
                        cnpj, cpf, cnpj_cpf, inscricao_estadual,
                        telefone, email,
                        cep, endereco, bairro, cidade,
                        estado, ativo, data_cadastro, data_ultima_alteracao
                 FROM clientes WHERE id = ?`,
                [id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            const c = rows[0];
            res.json({
                id: c.id,
                nome: c.nome_display || '',
                razao_social: c.razao_social || c.nome || c.nome_fantasia || '',
                nome_fantasia: c.nome_fantasia || '',
                contato: c.contato || '',
                cnpj: c.cnpj || c.cnpj_cpf || '',
                cpf: c.cpf || '',
                inscricao_estadual: c.inscricao_estadual || '',
                telefone: c.telefone || '',
                celular: '',
                email: c.email || '',
                email_nfe: c.email || '',
                cep: c.cep || '',
                endereco: c.endereco || '',
                numero: '',
                bairro: c.bairro || '',
                cidade: c.cidade || '',
                uf: c.estado || '',
                ativo: c.ativo === 1 || c.ativo === true
            });
        } catch (error) {
            console.error('❌ Erro ao buscar cliente:', error);
            res.status(500).json({ error: 'Erro ao buscar cliente' });
        }
    });

    // API Resumo/Inteligência do Cliente
    // SECURITY: Requer autenticação
    router.get('/api/clientes/:id/resumo', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`📊 Buscando resumo do cliente ID: ${id}...`);

            // Buscar dados do cliente
            const [clienteRows] = await pool.query(
                `SELECT c.*, e.nome_fantasia as empresa_nome, e.id as emp_id
                 FROM clientes c LEFT JOIN empresas e ON c.empresa_id = e.id
                 WHERE c.id = ?`, [id]
            );
            const cliente = clienteRows[0];
            if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });

            const empresaId = cliente.empresa_id || cliente.emp_id || id;

            // Executar todas as queries em paralelo
            const [pedidosStats, pedidosRecentes, produtosMaisComprados, pedidosPorStatus, pedidosPorMes, financeiro] = await Promise.all([
                // 1. Estatísticas gerais de pedidos
                pool.query(`
                    SELECT
                        COUNT(*) as total_pedidos,
                        COALESCE(SUM(CASE WHEN status NOT IN ('cancelado') THEN valor ELSE 0 END), 0) as valor_total,
                        COALESCE(AVG(CASE WHEN status NOT IN ('cancelado') THEN valor ELSE NULL END), 0) as ticket_medio,
                        COALESCE(MAX(CASE WHEN status NOT IN ('cancelado') THEN valor ELSE NULL END), 0) as maior_pedido,
                        MIN(created_at) as primeiro_pedido,
                        MAX(created_at) as ultimo_pedido,
                        COUNT(CASE WHEN status IN ('faturado', 'recibo', 'entregue') THEN 1 END) as pedidos_concluidos,
                        COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as pedidos_cancelados,
                        COUNT(CASE WHEN status IN ('orcamento', 'analise', 'analise-credito') THEN 1 END) as pedidos_em_aberto,
                        COUNT(CASE WHEN status IN ('aprovado', 'pedido-aprovado', 'faturar') THEN 1 END) as pedidos_aprovados
                    FROM pedidos
                    WHERE empresa_id = ? OR cliente_id = ?
                `, [empresaId, id]),

                // 2. Últimos 10 pedidos
                pool.query(`
                    SELECT p.id, p.valor, p.status, p.created_at, p.produtos_preview, p.descricao
                    FROM pedidos p
                    WHERE p.empresa_id = ? OR p.cliente_id = ?
                    ORDER BY p.created_at DESC
                    LIMIT 10
                `, [empresaId, id]),

                // 3. Produtos mais comprados (extraídos do JSON produtos_preview)
                pool.query(`
                    SELECT p.produtos_preview
                    FROM pedidos p
                    WHERE (p.empresa_id = ? OR p.cliente_id = ?) AND p.status NOT IN ('cancelado') AND p.produtos_preview IS NOT NULL
                    ORDER BY p.created_at DESC
                    LIMIT 50
                `, [empresaId, id]),

                // 4. Pedidos por status
                pool.query(`
                    SELECT status, COUNT(*) as total, COALESCE(SUM(valor), 0) as valor_total
                    FROM pedidos
                    WHERE empresa_id = ? OR cliente_id = ?
                    GROUP BY status
                    ORDER BY total DESC
                `, [empresaId, id]),

                // 5. Pedidos por mês (últimos 12 meses)
                pool.query(`
                    SELECT
                        DATE_FORMAT(created_at, '%Y-%m') as mes,
                        COUNT(*) as total,
                        COALESCE(SUM(valor), 0) as valor_total
                    FROM pedidos
                    WHERE (empresa_id = ? OR cliente_id = ?) AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                    ORDER BY mes DESC
                `, [empresaId, id]),

                // 6. Financeiro - contas a receber
                pool.query(`
                    SELECT
                        COUNT(*) as total_titulos,
                        COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) as valor_pendente,
                        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) as valor_pago,
                        COALESCE(SUM(CASE WHEN status = 'vencido' OR (status = 'pendente' AND data_vencimento < NOW()) THEN valor ELSE 0 END), 0) as valor_vencido
                    FROM contas_receber
                    WHERE cliente_id = ? OR cliente_id = ?
                `, [id, empresaId])
            ]);

            // Processar produtos mais comprados
            const produtosMap = {};
            (produtosMaisComprados[0] || []).forEach(row => {
                try {
                    let produtos = row.produtos_preview;
                    if (typeof produtos === 'string') produtos = JSON.parse(produtos);
                    if (Array.isArray(produtos)) {
                        produtos.forEach(prod => {
                            const nome = prod.nome || prod.descricao || prod.produto || 'Produto sem nome';
                            if (!produtosMap[nome]) {
                                produtosMap[nome] = { nome, quantidade: 0, valor_total: 0 };
                            }
                            produtosMap[nome].quantidade += (prod.quantidade || prod.qtd || 1);
                            produtosMap[nome].valor_total += (prod.valor_total || prod.total || (prod.valor_unitario || prod.preco || 0) * (prod.quantidade || prod.qtd || 1));
                        });
                    }
                } catch(e) { /* ignore parse errors */ }
            });
            const topProdutos = Object.values(produtosMap)
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 10);

            // Calcular tempo como cliente
            const stats = pedidosStats[0][0] || {};
            let tempoCliente = null;
            const dataCadastro = cliente.data_cadastro || cliente.created_at || stats.primeiro_pedido;
            if (dataCadastro) {
                const inicio = new Date(dataCadastro);
                const agora = new Date();
                const diffMs = agora - inicio;
                const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const anos = Math.floor(diffDias / 365);
                const meses = Math.floor((diffDias % 365) / 30);
                const dias = diffDias % 30;
                tempoCliente = { anos, meses, dias, total_dias: diffDias, data_inicio: dataCadastro };
            }

            console.log(`✅ Resumo do cliente ${id}: ${stats.total_pedidos || 0} pedidos, ${topProdutos.length} produtos`);

            res.json({
                estatisticas: {
                    total_pedidos: stats.total_pedidos || 0,
                    valor_total: parseFloat(stats.valor_total) || 0,
                    ticket_medio: parseFloat(stats.ticket_medio) || 0,
                    maior_pedido: parseFloat(stats.maior_pedido) || 0,
                    primeiro_pedido: stats.primeiro_pedido,
                    ultimo_pedido: stats.ultimo_pedido,
                    pedidos_concluidos: stats.pedidos_concluidos || 0,
                    pedidos_cancelados: stats.pedidos_cancelados || 0,
                    pedidos_em_aberto: stats.pedidos_em_aberto || 0,
                    pedidos_aprovados: stats.pedidos_aprovados || 0
                },
                tempo_cliente: tempoCliente,
                pedidos_recentes: pedidosRecentes[0] || [],
                produtos_mais_comprados: topProdutos,
                pedidos_por_status: pedidosPorStatus[0] || [],
                pedidos_por_mes: pedidosPorMes[0] || [],
                financeiro: (financeiro[0] && financeiro[0][0]) || { total_titulos: 0, valor_pendente: 0, valor_pago: 0, valor_vencido: 0 }
            });
        } catch (error) {
            console.error('❌ Erro ao buscar resumo do cliente:', error);
            res.status(500).json({ error: 'Erro ao buscar resumo do cliente' });
        }
    });

    // API Histórico de Alterações do Cliente
    router.get('/api/clientes/:id/historico', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            // Tentar buscar de tabela de audit/log se existir, senão retornar dados básicos
            try {
                const [rows] = await pool.query(
                    `SELECT * FROM cliente_historico WHERE cliente_id = ? ORDER BY data_alteracao DESC LIMIT 50`, [id]
                );
                res.json({ historico: rows });
            } catch(e) {
                // Tabela não existe - retornar histórico baseado em data_ultima_alteracao do cliente
                const [cliente] = await pool.query(
                    `SELECT id, nome, data_ultima_alteracao, created_at FROM clientes WHERE id = ?`, [id]
                );
                const c = cliente[0];
                const historico = [];
                if (c) {
                    if (c.created_at) {
                        historico.push({ tipo: 'criacao', descricao: 'Cliente cadastrado no sistema', data_alteracao: c.created_at, usuario: 'Sistema' });
                    }
                    if (c.data_ultima_alteracao && c.data_ultima_alteracao !== c.created_at) {
                        historico.push({ tipo: 'atualizacao', descricao: 'Dados do cliente atualizados', data_alteracao: c.data_ultima_alteracao, usuario: 'Sistema' });
                    }
                }
                res.json({ historico });
            }
        } catch (error) {
            console.error('❌ Erro ao buscar histórico:', error);
            res.status(500).json({ error: 'Erro ao buscar histórico do cliente' });
        }
    });

    // API para atualizar cliente existente
    // SECURITY: Requer autenticação
    router.put('/api/clientes/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`📋 Atualizando cliente ID: ${id}...`);

            const {
                nome, nome_fantasia, contato, cnpj, cpf, inscricao_estadual,
                telefone, celular, email, email_nfe, website,
                cep, endereco, numero, complemento, bairro, cidade, uf, ativo
            } = req.body;

            if (!nome) {
                return res.status(400).json({ error: 'Nome é obrigatório' });
            }

            const [result] = await pool.query(`
                UPDATE clientes SET
                    nome = ?, nome_fantasia = ?, contato = ?, cnpj = ?, cpf = ?, inscricao_estadual = ?,
                    telefone = ?, celular = ?, email = ?, email_nfe = ?, website = ?,
                    cep = ?, endereco = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, uf = ?, estado = ?, ativo = ?,
                    data_ultima_alteracao = NOW()
                WHERE id = ?
            `, [
                nome, nome_fantasia || null, contato || null, cnpj || null, cpf || null, inscricao_estadual || null,
                telefone || null, celular || null, email || null, email_nfe || null, website || null,
                cep || null, endereco || null, endereco || null, numero || null, complemento || null, bairro || null, cidade || null, uf || null, uf || null,
                ativo !== undefined ? (ativo ? 1 : 0) : 1,
                id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            console.log(`✅ Cliente ${id} atualizado com sucesso`);
            res.json({ message: 'Cliente atualizado com sucesso' });

        } catch (error) {
            console.error('❌ Erro ao atualizar cliente:', error);
            res.status(500).json({ error: 'Erro ao atualizar cliente' });
        }
    });


};
