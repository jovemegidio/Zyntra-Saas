/**
 * NF-e ROUTES  Extracted from server.js (Lines 2262-2553)
 * Calculation, emission, cancellation, correction letters, reports
 * @module routes/nfe-routes
 */
const express = require('express');

module.exports = function createNfeRoutes(deps) {
    const { pool, authenticateToken, authorizeArea, authorizeAdmin } = deps;
    const router = express.Router();
    router.use(authenticateToken);
    router.use(authorizeArea('nfe'));

    // Sprint 3 (Gap-3 fix): Usar serviço centralizado de faturamento para contas_receber
    const { getFaturamentoSharedService } = require('../services/faturamento-shared.service');
    const faturamentoShared = getFaturamentoSharedService(pool);
    // ===================== ROTAS SERVIÇOS/NF-e PROFISSIONAL =====================
    
    // 1. Cálculo Automático de Impostos (ISS, PIS, COFINS, CSLL, IRRF)
    router.post('/calcular-impostos', async (req, res, next) => {
        const { valor, municipio } = req.body;
        let impostos = {
            ISS: municipio === 'SP' ? valor * 0.05 : valor * 0.03,
            PIS: valor * 0.0065,
            COFINS: valor * 0.03,
            CSLL: valor * 0.01,
            IRRF: valor * 0.015
        };
        res.json({ impostos });
    });
    
    // 2. Sugestão de Preenchimento com Base no Histórico
    router.get('/sugestao/:cliente_id', async (req, res, next) => {
        const { cliente_id } = req.params;
        const [rows] = await pool.query('SELECT descricao_servico, valor FROM nfe WHERE cliente_id = ? ORDER BY data_emissao DESC LIMIT 1', [cliente_id]);
        if (rows.length) {
            res.json({ sugestao: rows[0] });
        } else {
            res.json({ sugestao: null });
        }
    });
    
    // 3. Validação de Dados em Tempo Real (simulação de API pública)
    router.post('/validar-cliente', async (req, res, next) => {
        const { cnpj, cpf, inscricao_municipal } = req.body;
        // Em produção, integrar com APIs públicas
        const valido = (cnpj || cpf) && inscricao_municipal;
        res.json({ valido, mensagem: valido ? 'Dados válidos.' : 'Dados inválidos.' });
    });
    
    // 4. Emissão de NF-e (com integração ao Financeiro e Estoque)
    router.post('/emitir', authenticateToken, async (req, res, next) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
    
            const { cliente_id, servico_id, descricao_servico, valor, impostos, vencimento, pedido_id, itens } = req.body;
    
            // Validar cliente
            const [cliente] = await connection.query('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
            if (cliente.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
    
            // Emitir NF-e
            const [nfeResult] = await connection.query(
                'INSERT INTO nfe (cliente_id, servico_id, descricao_servico, valor, impostos, status, data_emissao) VALUES (?, ?, ?, ?, ?, "autorizada", NOW())',
                [cliente_id, servico_id, descricao_servico, valor, JSON.stringify(impostos)]
            );
            const nfeId = nfeResult.insertId;
    
            // Integração Financeiro: cria conta a receber via serviço centralizado (Sprint 3 Gap-3)
            const contaCriada = await faturamentoShared.gerarContaReceber(connection, {
                pedido_id: pedido_id || null,
                nfe_id: nfeId,                  // FISC-001: rastrear NF-e para cancelamento
                cliente_id,
                descricao: descricao_servico,
                valor,
                tipo: 'nfe',
                pedido: null
            });

            // FISC-001: Se o serviço não persistiu nfe_id, atualizar via UPDATE direto
            if (contaCriada && contaCriada.id) {
                await connection.query(
                    'UPDATE contas_receber SET nfe_id = ? WHERE id = ? AND nfe_id IS NULL',
                    [nfeId, contaCriada.id]
                );
            } else {
                // Fallback: setar nfe_id em entradas recentes desta sessão (max 1 registro)
                await connection.query(
                    'UPDATE contas_receber SET nfe_id = ? WHERE pedido_id = ? AND nfe_id IS NULL ORDER BY id DESC LIMIT 1',
                    [nfeId, pedido_id || null]
                );
            }
    
            // Se há pedido vinculado, atualizar status + trigger logística (LA-001/WF-001)
            if (pedido_id) {
                await connection.query(
                    `UPDATE pedidos
                     SET status = "faturado", nfe_id = ?, data_faturamento = NOW(),
                         status_logistica = CASE
                             WHEN (status_logistica IS NULL OR status_logistica = '') THEN 'aguardando'
                             ELSE status_logistica
                         END
                     WHERE id = ?`,
                    [nfeId, pedido_id]
                );
            }
    
            // AUDIT-FIX S1.2: Integração Estoque com FOR UPDATE (previne race condition / oversell)
            if (itens && Array.isArray(itens) && itens.length > 0) {
                for (const item of itens) {
                    if (item.material_id && item.quantidade > 0) {
                        // FOR UPDATE: lock exclusivo na linha para evitar oversell por concorrência
                        const [material] = await connection.query(
                            'SELECT id, nome, quantidade_estoque FROM materiais WHERE id = ? FOR UPDATE',
                            [item.material_id]
                        );
    
                        if (material.length > 0) {
                            const estoqueAtual = material[0].quantidade_estoque || 0;
                            if (estoqueAtual < item.quantidade) {
                                await connection.rollback();
                                return res.status(400).json({
                                    error: `Estoque insuficiente para ${material[0].nome}. Disponível: ${estoqueAtual}, Solicitado: ${item.quantidade}`
                                });
                            }

                            // Decrementar estoque (materiais)
                            await connection.query(
                                'UPDATE materiais SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?',
                                [item.quantidade, item.material_id]
                            );

                            // Sync estoque unificado (produtos.estoque_atual + tabela estoque)
                            try {
                                if (item.produto_id) {
                                    await connection.query('UPDATE produtos SET estoque_atual = GREATEST(0, estoque_atual - ?) WHERE id = ?', [item.quantidade, item.produto_id]);
                                    await connection.query('UPDATE estoque SET quantidade_disponivel = GREATEST(0, quantidade_disponivel - ?) WHERE produto_id = ?', [item.quantidade, item.produto_id]);
                                }
                            } catch (syncErr) {
                                console.warn(`[NFE] Sync estoque secundário falhou para material ${item.material_id}:`, syncErr.message);
                            }

                            // Registrar movimentação de estoque
                            await connection.query(`
                                INSERT INTO estoque_movimentacoes
                                (material_id, tipo, quantidade, referencia_tipo, referencia_id, observacao, data_movimentacao)
                                VALUES (?, 'saida', ?, 'nfe', ?, 'Saída via faturamento NF-e', NOW())
                            `, [item.material_id, item.quantidade, nfeId]);
                        }
                    }
                }
            }
    
            await connection.commit();
    
            console.log(`✅ NF-e #${nfeId} emitida por usuário ${req.user?.id}`);
            res.json({
                message: 'NF-e emitida e integrada ao Financeiro e Estoque.',
                nfe_id: nfeId
            });
        } catch (error) {
            await connection.rollback();
            next(error);
        } finally {
            connection.release();
        }
    });
    
    // 5. Envio Automático por E-mail (simulação)
    router.post('/enviar-email', async (req, res, next) => {
        // Recebe dados da NF-e e cliente
        res.json({ message: 'E-mail enviado ao cliente com PDF/XML (simulação).' });
    });
    
    // 6. Cancelamento e Carta de Correção
    router.post('/cancelar/:nfe_id', authenticateToken, authorizeAdmin, async (req, res, next) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
    
            const { nfe_id } = req.params;
            const { motivo } = req.body;
    
            if (!motivo || motivo.length < 15) {
                await connection.rollback();
                return res.status(400).json({ error: 'Motivo de cancelamento deve ter no mínimo 15 caracteres' });
            }
    
            // Verificar se NF-e existe e pode ser cancelada
            const [nfe] = await connection.query('SELECT id, status, valor, data_emissao, data_autorizacao FROM nfe WHERE id = ?', [nfe_id]);
            if (nfe.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'NF-e não encontrada' });
            }
            if (nfe[0].status === 'cancelada') {
                await connection.rollback();
                return res.status(400).json({ error: 'NF-e já está cancelada' });
            }

            // FISC-010: Prazo máximo de cancelamento = 24h após autorização (norma SEFAZ NF-e)
            const dataRef = nfe[0].data_autorizacao || nfe[0].data_emissao;
            if (dataRef) {
                const horasDecorridas = (Date.now() - new Date(dataRef).getTime()) / 3600000;
                if (horasDecorridas > 24) {
                    await connection.rollback();
                    return res.status(400).json({
                        error: `Cancelamento fora do prazo. A NF-e foi autorizada há ${Math.floor(horasDecorridas)}h — o prazo máximo é 24h conforme legislação SEFAZ.`,
                        code: 'PRAZO_CANCELAMENTO_EXPIRADO',
                        horas_decorridas: Math.floor(horasDecorridas)
                    });
                }
            }
    
            // Cancelar NF-e
            await connection.query('UPDATE nfe SET status = "cancelada", motivo_cancelamento = ?, data_cancelamento = NOW() WHERE id = ?', [motivo, nfe_id]);
    
            // Reverter conta a receber (marcar como cancelada)
            await connection.query('UPDATE contas_receber SET status = "cancelada", observacao = ? WHERE nfe_id = ?', [`Cancelamento NF-e: ${motivo}`, nfe_id]);
    
            // AUDIT-FIX S1.3: Reverter estoque com idempotência (verifica se já foi estornado)
            const [jaEstornada] = await connection.query(
                'SELECT COUNT(*) as cnt FROM estoque_movimentacoes WHERE referencia_tipo = "nfe_cancelamento" AND referencia_id = ?',
                [nfe_id]
            );
            if (jaEstornada[0].cnt > 0) {
                // Já foi estornado anteriormente — pular para evitar duplicação
                console.warn(`⚠️ NF-e #${nfe_id}: estorno de estoque já realizado, pulando.`);
            } else {
                const [movimentacoes] = await connection.query(
                    'SELECT material_id, quantidade FROM estoque_movimentacoes WHERE referencia_tipo = "nfe" AND referencia_id = ? AND tipo = "saida"',
                    [nfe_id]
                );

                for (const mov of movimentacoes) {
                    // FOR UPDATE implícito: UPDATE atômico (quantidade_estoque + ?)
                    await connection.query('UPDATE materiais SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?', [mov.quantidade, mov.material_id]);

                    // Sync estoque unificado de volta
                    try {
                        await connection.query('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = (SELECT produto_id FROM materiais WHERE id = ? LIMIT 1)', [mov.quantidade, mov.material_id]);
                        await connection.query('UPDATE estoque SET quantidade_disponivel = quantidade_disponivel + ? WHERE produto_id = (SELECT produto_id FROM materiais WHERE id = ? LIMIT 1)', [mov.quantidade, mov.material_id]);
                    } catch (syncErr) {
                        console.warn(`[NFE-CANCEL] Sync estoque secundário falhou para material ${mov.material_id}:`, syncErr.message);
                    }

                    // Registrar movimentação de estorno
                    await connection.query(`
                        INSERT INTO estoque_movimentacoes
                        (material_id, tipo, quantidade, referencia_tipo, referencia_id, observacao, data_movimentacao)
                        VALUES (?, 'entrada', ?, 'nfe_cancelamento', ?, 'Estorno por cancelamento de NF-e', NOW())
                    `, [mov.material_id, mov.quantidade, nfe_id]);
                }
            }
    
            // Atualizar pedido vinculado (volta a 'aprovado' para poder ser re-faturado)
            await connection.query('UPDATE pedidos SET status = "aprovado", nfe_id = NULL WHERE nfe_id = ?', [nfe_id]);
    
            await connection.commit();
    
            console.log(`🚫 NF-e #${nfe_id} cancelada por usuário ${req.user?.id}. Motivo: ${motivo}`);
            res.json({ message: 'NF-e cancelada. Estoque e financeiro revertidos.' });
        } catch (error) {
            await connection.rollback();
            next(error);
        } finally {
            connection.release();
        }
    });
    
    // AUDITORIA ENTERPRISE: Carta de Correção com RBAC e validações fiscais
    router.post('/carta-correcao/:nfe_id', authenticateToken, async (req, res, next) => {
        try {
            const { nfe_id } = req.params;
            const { correcao } = req.body;
    
            // VALIDAÇÃO FISCAL: CC-e deve ter mínimo 15 e máximo 1000 caracteres (SEFAZ)
            if (!correcao || correcao.trim().length < 15) {
                return res.status(400).json({
                    error: 'Correção deve ter no mínimo 15 caracteres conforme norma SEFAZ'
                });
            }
            if (correcao.length > 1000) {
                return res.status(400).json({
                    error: 'Correção excede o limite de 1000 caracteres permitidos pela SEFAZ'
                });
            }
    
            // Verificar se NF-e existe e está autorizada
            const [nfe] = await pool.query('SELECT id, status, numero_nfe FROM nfe WHERE id = ?', [nfe_id]);
            if (nfe.length === 0) {
                return res.status(404).json({ error: 'NF-e não encontrada' });
            }
            if (nfe[0].status !== 'autorizada') {
                return res.status(400).json({
                    error: 'Carta de Correção só pode ser emitida para NF-e autorizada',
                    status_atual: nfe[0].status
                });
            }
    
            // Registrar CC-e com auditoria
            await pool.query(
                `UPDATE nfe SET
                    carta_correcao = ?,
                    carta_correcao_data = NOW(),
                    carta_correcao_usuario = ?
                WHERE id = ?`,
                [correcao, req.user.id, nfe_id]
            );
    
            console.log(`📝 CC-e registrada para NF-e #${nfe[0].numero_nfe} por usuário ${req.user.id}`);
            res.json({
                success: true,
                message: 'Carta de Correção registrada com sucesso.',
                nfe_id,
                usuario_id: req.user.id
            });
        } catch (error) {
            console.error('[NFE] Erro ao registrar CC-e:', error);
            next(error);
        }
    });
    
    // 7. Relatórios Gerenciais
    router.get('/relatorios/faturamento', async (req, res, next) => {
        const { inicio, fim, cliente_id, servico_id } = req.query;
        let where = 'data_emissao >= ? AND data_emissao <= ?';
        let params = [inicio, fim];
        if (cliente_id) { where += ' AND cliente_id = ?'; params.push(cliente_id); }
        if (servico_id) { where += ' AND servico_id = ?'; params.push(servico_id); }
        const [rows] = await pool.query(`SELECT cliente_id, servico_id, SUM(valor) AS total FROM nfe WHERE ${where} GROUP BY cliente_id, servico_id`, params);
        res.json(rows);
    });
    
    // 8. Dashboard de Status das NF-e
    router.get('/dashboard', async (req, res, next) => {
        try {
            // FISC-002: 'emitida' é um status interno coloquial — inclui no grupo 'autorizadas'
            // pois uma NF-e "emitida" sem protocolo deve ser tratada como pendente de autorização
            const [autorizadas] = await pool.query('SELECT COUNT(*) AS qtd, COALESCE(SUM(valor),0) AS total FROM nfe WHERE status IN ("autorizada","emitida") AND MONTH(data_emissao) = MONTH(CURRENT_DATE()) AND YEAR(data_emissao) = YEAR(CURRENT_DATE())');
            const [canceladas] = await pool.query('SELECT COUNT(*) AS qtd, COALESCE(SUM(valor),0) AS total FROM nfe WHERE status = "cancelada" AND MONTH(data_emissao) = MONTH(CURRENT_DATE()) AND YEAR(data_emissao) = YEAR(CURRENT_DATE())');
            const [pendentes] = await pool.query('SELECT COUNT(*) AS qtd, COALESCE(SUM(valor),0) AS total FROM nfe WHERE status IN ("pendente", "rejeitada") AND MONTH(data_emissao) = MONTH(CURRENT_DATE()) AND YEAR(data_emissao) = YEAR(CURRENT_DATE())');
            const qtdAutorizadas = Number(autorizadas[0]?.qtd) || 0;
            const qtdCanceladas = Number(canceladas[0]?.qtd) || 0;
            const qtdPendentes = Number(pendentes[0]?.qtd) || 0;
            const valorAutorizadas = Number(autorizadas[0]?.total) || 0;
            res.json({
                emitidas: qtdAutorizadas + qtdCanceladas + qtdPendentes,
                autorizadas: qtdAutorizadas,
                canceladas: qtdCanceladas,
                pendentes: qtdPendentes,
                valor: valorAutorizadas
            });
        } catch (error) {
            console.error('[NFe] Erro dashboard:', error);
            res.json({ emitidas: 0, autorizadas: 0, canceladas: 0, pendentes: 0, valor: 0 });
        }
    });
    
    // 9. Livro de Registro de Serviços Prestados
    router.get('/livro-registro', async (req, res, next) => {
        const { inicio, fim } = req.query;
        const [rows] = await pool.query('SELECT id, numero, serie, chave_acesso, data_emissao, valor, status, destinatario_nome, destinatario_cnpj, natureza_operacao, cfop FROM nfe WHERE data_emissao >= ? AND data_emissao <= ? ORDER BY data_emissao DESC LIMIT 500', [inicio, fim]);
        res.json(rows);
    });
    
    // Integração com o Painel da Contabilidade (download XMLs em lote)
    router.get('/contabilidade/xmls', async (req, res, next) => {
        const { inicio, fim } = req.query;
        const [rows] = await pool.query('SELECT xml_arquivo FROM nfe WHERE data_emissao >= ? AND data_emissao <= ?', [inicio, fim]);
        res.json(rows);
    });
    
    // Armazenamento e Gestão de XMLs
    router.get('/xml/:nfe_id', async (req, res, next) => {
        const { nfe_id } = req.params;
        const [[nfe]] = await pool.query('SELECT xml_arquivo FROM nfe WHERE id = ?', [nfe_id]);
        if (!nfe) return res.status(404).json({ message: 'NF-e não encontrada.' });
    
        res.json({ xml: nfe.xml_arquivo });
    });

    // 13. Atividades Recentes — GET /api/nfe/atividades?limite=5
    router.get('/atividades', async (req, res, next) => {
        try {
            const limite = parseInt(req.query.limite) || 10;
            const atividades = [];

            // Buscar NF-es recentes (emissões e autorizações)
            try {
                const [emissoes] = await pool.query(
                    `SELECT id, numero_nfe as numero, status, data_emissao as data,
                        CASE status
                            WHEN 'autorizada' THEN 'autorizacao'
                            WHEN 'cancelada' THEN 'cancelamento'
                            WHEN 'rejeitada' THEN 'rejeicao'
                            ELSE 'emissao'
                        END as tipo,
                        CASE status
                            WHEN 'autorizada' THEN CONCAT('NF-e #', COALESCE(numero_nfe, id), ' autorizada')
                            WHEN 'cancelada' THEN CONCAT('NF-e #', COALESCE(numero_nfe, id), ' cancelada')
                            WHEN 'rejeitada' THEN CONCAT('NF-e #', COALESCE(numero_nfe, id), ' rejeitada')
                            ELSE CONCAT('NF-e #', COALESCE(numero_nfe, id), ' emitida')
                        END as descricao
                    FROM nfe
                    ORDER BY COALESCE(data_emissao, data_cancelamento) DESC
                    LIMIT ?`,
                    [limite]
                );
                atividades.push(...emissoes);
            } catch (dbErr) {
                console.log('[NFe] Tabela nfe não disponível:', dbErr.message);
            }

            // Ordenar por data mais recente
            atividades.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

            res.json({
                success: true,
                atividades: atividades.slice(0, limite)
            });
        } catch (error) {
            console.error('[NFe] Erro ao buscar atividades:', error);
            res.json({ success: true, atividades: [] });
        }
    });
    
    return router;
};
