/**
 * ORDER BY Whitelist Utility — ALUFORCE ERP
 * 
 * Previne SQL injection em cláusulas ORDER BY dinâmicas.
 * Colunas permitidas são definidas por rota/módulo.
 * 
 * Uso:
 *   const { safeOrderBy } = require('../utils/order-by-whitelist');
 *   const orderClause = safeOrderBy(req.query.sort, req.query.order, {
 *       allowed: ['id', 'nome', 'data_criacao', 'valor'],
 *       default: 'id',
 *       defaultDir: 'DESC'
 *   });
 *   const [rows] = await pool.query(`SELECT * FROM pedidos ${orderClause}`);
 */
'use strict';

/**
 * Gera uma cláusula ORDER BY segura a partir de input do usuário
 * @param {string} column - Coluna solicitada pelo usuário  
 * @param {string} direction - Direção (asc/desc)
 * @param {object} options
 * @param {string[]} options.allowed - Colunas permitidas
 * @param {string} [options.default] - Coluna padrão se input inválido
 * @param {string} [options.defaultDir] - Direção padrão ('ASC' ou 'DESC')
 * @param {string} [options.tableAlias] - Alias da tabela (ex: 'p' → 'p.coluna')
 * @returns {string} Cláusula SQL segura: 'ORDER BY coluna ASC'
 */
function safeOrderBy(column, direction, options = {}) {
    const {
        allowed = [],
        default: defaultCol = 'id',
        defaultDir = 'DESC',
        tableAlias = ''
    } = options;

    // Sanitizar direção
    const dir = (direction || '').toUpperCase() === 'ASC' ? 'ASC' : 
                (direction || '').toUpperCase() === 'DESC' ? 'DESC' : defaultDir;

    // Sanitizar coluna — DEVE estar na whitelist
    const col = (column || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const safeCol = allowed.includes(col) ? col : defaultCol;

    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `ORDER BY ${prefix}${safeCol} ${dir}`;
}

/**
 * Whitelists comuns para módulos do ERP
 */
const COMMON_COLUMNS = {
    pedidos: ['id', 'numero', 'cliente_id', 'vendedor_id', 'status', 'valor_total', 'data_pedido', 'data_entrega', 'created_at', 'updated_at'],
    clientes: ['id', 'nome', 'razao_social', 'cpf_cnpj', 'email', 'cidade', 'estado', 'ativo', 'created_at'],
    produtos: ['id', 'nome', 'codigo', 'preco', 'custo', 'estoque', 'ativo', 'categoria_id', 'created_at'],
    financeiro: ['id', 'tipo', 'descricao', 'valor', 'data_vencimento', 'data_pagamento', 'status', 'categoria_id', 'created_at'],
    funcionarios: ['id', 'nome', 'cpf', 'cargo', 'departamento', 'data_admissao', 'ativo', 'created_at'],
    fornecedores: ['id', 'nome', 'cnpj', 'email', 'telefone', 'ativo', 'created_at'],
    usuarios: ['id', 'nome', 'email', 'role', 'ativo', 'ultimo_login', 'created_at'],
};

module.exports = { safeOrderBy, COMMON_COLUMNS };
