/**
 * MIDDLEWARE DE CORTE TEMPORAL — HARD LIMIT 2026
 * =====================================================
 * Interceptador global para rotas do módulo financeiro.
 * Garante que NENHUM dado com data de emissão/vencimento anterior
 * a 01/01/2026 seja retornado pela API.
 *
 * REGRA:
 *  - Filtra registros com emissão/vencimento >= 2026-01-01
 *  - EXCEÇÃO: inclui parcelas futuras de qualquer data, desde que
 *    a nota tenha sido emitida em 2026+
 *
 * Injeta `req.financeiroCorteTemporal` com cláusulas SQL reutilizáveis.
 */

const CORTE_DATE = '2026-01-01';

/**
 * Retorna cláusulas WHERE SQL para aplicar o corte temporal.
 * @param {string} alias - Alias da tabela (ex: 'cr', 'cp')
 * @param {object} opts
 * @param {boolean} opts.incluirParcelasFuturas - Se true, inclui parcelas futuras mesmo que emissão < 2026
 * @returns {string} cláusula SQL parcial (sem AND inicial)
 */
function buildCorteClause(alias, opts = {}) {
    const a = alias ? `${alias}.` : '';

    // Hard limit: todas as datas relevantes devem ser >= 2026-01-01
    // Não permite dados de 2025 independente de condição
    if (opts.incluirParcelasFuturas) {
        // M-002 FIX: inclui parcelas com vencimento futuro mesmo que emissão < CORTE_DATE
        return `(
            COALESCE(${a}data_vencimento, ${a}vencimento, ${a}data_criacao) >= '${CORTE_DATE}'
            OR ${a}data_vencimento >= CURDATE()
        )`;
    }
    return `(
        COALESCE(${a}data_vencimento, ${a}vencimento, ${a}data_criacao) >= '${CORTE_DATE}'
    )`;
}

/**
 * Express middleware — injeta helpers de corte temporal no request.
 */
function corteTemporalMiddleware(req, res, next) {
    req.financeiroCorteTemporal = {
        date: CORTE_DATE,
        /**
         * Gera cláusula SQL AND para CR
         * @param {string} alias - Alias da tabela contas_receber
         */
        crClause(alias = 'cr') {
            return ` AND ${buildCorteClause(alias, { incluirParcelasFuturas: true })}`;
        },
        /**
         * Gera cláusula SQL AND para CP
         * @param {string} alias - Alias da tabela contas_pagar
         */
        cpClause(alias = 'cp') {
            return ` AND ${buildCorteClause(alias, { incluirParcelasFuturas: true })}`;
        },
        /**
         * Cláusula genérica (sem AND prefix)
         */
        rawClause(alias, opts) {
            return buildCorteClause(alias, opts);
        }
    };
    next();
}

module.exports = { corteTemporalMiddleware, buildCorteClause, CORTE_DATE };
