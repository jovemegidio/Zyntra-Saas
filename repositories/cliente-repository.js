/**
 * Cliente Repository — encapsulates clientes table queries.
 * @module repositories/cliente-repository
 */
const BaseRepository = require('./base-repository');

class ClienteRepository extends BaseRepository {
    /**
     * List clientes with optional admin/vendedor filtering and pagination.
     */
    async list({ page = 1, limit = 2000, isAdmin = false, isComercial = false, vendedorId = null, vendedorNome = null } = {}) {
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '';
        const params = [];

        if (isComercial && vendedorNome) {
            where = 'WHERE (c.vendedor_proprietario = ? OR c.vendedor_responsavel = ?)';
            params.push(vendedorNome, vendedorNome);
        }

        params.push(parseInt(limit), offset);

        return this.query(
            `SELECT c.id, c.nome, c.razao_social, c.nome_fantasia, c.email, c.telefone,
                    c.cnpj, c.cpf, c.cnpj_cpf, c.cidade, c.estado, c.ativo,
                    c.vendedor_responsavel, c.vendedor_proprietario,
                    c.created_at, c.data_cadastro,
                    e.nome_fantasia AS empresa_nome
             FROM clientes c
             LEFT JOIN empresas e ON c.empresa_id = e.id
             ${where} ORDER BY c.nome ASC LIMIT ? OFFSET ?`,
            params
        );
    }

    async findById(id) {
        return this.queryOne('SELECT * FROM clientes WHERE id = ?', [id]);
    }

    async search(q, { isAdmin = false, isComercial = false, vendedorId = null, vendedorNome = null } = {}) {
        const like = `%${q}%`;
        let where = 'WHERE (c.nome LIKE ? OR c.nome_fantasia LIKE ? OR c.razao_social LIKE ? OR c.cnpj LIKE ? OR c.email LIKE ?)';
        const params = [like, like, like, like, like];

        if (isComercial && vendedorNome) {
            where += ' AND (c.vendedor_proprietario = ? OR c.vendedor_responsavel = ?)';
            params.push(vendedorNome, vendedorNome);
        }

        return this.query(
            `SELECT c.id, c.nome, c.nome_fantasia, c.cnpj, c.email, c.telefone
             FROM clientes c
             LEFT JOIN empresas e ON c.empresa_id = e.id
             ${where} ORDER BY c.nome ASC LIMIT 20`,
            params
        );
    }
}

module.exports = ClienteRepository;
