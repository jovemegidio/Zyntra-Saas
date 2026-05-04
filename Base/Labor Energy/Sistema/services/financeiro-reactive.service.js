/**
 * SERVIÇO DE INTEGRAÇÃO REATIVA — FATURAMENTO/LOGÍSTICA → FINANCEIRO
 * ==================================================================
 * Toda mudança de status, valor ou cancelamento oriunda de Faturamento
 * ou Logística gera um UPDATE imediato e atômico (ACID) nos registros
 * correspondentes em CR/CP.
 *
 * Listeners:
 *  - onNFeEmitida        → Gera CR principal + parcelas
 *  - onNFeCancelada      → Cancela CR + parcelas + boletos
 *  - onNFeValorAlterado  → Recalcula CR + parcelas
 *  - onPedidoEntregue    → Marca CR como confirmado (sem impacto financeiro)
 *  - onPedidoDevolvido   → Estorna CR
 *  - onCompraAprovada    → Gera CP + parcelas
 *  - onCompraCancel      → Cancela CP
 */

class FinanceiroReactiveService {

    constructor(pool) {
        this.pool = pool;
    }

    // ================================================================
    // FATURAMENTO → FINANCEIRO (CONTAS A RECEBER)
    // ================================================================

    /**
     * Quando uma NFe é emitida com sucesso: gera CR + parcelas
     * @param {number} nfe_id
     * @param {object} dadosPagamento { numeroParcelas, intervalo, diaVencimento }
     * @param {string} usuario_email — para auditoria
     */
    async onNFeEmitida(nfe_id, dadosPagamento = {}, usuario_email = 'sistema') {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            const [nfe] = await connection.query(
                `SELECT n.*, c.id AS cliente_id, c.nome AS cliente_nome,
                        c.nome_fantasia AS cliente_fantasia
                 FROM nfe n
                 LEFT JOIN clientes c ON n.cliente_id = c.id
                 WHERE n.id = ?`, [nfe_id]
            );
            if (!nfe.length) throw new Error(`NFe ${nfe_id} não encontrada`);

            const nfeData = nfe[0];
            const valorTotal = parseFloat(nfeData.valor_total) || 0;
            if (valorTotal <= 0) throw new Error(`NFe ${nfe_id}: valor total inválido`);

            // S5.1 FIX: Idempotency guard — evita contas_receber duplicadas para mesma NFe
            const [existing] = await connection.query(
                'SELECT id FROM contas_receber WHERE nfe_id = ? AND origem_integracao = ?',
                [nfe_id, 'faturamento']
            );
            if (existing.length) {
                await connection.rollback();
                console.warn(`[INTEGRAÇÃO] NFe ${nfe_id} já possui CR #${existing[0].id} — idempotência aplicada`);
                return { success: true, conta_receber_id: existing[0].id, parcelas: 0, idempotent: true };
            }

            const parcelas = this._calcularParcelas(valorTotal, dadosPagamento, nfeData.data_emissao);

            const [cr] = await connection.query(
                `INSERT INTO contas_receber (
                    cliente_id, nfe_id, descricao, valor, valor_original, valor_saldo,
                    data_emissao, data_vencimento, vencimento, status, origem_integracao, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'a_vencer', 'faturamento', NOW())`,
                [
                    nfeData.cliente_id, nfe_id,
                    `NF-e ${nfeData.numero_nfe || nfeData.numero} - ${nfeData.cliente_fantasia || nfeData.cliente_nome}`,
                    valorTotal, valorTotal, valorTotal,
                    nfeData.data_emissao,
                    parcelas[0].vencimento,
                    parcelas[0].vencimento
                ]
            );
            const cr_id = cr.insertId;

            for (const p of parcelas) {
                await connection.query(
                    `INSERT INTO contas_receber_parcelas (
                        conta_receber_id, numero_parcela, valor, data_vencimento, status, created_at
                    ) VALUES (?, ?, ?, ?, 'a_vencer', NOW())`,
                    [cr_id, p.numero, p.valor, p.vencimento]
                );
            }

            await connection.query(
                `UPDATE nfe SET conta_receber_id = ? WHERE id = ?`,
                [cr_id, nfe_id]
            );

            // Auditoria
            await this._logIntegracao(connection, 'nfe_emitida', 'contas_receber', cr_id, {
                nfe_id, valor: valorTotal, parcelas: parcelas.length
            }, usuario_email);

            await connection.commit();
            console.log(`[INTEGRAÇÃO] NFe ${nfe_id} → CR #${cr_id} (${parcelas.length} parcelas, R$ ${valorTotal})`);
            return { success: true, conta_receber_id: cr_id, parcelas: parcelas.length };
        } catch (error) {
            await connection.rollback();
            console.error('[INTEGRAÇÃO] Erro onNFeEmitida:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Quando uma NFe é cancelada: cancela CR + parcelas + boletos atomicamente
     */
    async onNFeCancelada(nfe_id, motivo = '', usuario_email = 'sistema') {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            const [contas] = await connection.query(
                `SELECT id FROM contas_receber WHERE nfe_id = ? AND status != 'cancelada'`,
                [nfe_id]
            );

            for (const conta of contas) {
                // Cancelar parcelas abertas
                await connection.query(
                    `UPDATE contas_receber_parcelas SET status = 'cancelada'
                     WHERE conta_receber_id = ? AND status NOT IN ('pago', 'liquidada')`,
                    [conta.id]
                );

                // Cancelar boletos emitidos
                await connection.query(
                    `UPDATE financeiro_boletos b
                     INNER JOIN contas_receber_parcelas p ON b.parcela_id = p.id
                     SET b.status = 'cancelado'
                     WHERE p.conta_receber_id = ? AND b.status = 'emitido'`,
                    [conta.id]
                );

                // Cancelar conta
                await connection.query(
                    `UPDATE contas_receber
                     SET status = 'cancelada', valor_saldo = 0,
                         observacoes = CONCAT(COALESCE(observacoes, ''), '\n[CANCELAMENTO] ', ?, ' - NFe cancelada por: ', ?)
                     WHERE id = ?`,
                    [new Date().toISOString(), motivo || usuario_email, conta.id]
                );

                await this._logIntegracao(connection, 'nfe_cancelada', 'contas_receber', conta.id, {
                    nfe_id, motivo
                }, usuario_email);
            }

            await connection.commit();
            console.log(`[INTEGRAÇÃO] NFe ${nfe_id} cancelada → ${contas.length} CR(s) cancelada(s)`);
            return { success: true, contas_canceladas: contas.length };
        } catch (error) {
            await connection.rollback();
            console.error('[INTEGRAÇÃO] Erro onNFeCancelada:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Quando o valor de uma NFe é alterado: recalcula CR e parcelas
     */
    async onNFeValorAlterado(nfe_id, novoValor, usuario_email = 'sistema') {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            const valorNovo = parseFloat(novoValor);
            if (isNaN(valorNovo) || valorNovo <= 0) throw new Error('Valor inválido');

            const [contas] = await connection.query(
                `SELECT id, valor FROM contas_receber WHERE nfe_id = ? AND status NOT IN ('cancelada', 'liquidada')`,
                [nfe_id]
            );

            for (const conta of contas) {
                const valorAntigo = parseFloat(conta.valor);
                const fator = valorNovo / valorAntigo;

                // Atualizar valor da conta
                await connection.query(
                    `UPDATE contas_receber SET valor = ?, valor_original = ?, valor_saldo = ? WHERE id = ?`,
                    [valorNovo, valorNovo, valorNovo, conta.id]
                );

                // Recalcular parcelas abertas proporcionalmente
                const [parcelas] = await connection.query(
                    `SELECT id, valor FROM contas_receber_parcelas
                     WHERE conta_receber_id = ? AND status NOT IN ('pago', 'liquidada', 'cancelada')`,
                    [conta.id]
                );

                for (const parcela of parcelas) {
                    const novoValorParcela = Math.round(parseFloat(parcela.valor) * fator * 100) / 100;
                    await connection.query(
                        `UPDATE contas_receber_parcelas SET valor = ? WHERE id = ?`,
                        [novoValorParcela, parcela.id]
                    );
                }

                await this._logIntegracao(connection, 'nfe_valor_alterado', 'contas_receber', conta.id, {
                    nfe_id, valor_antigo: valorAntigo, valor_novo: valorNovo
                }, usuario_email);
            }

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ================================================================
    // LOGÍSTICA → FINANCEIRO
    // ================================================================

    /**
     * Quando um pedido é marcado como entregue na logística
     * Confirma o CR associado (status financeiro não muda, mas registra entrega)
     */
    async onPedidoEntregue(pedido_id, usuario_email = 'sistema') {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            // Buscar CRs associados ao pedido (via pedido_id ou via nfe do pedido)
            const [contas] = await connection.query(
                `SELECT cr.id FROM contas_receber cr
                 LEFT JOIN nfe n ON cr.nfe_id = n.id
                 WHERE cr.pedido_id = ? OR n.pedido_id = ?`,
                [pedido_id, pedido_id]
            );

            for (const conta of contas) {
                await connection.query(
                    `UPDATE contas_receber
                     SET observacoes = CONCAT(COALESCE(observacoes, ''), '\n[LOGÍSTICA] Entrega confirmada em ', NOW())
                     WHERE id = ?`,
                    [conta.id]
                );
            }

            await this._logIntegracao(connection, 'pedido_entregue', 'contas_receber', null, {
                pedido_id, contas_atualizadas: contas.length
            }, usuario_email);

            await connection.commit();
            return { success: true, contas_atualizadas: contas.length };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Quando um pedido é devolvido: estorna CRs associados
     */
    async onPedidoDevolvido(pedido_id, motivo = '', usuario_email = 'sistema') {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            const [contas] = await connection.query(
                `SELECT cr.id FROM contas_receber cr
                 LEFT JOIN nfe n ON cr.nfe_id = n.id
                 WHERE (cr.pedido_id = ? OR n.pedido_id = ?)
                   AND cr.status NOT IN ('cancelada', 'liquidada')`,
                [pedido_id, pedido_id]
            );

            for (const conta of contas) {
                await connection.query(
                    `UPDATE contas_receber_parcelas SET status = 'cancelada'
                     WHERE conta_receber_id = ? AND status NOT IN ('pago', 'liquidada')`,
                    [conta.id]
                );

                await connection.query(
                    `UPDATE contas_receber
                     SET status = 'cancelada', valor_saldo = 0,
                         observacoes = CONCAT(COALESCE(observacoes, ''), '\n[DEVOLUÇÃO] ', ?, ' - Motivo: ', ?)
                     WHERE id = ?`,
                    [new Date().toISOString(), motivo || 'Devolução logística', conta.id]
                );
            }

            await this._logIntegracao(connection, 'pedido_devolvido', 'contas_receber', null, {
                pedido_id, motivo, contas_estornadas: contas.length
            }, usuario_email);

            await connection.commit();
            return { success: true, contas_estornadas: contas.length };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ================================================================
    // COMPRAS → FINANCEIRO (CONTAS A PAGAR)
    // ================================================================

    /**
     * Quando uma ordem de compra é aprovada: gera CP + parcelas
     */
    async onCompraAprovada(ordem_compra_id, dadosPagamento = {}, usuario_email = 'sistema') {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            const [ordens] = await connection.query(
                `SELECT oc.*, f.razao_social AS fornecedor_nome
                 FROM ordens_compra oc
                 LEFT JOIN fornecedores f ON oc.fornecedor_id = f.id
                 WHERE oc.id = ?`, [ordem_compra_id]
            );
            if (!ordens.length) throw new Error(`OC ${ordem_compra_id} não encontrada`);

            const ordem = ordens[0];
            const valorTotal = parseFloat(ordem.valor_total) || 0;
            const parcelas = this._calcularParcelas(valorTotal, dadosPagamento);

            for (const p of parcelas) {
                await connection.query(
                    `INSERT INTO contas_pagar (
                        ordem_compra_id, fornecedor_id, descricao, valor,
                        data_vencimento, parcela_numero, total_parcelas,
                        status, origem_integracao, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'a_vencer', 'compras', NOW())`,
                    [
                        ordem_compra_id, ordem.fornecedor_id,
                        `OC #${ordem.numero || ordem_compra_id} - ${ordem.fornecedor_nome || 'Fornecedor'} (${p.numero}/${parcelas.length})`,
                        p.valor, p.vencimento, p.numero, parcelas.length
                    ]
                );
            }

            await connection.query(
                `UPDATE ordens_compra SET financeiro_gerado = 1 WHERE id = ?`,
                [ordem_compra_id]
            ).catch(() => { /* coluna pode não existir */ });

            await this._logIntegracao(connection, 'compra_aprovada', 'contas_pagar', null, {
                ordem_compra_id, valor: valorTotal, parcelas: parcelas.length
            }, usuario_email);

            await connection.commit();
            return { success: true, parcelas: parcelas.length };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Quando uma ordem de compra é cancelada: cancela CPs associadas
     */
    async onCompraCancelada(ordem_compra_id, motivo = '', usuario_email = 'sistema') {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `UPDATE contas_pagar
                 SET status = 'cancelada',
                     observacoes = CONCAT(COALESCE(observacoes, ''), '\n[CANCELAMENTO] OC cancelada - ', ?)
                 WHERE ordem_compra_id = ? AND status NOT IN ('pago', 'cancelada')`,
                [motivo || usuario_email, ordem_compra_id]
            );

            await this._logIntegracao(connection, 'compra_cancelada', 'contas_pagar', null, {
                ordem_compra_id, motivo, registros_cancelados: result.affectedRows
            }, usuario_email);

            await connection.commit();
            return { success: true, canceladas: result.affectedRows };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ================================================================
    // HELPERS INTERNOS
    // ================================================================

    _calcularParcelas(valorTotal, dados = {}, dataEmissao = null) {
        const { numeroParcelas = 1, intervalo = 30, diaVencimento = 30 } = dados;
        const parcelas = [];
        const valorBase = Math.floor((valorTotal * 100) / numeroParcelas);
        const dataBase = dataEmissao ? new Date(dataEmissao) : new Date();

        for (let i = 0; i < numeroParcelas; i++) {
            const dtVenc = new Date(dataBase);
            dtVenc.setDate(dtVenc.getDate() + diaVencimento + (i * intervalo));
            const centavos = (i === numeroParcelas - 1)
                ? (valorTotal * 100) - valorBase * (numeroParcelas - 1)
                : valorBase;

            parcelas.push({
                numero: i + 1,
                valor: Math.round(centavos) / 100,
                vencimento: dtVenc.toISOString().split('T')[0]
            });
        }
        return parcelas;
    }

    async _logIntegracao(connection, acao, tabela, registro_id, dados, usuario_email) {
        try {
            await connection.query(
                `INSERT INTO auditoria_logs (usuario_id, acao, modulo, dados_novo, created_at)
                 VALUES (?, ?, 'financeiro_integracao', ?, NOW())`,
                [
                    usuario_email,
                    `${acao}:${tabela}:${registro_id || 'N/A'}`,
                    JSON.stringify(dados)
                ]
            );
        } catch (err) {
            console.warn('[INTEGRAÇÃO] Falha ao gravar auditoria:', err.message);
        }
    }
}

module.exports = FinanceiroReactiveService;
