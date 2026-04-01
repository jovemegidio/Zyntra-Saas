/**
 * Migration 005: Tenant Indexes
 * Adiciona índices em empresa_id nas tabelas que agora fazem filtro por tenant.
 * Indispensável para performance das queries com WHERE empresa_id = ?.
 */
module.exports = {
    name: '005-tenant-indexes',

    async up(pool) {
        const indexes = [
            { table: 'contas_receber', column: 'empresa_id' },
            { table: 'contas_pagar', column: 'empresa_id' },
            { table: 'fornecedores', column: 'empresa_id' },
            { table: 'estoque', column: 'empresa_id' },
            { table: 'pedidos', column: 'empresa_id' },
            { table: 'clientes', column: 'empresa_id' },
        ];

        for (const { table, column } of indexes) {
            const idxName = `idx_${table}_${column}`;
            try {
                // Verifica se o índice já existe
                const [existing] = await pool.query(
                    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
                    [table, idxName]
                );
                if (existing.length === 0) {
                    await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${idxName}\` (\`${column}\`)`);
                    console.log(`[MIGRATION-005] ✅ Index ${idxName} criado`);
                } else {
                    console.log(`[MIGRATION-005] ⏭️ Index ${idxName} já existe`);
                }
            } catch (err) {
                // Tabela pode não existir em ambientes dev
                console.warn(`[MIGRATION-005] ⚠️ Não foi possível criar index em ${table}: ${err.message}`);
            }
        }
    }
};
